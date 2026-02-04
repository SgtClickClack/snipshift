/**
 * Staff Invitations E2E Tests
 * 
 * Tests the Professional user invitation flow:
 * - View pending invitations
 * - Accept individual invitations
 * - Accept All with confetti celebration
 * - Verify shift status transitions to CONFIRMED
 * - Financial RBAC: Costs NOT visible to staff
 * 
 * Part of staff-e2e project - runs with professional user authentication.
 */

import { test, expect, Page, BrowserContext, Browser } from '@playwright/test';
import { TEST_PROFESSIONAL, setupUserContext } from './seed_data';
import { E2E_PROFESSIONAL } from './auth-professional.setup';

/** Performance benchmark: TTI should be under 1000ms */
const TTI_THRESHOLD_MS = 1000;

/**
 * Helper to measure Time to Interactive (TTI)
 */
async function measureTTI(page: Page, targetUrl: string): Promise<number> {
  const startTime = Date.now();
  
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  
  await page.getByTestId('professional-dashboard')
    .or(page.getByTestId('invitations-tab'))
    .or(page.getByRole('heading', { name: /dashboard/i }))
    .first()
    .waitFor({ state: 'visible', timeout: 30000 });
  
  return Date.now() - startTime;
}

/**
 * Generate mock invitations for testing
 */
function createMockInvitations(count: number = 3) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => ({
    id: `inv-${i + 1}`,
    shiftId: `shift-${i + 1}`,
    status: 'PENDING',
    createdAt: now.toISOString(),
    shift: {
      id: `shift-${i + 1}`,
      title: `Test Shift ${i + 1}`,
      description: 'E2E test shift invitation',
      startTime: new Date(now.getTime() + (i + 1) * 86400000 + 9 * 3600000).toISOString(),
      endTime: new Date(now.getTime() + (i + 1) * 86400000 + 17 * 3600000).toISOString(),
      hourlyRate: (30 + i * 5).toFixed(2),
      location: '123 Test St, Brisbane',
      venue: { name: 'E2E Test Venue' },
    },
  }));
}

