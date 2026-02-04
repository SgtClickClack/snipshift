/**
 * Worker Routes
 * 
 * Handles worker-specific endpoints (earnings, payouts, etc.)
 */

import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as payoutsRepo from '../repositories/payouts.repository.js';
import * as usersRepo from '../repositories/users.repository.js';
import * as shiftsRepo from '../repositories/shifts.repository.js';
import * as shiftApplicationsRepo from '../repositories/shift-applications.repository.js';
import * as shiftWaitlistRepo from '../repositories/shift-waitlist.repository.js';
import * as priorityBoostTokensRepo from '../repositories/priority-boost-tokens.repository.js';
import * as calendarTokensRepo from '../repositories/calendar-tokens.repository.js';
import { getDb } from '../db/index.js';
import { shifts, users } from '../db/schema.js';
import { eq, and, ne, inArray, gte, isNotNull, sql } from 'drizzle-orm';
import { calculateDistance } from '../utils/geofencing.js';
import { normalizeQueryOptional, normalizeParam } from '../utils/request-params.js';

const router = Router();

/**
 * GET /api/worker/earnings
 * 
 * Get worker earnings data including total lifetime earnings and payout history
 */
router.get('/earnings', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Get date range filter from query params
  const { period } = req.query; // 'current_month', 'last_3_months', 'all_time'
  
  let startDate: Date | undefined;
  const endDate = new Date();
  
  if (period === 'current_month') {
    startDate = new Date();
    startDate.setDate(1); // First day of current month
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'last_3_months') {
    startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    startDate.setHours(0, 0, 0, 0);
  }
  // 'all_time' or undefined means no date filter

  // Get user's total earnings
  const user = await usersRepo.getUserById(userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const totalEarnedCents = parseInt(user.totalEarnedCents?.toString() || '0', 10);

  // Get payouts with shift and venue details
  const payouts = await payoutsRepo.getPayoutsForWorker(userId, {
    startDate,
    endDate,
  });

  // Transform payouts for response
  const payoutHistory = payouts.map((payout) => ({
    id: payout.id,
    shiftId: payout.shiftId,
    amountCents: payout.amountCents,
    amountDollars: (payout.amountCents / 100).toFixed(2),
    hourlyRate: parseFloat(payout.hourlyRate),
    hoursWorked: parseFloat(payout.hoursWorked),
    status: payout.status,
    processedAt: payout.processedAt?.toISOString() || null,
    createdAt: payout.createdAt.toISOString(),
    // Shift details
    shift: payout.shift ? {
      id: payout.shift.id,
      title: payout.shift.title,
      startTime: payout.shift.startTime.toISOString(),
      endTime: payout.shift.endTime.toISOString(),
      location: payout.shift.location,
    } : null,
    // Venue details
    venue: payout.venue ? {
      id: payout.venue.id,
      name: payout.venue.name,
      email: payout.venue.email,
    } : null,
  }));

  // Calculate filtered totals
  // IMPORTANT: Only completed payouts count toward "earned" totals (pending/failed are not settled).
  const completedPayoutsTotalCents = payoutHistory
    .filter((payout) => payout.status === 'completed')
    .reduce((sum, payout) => sum + payout.amountCents, 0);

  res.status(200).json({
    totalEarnedCents,
    totalEarnedDollars: (totalEarnedCents / 100).toFixed(2),
    filteredTotalCents: period ? completedPayoutsTotalCents : totalEarnedCents,
    filteredTotalDollars: period
      ? (completedPayoutsTotalCents / 100).toFixed(2)
      : (totalEarnedCents / 100).toFixed(2),
    period: period || 'all_time',
    payoutHistory,
    payoutCount: payoutHistory.length,
  });
}));

/**
 * GET /api/worker/recommendations
 * 
 * Get personalized shift recommendations for a worker based on:
 * - Proximity (40%): Shifts within 5km of home/current location
 * - Venue Rating (30%): Higher-rated venues are prioritized
 * - Recency (30%): Newly posted shifts
 */
