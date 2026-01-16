/**
 * Cron Health Check Endpoint
 * 
 * Secured endpoint for Vercel Cron Jobs to trigger health monitoring
 * Requires CRON_SECRET in Authorization header for security
 */

import express from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { monitorHealth } from '../../scripts/monitor-health.js';

const router = express.Router();

/**
 * GET/POST /api/cron/health-check
 * 
 * Secured endpoint for Vercel Cron Jobs
 * Validates CRON_SECRET before executing health monitoring
 * Supports both GET (default Vercel cron) and POST requests
 */
router.get('/health-check', asyncHandler(async (req, res) => {
  // Verify CRON_SECRET for security
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = req.headers.authorization?.replace('Bearer ', '') || 
                         req.headers['x-cron-secret'] || 
                         req.query.secret as string;

  if (!cronSecret) {
    console.error('[Cron Health Check] CRON_SECRET not configured in environment variables');
    res.status(500).json({ 
      error: 'Cron secret not configured',
      message: 'CRON_SECRET environment variable is required for cron job security'
    });
    return;
  }

  if (providedSecret !== cronSecret) {
    console.warn('[Cron Health Check] Unauthorized access attempt', {
      hasSecret: !!providedSecret,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid or missing CRON_SECRET'
    });
    return;
  }

  // Execute health monitoring
  console.log('[Cron Health Check] Executing health monitor...');
  
  try {
    await monitorHealth();
    
    res.status(200).json({
      success: true,
      message: 'Health check completed',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron Health Check] Error executing health monitor:', error);
    
    // Still return 200 to prevent Vercel from retrying immediately
    // The error is logged and email alert should have been sent if health check failed
    res.status(200).json({
      success: false,
      message: 'Health check completed with errors',
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}));

router.post('/health-check', asyncHandler(async (req, res) => {
  // Verify CRON_SECRET for security
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = req.headers.authorization?.replace('Bearer ', '') || 
                         req.headers['x-cron-secret'] || 
                         req.query.secret as string;

  if (!cronSecret) {
    console.error('[Cron Health Check] CRON_SECRET not configured in environment variables');
    res.status(500).json({ 
      error: 'Cron secret not configured',
      message: 'CRON_SECRET environment variable is required for cron job security'
    });
    return;
  }

  if (providedSecret !== cronSecret) {
    console.warn('[Cron Health Check] Unauthorized access attempt', {
      hasSecret: !!providedSecret,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid or missing CRON_SECRET'
    });
    return;
  }

  // Execute health monitoring
  console.log('[Cron Health Check] Executing health monitor...');
  
  try {
    await monitorHealth();
    
    res.status(200).json({
      success: true,
      message: 'Health check completed',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron Health Check] Error executing health monitor:', error);
    
    // Still return 200 to prevent Vercel from retrying immediately
    // The error is logged and email alert should have been sent if health check failed
    res.status(200).json({
      success: false,
      message: 'Health check completed with errors',
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}));

export default router;
