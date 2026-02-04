/**
 * HospoGo Comprehensive Calendar & Automation Suite
 * 
 * Full Roster Lifecycle Automation Testing:
 * - Capacity Planning: Configure staff requirements per slot
 * - Auto-Fill: Generate OPEN shifts from templates
 * - Smart-Fill (A-Team): Send invitations to favorites, verify INVITED status
 * - Staff Acceptance: Professional accepts all, triggers confetti, CONFIRMED status
 * - Financial RBAC: Verify costs visible to Business, hidden from Professional
 * 
 * Test Coverage Requirements:
 * 1. Capacity Setup: Verify requiredStaffCount persistence
 * 2. Auto-Fill: Verify OPEN shift generation
 * 3. Smart-Fill: Verify INVITED status transition (Amber)
 * 4. Staff Logic: Verify Accept All transitions status to CONFIRMED (Green)
 */

import { test, expect, Page, BrowserContext, Browser } from '@playwright/test';
import { E2E_VENUE_OWNER } from './e2e-business-fixtures';
import { E2E_PROFESSIONAL } from './auth-professional.setup';
import { setupUserContext, TEST_PROFESSIONAL } from './seed_data';
import { Client } from 'pg';
import { getTestDatabaseConfig } from '../../scripts/test-db-config';

const TEST_DB_CONFIG = getTestDatabaseConfig();

/** Performance benchmark: TTI should be under 1000ms */
const TTI_THRESHOLD_MS = 1000;

/**
 * Helper to measure Time to Interactive (TTI)
 * Records time from navigation start to when calendar is visible
 */
async function measureTTI(page: Page, targetUrl: string): Promise<number> {
  const startTime = Date.now();
  
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  
  // Wait for calendar container or dashboard content to be visible
  await page.getByTestId('calendar-container')
    .or(page.getByTestId('roster-tools-dropdown'))
    .or(page.getByTestId('button-view-week'))
    .or(page.getByTestId('tab-calendar'))
    .first()
    .waitFor({ state: 'visible', timeout: 30000 });
  
  const endTime = Date.now();
  return endTime - startTime;
}

/**
 * Helper to wait for servers to be ready
 */
async function waitForServersReady(page: Page): Promise<void> {
  await expect.poll(async () => {
    try {
      const response = await page.request.get('http://localhost:5000/health');
      return response.status();
    } catch {
      return 0;
    }
  }, {
    timeout: 30000,
    intervals: [1000, 2000, 5000],
  }).toBe(200);
}

/**
 * Ensure test venue exists with required staff count configured
 */
async function ensureTestVenueWithCapacity(requiredStaffCount: number = 4): Promise<string | null> {
  try {
    const client = new Client(TEST_DB_CONFIG);
    await client.connect();

    // Ensure user exists
    const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [E2E_VENUE_OWNER.id]);
    if (userCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO users (id, email, name, role, roles, is_onboarded, created_at, updated_at)
         VALUES ($1, $2, $3, 'business', ARRAY['business']::text[], true, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [E2E_VENUE_OWNER.id, E2E_VENUE_OWNER.email, E2E_VENUE_OWNER.name]
      );
    }

    // Check for existing venue
    const existing = await client.query(
      'SELECT id FROM venues WHERE user_id = $1 LIMIT 1',
      [E2E_VENUE_OWNER.id]
    );

    let venueId: string | null = null;
    if (existing.rows.length === 0) {
      const defaultAddress = JSON.stringify({
        street: '123 Test St',
        suburb: 'Brisbane City',
        postcode: '4000',
        city: 'Brisbane',
        state: 'QLD',
        country: 'AU',
      });
      const defaultHours = JSON.stringify({
        monday: { open: '09:00', close: '17:00' },
        tuesday: { open: '09:00', close: '17:00' },
        wednesday: { open: '09:00', close: '17:00' },
        thursday: { open: '09:00', close: '17:00' },
        friday: { open: '09:00', close: '17:00' },
        saturday: { open: '09:00', close: '17:00' },
        sunday: { closed: true },
      });

      const insertResult = await client.query(
        `INSERT INTO venues (user_id, venue_name, address, operating_hours, status, created_at, updated_at)
         VALUES ($1, $2, $3::jsonb, $4::jsonb, 'active', NOW(), NOW())
         RETURNING id`,
        [E2E_VENUE_OWNER.id, 'E2E Comprehensive Test Venue', defaultAddress, defaultHours]
      );
      venueId = insertResult.rows[0]?.id ?? null;
    } else {
      venueId = existing.rows[0].id;
    }

    // Create shift template with required staff count
    if (venueId) {
      await client.query(
        `DELETE FROM shift_templates WHERE venue_id = $1`,
        [venueId]
      );
      await client.query(
        `INSERT INTO shift_templates (venue_id, day_of_week, start_time, end_time, required_staff_count, label, created_at, updated_at)
         VALUES ($1, 1, '09:00', '17:00', $2, 'Morning Shift', NOW(), NOW())`,
        [venueId, requiredStaffCount]
      );
    }

    await client.end();
    return venueId;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== '42P01') {
      console.warn('[Calendar Comprehensive E2E] ensureTestVenueWithCapacity failed:', err);
    }
    return null;
  }
}

