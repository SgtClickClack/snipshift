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

  // Calculate filtered total if date range is applied
  const filteredTotalCents = payoutHistory.reduce((sum, payout) => sum + payout.amountCents, 0);

  res.status(200).json({
    totalEarnedCents,
    totalEarnedDollars: (totalEarnedCents / 100).toFixed(2),
    filteredTotalCents: period ? filteredTotalCents : totalEarnedCents,
    filteredTotalDollars: period ? (filteredTotalCents / 100).toFixed(2) : (totalEarnedCents / 100).toFixed(2),
    period: period || 'all_time',
    payoutHistory,
    payoutCount: payoutHistory.length,
  });
}));

export default router;
