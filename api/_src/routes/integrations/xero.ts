/**
 * Xero Integration Routes
 * Isolated OAuth flow - does not touch core auth (Firebase/Google)
 */

import { Router } from 'express';
import crypto from 'crypto';
import { authenticateUser, AuthenticatedRequest, requireBusinessOwner } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import * as xeroOauthService from '../../services/xero-oauth.service.js';
import type { XeroTimesheetPayload } from '../../services/xero-oauth.service.js';
import * as xeroRepo from '../../repositories/xero-integrations.repository.js';
import * as usersRepo from '../../repositories/users.repository.js';
import * as shiftsRepo from '../../repositories/shifts.repository.js';

const router = Router();

const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000; // Refresh if expiring within 1 min

async function getValidTokens(userId: string): Promise<{ accessToken: string; tenantId: string } | null> {
  let tokens = await xeroRepo.getDecryptedTokens(userId);
  if (!tokens) return null;

  const expiresAt = tokens.expiresAt instanceof Date ? tokens.expiresAt : new Date(tokens.expiresAt);
  if (expiresAt.getTime() - TOKEN_EXPIRY_BUFFER_MS < Date.now()) {
    try {
      const refreshed = await xeroOauthService.refreshAccessToken(tokens.refreshToken);
      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
      await xeroRepo.updateTokens(userId, refreshed.access_token, refreshed.refresh_token, newExpiresAt);
      tokens = { accessToken: refreshed.access_token, refreshToken: refreshed.refresh_token, expiresAt: newExpiresAt };
    } catch (err) {
      console.error('[XERO] Token refresh failed:', err);
      return null;
    }
  }

  const integration = await xeroRepo.getXeroIntegrationByUserId(userId);
  if (!integration) return null;

  return { accessToken: tokens.accessToken, tenantId: integration.xeroTenantId };
}

const FRONTEND_URL = process.env.VITE_APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * GET /api/integrations/xero/connect
 * Returns authUrl for frontend to redirect user to Xero OAuth
 */
router.get('/connect', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const state = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + STATE_EXPIRY_MS);
    await xeroRepo.storeOAuthState(state, userId, expiresAt);

    const authUrl = xeroOauthService.buildAuthUrl(state);
    res.status(200).json({ authUrl });
  } catch (error) {
    console.error('[XERO] Connect error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Xero integration not configured',
    });
  }
}));

/**
 * GET /api/integrations/xero/callback
 * Public - Xero redirects here with code and state
 */
router.get('/callback', asyncHandler(async (req, res) => {
  const { code, state, error: xeroError } = req.query;

  const redirectToSettings = (params?: Record<string, string>) => {
    const url = new URL('/settings', FRONTEND_URL);
    url.searchParams.set('category', 'business');
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    res.redirect(url.toString());
  };

  if (xeroError) {
    console.error('[XERO] OAuth error from Xero:', xeroError);
    redirectToSettings({ xero: 'error' });
    return;
  }

  if (typeof code !== 'string' || typeof state !== 'string') {
    res.status(400).send('Missing code or state parameter');
    return;
  }

  const userId = await xeroRepo.consumeOAuthState(state);
  if (!userId) {
    console.error('[XERO] Invalid or expired state');
    redirectToSettings({ xero: 'invalid_state' });
    return;
  }

  try {
    const tokens = await xeroOauthService.exchangeCodeForTokens(code);
    const connections = await xeroOauthService.getConnections(tokens.access_token);

    if (connections.length === 0) {
      console.error('[XERO] No tenants connected');
      redirectToSettings({ xero: 'no_tenant' });
      return;
    }

    const tenant = connections[0];
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await xeroRepo.upsertXeroIntegration({
      userId,
      xeroTenantId: tenant.tenantId,
      xeroTenantName: tenant.tenantName ?? undefined,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      scope: tokens.scope,
    });

    redirectToSettings({ xero: 'connected' });
  } catch (err) {
    console.error('[XERO] Callback error:', err);
    redirectToSettings({ xero: 'error' });
  }
}));

