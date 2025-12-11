/**
 * Payments Routes
 * 
 * Handles payment balance and history for professionals
 */

import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as stripeConnectService from '../services/stripe-connect.service.js';
import * as usersRepo from '../repositories/users.repository.js';
import * as shiftsRepo from '../repositories/shifts.repository.js';
import { eq, and, or, desc } from 'drizzle-orm';
import { shifts } from '../db/schema.js';
import { getDb } from '../db/index.js';

const router = Router();

// Get balance for current user
router.get('/balance/:userId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  const authenticatedUserId = req.user?.id;

  // Security: Users can only view their own balance
  if (userId !== authenticatedUserId) {
    res.status(403).json({ message: 'Forbidden: You can only view your own balance' });
    return;
  }

  const user = await usersRepo.getUserById(userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  if (!user.stripeAccountId) {
    res.status(200).json({
      available: 0,
      pending: 0,
      currency: 'aud',
    });
    return;
  }

  try {
    const balance = await stripeConnectService.getAccountBalance(user.stripeAccountId);
    
    // Calculate available and pending amounts in cents
    const available = balance.available?.reduce((sum, item) => sum + item.amount, 0) || 0;
    const pending = balance.pending?.reduce((sum, item) => sum + item.amount, 0) || 0;

    res.status(200).json({
      available: available / 100, // Convert cents to dollars
      pending: pending / 100,
      currency: balance.available?.[0]?.currency || balance.pending?.[0]?.currency || 'aud',
    });
  } catch (error: any) {
    console.error('[PAYMENTS] Error getting balance:', error);
    res.status(500).json({ message: 'Failed to get balance', error: error.message });
  }
}));

// Get payment history for current user
router.get('/history/:userId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  const authenticatedUserId = req.user?.id;

  // Security: Users can only view their own history
  if (userId !== authenticatedUserId) {
    res.status(403).json({ message: 'Forbidden: You can only view your own payment history' });
    return;
  }

  const user = await usersRepo.getUserById(userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const db = getDb();
  if (!db) {
    res.status(500).json({ message: 'Database not available' });
    return;
  }

  try {
    // Get shifts where user is the assignee and payment status is PAID or AUTHORIZED
    const paymentShifts = await db
      .select({
        id: shifts.id,
        title: shifts.title,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        hourlyRate: shifts.hourlyRate,
        paymentStatus: shifts.paymentStatus,
        paymentIntentId: shifts.paymentIntentId,
        transferAmount: shifts.transferAmount,
        applicationFeeAmount: shifts.applicationFeeAmount,
        employerId: shifts.employerId,
        createdAt: shifts.createdAt,
      })
      .from(shifts)
      .where(
        and(
          eq(shifts.assigneeId, userId),
          or(
            eq(shifts.paymentStatus, 'PAID'),
            eq(shifts.paymentStatus, 'AUTHORIZED')
          )
        )
      )
      .orderBy(desc(shifts.createdAt))
      .limit(100); // Limit to last 100 transactions

    // Get employer names for each shift
    const history = await Promise.all(
      paymentShifts.map(async (shift) => {
        const employer = await usersRepo.getUserById(shift.employerId);
        const shopName = employer?.name || 'Unknown Shop';

        // Calculate net amount (transfer amount in cents, convert to dollars)
        const netAmount = shift.transferAmount ? shift.transferAmount / 100 : 0;

        // Calculate hours worked
        const startTime = new Date(shift.startTime);
        const endTime = new Date(shift.endTime);
        const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

        return {
          id: shift.id,
          date: shift.startTime.toISOString(),
          shopName,
          netAmount,
          status: shift.paymentStatus === 'PAID' ? 'Paid' : 'Processing',
          paymentStatus: shift.paymentStatus,
          hours: Math.round(hours * 10) / 10, // Round to 1 decimal
          hourlyRate: parseFloat(shift.hourlyRate.toString()),
        };
      })
    );

    res.status(200).json({ history });
  } catch (error: any) {
    console.error('[PAYMENTS] Error getting payment history:', error);
    res.status(500).json({ message: 'Failed to get payment history', error: error.message });
  }
}));

export default router;
