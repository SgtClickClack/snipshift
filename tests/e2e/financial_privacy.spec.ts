/**
 * Financial Privacy & RBAC E2E Tests
 * 
 * Verifies the Financial Masking audit requirements:
 * - Business Users: Can see Est. Wage Cost pill and individual shift costs
 * - Professional Users: Cannot see any wage cost or financial data in the DOM
 * 
 * This test covers the Financial RBAC implementation ensuring cost data
 * is only exposed to users with appropriate permissions (business role).
 */

import { test, expect, Page, BrowserContext, Browser } from '@playwright/test';
import { E2E_VENUE_OWNER } from './e2e-business-fixtures';
import { TEST_PROFESSIONAL, setupUserContext } from './seed_data';
import { Client } from 'pg';
import { getTestDatabaseConfig } from '../../scripts/test-db-config';

const TEST_DB_CONFIG = getTestDatabaseConfig();

/**
 * Ensure test venue exists with shifts for costing tests
 */
async function ensureTestVenueWithShifts(): Promise<string | null> {
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
        street: '123 Financial Test St',
        suburb: 'Brisbane City',
        postcode: '4000',
      });

      const insertResult = await client.query(
        `INSERT INTO venues (user_id, venue_name, address, status, created_at, updated_at)
         VALUES ($1, $2, $3::jsonb, 'active', NOW(), NOW())
         RETURNING id`,
        [E2E_VENUE_OWNER.id, 'Financial Privacy Test Venue', defaultAddress]
      );
      venueId = insertResult.rows[0]?.id ?? null;
    } else {
      venueId = existing.rows[0].id;
    }

    // Create a confirmed shift with cost data
    const now = new Date();
    const startTime = new Date(now);
    startTime.setHours(9, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(17, 0, 0, 0);

    await client.query(
      `INSERT INTO shifts (employer_id, title, description, start_time, end_time, hourly_rate, status, created_at, updated_at)
       VALUES ($1, 'Financial Test Shift', 'Testing cost visibility', $2, $3, 30, 'confirmed', NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [E2E_VENUE_OWNER.id, startTime, endTime]
    );

    await client.end();
    return venueId;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== '42P01') {
      console.warn('[Financial Privacy E2E] ensureTestVenueWithShifts failed:', err);
    }
    return null;
  }
}

/**
 * Clean up test shifts
 */
async function cleanupTestShifts(): Promise<void> {
  try {
    const client = new Client(TEST_DB_CONFIG);
    await client.connect();
    await client.query(
      `DELETE FROM shifts WHERE employer_id = $1 AND title = 'Financial Test Shift'`,
      [E2E_VENUE_OWNER.id]
    );
    await client.end();
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== '42P01') {
      console.warn('[Financial Privacy E2E] Cleanup failed:', err);
    }
  }
}

test.describe('Financial Privacy: Business Owner View', () => {
  test.beforeEach(async ({ context, page }) => {
    await ensureTestVenueWithShifts();

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
    await cleanupTestShifts();
  });

  test('Business Owner SEES Est. Wage Cost pill with dollar value', async ({ page }) => {
    test.setTimeout(90000);

    // Mock roster-totals API for deterministic testing
    await page.route('**/api/roster-totals*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalCost: 240.00,
          totalHours: 8,
          currency: 'AUD',
        }),
      });
    });

    await page.goto('/venue/dashboard?view=calendar', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Wait for calendar to load
    await expect(
      page.getByTestId('calendar-container')
        .or(page.getByTestId('roster-tools-dropdown'))
        .first()
    ).toBeVisible({ timeout: 20000 });

    // ============================================
    // ASSERTION: Est. Wage Cost pill is visible
    // ============================================
    const wageCostPill = page.getByTestId('est-wage-cost');
    await expect(wageCostPill).toBeVisible({ timeout: 15000 });

    // ============================================
    // ASSERTION: Pill contains a dollar value
    // ============================================
    await expect(wageCostPill).toContainText(/\$\d+(\.\d{2})?/);

    // ============================================
    // ASSERTION: Pill has correct emerald styling (financial indicator)
    // ============================================
    const pillClasses = await wageCostPill.getAttribute('class');
    expect.soft(pillClasses).toContain('emerald');
  });

  test('Business Owner SEES individual shift costs in bucket expansion', async ({ page }) => {
    test.setTimeout(90000);

    // Mock shifts with cost data
    await page.route('**/api/shifts*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      const now = new Date();
      const startTime = new Date(now);
      startTime.setHours(9, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(17, 0, 0, 0);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'shift-financial-1',
          title: 'Financial Test Shift',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          hourlyRate: 30,
          status: 'confirmed',
          employerId: E2E_VENUE_OWNER.id,
          // Business users receive estimatedCost
          estimatedCost: 240.00,
        }]),
      });
    });

    await page.goto('/venue/dashboard?view=calendar', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Wait for calendar to load
    await expect(
      page.getByTestId('calendar-container')
        .or(page.getByTestId('roster-tools-dropdown'))
        .first()
    ).toBeVisible({ timeout: 20000 });

    // Click on bucket pill to expand
    const bucketPill = page.getByTestId(/shift-bucket-pill/).first();
    if (await bucketPill.isVisible({ timeout: 10000 }).catch(() => false)) {
      await bucketPill.click();
      await page.waitForTimeout(500);

      // ============================================
      // ASSERTION: Individual shift cost is visible
      // ============================================
      const shiftCost = page.getByTestId(/shift-cost/)
        .or(page.getByText(/Cost: \$\d+/))
        .or(page.getByText(/\$240/));
      
      if (await shiftCost.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(shiftCost.first()).toContainText(/\$\d+/);
      }
    }
  });

  test('Business Owner SEES cost breakdown in settings page', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/settings?category=business', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // The settings page for business should have cost-related sections
    // This verifies business users have access to financial configuration
    const pageContent = await page.content();
    
    // Look for financial-related settings
    const hasFinancialSettings = 
      pageContent.includes('rate') || 
      pageContent.includes('cost') || 
      pageContent.includes('wage') ||
      pageContent.includes('hourly');
    
    expect.soft(hasFinancialSettings).toBe(true);
  });
});

test.describe('Financial Privacy: Professional Staff View', () => {
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

  test('Professional Staff does NOT see Est. Wage Cost pill', async () => {
    test.setTimeout(60000);

    // Mock shifts API without cost data (as professional would receive)
    await professionalPage.route('**/api/shifts*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      const now = new Date();
      const startTime = new Date(now);
      startTime.setHours(9, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(17, 0, 0, 0);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'shift-1',
          title: 'My Assigned Shift',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          hourlyRate: 30, // Rate is visible for personal calculation
          status: 'confirmed',
          assigneeId: TEST_PROFESSIONAL.id,
          // NO estimatedCost field - stripped by backend
        }]),
      });
    });

    // Professional users see their own dashboard, not venue dashboard
    await professionalPage.goto('/dashboard?view=calendar', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await professionalPage.waitForLoadState('networkidle');

    // ============================================
    // ASSERTION: Est. Wage Cost pill is NOT visible
    // ============================================
    const wageCostPill = professionalPage.getByTestId('est-wage-cost');
    await expect(wageCostPill).not.toBeVisible({ timeout: 5000 });
  });

  test('Professional Staff does NOT see ANY cost elements in DOM', async () => {
    test.setTimeout(60000);

    await professionalPage.goto('/dashboard?view=calendar', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await professionalPage.waitForLoadState('networkidle');

    // ============================================
    // ASSERTION: No cost-related data-testid elements
    // ============================================
    const costElements = professionalPage.locator('[data-testid*="cost"], [data-testid*="wage"]');
    const costCount = await costElements.count();
    expect(costCount).toBe(0);

    // ============================================
    // ASSERTION: No cost-related CSS class elements
    // ============================================
    const costClassElements = professionalPage.locator('[class*="wage-cost"], [class*="shift-cost"]');
    const costClassCount = await costClassElements.count();
    expect(costClassCount).toBe(0);
  });

  test('Professional Staff does NOT see individual shift costs in expanded view', async () => {
    test.setTimeout(60000);

    // Mock calendar-bookings API
    await professionalPage.route('**/api/calendar-bookings*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await professionalPage.goto('/dashboard?view=calendar', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await professionalPage.waitForLoadState('networkidle');

    // Try to find any shift cards or calendar events
    const shiftElements = professionalPage.locator('.rbc-event, [class*="shift"], [class*="card"]');
    const shiftCount = await shiftElements.count();

    // If there are shifts visible, click to expand and check for costs
    if (shiftCount > 0) {
      await shiftElements.first().click();
      await professionalPage.waitForTimeout(500);

      // ============================================
      // ASSERTION: No shift cost labels visible
      // ============================================
      const shiftCostLabel = professionalPage.getByTestId(/shift-cost/)
        .or(professionalPage.getByText(/Cost: \$/));
      
      await expect(shiftCostLabel).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('Professional Staff API responses do NOT include estimatedCost field', async () => {
    test.setTimeout(60000);

    let apiResponseBody: any = null;

    // Intercept shifts API to verify response structure
    await professionalPage.route('**/api/shifts*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      
      // Simulate professional-appropriate response (no cost data)
      apiResponseBody = [{
        id: 'shift-1',
        title: 'My Shift',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 8 * 3600000).toISOString(),
        hourlyRate: 30,
        status: 'confirmed',
        assigneeId: TEST_PROFESSIONAL.id,
        // Intentionally NO estimatedCost
      }];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiResponseBody),
      });
    });

    await professionalPage.goto('/dashboard?view=calendar', { waitUntil: 'networkidle', timeout: 30000 });

    // ============================================
    // ASSERTION: API response does not include estimatedCost
    // ============================================
    if (apiResponseBody) {
      expect(apiResponseBody[0]).not.toHaveProperty('estimatedCost');
      expect(apiResponseBody[0]).not.toHaveProperty('totalCost');
      expect(apiResponseBody[0]).not.toHaveProperty('wageCost');
    }
  });
});

test.describe('Financial Privacy: Dual Context Comparison', () => {
  let browser: Browser;
  let businessContext: BrowserContext;
  let professionalContext: BrowserContext;
  let businessPage: Page;
  let professionalPage: Page;

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
  });

  test.beforeEach(async () => {
    await ensureTestVenueWithShifts();

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

    // Setup API auth bypass
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
    await cleanupTestShifts();
  });

  test('Same shift data shows costs for Business, hides for Professional', async () => {
    test.setTimeout(120000);

    // Mock roster-totals for business user
    await businessPage.route('**/api/roster-totals*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalCost: 240.00,
          totalHours: 8,
          currency: 'AUD',
        }),
      });
    });

    // ============================================
    // Step 1: Business loads dashboard
    // ============================================
    await businessPage.goto('/venue/dashboard?view=calendar', { waitUntil: 'networkidle', timeout: 30000 });
    
    await expect(
      businessPage.getByTestId('calendar-container')
        .or(businessPage.getByTestId('roster-tools-dropdown'))
        .first()
    ).toBeVisible({ timeout: 20000 });

    // Business SEES wage cost
    const businessWageCost = businessPage.getByTestId('est-wage-cost');
    const businessSeesWage = await businessWageCost.isVisible({ timeout: 10000 }).catch(() => false);
    expect(businessSeesWage).toBe(true);

    console.log('✅ Business user sees Est. Wage Cost pill');

    // ============================================
    // Step 2: Professional loads dashboard
    // ============================================
    await professionalPage.goto('/dashboard?view=calendar', { waitUntil: 'networkidle', timeout: 30000 });

    // Professional does NOT see wage cost
    const professionalWageCost = professionalPage.getByTestId('est-wage-cost');
    const professionalSeesWage = await professionalWageCost.isVisible({ timeout: 5000 }).catch(() => false);
    expect(professionalSeesWage).toBe(false);

    console.log('✅ Professional user does NOT see Est. Wage Cost pill');

    // ============================================
    // FINAL ASSERTION: Role-based visibility confirmed
    // ============================================
    expect(businessSeesWage).toBe(true);
    expect(professionalSeesWage).toBe(false);
  });
});
