import express from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as venuesRepo from '../repositories/venues.repository.js';
import * as shiftApplicationsRepo from '../repositories/shift-applications.repository.js';
import * as shiftsRepo from '../repositories/shifts.repository.js';
import * as payoutsRepo from '../repositories/payouts.repository.js';

const router = express.Router();

// Get current user's venue
router.get('/me', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const venue = await venuesRepo.getVenueByUserId(userId);
  
  if (!venue) {
    res.status(404).json({ message: 'Venue not found' });
    return;
  }

  res.status(200).json({
    id: venue.id,
    userId: venue.userId,
    venueName: venue.venueName,
    liquorLicenseNumber: venue.liquorLicenseNumber,
    address: venue.address,
    operatingHours: venue.operatingHours,
    status: venue.status,
    createdAt: venue.createdAt.toISOString(),
    updatedAt: venue.updatedAt.toISOString(),
  });
}));

// Get all applications for current venue owner
router.get('/me/applications', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { status } = req.query;

  // Get applications for this venue owner
  const applications = await shiftApplicationsRepo.getApplicationsForVenue(
    userId,
    status ? { status: status as 'pending' | 'accepted' | 'rejected' } : undefined
  );

  // Transform to include only necessary fields
  const transformed = applications.map((app) => ({
    id: app.id,
    shiftId: app.shiftId,
    workerId: app.workerId,
    venueId: app.venueId,
    status: app.status,
    message: app.message,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    // Worker details
    worker: app.worker ? {
      id: app.worker.id,
      name: app.worker.name,
      email: app.worker.email,
      avatarUrl: app.worker.avatarUrl,
      bio: app.worker.bio,
      phone: app.worker.phone,
    } : null,
    // Shift details
    shift: app.shift ? {
      id: app.shift.id,
      title: app.shift.title,
      description: app.shift.description,
      startTime: app.shift.startTime.toISOString(),
      endTime: app.shift.endTime.toISOString(),
      hourlyRate: app.shift.hourlyRate,
      location: app.shift.location,
      status: app.shift.status,
    } : null,
  }));

  res.status(200).json(transformed);
}));

