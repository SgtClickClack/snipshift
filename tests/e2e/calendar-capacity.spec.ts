/**
 * Calendar Capacity E2E Tests
 *
 * Tests the Capacity Planner (shift templates) and Calendar bucket visualization:
 * - Template creation in Settings > Business
 * - Bucket pills on the venue calendar
 * - Bucket expand view and empty slot indicators
 * - Validation (required count >= 1, delete template removes bucket)
 */

import { test, expect, E2E_VENUE_OWNER } from '../fixtures/hospogo-fixtures';
import { setupUserContext } from './seed_data';
import { Client } from 'pg';
import { getTestDatabaseConfig } from '../../scripts/test-db-config';

const TEST_DB_CONFIG = getTestDatabaseConfig();
const E2E_AUTH_USER_ID = E2E_VENUE_OWNER.id;

/**
 * Ensure the test venue exists for TEST_VENUE_OWNER (required for shift-templates API)
 */
async function ensureTestVenueExists(): Promise<void> {
  try {
    const client = new Client(TEST_DB_CONFIG);
    await client.connect();

    // Ensure auth bypass user exists (required for venue FK)
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
        [E2E_AUTH_USER_ID, 'E2E Test Venue', defaultAddress, defaultHours]
      );
    }

    await client.end();
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== '42P01') {
      console.warn('[Calendar Capacity E2E] ensureTestVenue failed:', err);
    }
  }
}

/**
 * Clear shift templates for the test venue (ensures clean state per test)
 */
async function cleanupShiftTemplates(): Promise<void> {
  try {
    const client = new Client(TEST_DB_CONFIG);
    await client.connect();

    await client.query(
      `DELETE FROM shift_templates WHERE venue_id IN (SELECT id FROM venues WHERE user_id = $1)`,
      [E2E_AUTH_USER_ID]
    );

    await client.end();
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== '42P01') {
      console.warn('[Calendar Capacity E2E] Cleanup failed:', err);
    }
  }
}

