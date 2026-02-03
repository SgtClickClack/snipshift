import { Page } from '@playwright/test';

/**
 * Mock data for Xero E2E tests
 */
export const MOCK_XERO_EMPLOYEES = [
  { EmployeeID: 'xero-emp-1', FirstName: 'Jane', LastName: 'Doe', Status: 'ACTIVE', Email: 'jane@example.com' },
  { EmployeeID: 'xero-emp-2', FirstName: 'John', LastName: 'Smith', Status: 'ACTIVE', Email: 'john@example.com' },
];

export const MOCK_XERO_STAFF = [
  { id: 'staff-1', name: 'Test Staff', email: 'staff@test.com', xeroEmployeeId: null as string | null },
];

export const MOCK_XERO_CALENDARS = [
  { id: 'cal-1', name: 'Weekly', calendarType: 'WEEKLY', startDate: null, paymentDate: null, referenceDate: null },
];

export const MOCK_SYNC_SUCCESS = {
  synced: [{ employeeId: 'staff-1', xeroEmployeeId: 'xero-emp-1', hours: 8, status: 'success' }],
  failed: [] as Array<{ employeeId: string; reason: string }>,
};

export interface XeroMockOptions {
  baseURL?: string;
  connected?: boolean;
  staffWithMapping?: boolean;
}

/**
 * Sets up page.route mocks for all Xero API endpoints.
 * Use connected: true for mapper/sync tests, false for handshake connect flow.
 */
export async function setupXeroMocks(
  page: Page,
  options: XeroMockOptions = {}
): Promise<void> {
  const { baseURL = 'http://localhost:3000', connected = true, staffWithMapping = false } = options;

  const staff = staffWithMapping
    ? [{ ...MOCK_XERO_STAFF[0], xeroEmployeeId: 'xero-emp-1' }]
    : MOCK_XERO_STAFF;

  // GET /api/integrations/xero/status
  await page.route('**/api/integrations/xero/status', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        connected ? { connected: true, tenantName: 'Mock Org' } : { connected: false }
      ),
    });
  });

  // GET /api/integrations/xero/connect
  await page.route('**/api/integrations/xero/connect', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const callbackUrl = `${baseURL}/api/integrations/xero/callback?code=mock_code&state=mock_state`;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ authUrl: callbackUrl }),
    });
  });

  // GET /api/integrations/xero/employees
  await page.route('**/api/integrations/xero/employees', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ employees: MOCK_XERO_EMPLOYEES }),
    });
  });

  // GET /api/integrations/xero/staff
  await page.route('**/api/integrations/xero/staff', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ staff }),
    });
  });

  // GET /api/integrations/xero/calendars
  await page.route('**/api/integrations/xero/calendars', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ calendars: MOCK_XERO_CALENDARS }),
    });
  });

  // POST /api/integrations/xero/map-employees
  await page.route('**/api/integrations/xero/map-employees', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Mappings saved' }),
    });
  });

  // POST /api/integrations/xero/sync-timesheet
  await page.route('**/api/integrations/xero/sync-timesheet', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SYNC_SUCCESS),
    });
  });

  // DELETE /api/integrations/xero
  await page.route('**/api/integrations/xero', async (route) => {
    if (route.request().method() !== 'DELETE') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Xero disconnected' }),
    });
  });
}

/**
 * Override sync-timesheet to return a 500 error
 */
export async function mockSyncTimesheetError(page: Page, status: number = 500, message?: string): Promise<void> {
  await page.route('**/api/integrations/xero/sync-timesheet', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ message: message ?? 'Internal server error' }),
    });
  });
}

/**
 * Override sync-timesheet to return locked period error (400)
 */
export async function mockSyncTimesheetLocked(page: Page): Promise<void> {
  await page.route('**/api/integrations/xero/sync-timesheet', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Pay period is locked in Xero. Cannot add timesheets.' }),
    });
  });
}

/**
 * Override employees to return 500 error
 */
export async function mockEmployeesError(page: Page): Promise<void> {
  await page.route('**/api/integrations/xero/employees', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Internal server error' }),
    });
  });
}