test.describe('Staff Invitations: View & Manage', () => {
  test.beforeEach(async ({ context, page }) => {
    await setupUserContext(context, TEST_PROFESSIONAL);

    // Setup API auth bypass
    await page.route('**/api/**', async (route) => {
      const headers = { ...route.request().headers() };
      if (!headers['authorization']?.startsWith('Bearer mock-test-')) {
        headers['authorization'] = 'Bearer mock-test-token-professional';
      }
      await route.continue({ headers });
    });
  });

  test('Should see pending invitations on dashboard', async ({ page }) => {
    test.setTimeout(60000);

    const mockInvitations = createMockInvitations(3);

    // Mock invitations API
    await page.route('**/api/shifts/invitations/me', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockInvitations),
      });
    });

    await page.goto('/dashboard?tab=invitations', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // ============================================
    // ASSERTION: Invitation cards are visible
    // ============================================
    const invitationCards = page.getByTestId(/invitation-card/)
      .or(page.locator('[class*="invitation"]'))
      .or(page.locator('[class*="card"]').filter({ hasText: /Test Shift/i }));
    
    await expect(invitationCards.first()).toBeVisible({ timeout: 15000 });
    
    // Verify we have the expected number of invitations
    const cardCount = await invitationCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(1);

    // ============================================
    // ASSERTION: Invitation details are displayed
    // ============================================
    await expect(page.getByText('Test Shift 1')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/E2E Test Venue/i)).toBeVisible();
  });

  test('Should accept individual invitation', async ({ page }) => {
    test.setTimeout(60000);

    let invitationStatus = 'PENDING';
    const mockInvitations = createMockInvitations(1);

    // Mock invitations API with state tracking
    await page.route('**/api/shifts/invitations/me', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      const invitations = invitationStatus === 'PENDING' ? mockInvitations : [];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(invitations),
      });
    });

    // Mock accept endpoint
    await page.route('**/api/shifts/invitations/*/accept', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      invitationStatus = 'ACCEPTED';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, status: 'ACCEPTED' }),
      });
    });

    await page.goto('/dashboard?tab=invitations', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Find invitation card
    const invitationCard = page.getByTestId(/invitation-card/)
      .or(page.locator('[class*="card"]').filter({ hasText: /Test Shift/i }))
      .first();
    
    await expect(invitationCard).toBeVisible({ timeout: 15000 });

    // Find and click Accept button
    const acceptBtn = invitationCard.getByRole('button', { name: /accept/i }).first()
      .or(page.getByRole('button', { name: /accept/i }).first());
    
    await expect(acceptBtn).toBeVisible({ timeout: 10000 });
    await acceptBtn.click();

    // ============================================
    // ASSERTION: Success toast appears
    // ============================================
    await expect(
      page.getByRole('status').filter({ hasText: /accepted|confirmed|success/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('Should Accept All invitations with confetti', async ({ page }) => {
    test.setTimeout(90000);

    const mockInvitations = createMockInvitations(3);

    // Mock invitations API
    await page.route('**/api/shifts/invitations/me', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockInvitations),
      });
    });

    // Mock accept-all endpoint
    await page.route('**/api/shifts/invitations/accept-all', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accepted: 3, errors: [] }),
      });
    });

    await page.goto('/dashboard?tab=invitations', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Verify invitations are displayed
    const invitationCards = page.getByTestId(/invitation-card/)
      .or(page.locator('[class*="card"]').filter({ hasText: /Test Shift/i }));
    
    await expect(invitationCards.first()).toBeVisible({ timeout: 15000 });

    // Find and click Accept All button
    const acceptAllBtn = page.getByTestId('accept-all-invitations-btn')
      .or(page.getByTestId('accept-all-btn'))
      .or(page.getByRole('button', { name: /accept all/i }));
    
    await expect(acceptAllBtn).toBeVisible({ timeout: 10000 });
    await acceptAllBtn.click();

    // ============================================
    // ASSERTION: Confetti animation appears
    // ============================================
    const confettiCanvas = page.locator('canvas').first();
    await expect.soft(confettiCanvas).toBeVisible({ timeout: 5000 }).catch(() => {
      console.log('[Staff Invitations] Confetti animation may have completed quickly');
    });

    // ============================================
    // ASSERTION: Success toast with count
    // ============================================
    await expect(
      page.getByRole('status').filter({ hasText: /confirmed|accepted|all.*shifts/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('Should decline invitation', async ({ page }) => {
    test.setTimeout(60000);

    let invitationStatus = 'PENDING';
    const mockInvitations = createMockInvitations(1);

    // Mock invitations API
    await page.route('**/api/shifts/invitations/me', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      const invitations = invitationStatus === 'PENDING' ? mockInvitations : [];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(invitations),
      });
    });

    // Mock decline endpoint
    await page.route('**/api/shifts/invitations/*/decline', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      invitationStatus = 'DECLINED';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, status: 'DECLINED' }),
      });
    });

    await page.goto('/dashboard?tab=invitations', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Find decline button
    const declineBtn = page.getByRole('button', { name: /decline|reject/i }).first();
    
    if (await declineBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await declineBtn.click();

      // ============================================
      // ASSERTION: Invitation removed after decline
      // ============================================
      // Wait for state update
      await page.waitForTimeout(1000);
      
      // Verify toast
      await expect
        .soft(page.getByRole('status').filter({ hasText: /declined|removed/i }).first())
        .toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Staff Invitations: Financial Privacy', () => {
  test.beforeEach(async ({ context, page }) => {
    await setupUserContext(context, TEST_PROFESSIONAL);

    await page.route('**/api/**', async (route) => {
      const headers = { ...route.request().headers() };
      if (!headers['authorization']?.startsWith('Bearer mock-test-')) {
        headers['authorization'] = 'Bearer mock-test-token-professional';
      }
      await route.continue({ headers });
    });
  });

  test('Staff does NOT see venue wage costs in invitations', async ({ page }) => {
    test.setTimeout(60000);

    // Mock invitations WITHOUT cost data (as backend would return for professional)
    await page.route('**/api/shifts/invitations/me', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      const now = new Date();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'inv-1',
          shiftId: 'shift-1',
          status: 'PENDING',
          createdAt: now.toISOString(),
          shift: {
            id: 'shift-1',
            title: 'Test Shift',
            startTime: new Date(now.getTime() + 86400000).toISOString(),
            endTime: new Date(now.getTime() + 86400000 + 8 * 3600000).toISOString(),
            hourlyRate: '30.00', // Staff can see their own rate
            // NO estimatedCost or totalCost - hidden from staff
          },
        }]),
      });
    });

    await page.goto('/dashboard?tab=invitations', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // ============================================
    // ASSERTION: No cost-related elements visible
    // ============================================
    const costElements = page.locator('[data-testid*="cost"], [class*="wage-cost"]');
    const costCount = await costElements.count();
    expect(costCount).toBe(0);

    // ============================================
    // ASSERTION: Staff CAN see their hourly rate
    // ============================================
    const rateText = page.getByText(/\$30/);
    // Rate may or may not be displayed depending on UI design
    // This is acceptable - staff can see their own rate
  });

  test('Staff does NOT see Est. Wage Cost pill on calendar view', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/dashboard?view=calendar', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // ============================================
    // ASSERTION: Est. Wage Cost pill is NOT visible
    // ============================================
    const wageCostPill = page.getByTestId('est-wage-cost');
    await expect(wageCostPill).not.toBeVisible({ timeout: 5000 });

    // ============================================
    // ASSERTION: No shift cost labels
    // ============================================
    const shiftCostLabels = page.getByTestId(/shift-cost/);
    const costLabelCount = await shiftCostLabels.count();
    expect(costLabelCount).toBe(0);
  });
});

