/**
 * Xero OAuth Service
 * Handles token exchange, refresh, and connections API
 */

// ----- Xero API Configuration -----
// Centralized endpoints for easier maintenance and versioning
export const XERO_CONFIG = {
  auth: {
    authUrl: 'https://login.xero.com/identity/connect/authorize',
    tokenUrl: 'https://identity.xero.com/connect/token',
  },
  api: {
    connections: 'https://api.xero.com/connections',
    payrollBaseUrl: 'https://api.xero.com/payroll.xro/1.0',
  },
  rateLimit: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
  },
} as const;

const XERO_AUTH_URL = XERO_CONFIG.auth.authUrl;
const XERO_TOKEN_URL = XERO_CONFIG.auth.tokenUrl;
const XERO_CONNECTIONS_URL = XERO_CONFIG.api.connections;

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
 * Custom error class for Xero rate limit errors
 */
export class XeroRateLimitError extends Error {
  public retryAfterSeconds: number;
  
  constructor(retryAfter: number) {
    super(`Xero rate limit exceeded. Retry after ${retryAfter} seconds.`);
    this.name = 'XeroRateLimitError';
    this.retryAfterSeconds = retryAfter;
  }
}

/**
 * Custom error class for Xero API errors with additional context
 */
export class XeroApiError extends Error {
  public statusCode: number;
  public rawResponse: string;
  