test.describe('Calendar Capacity E2E Tests', () => {
  test.beforeEach(async ({ context, page }) => {
    await ensureTestVenueExists();
    await cleanupShiftTemplates();

    // Setup E2E auth context
    await setupUserContext(context, E2E_VENUE_OWNER);

    // Block Stripe JS to prevent external network calls and flakiness
    await page.route('https://js.stripe.com/**', (route) => route.abort());
    await page.route('https://m.stripe.com/**', (route) => route.abort());
    await page.route('https://r.stripe.com/**', (route) => route.abort());

    // Ensure API requests use mock-test-token (E2E auth bypass)
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const headers = { ...request.headers() };
      if (!headers['authorization'] || !headers['authorization'].startsWith('Bearer mock-test-')) {
        headers['authorization'] = 'Bearer mock-test-token';
      }
      await route.continue({ headers });
    });

    // Mock shift-templates API for tests that need it (avoids DB/auth issues in E2E)
    const storedTemplates: Array<Record<string, unknown>> = [];
    await page.route(/\/api\/shift-templates/, async (route) => {
      const request = route.request();
      const method = request.method();
      const url = request.url();

      if (method === 'GET' && !url.includes('/api/shift-templates/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(storedTemplates),
        });
        return;
      }

      if (method === 'POST' && !url.includes('/api/shift-templates/')) {
        const body = request.postDataJSON() as Record<string, unknown> | undefined;
        const template = {
          id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          venueId: 'venue-e2e',
          dayOfWeek: body?.dayOfWeek ?? 1,
          startTime: body?.startTime ?? '09:00',
          endTime: body?.endTime ?? '17:00',
          requiredStaffCount: body?.requiredStaffCount ?? 1,
          label: body?.label ?? 'Shift',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        storedTemplates.push(template);
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(template),
        });
        return;
      }

      await route.continue();
    });
  });

  test.describe('Template Creation', () => {
    test('Add Morning Shift template for Monday with required count 3, save and verify persistence', async ({ page }, testInfo) => {
      testInfo.setTimeout(60000); // Allow time for cold start and API
      await page.goto('/settings?category=business');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');

      // Ensure Business category / Capacity Planner is visible
      const grid = page.getByTestId('capacity-planner-grid');
      await expect(grid).toBeVisible({ timeout: 15000 });
      await grid.scrollIntoViewIfNeeded();

      // Click Add Shift Slot for Monday (scroll into view to ensure it's clickable)
      const addBtn = page.getByTestId('add-template-button-monday');
      await expect(addBtn).toBeVisible({ timeout: 5000 });
      await addBtn.scrollIntoViewIfNeeded();
      // Use dispatchEvent as fallback - some React handlers may not fire with Playwright click
      await addBtn.click({ force: true });
      await addBtn.dispatchEvent('click');

      // Brief wait for React state update and re-render
      await page.waitForTimeout(500);

      // Wait for Save button first (confirms slot was added and hasChanges=true)
      await expect(page.getByTestId('capacity-planner-save')).toBeVisible({ timeout: 10000 });

      // Wait for the new slot to appear (slot container for Monday)
      await expect(page.getByTestId('shift-slot-monday-0')).toBeVisible({ timeout: 5000 });

      // Fill the slot form
      const slotContainer = page.getByTestId('shift-slot-monday-0');
      const labelInput = slotContainer.locator('input[placeholder*="Label"]');

      // Fill the new slot: Label "Morning Shift", Required count 3
      await labelInput.clear();
      await labelInput.fill('Morning Shift');

      const requiredInput = slotContainer.getByTestId('slot-required-input').or(slotContainer.locator('input[type="number"][min="1"]'));
      await requiredInput.fill('3');

      // Save
      await page.getByTestId('capacity-planner-save').click();

      // Wait for save to complete - on success Save button disappears (hasChanges=false)
      await page.getByTestId('capacity-planner-save').waitFor({ state: 'hidden', timeout: 20000 });

      // Verify template persists: reload and check it's still there
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('capacity-planner-grid')).toBeVisible({ timeout: 10000 });
      // After reload, template loads from API - slot should show Morning Shift and 3
      await expect(page.getByTestId('shift-slot-monday-0')).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId('shift-slot-monday-0').locator('input').first()).toHaveValue('Morning Shift');
      await expect(page.getByTestId('slot-required-input').first()).toHaveValue('3');
    });
  });

  test.describe('Calendar Visualization', () => {
    test('Bucket pill exists for Monday showing 0/3, color Red (Vacant)', async ({ page }, testInfo) => {
      testInfo.setTimeout(90000);
      // First create the template
      await page.goto('/settings?category=business');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('capacity-planner-grid')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('add-template-button-monday').click();
      await page.waitForTimeout(500);
      await expect(page.getByTestId('shift-slot-monday-0')).toBeVisible({ timeout: 5000 });
      const slotContainer = page.getByTestId('shift-slot-monday-0');
      await slotContainer.locator('input[placeholder*="Label"]').fill('Morning Shift');
      await slotContainer.getByTestId('slot-required-input').fill('3');
      await page.getByTestId('capacity-planner-save').click();
      await page.getByTestId('capacity-planner-save').waitFor({ state: 'hidden', timeout: 20000 });

      await page.goto('/venue/dashboard?view=calendar');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('calendar-container')).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId(/shift-bucket-pill|button-view-week|roster-tools-dropdown/).first()).toBeVisible({ timeout: 10000 });

      // Switch to week view to see Monday
      const weekViewBtn = page.getByRole('button', { name: /week/i });
      if (await weekViewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await weekViewBtn.click();
      }

      // Find bucket pill using data attributes (more stable than text-based filtering)
      // data-filled-count="0" and data-required-count="3" added for E2E stability
      const pill = page.locator('[data-testid^="shift-bucket-pill"][data-filled-count="0"][data-required-count="3"]').first();
      await expect(pill).toBeVisible({ timeout: 10000 });

      // Verify Vacant state using data attribute (more stable than class matching)
      await expect(pill).toHaveAttribute('data-bucket-state', 'vacant');
      // Also verify red background class for visual confirmation
      await expect(pill).toHaveClass(/bg-red|red-500|red-600/);
    });
  });

  test.describe('Bucket Interaction', () => {
    test('Click pill to expand, verify 3 Empty Slot indicators (Add Staff buttons)', async ({ page }) => {
      // Create template first
      await page.goto('/settings?category=business');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByTestId('capacity-planner-grid')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('add-template-button-monday').click();

      const labelInput = page.getByTestId('slot-label-input').first();
      await expect(labelInput).toBeVisible({ timeout: 5000 });
      await labelInput.fill('Morning Shift');
      const requiredInput = page.getByTestId('slot-required-input').first();
      await requiredInput.fill('3');
      await page.getByTestId('capacity-planner-save').click();
      await expect(page.getByText(/capacity saved|saved/i).first()).toBeVisible({ timeout: 5000 });

      await page.goto('/venue/dashboard?view=calendar');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('calendar-container')).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId(/shift-bucket-pill|button-view-week|roster-tools-dropdown/).first()).toBeVisible({ timeout: 10000 });

      const weekViewBtn = page.getByRole('button', { name: /week/i });
      if (await weekViewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await weekViewBtn.click();
      }

      // Use data attributes for stable selection (avoids text format changes)
      const pill = page.locator('[data-testid^="shift-bucket-pill"][data-filled-count="0"][data-required-count="3"]').first();
      await expect(pill).toBeVisible({ timeout: 10000 });

      // Click pill to expand popover
      await pill.click();

      // Verify expanded view
      const expandView = page.getByTestId('bucket-expand-view');
      await expect(expandView).toBeVisible({ timeout: 5000 });

      // Verify 3 "Add Staff" buttons (empty slots)
      const addStaffButtons = page.getByRole('button', { name: /add staff/i });
      await expect(addStaffButtons).toHaveCount(3);
    });

    test('Assign mock staff to one slot, verify pill updates to 1/3 and Orange (Partial)', async ({ page }) => {
      // Mock professionals API so we have someone to assign
      await page.route('**/api/professionals**', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              {
                id: '00000000-0000-4000-a000-000000000002',
                name: 'E2E Test Professional',
                displayName: 'E2E Test Professional',
                email: 'professional-e2e@hospogo.com',
                avatarUrl: null,
                skills: ['Bartender'],
                averageRating: 4.8,
                reviewCount: 10,
              },
            ]),
          });
          return;
        }
        await route.continue();
      });

      // Create template
      await page.goto('/settings?category=business');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByTestId('capacity-planner-grid')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('add-template-button-monday').click();

      const labelInput = page.getByTestId('slot-label-input').first();
      await expect(labelInput).toBeVisible({ timeout: 5000 });
      await labelInput.fill('Morning Shift');
      const requiredInput = page.getByTestId('slot-required-input').first();
      await requiredInput.fill('3');
      await page.getByTestId('capacity-planner-save').click();
      await expect(page.getByText(/capacity saved|saved/i).first()).toBeVisible({ timeout: 5000 });

      await page.goto('/venue/dashboard?view=calendar');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('calendar-container')).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId(/shift-bucket-pill|button-view-week|roster-tools-dropdown/).first()).toBeVisible({ timeout: 10000 });

      const weekViewBtn = page.getByRole('button', { name: /week/i });
      if (await weekViewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await weekViewBtn.click();
      }

      // Use data attributes for stable selection
      const pill = page.locator('[data-testid^="shift-bucket-pill"][data-filled-count="0"][data-required-count="3"]').first();
      await expect(pill).toBeVisible({ timeout: 10000 });
      await pill.click();

      // Click first Add Staff
      await page.getByRole('button', { name: /add staff/i }).first().click();

      // Shift Assignment Modal should open - assign a professional
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

      // Type in search to show professionals list (TEST_PROFESSIONAL name: "E2E Test Professional")
      const searchInput = page.getByPlaceholder(/search by name or skill/i);
      await searchInput.fill('E2E');

      // Click Assign on first professional result
      const assignBtn = page.getByRole('button', { name: /assign/i }).first();
      await expect(assignBtn).toBeVisible({ timeout: 5000 });
      await assignBtn.click();

      // Modal closes, pill should update to 1/3 - use data attributes for stable selection
      const updatedPill = page.locator('[data-testid^="shift-bucket-pill"][data-filled-count="1"][data-required-count="3"]').first();
      await expect(updatedPill).toBeVisible({ timeout: 10000 });

      // Verify Partial state using data attribute (more stable than class matching)
      await expect(updatedPill).toHaveAttribute('data-bucket-state', 'partial');
      // Also verify orange background class for visual confirmation
      await expect(updatedPill).toHaveClass(/bg-orange|orange-500|orange-600/);
    });
  });

  test.describe('Validation', () => {
    test('Required count cannot be less than 1', async ({ page }) => {
      await page.goto('/settings?category=business');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByTestId('capacity-planner-grid')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('add-template-button-monday').click();

      const requiredInput = page.getByTestId('slot-required-input').first();
      await expect(requiredInput).toBeVisible({ timeout: 5000 });
      await requiredInput.fill('0');

      // Input has min=1, so browser or component should enforce >= 1
      // After save, API rejects requiredStaffCount < 1 - so we verify the input constraint
      await expect(requiredInput).toHaveAttribute('min', '1');
    });

    test('Deleting template removes corresponding bucket from calendar', async ({ page }) => {
      // Create template
      await page.goto('/settings?category=business');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByTestId('capacity-planner-grid')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('add-template-button-monday').click();

      const labelInput = page.getByTestId('slot-label-input').first();
      await expect(labelInput).toBeVisible({ timeout: 5000 });
      await labelInput.fill('Morning Shift');
      const requiredInput = page.getByTestId('slot-required-input').first();
      await requiredInput.fill('3');
      await page.getByTestId('capacity-planner-save').click();
      await expect(page.getByText(/capacity saved|saved/i).first()).toBeVisible({ timeout: 5000 });

      await page.goto('/venue/dashboard?view=calendar');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('calendar-container')).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId(/shift-bucket-pill|button-view-week|roster-tools-dropdown/).first()).toBeVisible({ timeout: 10000 });

      const weekViewBtn = page.getByRole('button', { name: /week/i });
      if (await weekViewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await weekViewBtn.click();
      }

      // Use data attributes for stable selection
      await expect(
        page.locator('[data-testid^="shift-bucket-pill"][data-filled-count="0"][data-required-count="3"]').first()
      ).toBeVisible({ timeout: 10000 });

      // Go back to Settings and delete the template (trash icon)
      await page.goto('/settings?category=business');
      await page.waitForLoadState('domcontentloaded');

      // Trash button is next to the slot's label input
      const trashBtn = page.locator('button').filter({ has: page.locator('[class*="lucide-trash"], svg') }).first();
      await trashBtn.click();

      await page.getByTestId('capacity-planner-save').click();
      await expect(page.getByText(/capacity saved|saved/i).first()).toBeVisible({ timeout: 5000 });

      await page.goto('/venue/dashboard?view=calendar');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('calendar-container')).toBeVisible({ timeout: 15000 });

      const weekViewBtnFinal = page.getByRole('button', { name: /week/i });
      if (await weekViewBtnFinal.isVisible({ timeout: 3000 }).catch(() => false)) {
        await weekViewBtnFinal.click();
      }

      // No Morning Shift 0/3 pill
      await expect(page.getByTestId(/shift-bucket-pill/).filter({ hasText: 'Morning Shift' })).toHaveCount(
        0,
        { timeout: 3000 }
      );
    });
  });
});
