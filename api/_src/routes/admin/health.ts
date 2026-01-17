/**
 * Admin Health Check Route
 * 
 * Secure endpoint for Founder's Control Panel (Health Check Dashboard)
 * Requires SuperAdmin role (user.role === 'admin')
 */

import express from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authenticateUser, AuthenticatedRequest, requireSuperAdmin } from '../../middleware/auth.js';
import { checkSystemPulse } from '../../services/health.service.js';
import { getWeeklyMetrics } from '../../services/reporting.service.js';
import { getDb } from '../../db/index.js';
import { failedEmails } from '../../db/schema/failed-emails.js';
import { desc } from 'drizzle-orm';

const router = express.Router();

// Apply authentication and SuperAdmin authorization
router.use(authenticateUser);
router.use(requireSuperAdmin);

/**
 * GET /api/admin/health
 * 
 * Returns system pulse check for all critical services
 * Response format:
 * {
 *   database: { service: 'database', status: 'UP'|'DOWN', latency: number, message?: string, error?: string },
 *   stripe: { service: 'stripe', status: 'UP'|'DOWN', latency: number, message?: string, error?: string },
 *   pusher: { service: 'pusher', status: 'UP'|'DOWN', latency: number, message?: string, error?: string },
 *   resend: { service: 'resend', status: 'UP'|'DOWN', latency: number, message?: string, error?: string },
 *   timestamp: string
 * }
 */
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Verify user has admin role (requireSuperAdmin already checks this, but double-check for clarity)
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      error: 'Forbidden',
      message: 'SuperAdmin access required',
    });
    return;
  }

  try {
    const systemPulse = await checkSystemPulse();
    
    res.status(200).json(systemPulse);
  } catch (error: any) {
    console.error('[ADMIN HEALTH] Error checking system pulse:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Failed to check system pulse',
    });
  }
}));

/**
 * GET /api/admin/health/weekly-metrics
 * 
 * Returns weekly metrics from the Reporting Service
 */
router.get('/weekly-metrics', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      error: 'Forbidden',
      message: 'SuperAdmin access required',
    });
    return;
  }

  try {
    const metrics = await getWeeklyMetrics();
    
    // Convert Date objects to ISO strings for JSON response
    res.status(200).json({
      ...metrics,
      dateRange: {
        start: metrics.dateRange.start.toISOString(),
        end: metrics.dateRange.end.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[ADMIN HEALTH] Error fetching weekly metrics:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Failed to fetch weekly metrics',
    });
  }
}));

/**
 * GET /api/admin/health/system-log
 * 
 * Returns the 10 most recent entries from the failed_emails table
 */
router.get('/system-log', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      error: 'Forbidden',
      message: 'SuperAdmin access required',
    });
    return;
  }

  try {
    const db = getDb();
    if (!db) {
      res.status(500).json({
        error: 'Database unavailable',
        message: 'Database connection not available',
      });
      return;
    }

    // Fetch 10 most recent failed emails
    const logs = await db
      .select()
      .from(failedEmails)
      .orderBy(desc(failedEmails.createdAt))
      .limit(10);

    // Convert to JSON-serializable format
    const formattedLogs = logs.map(log => ({
      id: log.id,
      to: log.to,
      subject: log.subject,
      from: log.from,
      errorMessage: log.errorMessage,
      errorCode: log.errorCode,
      createdAt: log.createdAt?.toISOString() || null,
      recoveredAt: log.recoveredAt?.toISOString() || null,
    }));

    res.status(200).json({
      logs: formattedLogs,
      count: formattedLogs.length,
    });
  } catch (error: any) {
    console.error('[ADMIN HEALTH] Error fetching system log:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Failed to fetch system log',
    });
  }
}));

export default router;
