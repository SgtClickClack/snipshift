/**
 * Reports Routes
 * 
 * Admin-only endpoints for launch readiness and analytics
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateUser, AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import * as waitlistRepo from '../repositories/waitlist.repository.js';

const router = express.Router();

// Apply admin middleware to all routes
router.use(authenticateUser);
router.use(requireAdmin);

/**
 * GET /api/admin/reports/launch-readiness
 * 
 * Get onboarding metrics for Brisbane launch readiness
 * Returns conversion rates, stuck leads, and venue distribution by postcode
 */
router.get(
  '/launch-readiness',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const metrics = await waitlistRepo.getOnboardingMetrics();

      if (!metrics) {
        res.status(500).json({
          error: 'Internal server error',
          message: 'Failed to fetch onboarding metrics'
        });
        return;
      }

      // Format response with focus on Fortitude Valley (4006)
      const fortitudeValleyData = metrics.venuesByPostcode.find(
        p => p.postcode === '4006'
      ) || { postcode: '4006', count: 0, venues: [] };

      res.status(200).json({
        summary: {
          totalApproved: metrics.totalApproved,
          totalOnboarded: metrics.totalOnboarded,
          totalBusinessUsers: metrics.totalBusinessUsers,
          totalProfessionalUsers: metrics.totalProfessionalUsers,
          conversionRate: metrics.conversionRate,
          pendingOnboarding: metrics.pendingOnboarding,
          atRiskCount: metrics.atRiskCount,
        },
        stuckInFunnel: {
          count: metrics.stuckLeads.length,
          entries: metrics.stuckLeads.map(lead => ({
            name: lead.name,
            contact: lead.contact,
            role: lead.role,
            location: lead.location,
            approvedAt: lead.approvedAt?.toISOString() || null,
            reason: 'no_venue_profile', // Will be determined by frontend logic
          })),
        },
        atRisk: {
          count: metrics.atRiskCount,
          entries: metrics.atRiskLeads.map(lead => ({
            name: lead.name,
            contact: lead.contact,
            role: lead.role,
            location: lead.location,
            approvedAt: lead.approvedAt?.toISOString() || null,
            hoursSinceApproval: lead.approvedAt 
              ? Math.floor((Date.now() - new Date(lead.approvedAt).getTime()) / (1000 * 60 * 60))
              : 0,
          })),
        },
        spatialAnalysis: {
          postcodeGroups: metrics.venuesByPostcode.map(group => ({
            postcode: group.postcode,
            count: group.count,
            venues: group.venues.map(v => ({
              venueName: v.venueName,
              hasProfile: v.hasProfile,
            })),
          })),
        },
      });
    } catch (error: any) {
      console.error('[REPORTS] Error fetching launch readiness:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error?.message || 'Failed to generate launch readiness report'
      });
    }
  })
);

export default router;
