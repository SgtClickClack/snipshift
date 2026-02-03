/**
 * Xero OAuth Service
 * Handles token exchange, refresh, and connections API
 */

const XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize';
const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token';
const XERO_CONNECTIONS_URL = 'https://api.xero.com/connections';

// Phase 1–3: payroll read/write, employees, settings (calendars, pay items)
const XERO_SCOPES =
  'offline_access payroll.timesheets.read payroll.timesheets payroll.employees.read payroll.settings.read';

function getConfig() {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const redirectUri = process.env.XERO_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Xero OAuth not configured: XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_REDIRECT_URI required');
  }
  return { clientId, clientSecret, redirectUri };
}

function getBasicAuth(clientId: string, clientSecret: string): string {
  return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

/**
 * Build the Xero authorization URL for the OAuth flow
 */
export function buildAuthUrl(state: string): string {
  const { clientId, redirectUri } = getConfig();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: XERO_SCOPES,
    state,
  });
  return `${XERO_AUTH_URL}?${params.toString()}`;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const { clientId, clientSecret, redirectUri } = getConfig();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(XERO_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${getBasicAuth(clientId, clientSecret)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Xero token exchange failed: ${res.status} ${errText}`);
  }

  return res.json() as Promise<TokenResponse>;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = getConfig();
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const res = await fetch(XERO_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${getBasicAuth(clientId, clientSecret)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Xero token refresh failed: ${res.status} ${errText}`);
  }

  return res.json() as Promise<TokenResponse>;
}

export interface XeroConnection {
  id: string;
  tenantId: string;
  tenantType: string;
  tenantName: string | null;
}

/**
 * Get connected tenants for the given access token
 */
export async function getConnections(accessToken: string): Promise<XeroConnection[]> {
  const res = await fetch(XERO_CONNECTIONS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Xero connections failed: ${res.status} ${errText}`);
  }

  const data = (await res.json()) as Array<{
    id: string;
    tenantId: string;
    tenantType: string;
    tenantName: string | null;
  }>;

  return data.map((c) => ({
    id: c.id,
    tenantId: c.tenantId,
    tenantType: c.tenantType,
    tenantName: c.tenantName,
  }));
}

const XERO_PAYROLL_EMPLOYEES_URL = 'https://api.xero.com/payroll.xro/1.0/Employees';

export interface XeroEmployee {
  EmployeeID: string;
  FirstName?: string;
  LastName?: string;
  Status?: string;
  Email?: string;
}

/**
 * Get Xero Payroll AU employees for the given tenant.
 * Uses accessToken and tenantId. Does NOT handle refresh - caller must ensure valid token.
 */
export async function getEmployees(accessToken: string, tenantId: string): Promise<XeroEmployee[]> {
  const res = await fetch(XERO_PAYROLL_EMPLOYEES_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Xero-tenant-id': tenantId,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Xero employees fetch failed: ${res.status} ${errText}`);
  }

  const data = (await res.json()) as { Employees?: XeroEmployee[] };
  return data.Employees ?? [];
}

// --- Phase 3: Payroll Calendars, Pay Items, Timesheets ---

const XERO_PAYROLL_CALENDARS_URL = 'https://api.xero.com/payroll.xro/1.0/PayrollCalendars';
const XERO_PAY_ITEMS_URL = 'https://api.xero.com/payroll.xro/1.0/PayItems';
const XERO_TIMESHEETS_URL = 'https://api.xero.com/payroll.xro/1.0/Timesheets';

export interface XeroPayrollCalendar {
  PayrollCalendarID: string;
  Name?: string;
  CalendarType?: string;
  StartDate?: string;
  PaymentDate?: string;
  ReferenceDate?: string;
  UpdatedDateUTC?: string;
}

export interface XeroEarningsRate {
  EarningsRateID: string;
  Name?: string;
  EarningsType?: string;
  RateType?: string;
  TypeOfUnits?: string;
}

export interface XeroTimesheetLine {
  EarningsRateID: string;
  NumberOfUnits: number[];
}

export interface XeroTimesheetPayload {
  EmployeeID: string;
  StartDate: string;
  EndDate: string;
  Status: 'DRAFT' | 'APPROVED';
  TimesheetLines: XeroTimesheetLine[];
}

/**
 * Get Payroll AU calendars for the tenant.
 */
export async function getPayrollCalendars(
  accessToken: string,
  tenantId: string
): Promise<XeroPayrollCalendar[]> {
  const res = await fetch(XERO_PAYROLL_CALENDARS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Xero-tenant-id': tenantId,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Xero payroll calendars fetch failed: ${res.status} ${errText}`);
  }

  const data = (await res.json()) as { PayrollCalendars?: XeroPayrollCalendar[] };
  return data.PayrollCalendars ?? [];
}

/**
 * Get Pay Items (EarningsRates) for the tenant.
 * Used to resolve EarningsRateID for timesheet lines (ORDINARYTIMEEARNINGS).
 */
export async function getPayItems(
  accessToken: string,
  tenantId: string
): Promise<{ earningsRates: XeroEarningsRate[] }> {
  const res = await fetch(XERO_PAY_ITEMS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Xero-tenant-id': tenantId,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Xero pay items fetch failed: ${res.status} ${errText}`);
  }

  const data = (await res.json()) as {
    PayItems?: { EarningsRates?: XeroEarningsRate[] };
  };
  const earningsRates = data.PayItems?.EarningsRates ?? [];
  return { earningsRates };
}

/**
 * Create timesheets in Xero Payroll AU.
 * @param timesheets Array of timesheet objects (one per employee per period)
 */
export async function createTimesheet(
  accessToken: string,
  tenantId: string,
  timesheets: XeroTimesheetPayload[]
): Promise<{ Timesheets?: Array<{ TimesheetID?: string }> }> {
  const res = await fetch(XERO_TIMESHEETS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Xero-tenant-id': tenantId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(timesheets),
  });

  if (!res.ok) {
    const errText = await res.text();
    let message = `Xero timesheet create failed: ${res.status} ${errText}`;
    if (res.status === 400) {
      const lower = errText.toLowerCase();
      if (lower.includes('lock') || lower.includes('locked')) {
        message = 'Pay period is locked in Xero. Cannot add timesheets.';
      } else if (lower.includes('duplicate') || lower.includes('already exists')) {
        message = 'A timesheet already exists for this employee and period.';
      }
    }
    throw new Error(message);
  }

  return (await res.json()) as { Timesheets?: Array<{ TimesheetID?: string }> };
}