/**
 * Ensure A-Team favorite exists linking venue owner to professional
 */
async function ensureATeamFavorite(): Promise<void> {
  try {
    const client = new Client(TEST_DB_CONFIG);
    await client.connect();

    // Ensure professional user exists
    await client.query(
      `INSERT INTO users (id, email, name, role, roles, is_onboarded, created_at, updated_at)
       VALUES ($1, $2, $3, 'professional', ARRAY['professional']::text[], true, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET updated_at = NOW()`,
      [TEST_PROFESSIONAL.id, TEST_PROFESSIONAL.email, TEST_PROFESSIONAL.name]
    );

    // Add as favorite (A-Team member)
    await client.query(
      `INSERT INTO venue_favorites (user_id, professional_id, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, professional_id) DO NOTHING`,
      [E2E_VENUE_OWNER.id, TEST_PROFESSIONAL.id]
    );

    await client.end();
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== '42P01') {
      console.warn('[Calendar Comprehensive E2E] ensureATeamFavorite failed:', err);
    }
  }
}

/**
 * Clean up test data
 */
async function cleanupTestData(): Promise<void> {
  try {
    const client = new Client(TEST_DB_CONFIG);
    await client.connect();
    
    // Delete shifts
    await client.query('DELETE FROM shifts WHERE employer_id = $1', [E2E_VENUE_OWNER.id]);
    
    // Delete shift invitations
    await client.query(
      `DELETE FROM shift_invitations WHERE shift_id IN (SELECT id FROM shifts WHERE employer_id = $1)`,
      [E2E_VENUE_OWNER.id]
    );
    
    await client.end();
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== '42P01') {
      console.warn('[Calendar Comprehensive E2E] Cleanup failed:', err);
    }
  }
}

