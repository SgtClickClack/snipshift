/**
 * Xero OAuth Service
 * Handles token exchange, refresh, and connections API
 */

const XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize';
const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token';
const XERO_CONNECTIONS_URL = 'https://api.xero.com/connections';

// Phase 1 + Employee mapping: read-only payroll timesheets and employees (Payroll AU)
const XERO_SCOPES = 'offline_access payroll.timesheets.read payroll.employees.read';

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