router.get('/recommendations', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const db = getDb();
  if (!db) {
    res.status(500).json({ message: 'Database not available' });
    return;
  }

  // Get worker's location (from query params or user profile)
  const latStr = normalizeQueryOptional(req.query.lat);
  const workerLat = latStr ? parseFloat(latStr) : null;
  const lngStr = normalizeQueryOptional(req.query.lng);
  const workerLng = lngStr ? parseFloat(lngStr) : null;

  // If no coordinates provided, return empty recommendations (graceful fallback)
  // This prevents 400 errors when geolocation is denied or unavailable
  const userLat = workerLat;
  const userLng = workerLng;
  
  if (!userLat || !userLng || isNaN(userLat) || isNaN(userLng)) {
    console.log('[GET /api/worker/recommendations] No location provided, returning empty recommendations');
    res.status(200).json({
      recommendations: [],
      count: 0,
      message: 'Enable location services to see personalized shift recommendations near you',
    });
    return;
  }

  // Get all open shifts (exclude filled/completed)
  const openShifts = await db
    .select({
      shift: shifts,
      venue: users,
    })
    .from(shifts)
    .innerJoin(users, eq(shifts.employerId, users.id))
    .where(
      and(
        eq(shifts.status, 'open'),
        gte(shifts.startTime, new Date()), // Only future shifts
        isNotNull(shifts.lat),
        isNotNull(shifts.lng),
      )
    )
    .limit(100); // Get more than needed to calculate scores

  if (openShifts.length === 0) {
    res.status(200).json({
      recommendations: [],
      message: 'No open shifts available for recommendations',
    });
    return;
  }

  // Get priority boost multiplier for worker (1.0 = no boost, 1.1 = +10% boost)
  const priorityBoostMultiplier = await priorityBoostTokensRepo.getPriorityBoostMultiplier(userId);

  // Calculate recommendation scores for each shift
  const scoredShifts = openShifts.map(({ shift, venue }) => {
    const shiftLat = typeof shift.lat === 'number' ? shift.lat : parseFloat(shift.lat?.toString() || '0');
    const shiftLng = typeof shift.lng === 'number' ? shift.lng : parseFloat(shift.lng?.toString() || '0');

    // Skip shifts without valid coordinates
    if (!shiftLat || !shiftLng || isNaN(shiftLat) || isNaN(shiftLng)) {
      return null;
    }

    // 1. Proximity Score (40% weight)
    // Calculate distance in kilometers
    const distanceMeters = calculateDistance(userLat!, userLng!, shiftLat, shiftLng);
    const distanceKm = distanceMeters / 1000;
    
    // Score: 1.0 if within 5km, linearly decreases to 0 at 20km
    let proximityScore = 0;
    if (distanceKm <= 5) {
      proximityScore = 1.0;
    } else if (distanceKm <= 20) {
      proximityScore = 1.0 - ((distanceKm - 5) / 15); // Linear decrease from 5km to 20km
    } else {
      proximityScore = 0; // Beyond 20km gets 0 score
    }
    proximityScore = Math.max(0, Math.min(1, proximityScore)); // Clamp to 0-1

    // 2. Venue Rating Score (30% weight)
    // Normalize rating from 0-5 scale to 0-1 scale
    const venueRating = parseFloat(venue.averageRating?.toString() || '0');
    const ratingScore = Math.max(0, Math.min(1, venueRating / 5)); // 0-5 -> 0-1

    // 3. Recency Score (30% weight)
    // Score based on how recently the shift was posted
    const now = new Date();
    const createdAt = new Date(shift.createdAt);
    const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    // Score: 1.0 if posted within last 24 hours, decreases linearly to 0 at 7 days
    let recencyScore = 0;
    if (hoursSinceCreation <= 24) {
      recencyScore = 1.0;
    } else if (hoursSinceCreation <= 168) { // 7 days
      recencyScore = 1.0 - ((hoursSinceCreation - 24) / 144); // Linear decrease
    } else {
      recencyScore = 0;
    }
    recencyScore = Math.max(0, Math.min(1, recencyScore)); // Clamp to 0-1

    // Calculate weighted total score
    let totalScore = (proximityScore * 0.4) + (ratingScore * 0.3) + (recencyScore * 0.3);
    
    // Apply priority boost multiplier (+10% if worker has active token)
    totalScore = totalScore * priorityBoostMultiplier;

    // Determine match reason
    let matchReason = 'Recommended for you';
    if (priorityBoostMultiplier > 1.0) {
      matchReason = 'Priority Boost Active';
    }
    if (distanceKm <= 5 && proximityScore >= 0.8) {
      matchReason = 'Close to home';
    } else if (venueRating >= 4.5) {
      matchReason = 'Highly Rated Venue';
    } else if (hoursSinceCreation <= 24) {
      matchReason = 'Just Posted';
    } else if (venueRating >= 4.0) {
      matchReason = 'Top Rated Venue';
    }

    return {
      shift,
      venue,
      score: totalScore,
      proximityScore,
      ratingScore,
      recencyScore,
      distanceKm: Math.round(distanceKm * 10) / 10, // Round to 1 decimal
      matchReason,
    };
  })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.score - a.score) // Sort by score descending
    .slice(0, 10); // Limit to top 10

  // Transform for response
  const recommendations = scoredShifts.map(({ shift, venue, score, distanceKm, matchReason }) => ({
    id: shift.id,
    title: shift.title,
    description: shift.description,
    startTime: shift.startTime.toISOString(),
    endTime: shift.endTime.toISOString(),
    hourlyRate: shift.hourlyRate.toString(),
    location: shift.location,
    lat: shift.lat?.toString(),
    lng: shift.lng?.toString(),
    distanceKm,
    matchReason,
    score: Math.round(score * 100) / 100, // Round to 2 decimals
    venue: {
      id: venue.id,
      name: venue.name,
      averageRating: venue.averageRating ? parseFloat(venue.averageRating.toString()) : null,
      reviewCount: venue.reviewCount ? parseInt(venue.reviewCount.toString(), 10) : 0,
    },
    createdAt: shift.createdAt.toISOString(),
  }));

  res.status(200).json({
    recommendations,
    count: recommendations.length,
  });
}));