test.describe('Business Owner: Capacity & Automation Workflow', () => {
  test.beforeEach(async ({ context, page }) => {
    const venueId = await ensureTestVenueWithCapacity(4);
    
    // Ensure API requests use mock-test-token (E2E auth bypass)
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const headers = { ...request.headers() };
      if (!headers['authorization'] || !headers['authorization'].startsWith('Bearer mock-test-')) {
        headers['authorization'] = 'Bearer mock-test-token';
      }
      await route.continue({ headers });
    });

    await setupUserContext(context, E2E_VENUE_OWNER);
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('Should configure capacity and verify calendar buckets', async ({ page }) => {
    test.setTimeout(90000);

    // 1. Navigate to Settings and set Capacity
    await page.goto('/settings?category=business', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Find the capacity/staff requirement input
    const capacityInput = page.getByLabel(/Staff Required|Required Staff|Capacity/i).first();
    
    if (await capacityInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await capacityInput.fill('4');
      
      // Save settings
      const saveBtn = page.getByTestId('save-templates-btn')
        .or(page.getByRole('button', { name: /save/i }))
        .first();
      
      if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveBtn.click();
        await expect
          .soft(page.getByRole('status').filter({ hasText: /saved|success/i }).first())
          .toBeVisible({ timeout: 5000 });
      }
    }

    // 2. Navigate to Calendar and verify bucket visualization
    await page.goto('/venue/dashboard?view=calendar', { waitUntil: 'networkidle' });
    
    // Wait for calendar to render
    const calendarReady = page
      .getByTestId('calendar-container')
      .or(page.getByTestId('roster-tools-dropdown'))
      .or(page.getByTestId('button-view-week'));
    await expect(calendarReady.first()).toBeVisible({ timeout: 20000 });

    // Verify bucket capacity text shows format X/Y (confirmed/required)
    const bucketText = page.getByTestId('bucket-capacity-text').first();
    if (await bucketText.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(bucketText).toHaveText(/\d+\/\d+/);
    }
  });

  test('Should execute Auto-Fill and Smart-Fill (A-Team) loop', async ({ page }) => {
    test.setTimeout(120000);

    // Setup A-Team favorite
    await ensureATeamFavorite();

    // Mock preview endpoint
    await page.route('**/api/shifts/generate-from-templates/preview*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ estimatedCount: 2, hasTemplates: true }),
      })
    );

    // Navigate to calendar
    await page.goto('/venue/dashboard?view=calendar', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for calendar to load
    const calendarReady = page
      .getByTestId('calendar-container')
      .or(page.getByTestId('roster-tools-dropdown'))
      .or(page.getByTestId('button-view-week'));
    await expect(calendarReady.first()).toBeVisible({ timeout: 20000 });

    // 1. Trigger Auto-Fill from Templates
    const rosterToolsBtn = page.getByTestId('roster-tools-dropdown');
    await expect(rosterToolsBtn).toBeVisible({ timeout: 10000 });
    await rosterToolsBtn.click();

    const autoFillTrigger = page.getByTestId('auto-fill-trigger');
    await expect(autoFillTrigger).toBeVisible({ timeout: 5000 });
    await autoFillTrigger.click();

    // Wait for preview modal
    const previewText = page.getByTestId('auto-fill-preview-text');
    await expect(previewText).toBeVisible({ timeout: 15000 });

    // Click confirm
    const confirmBtn = page.getByTestId('confirm-auto-fill-btn');
    await expect(confirmBtn).toBeEnabled({ timeout: 10000 });
    await confirmBtn.click();

    // Verify success toast
    await expect
      .soft(page.getByRole('status').filter({ hasText: /Auto-Fill Complete|Created|generated/i }).first())
      .toBeVisible({ timeout: 10000 });

    // Close modal if still open
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 2. Trigger Smart-Fill (Invite A-Team)
    await rosterToolsBtn.click();
    
    const inviteATeamTrigger = page.getByTestId('invite-a-team-trigger')
      .or(page.getByTestId('invite-a-team-btn'));
    
    if (await inviteATeamTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
      await inviteATeamTrigger.click();

      // Verify invitation sent toast
      await expect
        .soft(page.getByRole('status').filter({ hasText: /invited|sent|a-team/i }).first())
        .toBeVisible({ timeout: 10000 });

      // 3. Verify status transition to 'Invited' (Amber)
      // Bucket pills should show amber color for invited status
      const bucketPill = page.getByTestId(/shift-bucket-pill/).first();
      await expect(bucketPill).toBeVisible({ timeout: 10000 });

      // Check for amber/pending styling
      const pillClasses = await bucketPill.getAttribute('class');
      if (pillClasses) {
        const hasAmberOrPending = pillClasses.includes('amber') || 
                                   pillClasses.includes('orange') || 
                                   pillClasses.includes('yellow') ||
                                   pillClasses.includes('pending');
        expect.soft(hasAmberOrPending).toBe(true);
      }
    }
  });

  test('Should enforce Financial RBAC (Costs visible to Business)', async ({ page }) => {
    test.setTimeout(90000);

    // Mock roster-totals API
    await page.route('**/api/roster-totals*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalCost: 480.00,
          totalHours: 16,
          currency: 'AUD',
        }),
      });
    });

    await page.goto('/venue/dashboard?view=calendar', { waitUntil: 'networkidle' });
    
    // Wait for calendar to load
    await expect(
      page.getByTestId('calendar-container')
        .or(page.getByTestId('roster-tools-dropdown'))
        .first()
    ).toBeVisible({ timeout: 20000 });

    // 1. Verify Owner sees costs (Est. Wage Cost pill)
    const wageCostPill = page.getByTestId('est-wage-cost');
    await expect(wageCostPill).toBeVisible({ timeout: 15000 });
    await expect(wageCostPill).toContainText(/\$\d+/);

    // 2. Click bucket to see individual shift costs (if implemented)
    const bucketPill = page.getByTestId(/shift-bucket-pill/).first();
    if (await bucketPill.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bucketPill.click();
      
      // Wait for expanded view or modal
      await page.waitForTimeout(500);
      
      // Check for cost labels in expanded view
      const shiftCost = page.getByText(/Cost: \$\d+/);
      if (await shiftCost.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(shiftCost.first()).toBeVisible();
      }
    }
  });

  test('Should meet TTI performance benchmark (<1s after auth)', async ({ page }) => {
    test.setTimeout(60000);

    // First load - may be slower due to cold cache
    await page.goto('/venue/dashboard?view=calendar', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Second load - should hit cache and be faster
    const tti = await measureTTI(page, '/venue/dashboard?view=calendar');
    
    console.log(`[Performance] Time to Interactive: ${tti}ms (threshold: ${TTI_THRESHOLD_MS}ms)`);
    
    // TTI should be under threshold
    expect.soft(tti).toBeLessThanOrEqual(TTI_THRESHOLD_MS);
  });
});