/**
 * GET /api/integrations/xero/status
 * Returns connection status for UI
 */
router.get('/status', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const integration = await xeroRepo.getXeroIntegrationByUserId(userId);
  if (!integration) {
    res.status(200).json({ connected: false });
    return;
  }

  res.status(200).json({
    connected: true,
    tenantName: integration.xeroTenantName ?? integration.xeroTenantId,
  });
}));

/**
 * DELETE /api/integrations/xero
 * Disconnect Xero integration
 */
router.delete('/', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  await xeroRepo.deleteXeroIntegration(userId);
  res.status(200).json({ message: 'Xero disconnected' });
}));

/**
 * GET /api/integrations/xero/employees
 * Returns Xero Payroll AU employees. Business/venue owner only.
 */
router.get('/employees', authenticateUser, requireBusinessOwner, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const tokens = await getValidTokens(userId);
  if (!tokens) {
    res.status(400).json({ message: 'Xero not connected or token expired. Please reconnect.' });
    return;
  }

  const employees = await xeroOauthService.getEmployees(tokens.accessToken, tokens.tenantId);
  res.status(200).json({ employees });
}));

/**
 * GET /api/integrations/xero/staff
 * Returns HospoGo staff (assignees) for the current employer. Business/venue owner only.
 */
router.get('/staff', authenticateUser, requireBusinessOwner, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const staffIds = await shiftsRepo.getStaffIdsForEmployer(userId);
  if (staffIds.length === 0) {
    res.status(200).json({ staff: [] });
    return;
  }

  const staff = await Promise.all(staffIds.map((id) => usersRepo.getUserById(id)));
  const staffList = staff
    .filter((u): u is NonNullable<typeof staff[number]> => u != null)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      xeroEmployeeId: u.xeroEmployeeId ?? null,
    }));

  res.status(200).json({ staff: staffList });
}));

/**
 * POST /api/integrations/xero/map-employees
 * Save Xero employee mappings. Business/venue owner only.
 * Body: { mappings: [{ userId: string, xeroEmployeeId: string | null }] }
 * Validation: No duplicate xeroEmployeeId across users; staff must have worked for this employer.
 */
router.post('/map-employees', authenticateUser, requireBusinessOwner, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { mappings } = req.body as { mappings?: Array<{ userId: string; xeroEmployeeId: string | null }> };
  if (!Array.isArray(mappings)) {
    res.status(400).json({ message: 'mappings must be an array' });
    return;
  }

  const staffIds = new Set(await shiftsRepo.getStaffIdsForEmployer(userId));
  const xeroIdsUsed = new Map<string, string>(); // xeroEmployeeId -> userId

  for (const m of mappings) {
    if (typeof m.userId !== 'string' || (m.xeroEmployeeId != null && typeof m.xeroEmployeeId !== 'string')) {
      res.status(400).json({ message: 'Each mapping must have userId (string) and xeroEmployeeId (string | null)' });
      return;
    }
    if (!staffIds.has(m.userId)) {
      res.status(403).json({ message: `User ${m.userId} is not staff for this venue` });
      return;
    }
    if (m.xeroEmployeeId) {
      const existing = xeroIdsUsed.get(m.xeroEmployeeId);
      if (existing && existing !== m.userId) {
        res.status(400).json({ message: `Xero employee ${m.xeroEmployeeId} is already mapped to another user` });
        return;
      }
      const otherUser = await usersRepo.getUserByXeroEmployeeId(m.xeroEmployeeId);
      if (otherUser && otherUser.id !== m.userId) {
        res.status(400).json({ message: `Xero employee ${m.xeroEmployeeId} is already mapped to another user` });
        return;
      }
      xeroIdsUsed.set(m.xeroEmployeeId, m.userId);
    }
  }

  for (const m of mappings) {
    await usersRepo.updateXeroEmployeeId(m.userId, m.xeroEmployeeId ?? null);
    console.log('[XERO_MAP]', {
      action: 'map_employee',
      employerId: userId,
      staffUserId: m.userId,
      xeroEmployeeId: m.xeroEmployeeId ?? 'cleared',
    });
  }

  res.status(200).json({ message: 'Mappings saved' });
}));

