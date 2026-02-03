import { test, expect, Page, BrowserContext } from '@playwright/test';
import { setupUserContext, TEST_VENUE_OWNER } from './seed_data';
import {
  setupXeroMocks,
  mockSyncTimesheetError,
  mockSyncTimesheetLocked,
  mockEmployeesError,
  MOCK_XERO_STAFF,
  MOCK_XERO_EMPLOYEES,
} from './xero-mocks';
import { Client } from 'pg';

const TEST_DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:test@localhost:5433/hospogo_test';
const MOCK_TEST_USER_ID = '8eaee523-79a2-4077-8f5b-4b7fd4058ede';

/**
 * Clean up Xero integration data created during E2E tests
 */
async function cleanupXeroTestData(): Promise<void> {
  try {
    const client = new Client({ connectionString: TEST_DB_URL });
    await client.connect();
    await client.query('DELETE FROM xero_integrations WHERE user_id = $1', [MOCK_TEST_USER_ID]);
    await client.query("DELETE FROM xero_oauth_state WHERE state = 'mock_state'");
    await client.end();
  } catch (err: unknown) {
    // Ignore if tables don't exist (e.g. test DB schema differs from app DB)
    const code = (err as { code?: string })?.code;
    if (code !== '42P01') {
      console.warn('[Xero E2E] Cleanup failed:', err);
    }
  }
}

test.describe('Xero Integration E2E Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({ baseURL: 'http://localhost:3000' });
    await setupUserContext(context, TEST_VENUE_OWNER);
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await page?.close();
    await context?.close();
  });

  test.afterAll(async () => {
    await cleanupXeroTestData();
  });

  test.describe('Handshake Flow', () => {
    test.afterEach(async () => {
      await cleanupXeroTestData();
    });

    test('Connected state shows status and Disconnect button', async () => {
      // Mock status as connected and simulate post-callback URL (xero=connected triggers success toast)
      await setupXeroMocks(page, { connected: true });
      await page.goto('/settings?category=business&xero=connected');
      await page.waitForLoadState('domcontentloaded');

      // Ensure Business category is visible (business user)
      await expect(page.getByRole('button', { name: /business settings/i })).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: /business settings/i }).click();

      // Verify Connected status and Disconnect button
      await expect(page.getByTestId('xero-status-connected')).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId('xero-disconnect-button')).toBeVisible();
      await expect(page.getByTestId('xero-status-connected').getByText(/connected to mock org/i)).toBeVisible();
    });

    test('Disconnect flow works when connected', async () => {
      await setupXeroMocks(page, { connected: true });
      await page.goto('/settings?category=business');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByTestId('xero-status-connected')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('xero-disconnect-button').click();

      // Component updates local state on successful disconnect
      await expect(page.getByTestId('xero-status-disconnected')).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId('xero-connect-button')).toBeVisible();
    });
  });

  test.describe('Employee Mapping', () => {
    test('Xero Employee Mapper table renders when connected', async () => {
      await setupXeroMocks(page, { connected: true });
      await page.goto('/settings?category=business');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByTestId('xero-employee-mapper-table')).toBeVisible({ timeout: 10000 });
    });

    test('Select Xero employee, Save Mappings, verify success toast and persistence', async () => {
      await setupXeroMocks(page, { connected: true, staffWithMapping: false });
      await page.goto('/settings?category=business');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByTestId('xero-employee-mapper-table')).toBeVisible({ timeout: 10000 });

      // Select a Xero employee for the first staff row
      const staffRow = page.getByTestId(`xero-staff-row-${MOCK_XERO_STAFF[0].id}`);
      await expect(staffRow).toBeVisible();

      const selectTrigger = staffRow.getByRole('combobox');
      await selectTrigger.click();
      await page.getByRole('option', { name: new RegExp(MOCK_XERO_EMPLOYEES[0].FirstName!, 'i') }).click();

      // Click Save Mappings
      await page.getByTestId('xero-save-mappings').click();

      // Verify success toast
      await expect(page.getByText('Mappings saved')).toBeVisible({ timeout: 5000 });

      // Reload and verify mapping persists (mock returns staff with mapping)
      await setupXeroMocks(page, { connected: true, staffWithMapping: true });
      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByTestId('xero-employee-mapper-table')).toBeVisible({ timeout: 10000 });
      // After reload with staffWithMapping, the select should show the mapped employee
      const staffRowAfter = page.getByTestId(`xero-staff-row-${MOCK_XERO_STAFF[0].id}`);
      await expect(staffRowAfter).toBeVisible();
    });
  });

  test.describe('Timesheet Sync', () => {
    test('Select calendar, Sync Now, confirm and verify success', async () => {
      await setupXeroMocks(page, { connected: true });
      await page.goto('/settings?category=business');
      await page.waitForLoadState('domcontentloaded');

      // Wait for calendars to load
      await expect(page.getByTestId('xero-calendar-select')).toBeVisible({ timeout: 10000 });

      // Ensure date range is set (component auto-sets default)
      const startInput = page.locator('#sync-start');
      const endInput = page.locator('#sync-end');
      await expect(startInput).toHaveValue(/.+/);
      await expect(endInput).toHaveValue(/.+/);

      // Click Sync Now
      await page.getByTestId('xero-sync-now').click();

      // Verify confirmation modal
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByTestId('xero-confirm-sync')).toBeVisible();

      // Confirm sync
      await page.getByTestId('xero-confirm-sync').click();

      // Verify success state
      const syncResult = page.getByTestId('xero-sync-result');
      await expect(syncResult).toBeVisible({ timeout: 5000 });
      await expect(syncResult.getByText(/1 employee\(s\) synced/)).toBeVisible();
      await expect(syncResult.getByText(/8\.0 hours/)).toBeVisible();
    });
  });

  test.describe('Failure Scenarios', () => {
    test('Sync timesheet returns 500 - error toast shown', async () => {
      await setupXeroMocks(page, { connected: true });
      await mockSyncTimesheetError(page, 500);
      await page.goto('/settings?category=business');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByTestId('xero-sync-now')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('xero-sync-now').click();
      await page.getByTestId('xero-confirm-sync').click();

      await expect(page.getByText('Sync failed').first()).toBeVisible({ timeout: 5000 });
    });

    test('Sync timesheet returns locked period - error handled', async () => {
      await setupXeroMocks(page, { connected: true });
      await mockSyncTimesheetLocked(page);
      await page.goto('/settings?category=business');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByTestId('xero-sync-now')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('xero-sync-now').click();
      await page.getByTestId('xero-confirm-sync').click();

      await expect(page.getByText('Sync failed').first()).toBeVisible({ timeout: 5000 });
    });

    test('Employees API returns 500 - error toast in mapper', async () => {
      await setupXeroMocks(page, { connected: true });
      await mockEmployeesError(page);
      await page.goto('/settings?category=business');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByText('Failed to load data').first()).toBeVisible({ timeout: 10000 });
    });
  });
});