// Get analytics for current user's venue
router.get('/me/analytics', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Get venue and verify it's active
  const venue = await venuesRepo.getVenueByUserId(userId);
  
  if (!venue) {
    res.status(404).json({ message: 'Venue not found' });
    return;
  }

  if (venue.status !== 'active') {
    res.status(403).json({ message: 'Venue must be active to view analytics' });
    return;
  }

  // Parse date range from query params
  const range = (req.query.range as string) || '30d';
  const now = new Date();
  let startDate: Date;
  let previousStartDate: Date;

  switch (range) {
    case '3m':
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      previousStartDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      break;
    case 'ytd': {
      startDate = new Date(now.getFullYear(), 0, 1);
      const previousYear = now.getFullYear() - 1;
      previousStartDate = new Date(previousYear, 0, 1);
      break;
    }
    case '30d':
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      previousStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      break;
  }

  const endDate = now;

  // Get shifts in date range
  const shifts = await shiftsRepo.getShiftsByEmployerInRange(userId, startDate, endDate);
  
  // Get previous period shifts for comparison
  let previousEndDate: Date;
  if (range === 'ytd') {
    // For YTD, compare to same period last year
    const previousYear = now.getFullYear() - 1;
    previousEndDate = new Date(previousYear, now.getMonth(), now.getDate());
  } else {
    previousEndDate = startDate;
  }
  const previousShifts = await shiftsRepo.getShiftsByEmployerInRange(userId, previousStartDate, previousEndDate);

  // Get payouts in date range (only completed payouts count toward spend)
  const payouts = await payoutsRepo.getPayoutsForVenue(userId, {
    startDate,
    endDate,
    status: 'completed',
  });

  // Get previous period payouts for comparison
  const previousPayouts = await payoutsRepo.getPayoutsForVenue(userId, {
    startDate: previousStartDate,
    endDate: previousEndDate,
    status: 'completed',
  });

  // Calculate Total Spend (sum of completed payout amounts)
  const totalSpend = payouts.reduce((sum, payout) => sum + payout.amountCents, 0);
  const previousTotalSpend = previousPayouts.reduce((sum, payout) => sum + payout.amountCents, 0);
  const spendChange = previousTotalSpend > 0 
    ? ((totalSpend - previousTotalSpend) / previousTotalSpend) * 100 
    : totalSpend > 0 ? 100 : 0;

  // Calculate Fill Rate: (filled or completed shifts / total shifts posted) * 100
  const totalShifts = shifts.length;
  const filledOrCompletedShifts = shifts.filter(
    s => s.status === 'filled' || s.status === 'completed'
  ).length;
  const fillRate = totalShifts > 0 ? (filledOrCompletedShifts / totalShifts) * 100 : 0;

  const previousTotalShifts = previousShifts.length;
  const previousFilledOrCompletedShifts = previousShifts.filter(
    s => s.status === 'filled' || s.status === 'completed'
  ).length;
  const previousFillRate = previousTotalShifts > 0 
    ? (previousFilledOrCompletedShifts / previousTotalShifts) * 100 
    : 0;
  const fillRateChange = previousFillRate > 0 
    ? fillRate - previousFillRate 
    : fillRate > 0 ? fillRate : 0;

  // Calculate Reliability Score: Percentage of shifts where actualStartTime was within 15 mins of startTime
  const shiftsWithActualStart = shifts.filter(s => s.actualStartTime && s.status === 'completed');
  const reliableShifts = shiftsWithActualStart.filter(shift => {
    if (!shift.actualStartTime || !shift.startTime) return false;
    const scheduledTime = new Date(shift.startTime).getTime();
    const actualTime = new Date(shift.actualStartTime).getTime();
    const diffMinutes = Math.abs(actualTime - scheduledTime) / (1000 * 60);
    return diffMinutes <= 15;
  });
  const reliabilityScore = shiftsWithActualStart.length > 0 
    ? (reliableShifts.length / shiftsWithActualStart.length) * 100 
    : 0;

  const previousShiftsWithActualStart = previousShifts.filter(s => s.actualStartTime && s.status === 'completed');
  const previousReliableShifts = previousShiftsWithActualStart.filter(shift => {
    if (!shift.actualStartTime || !shift.startTime) return false;
    const scheduledTime = new Date(shift.startTime).getTime();
    const actualTime = new Date(shift.actualStartTime).getTime();
    const diffMinutes = Math.abs(actualTime - scheduledTime) / (1000 * 60);
    return diffMinutes <= 15;
  });
  const previousReliabilityScore = previousShiftsWithActualStart.length > 0 
    ? (previousReliableShifts.length / previousShiftsWithActualStart.length) * 100 
    : 0;
  const reliabilityChange = previousReliabilityScore > 0 
    ? reliabilityScore - previousReliabilityScore 
    : reliabilityScore > 0 ? reliabilityScore : 0;

  // Calculate spend over time (daily breakdown for chart)
  const spendByDate: Record<string, number> = {};
  payouts.forEach(payout => {
    const dateKey = new Date(payout.createdAt).toISOString().split('T')[0];
    spendByDate[dateKey] = (spendByDate[dateKey] || 0) + payout.amountCents;
  });

  // Fill in missing dates with 0
  const spendOverTime = [];
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    spendOverTime.push({
      date: dateKey,
      spend: (spendByDate[dateKey] || 0) / 100, // Convert cents to dollars
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  res.status(200).json({
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      range,
    },
    metrics: {
      totalSpend: totalSpend / 100, // Convert cents to dollars
      totalSpendChange: spendChange,
      fillRate: Math.round(fillRate * 100) / 100, // Round to 2 decimal places
      fillRateChange: Math.round(fillRateChange * 100) / 100,
      reliabilityScore: Math.round(reliabilityScore * 100) / 100,
      reliabilityChange: Math.round(reliabilityChange * 100) / 100,
      totalShifts,
      filledOrCompletedShifts,
      shiftsWithActualStart: shiftsWithActualStart.length,
      reliableShifts: reliableShifts.length,
    },
    spendOverTime,
  });
}));

// Save venue operating hours
router.post('/settings/hours', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate request body - expect openingHours in calendar format
  const { openingHours } = req.body;
  
  if (!openingHours || typeof openingHours !== 'object') {
    res.status(400).json({ message: 'Opening hours are required' });
    return;
  }

  // Get venue for this user
  const venue = await venuesRepo.getVenueByUserId(userId);
  
  if (!venue) {
    res.status(404).json({ message: 'Venue not found' });
    return;
  }

  // Convert calendar format (with 'enabled' field) to venue format (with 'closed' field)
  const venueOperatingHours: any = {};
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  for (const day of days) {
    const hours = openingHours[day];
    if (hours) {
      if (hours.enabled === false) {
        venueOperatingHours[day] = { closed: true };
      } else {
        venueOperatingHours[day] = {
          open: hours.open || '09:00',
          close: hours.close || '18:00',
        };
      }
    }
  }

  // Update venue operating hours
  const updatedVenue = await venuesRepo.updateVenue(venue.id, {
    operatingHours: venueOperatingHours,
  });

  if (!updatedVenue) {
    res.status(500).json({ message: 'Failed to update venue hours' });
    return;
  }

  res.status(200).json({
    success: true,
    operatingHours: updatedVenue.operatingHours,
  });
}));

export default router;