/**
 * GET /api/worker/waitlisted-shifts
 * 
 * Get shifts where the worker is on the waitlist (standby).
 * Returns an empty array if the worker has no waitlisted shifts.
 */
router.get('/waitlisted-shifts', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    // Get waitlisted shifts for this worker
    const waitlistedEntries = await shiftWaitlistRepo.getWaitlistEntriesByWorker(userId);

    // If no waitlisted shifts, return empty array (graceful response)
    if (!waitlistedEntries || waitlistedEntries.length === 0) {
      res.status(200).json({
        shifts: [],
        count: 0,
        message: 'No waitlisted shifts at the moment',
      });
      return;
    }

    // Get full shift details for each waitlist entry
    const shiftsWithDetails = await Promise.all(
      waitlistedEntries.map(async (entry: { id: string; shiftId: string; rank: number; status: string; createdAt: Date | null }) => {
        const shift = await shiftsRepo.getShiftById(entry.shiftId);
        if (!shift) return null;

        // Get employer/venue details
        const employer = await usersRepo.getUserById(shift.employerId);

        return {
          waitlistEntry: {
            id: entry.id,
            position: entry.rank,
            joinedAt: entry.createdAt?.toISOString() || new Date().toISOString(),
            status: entry.status || 'active',
          },
          shift: {
            id: shift.id,
            title: shift.title,
            description: shift.description,
            startTime: shift.startTime.toISOString(),
            endTime: shift.endTime.toISOString(),
            hourlyRate: shift.hourlyRate.toString(),
            location: shift.location,
            status: shift.status,
          },
          venue: employer ? {
            id: employer.id,
            name: employer.name,
            avatarUrl: employer.avatarUrl,
          } : null,
        };
      })
    );

    // Filter out null entries (shifts that no longer exist)
    type WaitlistedShiftItem = {
      waitlistEntry: { id: string; position: number; joinedAt: string; status: string };
      shift: { id: string; title: string; description: string; startTime: string; endTime: string; hourlyRate: string; location: string | null; status: string };
      venue: { id: string; name: string | null; avatarUrl: string | null } | null;
    };
    const validShifts = shiftsWithDetails.filter((s: WaitlistedShiftItem | null): s is WaitlistedShiftItem => s !== null);

    res.status(200).json({
      shifts: validShifts,
      count: validShifts.length,
    });
  } catch (error) {
    console.error('[GET /api/worker/waitlisted-shifts] Error:', error);
    // Return empty array on error (graceful degradation)
    res.status(200).json({
      shifts: [],
      count: 0,
      message: 'Unable to fetch waitlisted shifts',
    });
  }
}));

