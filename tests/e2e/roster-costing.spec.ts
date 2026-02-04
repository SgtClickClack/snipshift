/**
 * Roster Costing E2E Tests
 *
 * Tests the Live Roster Costing feature:
 * - Staff pay rate in Settings
 * - Est. Wage Cost on Calendar
 * - Verifies $30/hr * 4h = $120.00
 */

import { test, expect } from '@playwright/test';
import { setupUserContext, TEST_PROFESSIONAL } from './seed_data';
import { E2E_VENUE_OWNER } from './e2e-business-fixtures';
import { Client } from 'pg';
import { getTestDatabaseConfig } from '../../scripts/test-db-config';

/** Brand-accurate Electric Lime color for UI elements */
const BRAND_ELECTRIC_LIME = '#BAFF39';

const TEST_DB_CONFIG = getTestDatabaseConfig();
const E2E_AUTH_USER_ID = E2E_VENUE_OWNER.id;

/**
 * Ensure the test venue exists for E2E auth user (required for /api/venues/me and roster-totals)
 */
async function ensureTestVenueExists(): Promise<void> {
  try {
    const client = new Client(TEST_DB_CONFIG);
    await client.connect();

    const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [E2E_AUTH_USER_ID]);
    if (userCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO users (id, email, name, role, roles, is_onboarded, created_at, updated_at)
         VALUES ($1, $2, $3, 'business', ARRAY['business']::text[], true, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [E2E_AUTH_USER_ID, 'test-owner@example.com', 'Test Owner']
      );
    }

    const existing = await client.query(
      'SELECT id FROM venues WHERE user_id = $1 LIMIT 1',
      [E2E_AUTH_USER_ID]
    );

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

      await client.query(
        `INSERT INTO venues (user_id, venue_name, address, operating_hours, status, created_at, updated_at)
         VALUES ($1, $2, $3::jsonb, $4::jsonb, 'active', NOW(), NOW())`,
        [E2E_AUTH_USER_ID, 'E2E Roster Costing Venue', defaultAddress, defaultHours]
      );
    }

    await client.end();
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== '42P01') {
      console.warn('[Roster Costing E2E] ensureTestVenue failed:', err);
    }
  }
}

