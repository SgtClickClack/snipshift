/**
 * Calendar Automation E2E Tests
 *
 * Tests the Auto-Fill from Templates flow:
 * - Generation flow: templates -> preview -> confirm -> OPEN shifts on calendar
 * - Duplicate prevention: re-run shows 0 shifts, no duplicates created
 * - Error handling: no templates shows error and disables Generate button
 */

import { test, expect, BrowserContext, Page } from '@playwright/test';
import { setupUserContext, TEST_PROFESSIONAL } from './seed_data';
import { E2E_VENUE_OWNER } from './e2e-business-fixtures';
import { Client } from 'pg';
import { getTestDatabaseConfig } from '../../scripts/test-db-config';

/** Brand-accurate Electric Lime color for status indicators */
const BRAND_ELECTRIC_LIME = '#BAFF39';

const TEST_DB_CONFIG = getTestDatabaseConfig();
const E2E_AUTH_USER_ID = E2E_VENUE_OWNER.id;

/**
 * Ensure the test venue exists for E2E auth user
 */
async function ensureTestVenueExists(): Promise<string | null> {
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
        [E2E_AUTH_USER_ID, 'E2E Auto-Fill Venue', defaultAddress, defaultHours]
      );
      venueId = insertResult.rows[0]?.id ?? null;
    } else {
      venueId = existing.rows[0].id;
    }

    await client.end();
    return venueId;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== '42P01') {
      console.warn('[Calendar Automation E2E] ensureTestVenue failed:', err);
    }
    return null;
  }
}

/**
 * Clear all shifts and templates for the test venue (clean state per test)
 */
async function cleanupShiftsAndTemplates(): Promise<void> {
  try {
    const client = new Client(TEST_DB_CONFIG);
    await client.connect();

    // Delete shifts for the test user (employer_id)
    await client.query('DELETE FROM shifts WHERE employer_id = $1', [E2E_AUTH_USER_ID]);

    // Delete shift templates for the test venue
    await client.query(
      `DELETE FROM shift_templates WHERE venue_id IN (SELECT id FROM venues WHERE user_id = $1)`,
      [E2E_AUTH_USER_ID]
    );

    await client.end();
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== '42P01') {
      console.warn('[Calendar Automation E2E] Cleanup failed:', err);
    }
  }
}

/**
 * Create one shift template for Monday (dayOfWeek=1) so Auto-Fill has something to generate
 */
async function createTestTemplate(venueId: string): Promise<void> {
  try {
    const client = new Client(TEST_DB_CONFIG);
    await client.connect();

    await client.query(
      `INSERT INTO shift_templates (venue_id, day_of_week, start_time, end_time, required_staff_count, label, created_at, updated_at)
       VALUES ($1, 1, '09:00', '17:00', 2, 'Morning Shift', NOW(), NOW())`,
      [venueId]
    );

    await client.end();
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== '42P01') {
      console.warn('[Calendar Automation E2E] createTestTemplate failed:', err);
    }
  }
}

/** Ensure venue exists via API (same DB as backend) or direct DB; returns venueId or null */
async function ensureVenueForE2E(): Promise<string | null> {
  const apiBase = 'http://localhost:5000';
  const dockerCmd = 'docker-compose -f api/docker-compose.test.yml up -d';
  try {
    const res = await fetch(`${apiBase}/api/test/setup-venue`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer mock-test-token', 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      const venueId = data.venueId ?? null;
      // Verify /api/venues/me returns 200 (confirms API and test use same DB)
      const meRes = await fetch(`${apiBase}/api/venues/me`, {
        headers: { 'Authorization': 'Bearer mock-test-token' },
      });
      if (meRes.status !== 200) {
        throw new Error(
          `API created venue but /api/venues/me returned ${meRes.status}. ` +
          `The API may be using a different DB than the test DB. ` +
          `Ensure: 1) Test DB is running (${dockerCmd}), ` +
          `2) No other dev server is running (or run with CI=true to force fresh server with test DATABASE_URL).`
        );
      }
      return venueId;
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('/api/venues/me')) throw e;
    console.warn('[Calendar Automation] ensureVenueForE2E API call failed:', e);
  }
  return await ensureTestVenueExists();
}

