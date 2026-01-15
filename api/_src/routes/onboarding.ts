/**
 * Onboarding Routes
 * 
 * Handles venue onboarding flow for approved waitlist entries
 */

import express from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { verifyApprovedWaitlist } from '../middleware/waitlist-verification.js';
import * as venuesRepo from '../repositories/venues.repository.js';
import * as usersRepo from '../repositories/users.repository.js';
import type { VenueAddress, OperatingHours } from '../db/schema/venues.js';

const router = express.Router();

/**
 * Validation schema for venue profile submission
 */
const VenueProfileSchema = z.object({
  venueName: z.string().min(1).max(255),
  address: z.object({
    street: z.string().min(1),
    suburb: z.string().min(1),
    postcode: z.string().regex(/^[4][0-1][0-9]{2}$/, 'Postcode must be between 4000-4199 (Brisbane Metro)'),
    city: z.string().default('Brisbane'),
    state: z.string().default('QLD'),
    country: z.string().default('AU'),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
  operatingHours: z.record(z.string(), z.object({
    open: z.string().optional(),
    close: z.string().optional(),
    closed: z.boolean().optional(),
  })),
  liquorLicenseNumber: z.string().max(100).optional(),
});

/**
 * POST /api/onboarding/venue-profile
 * 
 * Create or update venue profile for approved waitlist entry
 * Protected by: authenticateUser + verifyApprovedWaitlist
 */
router.post(
  '/venue-profile',
  authenticateUser,
  verifyApprovedWaitlist,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Get waitlist entry from middleware
    const waitlistEntry = (req as any).waitlistEntry;
    if (!waitlistEntry) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'No approved waitlist entry found'
      });
      return;
    }

    // Validate request body
    const validationResult = VenueProfileSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation error',
        message: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
      return;
    }

    const { venueName, address, operatingHours, liquorLicenseNumber } = validationResult.data;

    // Validate that at least one day has operating hours set
    const hasHours = Object.values(operatingHours).some(
      (day) => day && (day.open || day.close || day.closed)
    );
    if (!hasHours) {
      res.status(400).json({
        error: 'Validation error',
        message: 'Operating hours must be set for at least one day'
      });
      return;
    }

    // Check if venue already exists for this user
    const existingVenue = await venuesRepo.getVenueByUserId(req.user.id);
    
    if (existingVenue) {
      // Update existing venue
      const updatedVenue = await venuesRepo.updateVenue(existingVenue.id, {
        venueName,
        address: address as VenueAddress,
        operatingHours: operatingHours as OperatingHours,
        liquorLicenseNumber,
      });

      if (!updatedVenue) {
        res.status(500).json({
          error: 'Internal server error',
          message: 'Failed to update venue profile'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: updatedVenue.id,
          venueName: updatedVenue.venueName,
          address: updatedVenue.address,
          operatingHours: updatedVenue.operatingHours,
          liquorLicenseNumber: updatedVenue.liquorLicenseNumber,
          waitlistId: updatedVenue.waitlistId,
          createdAt: updatedVenue.createdAt.toISOString(),
          updatedAt: updatedVenue.updatedAt.toISOString(),
        },
      });
      return;
    }

    // Create new venue profile
    const newVenue = await venuesRepo.createVenue({
      userId: req.user.id,
      waitlistId: waitlistEntry.id,
      venueName,
      address: address as VenueAddress,
      operatingHours: operatingHours as OperatingHours,
      liquorLicenseNumber,
    });

    if (!newVenue) {
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create venue profile'
      });
      return;
    }

    // Update user role to 'business' and ensure isOnboarded is true
    const currentUser = await usersRepo.getUserById(req.user.id);
    if (currentUser) {
      const existingRoles = currentUser.roles || [];
      const rolesToStore = Array.from(new Set([...existingRoles, 'business', 'venue']));
      
      // Always update to ensure role='business' and isOnboarded=true
      await usersRepo.updateUser(req.user.id, {
        role: 'business',
        roles: rolesToStore,
        isOnboarded: true,
      });
    }

    res.status(201).json({
      success: true,
      data: {
        id: newVenue.id,
        venueName: newVenue.venueName,
        address: newVenue.address,
        operatingHours: newVenue.operatingHours,
        liquorLicenseNumber: newVenue.liquorLicenseNumber,
        waitlistId: newVenue.waitlistId,
        createdAt: newVenue.createdAt.toISOString(),
        updatedAt: newVenue.updatedAt.toISOString(),
      },
    });
  })
);

export default router;