/**
 * GET /api/worker/priority-boost
 * 
 * Get active priority boost status for the authenticated worker
 */
router.get('/priority-boost', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const tokenWithDetails = await priorityBoostTokensRepo.getActiveTokenWithDetails(userId);
    
    if (!tokenWithDetails) {
      res.status(200).json({
        hasActiveBoost: false,
        message: 'No active priority boost token',
      });
      return;
    }

    const now = new Date();
    const expiresAt = new Date(tokenWithDetails.token.expiresAt);
    const hoursRemaining = Math.max(0, (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));

    res.status(200).json({
      hasActiveBoost: true,
      token: {
        id: tokenWithDetails.token.id,
        grantedAt: tokenWithDetails.token.grantedAt.toISOString(),
        expiresAt: tokenWithDetails.token.expiresAt.toISOString(),
        hoursRemaining: Math.round(hoursRemaining * 10) / 10, // Round to 1 decimal
      },
      shift: {
        id: tokenWithDetails.shift.id,
        title: tokenWithDetails.shift.title,
        startTime: tokenWithDetails.shift.startTime.toISOString(),
      },
      boostMultiplier: 1.1, // +10% boost
    });
  } catch (error) {
    console.error('[GET /api/worker/priority-boost] Error:', error);
    res.status(500).json({ message: 'Failed to fetch priority boost status' });
  }
}));

/**
 * GET /api/worker/no-show-history
 * 
 * Get no-show history for the authenticated worker
 */
router.get('/no-show-history', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const db = getDb();
  if (!db) {
    res.status(500).json({ message: 'Database not available' });
    return;
  }

  try {
    // Get all no-show shifts for this worker
    const noShowShifts = await db
      .select({
        id: shifts.id,
        title: shifts.title,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        location: shifts.location,
        employerId: shifts.employerId,
        createdAt: shifts.createdAt,
      })
      .from(shifts)
      .where(
        and(
          eq(shifts.assigneeId, userId),
          eq(shifts.attendanceStatus, 'no_show')
        )
      )
      .orderBy(sql`${shifts.startTime} DESC`)
      .limit(50);

    // Get employer names
    const shiftsWithEmployers = await Promise.all(
      noShowShifts.map(async (shift) => {
        const employer = await usersRepo.getUserById(shift.employerId);
        return {
          ...shift,
          employerName: employer?.name || 'Unknown Venue',
        };
      })
    );

    res.status(200).json({
      noShows: shiftsWithEmployers,
      count: shiftsWithEmployers.length,
    });
  } catch (error: any) {
    console.error('[GET /api/worker/no-show-history] Error:', error);
    res.status(500).json({ message: 'Failed to fetch no-show history' });
  }
}));

/**
 * GET /api/worker/calendar/sync
 * 
 * Generate a secure iCal feed URL for the worker's accepted shifts
 * Creates or retrieves an active calendar token for the authenticated user
 */
router.get('/calendar/sync', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    // Check if user already has an active token
    let tokenRecord = await calendarTokensRepo.getActiveTokenForUser(userId);
    
    // If no active token exists, create a new one
    if (!tokenRecord) {
      // Create token with optional expiration (1 year from now)
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      
      tokenRecord = await calendarTokensRepo.createCalendarToken({
        userId,
        expiresAt,
      });
    }

    if (!tokenRecord) {
      res.status(500).json({ message: 'Failed to generate calendar token' });
      return;
    }

    // Generate the iCal feed URL
    const baseUrl = process.env.API_BASE_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : `http://localhost:${process.env.PORT || 5000}`;
    
    const calendarUrl = `${baseUrl}/api/worker/calendar/feed/${userId}/${tokenRecord.token}`;

    res.status(200).json({
      calendarUrl,
      token: tokenRecord.token, // Return token for frontend to display
      message: 'Use this URL to sync your shifts to your calendar app',
    });
  } catch (error: any) {
    console.error('[GET /api/worker/calendar/sync] Error:', error);
    res.status(500).json({ message: 'Failed to generate calendar sync URL' });
  }
}));