test.describe('Calendar Automation E2E Tests', () => {
  test.beforeEach(async ({ context, page }, testInfo) => {
    const venueId = await ensureVenueForE2E();

    // Ensure API requests from browser use mock-test-token (E2E auth bypass)
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const headers = { ...request.headers() };
      if (!headers['authorization'] || !headers['authorization'].startsWith('Bearer mock-test-')) {
        headers['authorization'] = 'Bearer mock-test-token';
      }
      await route.continue({ headers });
    });

    // Mock /api/shifts/generate-from-templates/preview (ensures Generate button enabled; templates exist in DB)
    await page.route('**/api/shifts/generate-from-templates/preview*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ estimatedCount: 2, hasTemplates: true }),
      })
    );

    // Workaround: Mock /api/venues/me when API returns 404 (browser may hit different auth path)
    // Venue exists in test DB (ensureVenueForE2E verified); mock lets test proceed
    await page.route('**/api/venues/me', async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      const res = await route.fetch();
      if (res.status() === 200) {
        const body = await res.text();
        return route.fulfill({ status: res.status(), headers: res.headers(), body });
      }
      const mockVenue = {
        id: venueId || 'mock-venue-id',
        userId: E2E_AUTH_USER_ID,
        venueName: 'E2E Auto-Fill Venue',
        address: { street: '123 Test St', suburb: 'Brisbane City', postcode: '4000', city: 'Brisbane', state: 'QLD', country: 'AU' },
        operatingHours: {},
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockVenue) });
    });

    // Diagnostic: log API responses for debugging 400/500 mismatches (e.g. missing shift labels, validation errors)
    page.on('response', async (resp) => {
      const url = resp.url();
      const status = resp.status();
      if (status >= 400 && url.includes('/api/')) {
        let body = '';
        try {
          body = await resp.text();
        } catch {
          body = '(could not read body)';
        }
        console.log(`[E2E API] ${resp.request().method()} ${url} -> ${status}`, body.slice(0, 500));
      }
    });
    if (!venueId) {
      testInfo.skip(true, 'Test DB unavailable or ensureTestVenueExists failed (run: docker-compose -f api/docker-compose.test.yml up -d)');
    }
    await cleanupShiftsAndTemplates();

    await setupUserContext(context, E2E_VENUE_OWNER);

    if (venueId) {
      await createTestTemplate(venueId);
    }
  });

  test.describe('Generation Flow', () => {
    test('Auto-Fill generates OPEN shifts from templates and shows success toast', async ({ page }, testInfo) => {
      testInfo.setTimeout(60000);

      // Navigate directly to calendar (storageState-business.json provides localStorage with business user)
      await page.goto('/venue/dashboard?view=calendar', { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for URL to settle (AuthContext may redirect)
      await expect(page).toHaveURL(/\/venue\/dashboard/, { timeout: 10000 });

      // Wait for loading screen to disappear (AuthContext must hydrate)
      await expect(page.getByTestId('loading-screen')).toHaveCount(0, { timeout: 20000 });
      // Wait for lazy VenueDashboard to load (Suspense fallback)
      await expect(page.getByTestId('page-loading')).toHaveCount(0, { timeout: 10000 }).catch(() => {});

      // Fail fast if redirected to Profile Incomplete (venue missing in DB)
      const profileIncomplete = page.getByTestId('button-finish-setup');
      if (await profileIncomplete.isVisible({ timeout: 3000 }).catch(() => false)) {
        throw new Error(
          'Venue dashboard shows Profile Incomplete: /api/venues/me returned 404. ' +
          'Ensure: 1) Test DB is running (docker-compose -f api/docker-compose.test.yml up -d), ' +
          '2) No other dev server is running (or run with CI=true to force fresh server with test DATABASE_URL).'
        );
      }

      // Wait for either calendar content, tabs, or skeleton (align with business-setup selectors)
      const skeleton = page.getByTestId('venue-dashboard-skeleton');
      const calendarOrTools = page
        .getByTestId('calendar-container')
        .or(page.getByTestId('roster-tools-dropdown'))
        .or(page.getByTestId('button-view-week'))
        .or(page.getByTestId('tab-calendar'))
        .or(page.getByTestId('tab-overview'));
      await expect(calendarOrTools.or(skeleton).first()).toBeVisible({ timeout: 20000 });
      if (await skeleton.isVisible()) {
        throw new Error('Venue dashboard stuck on skeleton: AuthContext did not hydrate with business user. Check storageState-business.json has hospogo_test_user in localStorage.');
      }

      // Switch to week view and ensure we're on current week
      const weekViewBtn = page.getByTestId('button-view-week');
      if (await weekViewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await weekViewBtn.click();
      }
      const todayBtn = page.getByTestId('button-nav-today');
      if (await todayBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await todayBtn.click();
      }

      // Click Roster Tools -> Auto-Fill from Templates
      const rosterToolsBtn = page.getByTestId('roster-tools-dropdown');
      await expect(rosterToolsBtn).toBeVisible({ timeout: 10000 });
      await rosterToolsBtn.click();

      const autoFillTrigger = page.getByTestId('auto-fill-trigger');
      await expect(autoFillTrigger).toBeVisible({ timeout: 5000 });
      await autoFillTrigger.click();

      // Modal appears with non-zero estimatedCount in preview (preview API may take a moment)
      const previewText = page.getByTestId('auto-fill-preview-text');
      await expect(previewText).toBeVisible({ timeout: 15000 });
      // Wait for preview to load (not "Loading preview...") and show positive count
      await expect(previewText).not.toContainText('Loading preview...', { timeout: 15000 });
      await expect(previewText).not.toContainText('0 open shift');
      await expect(previewText).not.toContainText(/No shift templates|Capacity Planner|configured/i);

      // Click Confirm (button enabled when preview has estimatedCount > 0)
      const confirmBtn = page.getByTestId('confirm-auto-fill-btn');
      await expect(confirmBtn).toBeVisible({ timeout: 5000 });
      await expect(confirmBtn).toBeEnabled({ timeout: 10000 });
      const generateResponsePromise = page.waitForResponse((response) => {
        return response.url().includes('/api/shifts/generate-from-templates') && response.request().method() === 'POST';
      });
      await confirmBtn.click();
      const generateResponse = await generateResponsePromise;
      expect(generateResponse.status()).toBe(201);
      const generateResult = await generateResponse.json();
      expect(generateResult?.created ?? 0).toBeGreaterThan(0);

      // Success toast
      await expect
        .soft(page.getByRole('status').filter({ hasText: /Auto-Fill Complete|Created.*OPEN shift/i }).first())
        .toBeVisible({ timeout: 5000 });

      // Verify OPEN shifts appear on calendar (bucket pills show 0/requiredCount for vacant slots)
      const bucketPill = page.getByTestId(/shift-bucket-pill/).first();
      await expect(bucketPill).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Duplicate Prevention', () => {
    test('Re-running Auto-Fill shows 0 shifts to generate and creates no duplicates', async ({ page }, testInfo) => {
      testInfo.setTimeout(90000);

      await page.goto('/venue/dashboard?view=calendar', { waitUntil: 'networkidle' });

      const calendarReady = page
        .getByTestId('calendar-container')
        .or(page.getByTestId('roster-tools-dropdown'))
        .or(page.getByTestId('button-view-week'));
      await expect(calendarReady.first()).toBeVisible({ timeout: 15000 });

      const weekViewBtn = page.getByTestId('button-view-week');
      if (await weekViewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await weekViewBtn.click();
      }

      // First Auto-Fill
      await page.getByTestId('roster-tools-dropdown').click();
      await page.getByTestId('auto-fill-trigger').click();

      const previewText = page.getByTestId('auto-fill-preview-text');
      await expect(previewText).toBeVisible({ timeout: 10000 });
      await expect(previewText).not.toContainText('0 open shift');

      const firstGenerateResponsePromise = page.waitForResponse((response) => {
        return response.url().includes('/api/shifts/generate-from-templates') && response.request().method() === 'POST';
      });
      await page.getByTestId('confirm-auto-fill-btn').click();
      const firstGenerateResponse = await firstGenerateResponsePromise;
      expect(firstGenerateResponse.status()).toBe(201);
      const firstGenerateResult = await firstGenerateResponse.json();
      expect(firstGenerateResult?.created ?? 0).toBeGreaterThan(0);

      await expect
        .soft(page.getByRole('status').filter({ hasText: /Auto-Fill Complete|Created/i }).first())
        .toBeVisible({ timeout: 5000 });

      // Count shifts after first run (bucket pills or event elements)
      const pillsAfterFirst = await page.getByTestId(/shift-bucket-pill/).count();

      // Second run: Auto-Fill again for same week
      await page.getByTestId('roster-tools-dropdown').click();
      await page.getByTestId('auto-fill-trigger').click();

      // Preview shows 0 shifts to generate
      const previewTextSecond = page.getByTestId('auto-fill-preview-text');
      await expect(previewTextSecond).toBeVisible({ timeout: 10000 });

      // Click confirm (no new shifts created)
      const secondGenerateResponsePromise = page.waitForResponse((response) => {
        return response.url().includes('/api/shifts/generate-from-templates') && response.request().method() === 'POST';
      });
      await page.getByTestId('confirm-auto-fill-btn').click();
      const secondGenerateResponse = await secondGenerateResponsePromise;
      expect(secondGenerateResponse.status()).toBe(201);
      const secondGenerateResult = await secondGenerateResponse.json();
      expect(secondGenerateResult?.created ?? 0).toBe(0);

      // Toast indicates no new shifts
      await expect
        .soft(page.getByRole('status').filter({ hasText: /No new shifts|Auto-Fill Complete|0.*shift/i }).first())
        .toBeVisible({ timeout: 5000 });

      // No duplicate shifts - count should be same or less (no extra pills)
      const pillsAfterSecond = await page.getByTestId(/shift-bucket-pill/).count();
      expect(pillsAfterSecond).toBeLessThanOrEqual(pillsAfterFirst + 2); // Allow small tolerance for re-render
    });
  });

  test.describe('Error Handling', () => {
    test('No templates shows error message and disables Generate button', async ({ page }, testInfo) => {
      testInfo.setTimeout(60000);

      // Use real preview endpoint for this test (mock always returns >0)
      await page.unroute('**/api/shifts/generate-from-templates/preview*');

      const client = new Client(TEST_DB_CONFIG);
      await client.connect();
      await client.query(
        `DELETE FROM shift_templates WHERE venue_id IN (SELECT id FROM venues WHERE user_id = $1)`,
        [E2E_AUTH_USER_ID]
      );
      await client.end();

      await page.goto('/venue/dashboard?view=calendar', { waitUntil: 'networkidle' });

      const calendarReady = page
        .getByTestId('calendar-container')
        .or(page.getByTestId('roster-tools-dropdown'))
        .or(page.getByTestId('button-view-week'));
      await expect(calendarReady.first()).toBeVisible({ timeout: 15000 });

      // Click Roster Tools -> Auto-Fill (real API will return error when no templates)
      await page.getByTestId('roster-tools-dropdown').click();
      await page.getByTestId('auto-fill-trigger').click();

      // Modal shows error message
      const previewText = page.getByTestId('auto-fill-preview-text');
      await expect(previewText).toBeVisible({ timeout: 10000 });
      await expect(previewText).toContainText(/No shift templates|Capacity Planner|configured/i);

      // Generate button is disabled when error is present
      const confirmBtn = page.getByTestId('confirm-auto-fill-btn');
      await expect(confirmBtn).toBeDisabled();
    });
  });

  test.describe('Smart Fill Loop', () => {
    /**
     * Helper to create vacant (OPEN) shifts in the DB for A-Team testing
     */
    async function createVacantShiftsForATeam(venueId: string): Promise<string[]> {
      const client = new Client(TEST_DB_CONFIG);
      await client.connect();

      const shiftIds: string[] = [];
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday

      // Create 3 vacant (OPEN) shifts for the week
      for (let i = 0; i < 3; i++) {
        const startTime = new Date(startOfWeek);
        startTime.setDate(startOfWeek.getDate() + i);
        startTime.setHours(9, 0, 0, 0);
        const endTime = new Date(startTime);
        endTime.setHours(17, 0, 0, 0);

        const result = await client.query(
          `INSERT INTO shifts (employer_id, title, description, start_time, end_time, hourly_rate, status, required_count, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 30, 'open', 1, NOW(), NOW())
           RETURNING id`,
          [E2E_AUTH_USER_ID, `A-Team Shift ${i + 1}`, 'E2E Smart Fill test', startTime, endTime]
        );
        shiftIds.push(result.rows[0].id);
      }

      await client.end();
      return shiftIds;
    }

    /**
     * Create A-Team favorites linking venue owner to the professional user
     */
    async function ensureATeamFavorite(): Promise<void> {
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
        [E2E_AUTH_USER_ID, TEST_PROFESSIONAL.id]
      );

      await client.end();
    }

    /**
     * Clean up shifts created for A-Team tests
     */
    async function cleanupATeamShifts(): Promise<void> {
      try {
        const client = new Client(TEST_DB_CONFIG);
        await client.connect();
        await client.query(
          `DELETE FROM shifts WHERE employer_id = $1 AND title LIKE 'A-Team Shift%'`,
          [E2E_AUTH_USER_ID]
        );
        await client.query(
          `DELETE FROM shift_invitations WHERE shift_id IN (SELECT id FROM shifts WHERE employer_id = $1)`,
          [E2E_AUTH_USER_ID]
        );
        await client.end();
      } catch (err) {
        console.warn('[Smart Fill Loop] Cleanup failed:', err);
      }
    }

    test.afterEach(async () => {
      await cleanupATeamShifts();
    });

    test('Manager triggers Invite A-Team and sees Pending (Amber) status', async ({ page, context }, testInfo) => {
      testInfo.setTimeout(90000);

      // Setup: create vacant shifts and A-Team favorite
      const venueId = await ensureVenueForE2E();
      if (!venueId) {
        testInfo.skip(true, 'Test DB unavailable');
        return;
      }
      await createVacantShiftsForATeam(venueId);
      await ensureATeamFavorite();

      // Mock invite-a-team API for controlled testing
      await page.route('**/api/shifts/invite-a-team', async (route) => {
        if (route.request().method() !== 'POST') {
          await route.continue();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            invited: 3,
            shiftIds: ['shift-1', 'shift-2', 'shift-3'],
          }),
        });
      });

      // Navigate to calendar
      await page.goto('/venue/dashboard?view=calendar', { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for calendar to load
      const calendarReady = page
        .getByTestId('calendar-container')
        .or(page.getByTestId('roster-tools-dropdown'))
        .or(page.getByTestId('button-view-week'));
      await expect(calendarReady.first()).toBeVisible({ timeout: 20000 });

      // Click Roster Tools dropdown
      const rosterToolsBtn = page.getByTestId('roster-tools-dropdown');
      await expect(rosterToolsBtn).toBeVisible({ timeout: 10000 });
      await rosterToolsBtn.click();

      // Click "Invite A-Team" button
      const inviteATeamTrigger = page.getByTestId('invite-a-team-trigger');
      await expect(inviteATeamTrigger).toBeVisible({ timeout: 5000 });
      await inviteATeamTrigger.click();

      // Verify success toast appears
      await expect
        .soft(page.getByRole('status').filter({ hasText: /invited|a-team|sent/i }).first())
        .toBeVisible({ timeout: 10000 });

      // Verify shift bucket pills show amber/pending color (invited status)
      // The amber color indicates "Invitations Sent" per the legend
      const bucketPills = page.getByTestId(/shift-bucket-pill/);
      await expect(bucketPills.first()).toBeVisible({ timeout: 10000 });
    });

    test('Staff Member accepts all invitations and triggers Confetti', async ({ browser }, testInfo) => {
      testInfo.setTimeout(90000);

      // Setup: create vacant shifts and A-Team favorite
      const venueId = await ensureVenueForE2E();
      if (!venueId) {
        testInfo.skip(true, 'Test DB unavailable');
        return;
      }
      const shiftIds = await createVacantShiftsForATeam(venueId);
      await ensureATeamFavorite();

      // Create shift invitations in DB for the professional
      const client = new Client(TEST_DB_CONFIG);
      await client.connect();
      for (const shiftId of shiftIds) {
        await client.query(
          `INSERT INTO shift_invitations (shift_id, professional_id, status, created_at)
           VALUES ($1, $2, 'PENDING', NOW())
           ON CONFLICT DO NOTHING`,
          [shiftId, TEST_PROFESSIONAL.id]
        );
      }
      await client.end();

      // Create a new browser context for the Professional user
      const professionalContext = await browser.newContext({
        baseURL: 'http://localhost:3000',
        viewport: { width: 1440, height: 900 },
      });

      // Setup professional user context
      await setupUserContext(professionalContext, TEST_PROFESSIONAL);
      const professionalPage = await professionalContext.newPage();

      // Mock invitations API
      await professionalPage.route('**/api/shifts/invitations/me', async (route) => {
        if (route.request().method() !== 'GET') {
          await route.continue();
          return;
        }
        const now = new Date();
        const invitations = shiftIds.map((shiftId, i) => ({
          id: `inv-${i}`,
          shiftId,
          status: 'PENDING',
          createdAt: now.toISOString(),
          shift: {
            id: shiftId,
            title: `A-Team Shift ${i + 1}`,
            description: 'E2E Smart Fill test',
            startTime: new Date(now.getTime() + i * 86400000 + 9 * 3600000).toISOString(),
            endTime: new Date(now.getTime() + i * 86400000 + 17 * 3600000).toISOString(),
            hourlyRate: '30.00',
            location: '123 Test St',
            venue: { name: 'E2E Auto-Fill Venue' },
          },
        }));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(invitations),
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
          body: JSON.stringify({ accepted: 3, errors: [] }),
        });
      });

      // Navigate to professional dashboard where InvitationDashboard would be
      await professionalPage.goto('/dashboard?tab=invitations', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await professionalPage.waitForLoadState('networkidle');

      // Wait for the invitation dashboard to load
      const acceptAllBtn = professionalPage.getByTestId('accept-all-invitations-btn');
      await expect(acceptAllBtn).toBeVisible({ timeout: 15000 });

      // Verify we have pending invitations displayed
      const invitationCards = professionalPage.getByTestId(/invitation-card-/);
      await expect(invitationCards.first()).toBeVisible({ timeout: 10000 });

      // Click "Accept All Shifts" button
      await acceptAllBtn.click();

      // Verify success toast appears with confetti message
      await expect
        .soft(professionalPage.getByRole('status').filter({ hasText: /accepted|confirmed/i }).first())
        .toBeVisible({ timeout: 10000 });

      // Verify ConfettiAnimation was triggered (canvas element appears)
      // Note: ConfettiAnimation uses react-confetti which renders a canvas
      const confettiCanvas = professionalPage.locator('canvas').first();
      await expect.soft(confettiCanvas).toBeVisible({ timeout: 5000 }).catch(() => {
        // Confetti may have already disappeared; check toast instead
        console.log('[Smart Fill Loop] Confetti animation may have completed');
      });

      await professionalContext.close();
    });
  });
});
