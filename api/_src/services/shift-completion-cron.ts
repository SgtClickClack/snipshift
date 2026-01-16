/**
 * Shift Completion Cron Service
 * 
 * Automatically flags shifts as "pending_completion" 1 hour after their endTime
 * Also handles pro verification status updates:
 * - Top Rated badge sync
 * - Low rating warnings
 */

import { eq, and, sql, lt, isNotNull, or, isNull } from 'drizzle-orm';
import { shifts } from '../db/schema.js';
import { getDb } from '../db/index.js';
import * as proVerificationService from './pro-verification.service.js';
import * as reputationService from '../lib/reputation-service.js';
import * as shiftsRepo from '../repositories/shifts.repository.js';
import * as shiftWaitlistRepo from '../repositories/shift-waitlist.repository.js';
import * as notificationsService from '../lib/notifications-service.js';

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
 * Sync pro verification statuses (Top Rated badges, rating warnings)
 * Runs every hour to ensure consistency
 */
let lastVerificationSyncTime = 0;
const VERIFICATION_SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function syncProVerificationStatuses(): Promise<void> {
  const now = Date.now();
  
  // Only run hourly
  if (now - lastVerificationSyncTime < VERIFICATION_SYNC_INTERVAL_MS) {
    return;
  }
  
  lastVerificationSyncTime = now;

  try {
    console.log('[SHIFT_CRON] Running pro verification status sync...');
    
    // Sync Top Rated badges
    const badgesSynced = await proVerificationService.syncTopRatedBadges();
    if (badgesSynced > 0) {
      console.log(`[SHIFT_CRON] Synced ${badgesSynced} Top Rated badge(s)`);
    }

    // Sync verification statuses for rating changes
    const { usersWarned, usersRestored } = await proVerificationService.syncVerificationStatusForLowRatings();
    if (usersWarned > 0) {
      console.log(`[SHIFT_CRON] Warned ${usersWarned} user(s) about low ratings`);
    }
    if (usersRestored > 0) {
      console.log(`[SHIFT_CRON] Restored ${usersRestored} user(s) from at_risk status`);
    }
  } catch (error) {
    console.error('[SHIFT_CRON] Error syncing pro verification statuses:', error);
  }
}

/**
 * Check for expired suspensions and send reactivation emails
 * Runs every 5 minutes to catch suspension expirations promptly
 */
async function checkSuspensionExpirations(): Promise<void> {
  try {
    const { processed, emailsSent } = await reputationService.checkAndSendReactivationEmails();
    if (emailsSent > 0) {
      console.log(`[SHIFT_CRON] Sent ${emailsSent} reactivation email(s) to restored accounts`);
    }
  } catch (error) {
    console.error('[SHIFT_CRON] Error checking suspension expirations:', error);
  }
}

/**
 * Check for no-shows: shifts that started 30+ minutes ago without check-in
 * Grace period: 15 minutes (so flags at 30 min = 15 min late)
 * Runs every 5 minutes to catch no-shows promptly
 */
