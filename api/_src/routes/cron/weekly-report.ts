/**
 * Cron Weekly Report Endpoint
 * 
 * Secured endpoint for Vercel Cron Jobs to trigger weekly founder report
 * Requires CRON_SECRET in Authorization header for security
 */

import express from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { sendWeeklyReport } from '../../scripts/send-weekly-report.js';

const router = express.Router();

/**
 * GET/POST /api/cron/weekly-report
 * 
 * Secured endpoint for Vercel Cron Jobs
 * Validates CRON_SECRET before executing weekly report generation and email
 * Supports both GET (default Vercel cron) and POST requests
 */
router.get('/weekly-report', asyncHandler(async (req, res) => {
  // Verify CRON_SECRET for security
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = req.headers.authorization?.replace('Bearer ', '') || 
                         req.headers['x-cron-secret'] || 
                         req.query.secret as string;

  if (!cronSecret) {
    console.error('[Cron Weekly Report] CRON_SECRET not configured in environment variables');
    res.status(500).json({ 
      error: 'Cron secret not configured',
      message: 'CRON_SECRET environment variable is required for cron job security'
    });
    return;
  }

  if (providedSecret !== cronSecret) {
    console.warn('[Cron Weekly Report] Unauthorized access attempt', {
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

  // Execute weekly report generation and email
  console.log('[Cron Weekly Report] Executing weekly report...');
  
  try {
    const success = await sendWeeklyReport();
    
    res.status(200).json({
      success,
      message: success ? 'Weekly report sent successfully' : 'Weekly report failed to send',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron Weekly Report] Error executing weekly report:', error);
    
    // Still return 200 to prevent Vercel from retrying immediately
    // The error is logged and can be monitored
    res.status(200).json({
      success: false,
      message: 'Weekly report completed with errors',
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}));

router.post('/weekly-report', asyncHandler(async (req, res) => {
  // Verify CRON_SECRET for security
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = req.headers.authorization?.replace('Bearer ', '') || 
                         req.headers['x-cron-secret'] || 
                         req.query.secret as string;

  if (!cronSecret) {
    console.error('[Cron Weekly Report] CRON_SECRET not configured in environment variables');
    res.status(500).json({ 
      error: 'Cron secret not configured',
      message: 'CRON_SECRET environment variable is required for cron job security'
    });
    return;
  }

  if (providedSecret !== cronSecret) {
    console.warn('[Cron Weekly Report] Unauthorized access attempt', {
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

  // Execute weekly report generation and email
  console.log('[Cron Weekly Report] Executing weekly report...');
  
  try {
    const success = await sendWeeklyReport();
    
    res.status(200).json({
      success,
      message: success ? 'Weekly report sent successfully' : 'Weekly report failed to send',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron Weekly Report] Error executing weekly report:', error);
    
    // Still return 200 to prevent Vercel from retrying immediately
    // The error is logged and can be monitored
    res.status(200).json({
      success: false,
      message: 'Weekly report completed with errors',
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}));

export default router;
