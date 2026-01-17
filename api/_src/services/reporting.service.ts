/**
 * Reporting Service
 * 
 * Aggregates metrics for weekly founder reports
 */

import { eq, and, gte, lte, sql, or, inArray } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { payouts } from '../db/schema/payouts.js';
import { shifts } from '../db/schema/shifts.js';
import { shiftLogs } from '../db/schema/shifts.js';
import { failedEmails } from '../db/schema/failed-emails.js';

export interface WeeklyMetrics {
  totalTransactionVolume: number; // Sum of all payout amounts in AUD (rounded to 2 decimal places)
  shiftCompletionRate: number; // Ratio of completed vs cancelled shifts (0-1)
  geofenceFailures: number; // Count of geofence failures from shift_logs
  failedCommunications: number; // Count of failed emails in the last 7 days
  dateRange: {
    start: Date;
    end: Date;
  };
}

/**
 * Get weekly metrics for the last 7 days
 * 
 * @returns WeeklyMetrics object with all calculated metrics
 */
export async function getWeeklyMetrics(): Promise<WeeklyMetrics> {
  const db = getDb();
  if (!db) {
    throw new Error('Database connection not available');
  }

  // Calculate date range (last 7 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  // 1. Total Transaction Volume: Sum of all payout amounts in AUD
  // Payouts are stored in cents, so we divide by 100 to get AUD
  const [transactionVolumeResult] = await db
    .select({ 
      total: sql<number>`COALESCE(SUM(${payouts.amountCents}::numeric), 0)` 
    })
    .from(payouts)
    .where(
      and(
        gte(payouts.createdAt, startDate),
        lte(payouts.createdAt, endDate)
      )
    );

  // Convert from cents to AUD and round to 2 decimal places
  const totalCents = Number(transactionVolumeResult?.total || 0);
  const totalTransactionVolume = Math.round((totalCents / 100) * 100) / 100;

  // 2. Shift Completion Rate: Compare 'completed' vs 'cancelled' shifts in the last 7 days
  const [completedCountResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(shifts)
    .where(
      and(
        eq(shifts.status, 'completed'),
        gte(shifts.createdAt, startDate),
        lte(shifts.createdAt, endDate)
      )
    );

  const [cancelledCountResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(shifts)
    .where(
      and(
        eq(shifts.status, 'cancelled'),
        gte(shifts.createdAt, startDate),
        lte(shifts.createdAt, endDate)
      )
    );

  const completedCount = Number(completedCountResult?.count || 0);
  const cancelledCount = Number(cancelledCountResult?.count || 0);
  const totalShifts = completedCount + cancelledCount;
  
  // Calculate completion rate (completed / total, or 0 if no shifts)
  const shiftCompletionRate = totalShifts > 0 ? completedCount / totalShifts : 0;

  // 3. Geofence Failures: Count of shift_logs where status was rejected due to distance
  // This includes both CLOCK_IN_ATTEMPT_FAILED and CHECK_IN_ATTEMPT_FAILED event types
  const [geofenceFailureResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(shiftLogs)
    .where(
      and(
        or(
          eq(shiftLogs.eventType, 'CLOCK_IN_ATTEMPT_FAILED'),
          eq(shiftLogs.eventType, 'CHECK_IN_ATTEMPT_FAILED')
        ),
        gte(shiftLogs.timestamp, startDate),
        lte(shiftLogs.timestamp, endDate)
      )
    );

  const geofenceFailures = Number(geofenceFailureResult?.count || 0);

  // 4. Failed Communications: Count of entries in failed_emails table from the last 7 days
  const [failedEmailsResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(failedEmails)
    .where(
      and(
        gte(failedEmails.createdAt, startDate),
        lte(failedEmails.createdAt, endDate)
      )
    );

  const failedCommunications = Number(failedEmailsResult?.count || 0);

  return {
    totalTransactionVolume,
    shiftCompletionRate,
    geofenceFailures,
    failedCommunications,
    dateRange: {
      start: startDate,
      end: endDate,
    },
  };
}