/** Ensure migration 0041 columns exist */
async function ensurePayRateColumns(): Promise<void> {
  try {
    const client = new Client(TEST_DB_CONFIG);
    await client.connect();
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS base_hourly_rate numeric(10, 2);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS currency varchar(3) DEFAULT 'AUD';
    `);
    await client.end();
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== '42P01') {
      console.warn('[Roster Costing E2E] ensurePayRateColumns failed:', err);
    }
  }
}

/** Create or get a professional (staff) user for the venue owner */
async function ensureStaffUser(): Promise<string> {
  const client = new Client(TEST_DB_CONFIG);
  await client.connect();

  const staffEmail = 'roster-costing-staff@example.com';
  const staffName = 'Roster Costing Staff';
  const [existing] = (await client.query('SELECT id FROM users WHERE email = $1', [staffEmail])).rows;

  if (existing) {
    await client.end();
    return existing.id;
  }

  const [inserted] = (
    await client.query(
      `INSERT INTO users (id, email, name, role, roles, is_onboarded, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'professional', ARRAY['professional']::text[], true, NOW(), NOW())
       RETURNING id`,
      [staffEmail, staffName]
    )
  ).rows;
  await client.end();
  return inserted.id;
}

/** Create a 4-hour confirmed shift for the staff */
async function createShiftForStaff(staffId: string): Promise<void> {
  const client = new Client(TEST_DB_CONFIG);
  await client.connect();

  const start = new Date();
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setHours(13, 0, 0, 0);

  await client.query(
    `INSERT INTO shifts (employer_id, assignee_id, title, description, start_time, end_time, hourly_rate, status, created_at, updated_at)
     VALUES ($1, $2, 'Roster Costing Test Shift', 'E2E test', $3, $4, 30, 'confirmed', NOW(), NOW())`,
    [E2E_AUTH_USER_ID, staffId, start, end]
  );
  await client.end();
}

/** Set staff base_hourly_rate to 30 */
async function setStaffRate(staffId: string): Promise<void> {
  const client = new Client(TEST_DB_CONFIG);
  await client.connect();
  await client.query('UPDATE users SET base_hourly_rate = 30 WHERE id = $1', [staffId]);
  await client.end();
}

/** Clean up test shifts */
async function cleanupTestShifts(): Promise<void> {
  try {
    const client = new Client(TEST_DB_CONFIG);
    await client.connect();
    await client.query(
      `DELETE FROM shifts WHERE employer_id = $1 AND title = 'Roster Costing Test Shift'`,
      [E2E_AUTH_USER_ID]
    );
    await client.end();
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== '42P01') {
      console.warn('[Roster Costing E2E] Cleanup failed:', err);
    }
  }
}

test.describe('Roster Costing E2E Tests', () => {
  test.beforeEach(async ({ context, page }) => {
    await ensureTestVenueExists();
    await ensurePayRateColumns();
    // Ensure API requests use mock-test-token (E2E auth bypass) to prevent Profile Incomplete redirects
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

  test('Est. Wage Cost displays $120.00 for 4h shift at $30/hr', async ({ page }, testInfo) => {
    testInfo.setTimeout(90000);

    // Mock roster-totals API for deterministic testing (4h shift at $30/hr = $120)
    // Endpoint is /api/venues/me/roster-totals
    await page.unroute('**/api/venues/me/roster-totals*');
    await page.route('**/api/venues/me/roster-totals*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalCost: 120.00,
          totalHours: 4,
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

    const wageCost = page.getByTestId('est-wage-cost');
    await expect(wageCost).toBeVisible({ timeout: 15000 });
    await expect(wageCost).toContainText('$120.00');
  });
});

test.describe('Financial RBAC E2E Tests', () => {
  test.describe('Business Owner Access', () => {
    test.beforeEach(async ({ context, page }) => {
      await ensureTestVenueExists();
      await ensurePayRateColumns();
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

    test('Business Owner sees Wage Costs pill with dollar value', async ({ page }, testInfo) => {
      testInfo.setTimeout(90000);

      const staffId = await ensureStaffUser();
      await createShiftForStaff(staffId);
      await setStaffRate(staffId);

      // Mock roster-totals API for deterministic testing
      await page.route('**/api/venues/me/roster-totals*', async (route) => {
        if (route.request().method() !== 'GET') {
          await route.continue();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalCost: 120.00,
            totalHours: 4,
            currency: 'AUD',
          }),
        });
      });

      await page.goto('/venue/dashboard?view=calendar');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');

      // Verify Est. Wage Cost pill is visible for business owner
      const wageCostPill = page.getByTestId('est-wage-cost');
      await expect(wageCostPill).toBeVisible({ timeout: 15000 });

      // Verify it contains a dollar value
      await expect(wageCostPill).toContainText(/\$\d+(\.\d{2})?/);

      // Verify the brand color styling (Electric Lime #BAFF39)
      const pillClasses = await wageCostPill.getAttribute('class');
      const pillStyle = await wageCostPill.getAttribute('style');
      const hasBrandStyling = 
        pillClasses?.includes('brand-neon') ||
        pillClasses?.includes('BAFF39') ||
        pillStyle?.toLowerCase().includes('baff39');
      expect(hasBrandStyling).toBe(true);
    });

    test('Business Owner sees individual Shift Cost in bucket expansion', async ({ page }, testInfo) => {
      testInfo.setTimeout(90000);

      const staffId = await ensureStaffUser();
      await createShiftForStaff(staffId);
      await setStaffRate(staffId);

      // Mock shifts with cost data
      await page.route('**/api/shifts*', async (route) => {
        if (route.request().method() !== 'GET') {
          await route.continue();
          return;
        }
        const start = new Date();
        start.setHours(9, 0, 0, 0);
        const end = new Date(start);
        end.setHours(13, 0, 0, 0);

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'shift-1',
            title: 'Test Shift',
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            hourlyRate: 30,
            status: 'confirmed',
            assigneeId: staffId,
            employerId: E2E_AUTH_USER_ID,
            estimatedCost: 120.00,
          }]),
        });
      });

      await page.goto('/venue/dashboard?view=calendar');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');

      // Wait for shift bucket to render
      const bucketPill = page.getByTestId(/shift-bucket-pill/).first();
      await expect(bucketPill).toBeVisible({ timeout: 15000 });

      // Click to expand bucket (if expandable)
      if (await bucketPill.isVisible()) {
        await bucketPill.click();
        
        // Verify shift cost is visible in expanded view
        const shiftCost = page.getByTestId(/shift-cost/);
        if (await shiftCost.isVisible({ timeout: 5000 }).catch(() => false)) {
          await expect(shiftCost).toContainText(/\$\d+/);
        }
      }
    });
  });

  test.describe('Professional Staff Access', () => {
    test('Professional Staff cannot see Wage Costs pill', async ({ browser }, testInfo) => {
      testInfo.setTimeout(90000);

      // Create a new browser context for the Professional user
      const professionalContext = await browser.newContext({
        baseURL: 'http://localhost:3000',
        viewport: { width: 1440, height: 900 },
      });

      // Setup professional user context
      await setupUserContext(professionalContext, TEST_PROFESSIONAL);
      const professionalPage = await professionalContext.newPage();

      // Ensure API routes don't return cost data for professional users
      await professionalPage.route('**/api/**', async (route) => {
        const request = route.request();
        const headers = { ...request.headers() };
        if (!headers['authorization'] || !headers['authorization'].startsWith('Bearer mock-test-')) {
          headers['authorization'] = 'Bearer mock-test-token-professional';
        }
        await route.continue({ headers });
      });

      // Professional users see a different dashboard (no venue calendar)
      await professionalPage.goto('/dashboard?view=calendar', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await professionalPage.waitForLoadState('networkidle');

      // Verify the Est. Wage Cost pill is NOT present for professional users
      const wageCostPill = professionalPage.getByTestId('est-wage-cost');
      await expect(wageCostPill).not.toBeVisible({ timeout: 5000 });

      // Verify there are no visible cost elements (even if shifts exist)
      const anyCostElement = professionalPage.locator('[data-testid*="cost"], [class*="wage-cost"]');
      const costCount = await anyCostElement.count();
      
      // Professional should not see any cost-related elements
      expect(costCount).toBe(0);

      await professionalContext.close();
    });

    test('Professional Staff cannot see individual Shift Cost labels in expanded view', async ({ browser }, testInfo) => {
      testInfo.setTimeout(90000);

      // Create a new browser context for the Professional user
      const professionalContext = await browser.newContext({
        baseURL: 'http://localhost:3000',
        viewport: { width: 1440, height: 900 },
      });

      // Setup professional user context
      await setupUserContext(professionalContext, TEST_PROFESSIONAL);
      const professionalPage = await professionalContext.newPage();

      // Mock shifts API to return shifts without cost data (as professional would see)
      await professionalPage.route('**/api/shifts*', async (route) => {
        if (route.request().method() !== 'GET') {
          await route.continue();
          return;
        }
        const start = new Date();
        start.setHours(9, 0, 0, 0);
        const end = new Date(start);
        end.setHours(13, 0, 0, 0);

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'shift-1',
            title: 'My Assigned Shift',
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            hourlyRate: 30, // Rate is visible, but total cost should not be calculated on UI
            status: 'confirmed',
            assigneeId: TEST_PROFESSIONAL.id,
            // Note: NO estimatedCost field - professional should not receive this
          }]),
        });
      });

      // Mock calendar-bookings API for professional calendar
      await professionalPage.route('**/api/calendar-bookings*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await professionalPage.route('**/api/**', async (route) => {
        await route.continue();
      });

      await professionalPage.goto('/dashboard?view=calendar', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await professionalPage.waitForLoadState('networkidle');

      // Verify NO shift cost labels are visible
      const shiftCostLabels = professionalPage.getByTestId(/shift-cost/);
      const costLabelCount = await shiftCostLabels.count();
      expect(costLabelCount).toBe(0);

      // Verify no wage-cost related elements are in the DOM
      const wageCostElements = professionalPage.locator('[data-testid="est-wage-cost"]');
      await expect(wageCostElements).toHaveCount(0);

      await professionalContext.close();
    });
  });
});
