/**
 * Shift Completion Cron Service
 * 
 * Automatically flags shifts as "pending_completion" 1 hour after their endTime
 */

import { eq, and, sql, lt, isNotNull, or, isNull } from 'drizzle-orm';
import { shifts } from '../db/schema.js';
import { getDb } from '../db/index.js';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes
const HOUR_MS = 60 * 60 * 1000; // 1 hour in milliseconds

let intervalId: NodeJS.Timeout | null = null;

/**
 * Check for shifts that need to be flagged as pending completion
 * A shift should be flagged if:
 * - It has an assignee (filled/confirmed)
 * - Status is 'filled' or 'confirmed'
 * - endTime was more than 1 hour ago
 * - attendanceStatus is still 'pending'
 * - Status is not already 'pending_completion' or 'completed'
 */
async function checkPendingCompletions(): Promise<void> {
  const db = getDb();
  if (!db) {
    console.error('[SHIFT_CRON] Database connection not available');
    return;
  }

  try {
    const oneHourAgo = new Date(Date.now() - HOUR_MS);

    // Find shifts that need to be flagged
    const shiftsToUpdate = await db
      .select({
        id: shifts.id,
        endTime: shifts.endTime,
        status: shifts.status,
        attendanceStatus: shifts.attendanceStatus,
      })
      .from(shifts)
      .where(
        and(
          isNotNull(shifts.assigneeId), // Has an assignee
          sql`${shifts.status} IN ('filled', 'confirmed')`, // Is filled or confirmed
          lt(shifts.endTime, oneHourAgo), // Ended more than 1 hour ago
          or(
            eq(shifts.attendanceStatus, 'pending'),
            isNull(shifts.attendanceStatus)
          ), // Not yet marked
          sql`${shifts.status} != 'pending_completion'`, // Not already pending completion
          sql`${shifts.status} != 'completed'` // Not already completed
        )
      );

    if (shiftsToUpdate.length === 0) {
      return; // No shifts to update
    }

    console.log(`[SHIFT_CRON] Found ${shiftsToUpdate.length} shift(s) to flag as pending completion`);

    // Update shifts to pending_completion status
    for (const shift of shiftsToUpdate) {
      await db
        .update(shifts)
        .set({
          status: 'pending_completion',
          updatedAt: new Date(),
        })
        .where(eq(shifts.id, shift.id));

      console.log(`[SHIFT_CRON] Flagged shift ${shift.id} as pending_completion`);
    }
  } catch (error) {
    console.error('[SHIFT_CRON] Error checking pending completions:', error);
  }
}

/**
 * Start the cron job
 */
export function startShiftCompletionCron(): void {
  if (intervalId !== null) {
    console.log('[SHIFT_CRON] Cron job already running');
    return;
  }

  console.log('[SHIFT_CRON] Starting shift completion cron job (checking every 5 minutes)');
  
  // Run immediately on start
  checkPendingCompletions();

  // Then run every 5 minutes
  intervalId = setInterval(() => {
    checkPendingCompletions();
  }, CHECK_INTERVAL_MS);
}

/**
 * Stop the cron job
 */
export function stopShiftCompletionCron(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[SHIFT_CRON] Stopped shift completion cron job');
  }
}