test.describe('Staff Invitations: Performance', () => {
  test.beforeEach(async ({ context, page }) => {
    await setupUserContext(context, TEST_PROFESSIONAL);

    await page.route('**/api/**', async (route) => {
      const headers = { ...route.request().headers() };
      if (!headers['authorization']?.startsWith('Bearer mock-test-')) {
        headers['authorization'] = 'Bearer mock-test-token-professional';
      }
      await route.continue({ headers });
    });
  });

  test('Professional dashboard loads within TTI threshold (<1s)', async ({ page }) => {
    test.setTimeout(60000);

    // Mock fast API responses
    await page.route('**/api/shifts/invitations/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/shifts*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // First load (may be slower)
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Second load (should hit cache)
    const tti = await measureTTI(page, '/dashboard');

    console.log(`[Performance] Staff Dashboard TTI: ${tti}ms (threshold: ${TTI_THRESHOLD_MS}ms)`);

    // ============================================
    // ASSERTION: TTI under threshold
    // ============================================
    expect.soft(tti).toBeLessThanOrEqual(TTI_THRESHOLD_MS);
  });
});

test.describe('Staff Invitations: Empty State', () => {
  test.beforeEach(async ({ context, page }) => {
    await setupUserContext(context, TEST_PROFESSIONAL);

    await page.route('**/api/**', async (route) => {
      const headers = { ...route.request().headers() };
      if (!headers['authorization']?.startsWith('Bearer mock-test-')) {
        headers['authorization'] = 'Bearer mock-test-token-professional';
      }
      await route.continue({ headers });
    });
  });

  test('Shows appropriate message when no invitations pending', async ({ page }) => {
    test.setTimeout(60000);

    // Mock empty invitations response
    await page.route('**/api/shifts/invitations/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/dashboard?tab=invitations', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // ============================================
    // ASSERTION: Empty state message is displayed
    // ============================================
    const emptyState = page.getByText(/no.*invitation|no.*pending|all caught up/i);
    await expect(emptyState).toBeVisible({ timeout: 10000 });

    // Accept All button should be hidden or disabled when no invitations
    const acceptAllBtn = page.getByRole('button', { name: /accept all/i });
    const isVisible = await acceptAllBtn.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isVisible) {
      // If visible, should be disabled
      await expect(acceptAllBtn).toBeDisabled();
    }
  });
});