  constructor(message: string, statusCode: number, rawResponse: string) {
    super(message);
    this.name = 'XeroApiError';
    this.statusCode = statusCode;
    this.rawResponse = rawResponse;
  }
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ----- Token Refresh Mutex -----
// Prevents race conditions when multiple requests trigger token refresh simultaneously.
// Xero refresh tokens are single-use, so concurrent refreshes will fail.
interface RefreshLock {
  promise: Promise<TokenResponse | null>;
  expiresAt: number;
}
const tokenRefreshLocks = new Map<string, RefreshLock>();
const REFRESH_LOCK_TTL_MS = 30_000; // 30 second max hold time

/**
 * Acquire a lock for token refresh. Returns existing result if refresh already in progress.
 * This prevents race conditions where multiple concurrent requests all try to refresh.
 */
async function withTokenRefreshLock<T>(
  key: string,
  refreshFn: () => Promise<T>
): Promise<T> {
  const existing = tokenRefreshLocks.get(key);
  const now = Date.now();
  
  // If lock exists and hasn't expired, wait for it
  if (existing && existing.expiresAt > now) {
    console.log(`[XERO] Waiting for existing token refresh for key: ${key}`);
    return existing.promise as Promise<T>;
  }
  
  // Clean up expired locks
  if (existing && existing.expiresAt <= now) {
    tokenRefreshLocks.delete(key);
  }
  
  // Create new lock
  const refreshPromise = refreshFn();
  tokenRefreshLocks.set(key, {
    promise: refreshPromise as Promise<TokenResponse | null>,
    expiresAt: now + REFRESH_LOCK_TTL_MS,
  });
  
  try {
    const result = await refreshPromise;
    return result;
  } finally {
    // Clean up lock after completion
    tokenRefreshLocks.delete(key);
  }
}

// ----- User-Friendly Error Mapping -----
// Maps Xero API error codes/responses to human-readable messages

export interface XeroErrorMapping {
  code: string;
  userMessage: string;
  technicalDetails: string;
  isRecoverable: boolean;
}

/**
 * Map Xero error response to user-friendly message.
 * Use for UI display to help users understand and resolve issues.
 */
export function mapXeroErrorToUserFriendly(
  statusCode: number,
  errorBody: string
): XeroErrorMapping {
  const lower = errorBody.toLowerCase();
  
  // Pay period locked (403 with specific message)
  if (statusCode === 403 && (lower.includes('lock') || lower.includes('approved'))) {
    return {
      code: 'PAY_PERIOD_LOCKED',
      userMessage: 'Pay Period Locked',
      technicalDetails: 'The pay period has been approved or locked in Xero. Timesheets cannot be added to locked periods.',
      isRecoverable: false,
    };
  }
  
  // Employee archived or not found - "The Orphaned Employee" scenario
  // DATA HYGIENE: Specific error for when HospoGo staff member maps to archived Xero employee
  if ((lower.includes('employee') && lower.includes('not found')) || 
      (lower.includes('employee') && lower.includes('archived')) ||
      (lower.includes('employee') && lower.includes('terminated')) ||
      (lower.includes('employeeid') && lower.includes('invalid'))) {
    return {
      code: 'XERO_ID_MISMATCH_EMPLOYEE_ARCHIVED',
      userMessage: 'Xero ID Mismatch: Employee Archived',
      technicalDetails: 'This staff member exists in HospoGo but has been deleted/archived in Xero. Please reactivate the employee in Xero Payroll, or update the mapping in Settings > Xero Integration to point to an active employee record.',
      isRecoverable: true,
    };
  }
  
  // Duplicate timesheet
  if (lower.includes('duplicate') || lower.includes('already exists')) {
    return {
      code: 'DUPLICATE_TIMESHEET',
      userMessage: 'Timesheet Already Exists',
      technicalDetails: 'A timesheet already exists for this employee and pay period. Edit the existing timesheet in Xero instead.',
      isRecoverable: false,
    };
  }
  
  // Invalid earnings rate
  if (lower.includes('earnings') && (lower.includes('not found') || lower.includes('invalid'))) {
    return {
      code: 'INVALID_EARNINGS_RATE',
      userMessage: 'Invalid Pay Configuration',
      technicalDetails: 'The earnings rate configured in Xero is invalid. Check your Pay Items setup in Xero.',
      isRecoverable: true,
    };
  }
  
  // Rate limit
  if (statusCode === 429) {
    return {
      code: 'RATE_LIMITED',
      userMessage: 'Too Many Requests',
      technicalDetails: 'Xero API rate limit reached. Please wait a moment and try again.',
      isRecoverable: true,
    };
  }
  
  // Token expired / auth error
  if (statusCode === 401) {
    return {
      code: 'AUTH_EXPIRED',
      userMessage: 'Xero Connection Expired',
      technicalDetails: 'Your Xero connection has expired. Please reconnect to Xero in Settings.',
      isRecoverable: true,
    };
  }
  
  // Generic 403
  if (statusCode === 403) {
    return {
      code: 'ACCESS_DENIED',
      userMessage: 'Access Denied',
      technicalDetails: 'Xero denied access. The pay period may be locked or your permissions may have changed.',
      isRecoverable: false,
    };
  }
  
  // Validation error
  if (statusCode === 400) {
    return {
      code: 'VALIDATION_ERROR',
      userMessage: 'Invalid Data',
      technicalDetails: `Xero rejected the data: ${errorBody.slice(0, 200)}`,
      isRecoverable: true,
    };
  }
  
  // Server error
  if (statusCode >= 500) {
    return {
      code: 'XERO_SERVER_ERROR',
      userMessage: 'Xero Service Unavailable',
      technicalDetails: 'Xero is experiencing issues. Please try again later.',
      isRecoverable: true,
    };
  }
  
  // Generic fallback
  return {
    code: 'UNKNOWN_ERROR',
    userMessage: 'Sync Failed',
    technicalDetails: `Xero returned error ${statusCode}: ${errorBody.slice(0, 200)}`,
    isRecoverable: false,
  };
}

/**
 * Fetch with comprehensive retry handling for resilience.
 * Automatically retries on:
 * - 429 (rate limit) responses - uses Retry-After header or exponential backoff
 * - 5xx (server errors) responses - transient Xero outages
 * - Network errors (TypeError) - connection issues
 */
async function fetchWithRateLimitRetry(
  url: string,
  options: RequestInit,
  retryCount = 0
): Promise<Response> {
  let response: Response;
  
  try {
    response = await fetch(url, options);
  } catch (err) {
    // Network error (e.g., DNS failure, connection refused)
    if (retryCount < XERO_CONFIG.rateLimit.maxRetries && err instanceof TypeError) {
      const delayMs = Math.min(
        XERO_CONFIG.rateLimit.initialDelayMs * Math.pow(2, retryCount),
        XERO_CONFIG.rateLimit.maxDelayMs
      );
      console.log(`[XERO] Network error. Retrying in ${delayMs}ms (attempt ${retryCount + 1}/${XERO_CONFIG.rateLimit.maxRetries})`, err.message);
      await sleep(delayMs);
      return fetchWithRateLimitRetry(url, options, retryCount + 1);
    }
    throw err;
  }
  
  // Rate limit (429) - use Retry-After header if available
  if (response.status === 429) {
    if (retryCount >= XERO_CONFIG.rateLimit.maxRetries) {
      const retryAfter = parseInt(response.headers.get('Retry-After') ?? '60', 10);
      throw new XeroRateLimitError(retryAfter);
    }
    
    const retryAfterHeader = response.headers.get('Retry-After');
    let delayMs: number;
    
    if (retryAfterHeader) {
      delayMs = parseInt(retryAfterHeader, 10) * 1000;
    } else {
      delayMs = Math.min(
        XERO_CONFIG.rateLimit.initialDelayMs * Math.pow(2, retryCount),
        XERO_CONFIG.rateLimit.maxDelayMs
      );
    }
    
    console.log(`[XERO] Rate limited. Retrying in ${delayMs}ms (attempt ${retryCount + 1}/${XERO_CONFIG.rateLimit.maxRetries})`);
    await sleep(delayMs);
    
    return fetchWithRateLimitRetry(url, options, retryCount + 1);
  }
  
  // Server error (5xx) - transient Xero outages
  if (response.status >= 500 && response.status < 600) {
    if (retryCount >= XERO_CONFIG.rateLimit.maxRetries) {
      console.error(`[XERO] Server error ${response.status} after ${retryCount} retries`);
      return response; // Return the error response for caller to handle
    }
    
    // Use shorter backoff for 5xx errors (likely transient)
    const delayMs = Math.min(
      1000 * Math.pow(2, retryCount), // 1s, 2s, 4s
      10000 // Max 10s for server errors
    );
    
    console.log(`[XERO] Server error ${response.status}. Retrying in ${delayMs}ms (attempt ${retryCount + 1}/${XERO_CONFIG.rateLimit.maxRetries})`);
    await sleep(delayMs);
    
    return fetchWithRateLimitRetry(url, options, retryCount + 1);
  }
  
  return response;
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
 * Get connected tenants for the given access token.
 * Includes rate limit handling with automatic retry.
 */
export async function getConnections(accessToken: string): Promise<XeroConnection[]> {
  const res = await fetchWithRateLimitRetry(XERO_CONNECTIONS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new XeroApiError(`Xero connections failed: ${res.status} ${errText}`, res.status, errText);
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

// ----- Payroll API Endpoints (using centralized config) -----
const XERO_PAYROLL_EMPLOYEES_URL = `${XERO_CONFIG.api.payrollBaseUrl}/Employees`;
const XERO_PAYROLL_CALENDARS_URL = `${XERO_CONFIG.api.payrollBaseUrl}/PayrollCalendars`;
const XERO_PAY_ITEMS_URL = `${XERO_CONFIG.api.payrollBaseUrl}/PayItems`;
const XERO_TIMESHEETS_URL = `${XERO_CONFIG.api.payrollBaseUrl}/Timesheets`;

// ----- Simple In-Memory Cache -----
// Caches employee lists and calendars to reduce redundant API calls during sync operations
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const CACHE_TTL = {
  employees: 5 * 60 * 1000,    // 5 minutes
  calendars: 10 * 60 * 1000,   // 10 minutes
  payItems: 30 * 60 * 1000,    // 30 minutes (rarely changes)
} as const;

function getCacheKey(type: string, tenantId: string): string {
  return `${type}:${tenantId}`;
}

function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Invalidate cache for a specific tenant (call after writes or reconnection)
 */
export function invalidateXeroCache(tenantId: string): void {
  const keysToDelete: string[] = [];
  for (const key of cache.keys()) {
    if (key.endsWith(`:${tenantId}`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(k => cache.delete(k));
  console.log(`[XERO] Cache invalidated for tenant ${tenantId}`);
}

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
 * Includes rate limit handling with automatic retry and caching.
 * @param skipCache If true, bypasses cache and fetches fresh data
 */
export async function getEmployees(
  accessToken: string,
  tenantId: string,
  skipCache = false
): Promise<XeroEmployee[]> {
  const cacheKey = getCacheKey('employees', tenantId);
  
  // Check cache first (unless skipCache is true)
  if (!skipCache) {
    const cached = getFromCache<XeroEmployee[]>(cacheKey);
    if (cached) {
      console.log(`[XERO] Using cached employees for tenant ${tenantId}`);
      return cached;
    }
  }
  
  const res = await fetchWithRateLimitRetry(XERO_PAYROLL_EMPLOYEES_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Xero-tenant-id': tenantId,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new XeroApiError(`Xero employees fetch failed: ${res.status} ${errText}`, res.status, errText);
  }

  const data = (await res.json()) as { Employees?: XeroEmployee[] };
  const employees = data.Employees ?? [];
  
  // Cache the result
  setCache(cacheKey, employees, CACHE_TTL.employees);
  
  return employees;
}

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
 * Includes rate limit handling with automatic retry and caching.
 * @param skipCache If true, bypasses cache and fetches fresh data
 */
export async function getPayrollCalendars(
  accessToken: string,
  tenantId: string,
  skipCache = false
): Promise<XeroPayrollCalendar[]> {
  const cacheKey = getCacheKey('calendars', tenantId);
  
  // Check cache first (unless skipCache is true)
  if (!skipCache) {
    const cached = getFromCache<XeroPayrollCalendar[]>(cacheKey);
    if (cached) {
      console.log(`[XERO] Using cached calendars for tenant ${tenantId}`);
      return cached;
    }
  }
  
  const res = await fetchWithRateLimitRetry(XERO_PAYROLL_CALENDARS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Xero-tenant-id': tenantId,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new XeroApiError(`Xero payroll calendars fetch failed: ${res.status} ${errText}`, res.status, errText);
  }

  const data = (await res.json()) as { PayrollCalendars?: XeroPayrollCalendar[] };
  const calendars = data.PayrollCalendars ?? [];
  
  // Cache the result
  setCache(cacheKey, calendars, CACHE_TTL.calendars);
  
  return calendars;
}

/**
 * Get Pay Items (EarningsRates) for the tenant.
 * Used to resolve EarningsRateID for timesheet lines (ORDINARYTIMEEARNINGS).
 * Includes rate limit handling with automatic retry and caching.
 * @param skipCache If true, bypasses cache and fetches fresh data
 */
export async function getPayItems(
  accessToken: string,
  tenantId: string,
  skipCache = false
): Promise<{ earningsRates: XeroEarningsRate[] }> {
  const cacheKey = getCacheKey('payItems', tenantId);
  
  // Check cache first (unless skipCache is true)
  if (!skipCache) {
    const cached = getFromCache<{ earningsRates: XeroEarningsRate[] }>(cacheKey);
    if (cached) {
      console.log(`[XERO] Using cached pay items for tenant ${tenantId}`);
      return cached;
    }
  }
  
  const res = await fetchWithRateLimitRetry(XERO_PAY_ITEMS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Xero-tenant-id': tenantId,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new XeroApiError(`Xero pay items fetch failed: ${res.status} ${errText}`, res.status, errText);
  }

  const data = (await res.json()) as {
    PayItems?: { EarningsRates?: XeroEarningsRate[] };
  };
  const earningsRates = data.PayItems?.EarningsRates ?? [];
  const result = { earningsRates };
  
  // Cache the result (pay items rarely change)
  setCache(cacheKey, result, CACHE_TTL.payItems);
  
  return result;
}

/**
 * Translate Xero API error response to a business-friendly message.
 */
function translateXeroError(statusCode: number, errText: string): string {
  const lower = errText.toLowerCase();
  
  // Locked pay period
  if (statusCode === 400 || statusCode === 403) {
    if (lower.includes('lock') || lower.includes('locked')) {
      return 'Pay period is locked in Xero. Cannot add timesheets.';
    }
    if (lower.includes('duplicate') || lower.includes('already exists')) {
      return 'A timesheet already exists for this employee and period.';
    }
  }
  
  // Access denied
  if (statusCode === 403) {
    return 'Access denied. The pay period may be locked in Xero, or your Xero connection may need to be refreshed.';
  }
  
  // Invalid employee
  if (lower.includes('employee') && (lower.includes('not found') || lower.includes('invalid'))) {
    return 'Employee not found in Xero. The employee may have been removed or deactivated.';
  }
  
  // Invalid earnings rate
  if (lower.includes('earnings') && (lower.includes('not found') || lower.includes('invalid'))) {
    return 'Invalid earnings rate. Please check your Pay Items configuration in Xero.';
  }
  
  // Validation errors
  if (lower.includes('validation') || statusCode === 400) {
    return `Validation error: ${errText}`;
  }
  
  // Generic error with status
  return `Xero timesheet create failed: ${statusCode} ${errText}`;
}

/**
 * Create timesheets in Xero Payroll AU.
 * @param timesheets Array of timesheet objects (one per employee per period)
 * Includes rate limit handling with automatic retry.
 */
export async function createTimesheet(
  accessToken: string,
  tenantId: string,
  timesheets: XeroTimesheetPayload[]
): Promise<{ Timesheets?: Array<{ TimesheetID?: string }> }> {
  const res = await fetchWithRateLimitRetry(XERO_TIMESHEETS_URL, {
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
    const message = translateXeroError(res.status, errText);
    throw new XeroApiError(message, res.status, errText);
  }

  return (await res.json()) as { Timesheets?: Array<{ TimesheetID?: string }> };
}