/**
 * GET /api/worker/calendar/feed/:userId/:token
 * 
 * Generate iCal feed for worker's accepted shifts
 * This endpoint is public but secured by token validation
 * SECURITY: Validates token matches userId before returning any data
 */
router.get('/calendar/feed/:userId/:token', asyncHandler(async (req, res) => {
  const userId = normalizeParam(req.params.userId);
  const token = normalizeParam(req.params.token);

  // SECURITY: Validate UUID format to prevent injection
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    res.status(400).json({ message: 'Invalid user ID format' });
    return;
  }

  // SECURITY: Validate token format (64 hex characters)
  const tokenRegex = /^[0-9a-f]{64}$/i;
  if (!tokenRegex.test(token)) {
    res.status(400).json({ message: 'Invalid token format' });
    return;
  }

  // SECURITY: Validate token belongs to this user
  const isValidToken = await calendarTokensRepo.validateCalendarToken(token, userId);
  if (!isValidToken) {
    res.status(403).json({ message: 'Invalid or expired calendar token' });
    return;
  }

  // Get all accepted shifts for this worker
  // 1. Get confirmed/filled shifts (assigned)
  const confirmedShifts = await shiftsRepo.getShiftsByAssignee(userId);
  const assignedShifts = confirmedShifts.filter(
    s => s.status === 'confirmed' || s.status === 'filled'
  );

  // 2. Get accepted shift applications
  const acceptedApplications = await shiftApplicationsRepo.getApplicationsByWorker(userId);
  const acceptedShiftIds = acceptedApplications
    .filter(app => app.status === 'accepted')
    .map(app => app.shiftId);

  const acceptedShifts = await Promise.all(
    acceptedShiftIds.map(id => shiftsRepo.getShiftById(id))
  );

  // Combine all shifts
  const allShifts = [
    ...assignedShifts,
    ...acceptedShifts.filter((s): s is NonNullable<typeof s> => s !== null)
  ];

  // Generate iCal content
  // iCal format: https://tools.ietf.org/html/rfc5545
  const now = new Date();
  const icalLines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HospoGo//Shift Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:HospoGo Shifts`,
    `X-WR-TIMEZONE:Australia/Brisbane`,
  ];

  // Add each shift as an event
  for (const shift of allShifts) {
    const startTime = new Date(shift.startTime);
    const endTime = new Date(shift.endTime);
    
    // Format dates in iCal format (YYYYMMDDTHHMMSSZ)
    const formatICalDate = (date: Date): string => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const seconds = String(date.getUTCSeconds()).padStart(2, '0');
      return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    };

    // Escape text for iCal format
    const escapeICalText = (text: string): string => {
      return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
    };

    const uid = `shift-${shift.id}@hospogo.com`;
    const summary = escapeICalText(shift.title || 'Shift');
    const description = escapeICalText(
      `Shift: ${shift.title || 'Untitled'}\n` +
      `Location: ${shift.location || 'TBD'}\n` +
      `Rate: $${shift.hourlyRate}/hr`
    );
    const location = escapeICalText(shift.location || '');

    icalLines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${formatICalDate(now)}`,
      `DTSTART:${formatICalDate(startTime)}`,
      `DTEND:${formatICalDate(endTime)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      location ? `LOCATION:${location}` : '',
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  }

  icalLines.push('END:VCALENDAR');

  // Set headers for iCal file
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="hospogo-shifts.ics"');
  
  // Send iCal content
  res.status(200).send(icalLines.join('\r\n'));
}));

export default router;