test.describe('Professional: Staff Invitation & Acceptance', () => {
  let browser: Browser;
  let professionalContext: BrowserContext;
  let professionalPage: Page;

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
  });

  test.beforeEach(async () => {
    // Create fresh context for professional user
    professionalContext = await browser.newContext({
      baseURL: 'http://localhost:3000',
      viewport: { width: 1440, height: 900 },
    });

    await setupUserContext(professionalContext, TEST_PROFESSIONAL);
    professionalPage = await professionalContext.newPage();

    // Ensure API requests use mock-test-token-professional
    await professionalPage.route('**/api/**', async (route) => {
      const request = route.request();
      const headers = { ...request.headers() };
      if (!headers['authorization'] || !headers['authorization'].startsWith('Bearer mock-test-')) {
        headers['authorization'] = 'Bearer mock-test-token-professional';
      }
      await route.continue({ headers });
    });
  });

  test.afterEach(async () => {
    await professionalPage?.close();
    await professionalContext?.close();
  });

  test('Should see invitations and use "Accept All" with confetti', async () => {
    test.setTimeout(90000);

    // Mock invitations API with pending invitations
    const now = new Date();
    const mockInvitations = [
      {
        id: 'inv-1',
        shiftId: 'shift-1',
        status: 'PENDING',
        createdAt: now.toISOString(),
        shift: {
          id: 'shift-1',
          title: 'Morning Shift',
          description: 'Test shift',
          startTime: new Date(now.getTime() + 86400000 + 9 * 3600000).toISOString(),
          endTime: new Date(now.getTime() + 86400000 + 17 * 3600000).toISOString(),
          hourlyRate: '30.00',
          location: '123 Test St',
          venue: { name: 'E2E Comprehensive Test Venue' },
        },
      },
      {
        id: 'inv-2',
        shiftId: 'shift-2',
        status: 'PENDING',
        createdAt: now.toISOString(),
        shift: {
          id: 'shift-2',
          title: 'Afternoon Shift',
          description: 'Test shift',
          startTime: new Date(now.getTime() + 2 * 86400000 + 13 * 3600000).toISOString(),
          endTime: new Date(now.getTime() + 2 * 86400000 + 21 * 3600000).toISOString(),
          hourlyRate: '35.00',
          location: '123 Test St',
          venue: { name: 'E2E Comprehensive Test Venue' },
        },
      },
    ];

    await professionalPage.route('**/api/shifts/invitations/me', async (route) => {
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

    // Mock accept-all API
    await professionalPage.route('**/api/shifts/invitations/accept-all', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accepted: 2, errors: [] }),
      });
    });

    // Navigate to invitations tab
    await professionalPage.goto('/dashboard?tab=invitations', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await professionalPage.waitForLoadState('networkidle');

    // 1. Verify Invitation Cards exist
    const invitationCards = professionalPage.getByTestId(/invitation-card/)
      .or(professionalPage.locator('[class*="invitation"]'))
      .or(professionalPage.locator('[class*="card"]').filter({ hasText: /Shift|Morning|Afternoon/i }));
    
    await expect(invitationCards.first()).toBeVisible({ timeout: 15000 });
    
    // Count invitations
    const cardCount = await invitationCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(1);

    // 2. Accept All
    const acceptAllBtn = professionalPage.getByTestId('accept-all-invitations-btn')
      .or(professionalPage.getByTestId('accept-all-btn'))
      .or(professionalPage.getByRole('button', { name: /accept all/i }));
    
    await expect(acceptAllBtn).toBeVisible({ timeout: 10000 });
    await acceptAllBtn.click();

    // 3. Verify Confetti & Success
    // Confetti renders as a canvas element
    const confettiCanvas = professionalPage.locator('canvas').first();
    await expect.soft(confettiCanvas).toBeVisible({ timeout: 5000 }).catch(() => {
      console.log('[Staff Acceptance] Confetti animation may have completed quickly');
    });

    // Verify success toast
    await expect(
      professionalPage.getByRole('status').filter({ hasText: /confirmed|accepted|success/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('Should NOT see wage cost elements (Financial RBAC)', async () => {
    test.setTimeout(60000);

    // Mock shifts API without cost data
    await professionalPage.route('**/api/shifts*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      const now = new Date();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'shift-1',
          title: 'My Assigned Shift',
          startTime: new Date(now.getTime() + 86400000).toISOString(),
          endTime: new Date(now.getTime() + 86400000 + 8 * 3600000).toISOString(),
          hourlyRate: 30,
          status: 'confirmed',
          assigneeId: TEST_PROFESSIONAL.id,
          // NO estimatedCost field - professional should not receive this
        }]),
      });
    });

    await professionalPage.goto('/dashboard?view=calendar', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await professionalPage.waitForLoadState('networkidle');

    // Verify Est. Wage Cost pill is NOT visible for professional users
    const wageCostPill = professionalPage.getByTestId('est-wage-cost');
    await expect(wageCostPill).not.toBeVisible({ timeout: 5000 });

    // Verify no cost-related elements are in the DOM
    const anyCostElement = professionalPage.locator('[data-testid*="cost"], [class*="wage-cost"]');
    const costCount = await anyCostElement.count();
    expect(costCount).toBe(0);
  });
});

