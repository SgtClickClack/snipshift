/**
 * Waitlist Verification Middleware
 * 
 * Verifies that the user has an approved waitlist entry for venue onboarding
 * MUST be used after authenticateUser middleware
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import * as waitlistRepo from '../repositories/waitlist.repository.js';

/**
 * Verify user has an approved waitlist entry
 * Checks if user's email matches an approved waitlist entry
 */
export async function verifyApprovedWaitlist(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized: Authentication required' });
    return;
  }

  try {
    // Get waitlist entry by user's email (contact field)
    const waitlistEntry = await waitlistRepo.getWaitlistEntryByContact(
      req.user.email,
      'venue' // Only check venue entries for venue onboarding
    );

    if (!waitlistEntry) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'No waitlist entry found for this email address'
      });
      return;
    }

    if (waitlistEntry.approvalStatus !== 'approved') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Your waitlist application has not been approved yet',
        approvalStatus: waitlistEntry.approvalStatus
      });
      return;
    }

    // Attach waitlist entry to request for use in route handlers
    (req as any).waitlistEntry = waitlistEntry;
    next();
  } catch (error: any) {
    console.error('[WAITLIST VERIFICATION] Error verifying waitlist:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify waitlist status'
    });
  }
}