async function checkNoShows(): Promise<void> {
  const db = getDb();
  if (!db) {
    console.error('[SHIFT_CRON] Database connection not available');
    return;
  }

  try {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago (15 min grace + 15 min late)

    // Find shifts that:
    // - Have an assignee (filled/confirmed)
    // - Status is 'filled' or 'confirmed'
    // - Start time was more than 30 minutes ago (15 min grace period + 15 min late = 30 min total)
    // - attendanceStatus is NOT 'checked_in' (no check-in event)
    // - attendanceStatus is NOT already 'no_show' (not already flagged)
    // - Status is not 'completed' or 'cancelled'
    const potentialNoShows = await db
      .select({
        id: shifts.id,
        assigneeId: shifts.assigneeId,
        startTime: shifts.startTime,
        title: shifts.title,
        attendanceStatus: shifts.attendanceStatus,
        status: shifts.status,
      })
      .from(shifts)
      .where(
        and(
          isNotNull(shifts.assigneeId), // Has an assignee
          sql`${shifts.status} IN ('filled', 'confirmed')`, // Is filled or confirmed
          lt(shifts.startTime, thirtyMinutesAgo), // Started more than 30 minutes ago
          or(
            eq(shifts.attendanceStatus, 'pending'),
            isNull(shifts.attendanceStatus)
          ), // Not checked in (exclude 'checked_in' and 'no_show')
          sql`${shifts.attendanceStatus} != 'no_show'`, // Not already flagged as no-show
          sql`${shifts.status} != 'completed'`, // Not completed
          sql`${shifts.status} != 'cancelled'` // Not cancelled
        )
      );

    if (potentialNoShows.length === 0) {
      return; // No shifts to process
    }

    console.log(`[SHIFT_CRON] Found ${potentialNoShows.length} potential no-show(s)`);

    // Process each potential no-show
    for (const shift of potentialNoShows) {
      if (!shift.assigneeId) continue;

      try {
        // Mark shift as no-show
        await db
          .update(shifts)
          .set({
            attendanceStatus: 'no_show',
            status: 'completed', // Mark as completed even if no-show
            updatedAt: new Date(),
          })
          .where(eq(shifts.id, shift.id));

        // Apply no-show penalties (strikes, rating deduction)
        const noShowResult = await reputationService.handleNoShow(shift.assigneeId, shift.id);
        console.log(`[SHIFT_CRON] No-show recorded for shift ${shift.id}: ${noShowResult.message}`);

        // Deduct 0.5 points from average rating
        await reputationService.deductRatingForNoShow(shift.assigneeId, 0.5);

        // Update pro verification status
        await proVerificationService.onNoShow(shift.assigneeId, shift.id);

        // Update reliability score
        await reputationService.calculateAndUpdateReliabilityScore(shift.assigneeId);

        // Notify waitlisted workers
        await notifyWaitlistedWorkers(shift.id);

        console.log(`[SHIFT_CRON] Processed no-show for shift ${shift.id}, worker ${shift.assigneeId}`);
      } catch (error) {
        console.error(`[SHIFT_CRON] Error processing no-show for shift ${shift.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[SHIFT_CRON] Error checking no-shows:', error);
  }
}

/**
 * Notify top 3 waitlisted workers when a shift becomes available
 */
async function notifyWaitlistedWorkers(shiftId: string): Promise<void> {
  try {
    // Get shift details
    const shift = await shiftsRepo.getShiftById(shiftId);
    if (!shift) {
      return;
    }

    // Get top 3 waitlisted workers
    const topWorkers = await shiftWaitlistRepo.getTopWaitlistedWorkers(shiftId, 3);

    if (topWorkers.length === 0) {
      return; // No waitlisted workers
    }

    // Send instant accept notifications to top 3 workers
    for (const entry of topWorkers) {
      try {
        await notificationsService.createNotification(entry.workerId, {
          type: 'shift_available',
          title: 'Shift Available - Instant Accept!',
          message: `A shift "${shift.title}" has become available. You're #${entry.rank} on the waitlist. Click to accept instantly!`,
          data: {
            shiftId: shift.id,
            shiftTitle: shift.title,
            startTime: shift.startTime,
            endTime: shift.endTime,
            location: shift.location,
            hourlyRate: shift.hourlyRate,
            waitlistRank: entry.rank,
            instantAccept: true,
            link: `/shifts/${shift.id}?instantAccept=true`,
          },
        });
      } catch (error) {
        console.error(`[SHIFT_CRON] Error notifying waitlisted worker ${entry.workerId}:`, error);
      }
    }

    console.log(`[SHIFT_CRON] Notified ${topWorkers.length} waitlisted worker(s) for shift ${shiftId}`);
  } catch (error) {
    console.error('[SHIFT_CRON] Error notifying waitlisted workers:', error);
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
  syncProVerificationStatuses();
  checkSuspensionExpirations();
  checkNoShows();

  // Then run every 5 minutes
  intervalId = setInterval(() => {
    checkPendingCompletions();
    syncProVerificationStatuses();
    checkSuspensionExpirations();
    checkNoShows();
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