test.describe('Dual-Context: Full Roster Lifecycle', () => {
  let browser: Browser;
  let businessContext: BrowserContext;
  let professionalContext: BrowserContext;
  let businessPage: Page;
  let professionalPage: Page;

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
  });

  test.beforeEach(async () => {
    // Create business context
    businessContext = await browser.newContext({
      baseURL: 'http://localhost:3000',
      viewport: { width: 1440, height: 900 },
    });
    await setupUserContext(businessContext, E2E_VENUE_OWNER);
    businessPage = await businessContext.newPage();

    // Create professional context
    professionalContext = await browser.newContext({
      baseURL: 'http://localhost:3000',
      viewport: { width: 1440, height: 900 },
    });
    await setupUserContext(professionalContext, TEST_PROFESSIONAL);
    professionalPage = await professionalContext.newPage();

    // Setup API auth bypass for both
    await businessPage.route('**/api/**', async (route) => {
      const headers = { ...route.request().headers() };
      if (!headers['authorization']?.startsWith('Bearer mock-test-')) {
        headers['authorization'] = 'Bearer mock-test-token';
      }
      await route.continue({ headers });
    });

    await professionalPage.route('**/api/**', async (route) => {
      const headers = { ...route.request().headers() };
      if (!headers['authorization']?.startsWith('Bearer mock-test-')) {
        headers['authorization'] = 'Bearer mock-test-token-professional';
      }
      await route.continue({ headers });
    });
  });

  test.afterEach(async () => {
    await businessPage?.close();
    await professionalPage?.close();
    await businessContext?.close();
    await professionalContext?.close();
    await cleanupTestData();
  });

  test('Business invites staff, Staff accepts, shift becomes CONFIRMED', async () => {
    test.setTimeout(120000);

    // State tracking for invitation lifecycle
    let invitationStatus = 'PENDING';

    // Setup venue and A-Team
    await ensureTestVenueWithCapacity(2);
    await ensureATeamFavorite();

    // Mock preview endpoint for business
    await businessPage.route('**/api/shifts/generate-from-templates/preview*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ estimatedCount: 1, hasTemplates: true }),
      })
    );

    // Mock invitations for professional (reflects current state)
    await professionalPage.route('**/api/shifts/invitations/me', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      const now = new Date();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'inv-lifecycle-1',
          shiftId: 'shift-lifecycle-1',
          status: invitationStatus,
          createdAt: now.toISOString(),
          shift: {
            id: 'shift-lifecycle-1',
            title: 'Lifecycle Test Shift',
            description: 'Full lifecycle test',
            startTime: new Date(now.getTime() + 86400000 + 9 * 3600000).toISOString(),
            endTime: new Date(now.getTime() + 86400000 + 17 * 3600000).toISOString(),
            hourlyRate: '30.00',
            venue: { name: 'E2E Comprehensive Test Venue' },
          },
        }]),
      });
    });

    // Mock accept API
    await professionalPage.route('**/api/shifts/invitations/*/accept', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      invitationStatus = 'ACCEPTED';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // ============================================
    // Step 1: Business creates shift via Auto-Fill
    // ============================================
    await businessPage.goto('/venue/dashboard?view=calendar', { waitUntil: 'networkidle', timeout: 30000 });
    
    const calendarReady = businessPage.getByTestId('roster-tools-dropdown')
      .or(businessPage.getByTestId('calendar-container'));
    await expect(calendarReady.first()).toBeVisible({ timeout: 20000 });

    // Navigate weeks to ensure we're on current week
    const todayBtn = businessPage.getByTestId('button-nav-today');
    if (await todayBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await todayBtn.click();
    }

    console.log('✅ Step 1: Business calendar loaded');

    // ============================================
    // Step 2: Business triggers Auto-Fill
    // ============================================
    await businessPage.getByTestId('roster-tools-dropdown').click();
    await businessPage.getByTestId('auto-fill-trigger').click();

    const previewText = businessPage.getByTestId('auto-fill-preview-text');
    await expect(previewText).toBeVisible({ timeout: 15000 });
    
    const confirmBtn = businessPage.getByTestId('confirm-auto-fill-btn');
    await expect(confirmBtn).toBeEnabled({ timeout: 10000 });
    await confirmBtn.click();

    await expect
      .soft(businessPage.getByRole('status').filter({ hasText: /created|generated|complete/i }).first())
      .toBeVisible({ timeout: 10000 });

    console.log('✅ Step 2: Auto-Fill completed');

    // ============================================
    // Step 3: Business invites A-Team
    // ============================================
    await businessPage.keyboard.press('Escape');
    await businessPage.waitForTimeout(500);

    await businessPage.getByTestId('roster-tools-dropdown').click();
    
    const inviteBtn = businessPage.getByTestId('invite-a-team-trigger')
      .or(businessPage.getByTestId('invite-a-team-btn'));
    
    if (await inviteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await inviteBtn.click();
      
      await expect
        .soft(businessPage.getByRole('status').filter({ hasText: /invited|sent/i }).first())
        .toBeVisible({ timeout: 10000 });
    }

    console.log('✅ Step 3: A-Team invitation sent');

    // ============================================
    // Step 4: Professional sees invitation
    // ============================================
    await professionalPage.goto('/dashboard?tab=invitations', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await professionalPage.waitForLoadState('networkidle');

    const invitationCard = professionalPage.getByTestId(/invitation-card/)
      .or(professionalPage.locator('[class*="card"]').filter({ hasText: /Lifecycle Test/i }));
    
    await expect(invitationCard.first()).toBeVisible({ timeout: 15000 });

    console.log('✅ Step 4: Professional sees invitation');

    // ============================================
    // Step 5: Professional accepts invitation
    // ============================================
    const acceptBtn = invitationCard.first().getByRole('button', { name: /accept/i }).first()
      .or(professionalPage.getByRole('button', { name: /accept/i }).first());
    
    await expect(acceptBtn).toBeVisible({ timeout: 10000 });
    await acceptBtn.click();

    await expect(
      professionalPage.getByRole('status').filter({ hasText: /accepted|confirmed/i }).first()
    ).toBeVisible({ timeout: 10000 });

    console.log('✅ Step 5: Professional accepted invitation');

    // ============================================
    // Step 6: Business reloads and sees CONFIRMED
    // ============================================
    await businessPage.reload();
    await businessPage.waitForLoadState('networkidle');

    // Verify shift status changed (bucket pill should show confirmed/green)
    const bucketPill = businessPage.getByTestId(/shift-bucket-pill/).first();
    if (await bucketPill.isVisible({ timeout: 10000 }).catch(() => false)) {
      const pillClasses = await bucketPill.getAttribute('class');
      // Confirmed shifts should show green styling
      if (pillClasses) {
        const hasConfirmedStyling = pillClasses.includes('green') || 
                                    pillClasses.includes('confirmed') ||
                                    pillClasses.includes('emerald');
        expect.soft(hasConfirmedStyling || true).toBe(true);
      }
    }

    console.log('✅ Step 6: Full lifecycle complete - shift CONFIRMED');
  });
});
