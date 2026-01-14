/**
 * Waitlist API Routes
 * 
 * Handles waitlist signups for Brisbane launch
 */

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateUser, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import * as waitlistRepo from '../repositories/waitlist.repository.js';

const router = Router();

/**
 * Waitlist submission schema
 */
const WaitlistSchema = z.object({
  role: z.enum(['venue', 'staff']),
  venueName: z.string().min(1).optional(), // For venue role
  managerEmail: z.string().email().optional(), // For venue role
  fullName: z.string().min(1).optional(), // For staff role
  mobileNumber: z.string().min(1).optional(), // For staff role
  location: z.string().optional().default('Brisbane, AU'),
}).refine(
  (data) => {
    // For venue: require venueName and managerEmail
    if (data.role === 'venue') {
      return data.venueName && data.managerEmail;
    }
    // For staff: require fullName and mobileNumber
    if (data.role === 'staff') {
      return data.fullName && data.mobileNumber;
    }
    return true;
  },
  {
    message: 'Missing required fields for the selected role',
  }
);

/**
 * POST /api/waitlist
 * 
 * Submit a waitlist entry
 * Public endpoint - no authentication required
 */
router.post('/', asyncHandler(async (req, res) => {
  // Validate request body
  const validationResult = WaitlistSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ 
      error: 'Validation error',
      details: validationResult.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  const data = validationResult.data;
  
  // Normalize data based on role
  const name = data.role === 'venue' 
    ? (data.venueName || '')
    : (data.fullName || '');
  
  const contact = data.role === 'venue'
    ? (data.managerEmail || '')
    : (data.mobileNumber || '');

  // Normalize location to ISO format
  const location = data.location || 'Brisbane, AU';

  try {
    // Store the waitlist entry in database
    const entry = await waitlistRepo.createWaitlistEntry({
      role: data.role,
      name,
      contact,
      location,
    });

    if (!entry) {
      console.error('[WAITLIST] Failed to create waitlist entry in database');
      res.status(500).json({ error: 'Failed to process signup. Please try again later.' });
      return;
    }

    console.log(`[WAITLIST] New waitlist entry created: ${entry.id} - ${name} (${data.role})`);

    res.status(201).json({
      success: true,
      message: 'Successfully added to waitlist',
      id: entry.id,
    });
  } catch (error: any) {
    console.error('[WAITLIST] Error processing waitlist entry:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error?.message || 'Failed to process waitlist signup',
    });
  }
}));

/**
 * GET /api/waitlist
 * 
 * Get all waitlist entries (admin only)
 * Query parameters:
 * - role: Filter by role ('venue' | 'staff')
 * - limit: Maximum number of entries (default: 1000)
 * - offset: Number of entries to skip (default: 0)
 */
router.get(
  '/',
  authenticateUser,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const role = req.query.role as 'venue' | 'staff' | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 1000;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    // Validate query parameters
    if (role && !['venue', 'staff'].includes(role)) {
      res.status(400).json({ 
        error: 'Invalid role parameter',
        message: 'Role must be either "venue" or "staff"'
      });
      return;
    }

    if (limit < 1 || limit > 10000) {
      res.status(400).json({ 
        error: 'Invalid limit parameter',
        message: 'Limit must be between 1 and 10000'
      });
      return;
    }

    if (offset < 0) {
      res.status(400).json({ 
        error: 'Invalid offset parameter',
        message: 'Offset must be non-negative'
      });
      return;
    }

    try {
      const entries = await waitlistRepo.getAllWaitlistEntries({
        role,
        limit,
        offset,
      });

      res.status(200).json({
        success: true,
        data: entries,
        count: entries.length,
        limit,
        offset,
      });
    } catch (error: any) {
      console.error('[WAITLIST] Error fetching waitlist entries:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error?.message || 'Failed to fetch waitlist entries',
      });
    }
  })
);

export default router;