/**
 * GET /api/integrations/xero/calendars
 * Returns active payroll calendars for Manual Sync. Business/venue owner only.
 */
router.get('/calendars', authenticateUser, requireBusinessOwner, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const tokens = await getValidTokens(userId);
  if (!tokens) {
    res.status(400).json({ message: 'Xero not connected or token expired. Please reconnect.' });
    return;
  }

  const raw = await xeroOauthService.getPayrollCalendars(tokens.accessToken, tokens.tenantId);
  const calendars = raw.map((c) => ({
    id: c.PayrollCalendarID,
    name: c.Name ?? 'Unnamed',
    calendarType: c.CalendarType ?? 'WEEKLY',
    startDate: parseXeroDate(c.StartDate),
    paymentDate: parseXeroDate(c.PaymentDate),
    referenceDate: parseXeroDate(c.ReferenceDate),
  }));
  res.status(200).json({ calendars });
}));

/**
 * POST /api/integrations/xero/sync-timesheet
 * Sync approved shifts to Xero timesheets. Business/venue owner only.
 * Body: { calendarId: string, startDate: string (ISO), endDate: string (ISO) }
 */
router.post('/sync-timesheet', authenticateUser, requireBusinessOwner, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { calendarId, startDate: startDateStr, endDate: endDateStr } = req.body as {
    calendarId?: string;
    startDate?: string;
    endDate?: string;
  };

  if (!calendarId || typeof calendarId !== 'string') {
    res.status(400).json({ message: 'calendarId is required' });
    return;
  }
  if (!startDateStr || typeof startDateStr !== 'string') {
    res.status(400).json({ message: 'startDate is required (ISO date)' });
    return;
  }
  if (!endDateStr || typeof endDateStr !== 'string') {
    res.status(400).json({ message: 'endDate is required (ISO date)' });
    return;
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    res.status(400).json({ message: 'Invalid startDate or endDate format' });
    return;
  }
  if (startDate > endDate) {
    res.status(400).json({ message: 'startDate must be before or equal to endDate' });
    return;
  }

  const tokens = await getValidTokens(userId);
  if (!tokens) {
    res.status(400).json({ message: 'Xero not connected or token expired. Please reconnect.' });
    return;
  }

  const synced: Array<{ employeeId: string; xeroEmployeeId: string; hours: number; status: string }> = [];
  const failed: Array<{ employeeId: string; reason: string }> = [];

  try {
    const [calendars, payItems, shifts] = await Promise.all([
      xeroOauthService.getPayrollCalendars(tokens.accessToken, tokens.tenantId),
      xeroOauthService.getPayItems(tokens.accessToken, tokens.tenantId),
      shiftsRepo.getApprovedShiftsForEmployerInRange(userId, startDate, endDate),
    ]);

    const calendar = calendars.find((c) => c.PayrollCalendarID === calendarId);
    const daysInPeriod = getDaysInPeriod(calendar?.CalendarType ?? 'WEEKLY');

    const ordinaryRate =
      payItems.earningsRates.find((r) => r.EarningsType === 'ORDINARYTIMEEARNINGS') ??
      payItems.earningsRates[0];
    const earningsRateId = ordinaryRate?.EarningsRateID;
    if (!earningsRateId) {
      res.status(400).json({
        message: 'No earnings rate found in Xero. Ensure Pay Items are configured.',
        synced: [],
        failed: [],
      });
      return;
    }

    const assigneeIds = [...new Set(shifts.map((s) => s.assigneeId).filter(Boolean))] as string[];
    const staffWithXero = await Promise.all(
      assigneeIds.map(async (aid) => {
        const u = await usersRepo.getUserById(aid);
        return u ? { userId: u.id, xeroEmployeeId: u.xeroEmployeeId } : null;
      })
    );

    const assigneeToXero = new Map<string, string>();
    for (const s of staffWithXero) {
      if (s?.xeroEmployeeId) assigneeToXero.set(s.userId, s.xeroEmployeeId);
      else if (s) failed.push({ employeeId: s.userId, reason: 'No Xero mapping' });
    }

    const hoursByEmployee = new Map<string, Map<string, number>>();
    for (const shift of shifts) {
      const aid = shift.assigneeId;
      if (!aid || !assigneeToXero.has(aid)) continue;

      const xeroId = assigneeToXero.get(aid)!;
      if (!hoursByEmployee.has(xeroId)) {
        hoursByEmployee.set(xeroId, new Map());
      }
      const byDate = hoursByEmployee.get(xeroId)!;

      const start = shift.startTime instanceof Date ? shift.startTime : new Date(shift.startTime);
      const end = shift.endTime instanceof Date ? shift.endTime : new Date(shift.endTime);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const dateKey = start.toISOString().slice(0, 10);
      byDate.set(dateKey, (byDate.get(dateKey) ?? 0) + hours);
    }

    const periodStart = toDateOnly(startDate);
    const periodEnd = toDateOnly(endDate);
    const timesheets: XeroTimesheetPayload[] = [];

    for (const [xeroEmployeeId, byDate] of hoursByEmployee) {
      const numberOfUnits = buildNumberOfUnitsArray(
        periodStart,
        periodEnd,
        daysInPeriod,
        byDate
      );
      if (numberOfUnits.every((n) => n === 0)) continue;

      timesheets.push({
        EmployeeID: xeroEmployeeId,
        StartDate: periodStart,
        EndDate: periodEnd,
        Status: 'DRAFT',
        TimesheetLines: [{ EarningsRateID: earningsRateId, NumberOfUnits: numberOfUnits }],
      });
    }

    if (timesheets.length === 0) {
      res.status(200).json({
        message: 'No approved shifts with Xero mapping in date range',
        synced: [],
        failed,
      });
      return;
    }

    await xeroOauthService.createTimesheet(tokens.accessToken, tokens.tenantId, timesheets);

    for (const ts of timesheets) {
      const totalHours = ts.TimesheetLines[0].NumberOfUnits.reduce((a, b) => a + b, 0);
      const staffEntry = staffWithXero.find((s) => s?.xeroEmployeeId === ts.EmployeeID);
      synced.push({
        employeeId: staffEntry?.userId ?? ts.EmployeeID,
        xeroEmployeeId: ts.EmployeeID,
        hours: totalHours,
        status: 'success',
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sync failed';
    console.error('[XERO] Sync timesheet error:', err);
    res.status(500).json({
      message: msg,
      synced,
      failed,
    });
    return;
  }

  res.status(200).json({ synced, failed });
}));

export default router;

// --- Helpers ---

function parseXeroDate(val: string | undefined): string | null {
  if (!val) return null;
  const m = /\/Date\((-?\d+)/.exec(val);
  if (m) {
    const d = new Date(parseInt(m[1], 10));
    return d.toISOString().slice(0, 10);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
  return null;
}

function getDaysInPeriod(calendarType: string): number {
  switch (calendarType) {
    case 'WEEKLY':
      return 7;
    case 'FORTNIGHTLY':
      return 14;
    case 'FOURWEEKLY':
      return 28;
    case 'MONTHLY':
      return 31;
    case 'TWICEMONTHLY':
      return 15;
    case 'QUARTERLY':
      return 91;
    default:
      return 7;
  }
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildNumberOfUnitsArray(
  periodStart: string,
  periodEnd: string,
  daysInPeriod: number,
  byDate: Map<string, number>
): number[] {
  const arr = new Array(daysInPeriod).fill(0);
  const start = new Date(periodStart + 'T00:00:00Z');
  const end = new Date(periodEnd + 'T23:59:59Z');

  for (const [dateKey, hours] of byDate) {
    const d = new Date(dateKey + 'T12:00:00Z');
    if (d >= start && d <= end) {
      const idx = Math.floor((d.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      if (idx >= 0 && idx < daysInPeriod) {
        arr[idx] = hours;
      }
    }
  }
  return arr;
}
