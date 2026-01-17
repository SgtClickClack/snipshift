/**
 * Cron Financial Reconciliation Endpoint
 *
 * Secured endpoint for scheduled reconciliation between Stripe and internal payout records.
 * Requires CRON_SECRET in Authorization header for security (matches other cron endpoints).
 */

import express from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { reconcileRecentPayouts } from '../../services/financial-reconciliation.service.js';

const router = express.Router();

function isAuthorized(req: express.Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret =
    req.headers.authorization?.replace('Bearer ', '') ||
    (req.headers['x-cron-secret'] as string | undefined) ||
    (req.query.secret as string | undefined);

  return !!cronSecret && providedSecret === cronSecret;
}

router.get('/financial-reconcile', asyncHandler(async (req, res) => {
  if (!process.env.CRON_SECRET) {
    res.status(500).json({
      success: false,
      message: 'CRON_SECRET environment variable is required for cron job security',
    });
    return;
  }

  if (!isAuthorized(req)) {
    res.status(401).json({ success: false, message: 'Invalid or missing CRON_SECRET' });
    return;
  }

  const daysBack = typeof req.query.daysBack === 'string' ? parseInt(req.query.daysBack, 10) : undefined;
  const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : undefined;

  try {
    const result = await reconcileRecentPayouts({ daysBack, limit });
    res.status(200).json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    // Return 200 to avoid immediate cron retries; logs/monitoring should capture the error.
    res.status(200).json({
      success: false,
      message: 'Financial reconciliation completed with errors',
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}));

router.post('/financial-reconcile', asyncHandler(async (req, res) => {
  if (!process.env.CRON_SECRET) {
    res.status(500).json({
      success: false,
      message: 'CRON_SECRET environment variable is required for cron job security',
    });
    return;
  }

  if (!isAuthorized(req)) {
    res.status(401).json({ success: false, message: 'Invalid or missing CRON_SECRET' });
    return;
  }

  const daysBack = typeof req.body?.daysBack === 'number' ? req.body.daysBack : undefined;
  const limit = typeof req.body?.limit === 'number' ? req.body.limit : undefined;

  try {
    const result = await reconcileRecentPayouts({ daysBack, limit });
    res.status(200).json({ success: true, result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(200).json({
      success: false,
      message: 'Financial reconciliation completed with errors',
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}));

export default router;

