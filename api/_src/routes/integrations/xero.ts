/**
 * Xero Integration Routes
 * Isolated OAuth flow - does not touch core auth (Firebase/Google)
 */

import { Router } from 'express';
import crypto from 'crypto';
import { authenticateUser, AuthenticatedRequest, requireBusinessOwner } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import * as xeroOauthService from '../../services/xero-oauth.service.js';
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

export default router;
