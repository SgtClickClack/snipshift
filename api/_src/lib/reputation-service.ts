/**
 * Reputation Service
 * 
 * Handles automated strike management and reputation scoring for professionals.
 * 
 * Strike Rules:
 * - No-show: +2 strikes, 48h suspension
 * - Late cancellation (< 4h notice): +1 strike
 * - Every 5th successful shift after last strike: -1 strike (if strikes > 0)
 * 
 * Reliability Score Mapping:
 * - 0 strikes: "Highly Reliable"
 * - 1 strike: "Good"
 * - 2+ strikes: "At Risk"
 */

import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { users, shifts } from '../db/schema.js';
import * as usersRepo from '../repositories/users.repository.js';
import * as notificationsService from './notifications-service.js';
import * as emailService from '../services/email.service.js';
import * as shiftsRepo from '../repositories/shifts.repository.js';

export type ReliabilityScore = 'highly_reliable' | 'good' | 'at_risk' | 'suspended';

export interface ReputationResult {
  success: boolean;
  strikeCount: number;
  previousStrikeCount: number;
  strikesAdded: number; // Number of strikes added in this action
  reliabilityScore: ReliabilityScore;
  suspendedUntil: Date | null;
  message: string;
}

/**
 * Get reliability score label based on strike count
 */
export function getReliabilityScore(strikes: number, suspendedUntil: Date | null): ReliabilityScore {
  if (suspendedUntil && suspendedUntil > new Date()) {
    return 'suspended';
  }
  if (strikes === 0) {
    return 'highly_reliable';
  }
  if (strikes === 1) {
    return 'good';
  }
  return 'at_risk';
}

/**
 * Get human-readable reliability score label
 */
export function getReliabilityLabel(score: ReliabilityScore): string {
  switch (score) {
    case 'highly_reliable':
      return 'Highly Reliable';
    case 'good':
      return 'Good';
    case 'at_risk':
      return 'At Risk';
    case 'suspended':
      return 'Suspended';
    default:
      return 'Unknown';
  }
}

/**
 * Handle no-show event
 * - Increments strikes by 2
 * - Triggers 48h suspension
 * - Resets shifts since last strike counter
 */
export async function handleNoShow(userId: string, shiftId: string): Promise<ReputationResult> {
  const db = getDb();
  if (!db) {
    return {
      success: false,
      strikeCount: 0,
      previousStrikeCount: 0,
      strikesAdded: 0,
      reliabilityScore: 'good',
      suspendedUntil: null,
      message: 'Database not available',
    };
  }

  const user = await usersRepo.getUserById(userId);
  if (!user) {
    return {
      success: false,
      strikeCount: 0,
      previousStrikeCount: 0,
      strikesAdded: 0,
      reliabilityScore: 'good',
      suspendedUntil: null,
      message: 'User not found',
    };
  }

  const previousStrikeCount = user.strikes ?? 0;
  const newStrikeCount = previousStrikeCount + 2;
  const now = new Date();
  const suspendedUntil = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now

  // Update user with new strike count and suspension
  await db
    .update(users)
    .set({
      strikes: newStrikeCount,
      lastStrikeDate: now,
      shiftsSinceLastStrike: 0, // Reset counter
      suspendedUntil,
      noShowCount: (user.noShowCount ?? 0) + 1,
      lastNoShowAt: now,
      updatedAt: now,
    })
    .where(eq(users.id, userId));

  // Send notification to the professional
  try {
    await notificationsService.createNotification(userId, {
      type: 'strike_added',
      title: 'Strike Added - No Show',
      message: `You received 2 strikes for not showing up to your shift. You are suspended until ${suspendedUntil.toLocaleString()}. Your current strike count: ${newStrikeCount}`,
      data: {
        shiftId,
        strikesAdded: 2,
        totalStrikes: newStrikeCount,
        suspendedUntil: suspendedUntil.toISOString(),
        reason: 'no_show',
      },
    });
  } catch (error) {
    console.error('[REPUTATION] Failed to send no-show notification:', error);
  }

  // Send suspension alert email (immediate - no-show triggers +2 strikes)
  try {
    // Get shift details for the email
    let shiftTitle: string | undefined;
    let shiftDate: string | undefined;
    
    const shift = await shiftsRepo.getShiftById(shiftId);
    if (shift) {
      shiftTitle = shift.title;
      shiftDate = shift.startTime ? new Date(shift.startTime).toLocaleDateString('en-AU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }) : undefined;
    }

    await emailService.sendSuspensionAlertEmail(
      user.email,
      user.name || user.email.split('@')[0],
      2, // strikesAdded
      newStrikeCount,
      suspendedUntil,
      shiftTitle,
      shiftDate
    );
  } catch (error) {
    console.error('[REPUTATION] Failed to send suspension alert email:', error);
  }

  console.log(`[REPUTATION] No-show recorded for user ${userId}: +2 strikes (now ${newStrikeCount}), suspended until ${suspendedUntil.toISOString()}`);

  return {
    success: true,
    strikeCount: newStrikeCount,
    previousStrikeCount,
    strikesAdded: 2,
    reliabilityScore: getReliabilityScore(newStrikeCount, suspendedUntil),
    suspendedUntil,
    message: `2 strikes added for no-show. Account suspended for 48 hours.`,
  };
}

/**
 * Handle late cancellation event
 * - Increments strikes by 1 if cancellation is within 4 hours of shift start
 * - Resets shifts since last strike counter
 */
export async function handleLateCancellation(
  userId: string,
  shiftId: string,
  shiftStartTime: Date,
  cancellationTime: Date = new Date()
): Promise<ReputationResult> {
  const db = getDb();
  if (!db) {
    return {
      success: false,
      strikeCount: 0,
      previousStrikeCount: 0,
      strikesAdded: 0,
      reliabilityScore: 'good',
      suspendedUntil: null,
      message: 'Database not available',
    };
  }

  const user = await usersRepo.getUserById(userId);
  if (!user) {
    return {
      success: false,
      strikeCount: 0,
      previousStrikeCount: 0,
      strikesAdded: 0,
      reliabilityScore: 'good',
      suspendedUntil: null,
      message: 'User not found',
    };
  }

  // Calculate hours until shift start
  const hoursUntilShift = (shiftStartTime.getTime() - cancellationTime.getTime()) / (1000 * 60 * 60);

  // Only apply strike if cancellation is within 4 hours of shift start
  if (hoursUntilShift >= 4) {
    return {
      success: true,
      strikeCount: user.strikes ?? 0,
      previousStrikeCount: user.strikes ?? 0,
      strikesAdded: 0,
      reliabilityScore: getReliabilityScore(user.strikes ?? 0, user.suspendedUntil),
      suspendedUntil: user.suspendedUntil,
      message: 'Cancellation was made with sufficient notice (4+ hours). No strike applied.',
    };
  }

  const previousStrikeCount = user.strikes ?? 0;
  const newStrikeCount = previousStrikeCount + 1;
  const now = new Date();

  // Update user with new strike count
  await db
    .update(users)
    .set({
      strikes: newStrikeCount,
      lastStrikeDate: now,
      shiftsSinceLastStrike: 0, // Reset counter
      updatedAt: now,
    })
    .where(eq(users.id, userId));

  // Send notification to the professional
  try {
    await notificationsService.createNotification(userId, {
      type: 'strike_added',
      title: 'Strike Added - Late Cancellation',
      message: `You received 1 strike for cancelling within ${Math.round(hoursUntilShift * 10) / 10} hours of your shift. Your current strike count: ${newStrikeCount}`,
      data: {
        shiftId,
        strikesAdded: 1,
        totalStrikes: newStrikeCount,
        hoursNotice: hoursUntilShift,
        reason: 'late_cancellation',
      },
    });
  } catch (error) {
    console.error('[REPUTATION] Failed to send late cancellation notification:', error);
  }

  // Send strike warning email (immediate - for late cancellation when strikes reach 1 or 2)
  if (newStrikeCount === 1 || newStrikeCount === 2) {
    try {
      // Get shift details for the email
      let shiftTitle: string | undefined;
      let shiftDate: string | undefined;
      
      const shift = await shiftsRepo.getShiftById(shiftId);
      if (shift) {
        shiftTitle = shift.title;
        shiftDate = shift.startTime ? new Date(shift.startTime).toLocaleDateString('en-AU', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }) : undefined;
      }

      await emailService.sendStrikeWarningEmail(
        user.email,
        user.name || user.email.split('@')[0],
        1, // strikesAdded
        newStrikeCount,
        'late_cancellation',
        hoursUntilShift,
        shiftTitle,
        shiftDate
      );
    } catch (error) {
      console.error('[REPUTATION] Failed to send strike warning email:', error);
    }
  }

  console.log(`[REPUTATION] Late cancellation recorded for user ${userId}: +1 strike (now ${newStrikeCount}), ${hoursUntilShift.toFixed(1)}h notice`);

  return {
    success: true,
    strikeCount: newStrikeCount,
    previousStrikeCount,
    strikesAdded: 1,
    reliabilityScore: getReliabilityScore(newStrikeCount, user.suspendedUntil),
    suspendedUntil: user.suspendedUntil,
    message: `1 strike added for late cancellation (${Math.round(hoursUntilShift * 10) / 10}h notice).`,
  };
}

/**
 * Handle successful shift completion
 * - Increments shifts since last strike counter
 * - If strikes > 0 and this is the 5th shift since last strike, decrements strike count
 */
export async function handleSuccessfulShift(userId: string, shiftId?: string): Promise<ReputationResult> {
  const db = getDb();
  if (!db) {
    return {
      success: false,
      strikeCount: 0,
      previousStrikeCount: 0,
      strikesAdded: 0,
      reliabilityScore: 'good',
      suspendedUntil: null,
      message: 'Database not available',
    };
  }

  const user = await usersRepo.getUserById(userId);
  if (!user) {
    return {
      success: false,
      strikeCount: 0,
      previousStrikeCount: 0,
      strikesAdded: 0,
      reliabilityScore: 'good',
      suspendedUntil: null,
      message: 'User not found',
    };
  }

  const previousStrikeCount = user.strikes ?? 0;
  const shiftsSinceLastStrike = (user.shiftsSinceLastStrike ?? 0) + 1;
  const now = new Date();

  let newStrikeCount = previousStrikeCount;
  let strikeRemoved = false;

  // Check if this is the 5th shift since last strike and user has strikes
  if (previousStrikeCount > 0 && shiftsSinceLastStrike >= 5) {
    newStrikeCount = previousStrikeCount - 1;
    strikeRemoved = true;

    // Update user with decremented strike count and reset counter
    await db
      .update(users)
      .set({
        strikes: newStrikeCount,
        shiftsSinceLastStrike: 0, // Reset counter after removing a strike
        completedShiftCount: (user.completedShiftCount ?? 0) + 1,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    // Send notification about strike removal
    try {
      await notificationsService.createNotification(userId, {
        type: 'strike_removed',
        title: 'Strike Removed!',
        message: `Great job! You completed 5 successful shifts and earned a strike removal. Your current strike count: ${newStrikeCount}`,
        data: {
          shiftId,
          strikesRemoved: 1,
          totalStrikes: newStrikeCount,
          reason: 'successful_shifts',
        },
      });
    } catch (error) {
      console.error('[REPUTATION] Failed to send strike removal notification:', error);
    }

    console.log(`[REPUTATION] Strike removed for user ${userId}: -1 strike (now ${newStrikeCount}) after 5 successful shifts`);
  } else {
    // Just increment the shifts since last strike counter
    await db
      .update(users)
      .set({
        shiftsSinceLastStrike,
        completedShiftCount: (user.completedShiftCount ?? 0) + 1,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    console.log(`[REPUTATION] Successful shift recorded for user ${userId}: ${shiftsSinceLastStrike}/5 shifts since last strike`);
  }

  const message = strikeRemoved
    ? `Strike removed! You completed 5 successful shifts. Current strikes: ${newStrikeCount}`
    : `Successful shift recorded. ${shiftsSinceLastStrike}/5 shifts towards next strike removal.`;

  // strikesAdded is negative when a strike is removed
  const strikesAdded = strikeRemoved ? -1 : 0;

  return {
    success: true,
    strikeCount: newStrikeCount,
    previousStrikeCount,
    strikesAdded,
    reliabilityScore: getReliabilityScore(newStrikeCount, user.suspendedUntil),
    suspendedUntil: user.suspendedUntil,
    message,
  };
}

/**
 * Process shift success with rating-based strike recovery
 * 
 * Logic:
 * - If user.strikes > 0 AND rating >= 4.5: Increment recovery_progress by 1
 * - If recovery_progress >= 5: Remove 1 strike, reset recovery_progress to 0
 * - If rating < 3.0: Reset recovery_progress to 0 (poor performance resets redemption)
 * 
 * @param userId - The professional's user ID
 * @param rating - The rating received for this shift (1-5)
 * @param shiftId - Optional shift ID for logging/notifications
 */
export interface ProcessShiftSuccessResult {
  success: boolean;
  strikeCount: number;
  previousStrikeCount: number;
  recoveryProgress: number;
  previousRecoveryProgress: number;
  strikeRemoved: boolean;
  progressReset: boolean;
  message: string;
}

export async function processShiftSuccess(
  userId: string,
  rating: number,
  shiftId?: string
): Promise<ProcessShiftSuccessResult> {
  const db = getDb();
  if (!db) {
    return {
      success: false,
      strikeCount: 0,
      previousStrikeCount: 0,
      recoveryProgress: 0,
      previousRecoveryProgress: 0,
      strikeRemoved: false,
      progressReset: false,
      message: 'Database not available',
    };
  }

  const user = await usersRepo.getUserById(userId);
  if (!user) {
    return {
      success: false,
      strikeCount: 0,
      previousStrikeCount: 0,
      recoveryProgress: 0,
      previousRecoveryProgress: 0,
      strikeRemoved: false,
      progressReset: false,
      message: 'User not found',
    };
  }

  const previousStrikeCount = user.strikes ?? 0;
  const previousRecoveryProgress = user.recoveryProgress ?? 0;
  const now = new Date();

  let newStrikeCount = previousStrikeCount;
  let newRecoveryProgress = previousRecoveryProgress;
  let strikeRemoved = false;
  let progressReset = false;

  // Poor performance (rating < 3.0) resets recovery progress
  if (rating < 3.0) {
    if (previousRecoveryProgress > 0) {
      progressReset = true;
      newRecoveryProgress = 0;
      
      await db
        .update(users)
        .set({
          recoveryProgress: 0,
          updatedAt: now,
        })
        .where(eq(users.id, userId));

      // Notify user that their progress was reset
      try {
        await notificationsService.createNotification(userId, {
          type: 'recovery_progress_reset',
          title: 'Recovery Progress Reset',
          message: `Your strike recovery progress was reset due to a rating below 3.0. Keep providing excellent service to rebuild your progress!`,
          data: {
            shiftId,
            rating,
            previousProgress: previousRecoveryProgress,
            reason: 'poor_rating',
          },
        });
      } catch (error) {
        console.error('[REPUTATION] Failed to send progress reset notification:', error);
      }

      console.log(`[REPUTATION] Recovery progress reset for user ${userId} due to low rating (${rating})`);
    }

    return {
      success: true,
      strikeCount: newStrikeCount,
      previousStrikeCount,
      recoveryProgress: newRecoveryProgress,
      previousRecoveryProgress,
      strikeRemoved: false,
      progressReset,
      message: progressReset 
        ? `Recovery progress reset due to rating below 3.0.`
        : `Low rating recorded. No recovery progress to reset.`,
    };
  }

  // Good rating (>= 4.5) with active strikes: increment recovery progress
  if (previousStrikeCount > 0 && rating >= 4.5) {
    newRecoveryProgress = previousRecoveryProgress + 1;

    // Check if user has completed 5 qualifying shifts
    if (newRecoveryProgress >= 5) {
      strikeRemoved = true;
      newStrikeCount = previousStrikeCount - 1;
      newRecoveryProgress = 0;

      await db
        .update(users)
        .set({
          strikes: newStrikeCount,
          recoveryProgress: 0,
          lastStrikeDate: newStrikeCount > 0 ? user.lastStrikeDate : null,
          updatedAt: now,
        })
        .where(eq(users.id, userId));

      // Notify user of strike removal
      try {
        await notificationsService.createNotification(userId, {
          type: 'strike_removed',
          title: '🎉 Strike Removed!',
          message: `Congratulations! You completed 5 shifts with 4.5+ star ratings and earned a strike removal. Current strikes: ${newStrikeCount}`,
          data: {
            shiftId,
            strikesRemoved: 1,
            totalStrikes: newStrikeCount,
            reason: 'recovery_progress_complete',
          },
        });
      } catch (error) {
        console.error('[REPUTATION] Failed to send strike removal notification:', error);
      }

      console.log(`[REPUTATION] Strike removed for user ${userId} via recovery progress: -1 strike (now ${newStrikeCount})`);
    } else {
      // Just increment recovery progress
      await db
        .update(users)
        .set({
          recoveryProgress: newRecoveryProgress,
          updatedAt: now,
        })
        .where(eq(users.id, userId));

      console.log(`[REPUTATION] Recovery progress updated for user ${userId}: ${newRecoveryProgress}/5 toward strike removal`);
    }

    return {
      success: true,
      strikeCount: newStrikeCount,
      previousStrikeCount,
      recoveryProgress: newRecoveryProgress,
      previousRecoveryProgress,
      strikeRemoved,
      progressReset: false,
      message: strikeRemoved
        ? `Strike removed! You completed 5 shifts with 4.5+ stars. Current strikes: ${newStrikeCount}`
        : `Great job! ${newRecoveryProgress}/5 shifts toward strike removal.`,
    };
  }

  // Rating is acceptable but either no strikes or rating between 3.0-4.5
  // Just log and return current state
  const message = previousStrikeCount === 0
    ? 'Shift completed successfully. No strikes to recover from.'
    : `Shift completed with rating ${rating}. Need 4.5+ stars to progress strike recovery.`;

  console.log(`[REPUTATION] Shift processed for user ${userId}: ${message}`);

  return {
    success: true,
    strikeCount: newStrikeCount,
    previousStrikeCount,
    recoveryProgress: newRecoveryProgress,
    previousRecoveryProgress,
    strikeRemoved: false,
    progressReset: false,
    message,
  };
}

/**
 * Check if a user is currently suspended
 */
export async function isUserSuspended(userId: string): Promise<boolean> {
  const user = await usersRepo.getUserById(userId);
  if (!user) return false;

  if (user.suspendedUntil && user.suspendedUntil > new Date()) {
    return true;
  }

  return false;
}

/**
 * Get user's reputation stats
 */
export async function getUserReputationStats(userId: string): Promise<{
  strikes: number;
  reliabilityScore: ReliabilityScore;
  reliabilityLabel: string;
  shiftsSinceLastStrike: number;
  shiftsUntilStrikeRemoval: number;
  recoveryProgress: number;
  suspendedUntil: Date | null;
  isSuspended: boolean;
  completedShiftCount: number;
  noShowCount: number;
} | null> {
  const user = await usersRepo.getUserById(userId);
  if (!user) return null;

  const strikes = user.strikes ?? 0;
  const suspendedUntil = user.suspendedUntil ?? null;
  const isSuspended = suspendedUntil !== null && suspendedUntil > new Date();
  const shiftsSinceLastStrike = user.shiftsSinceLastStrike ?? 0;
  const recoveryProgress = user.recoveryProgress ?? 0;
  const reliabilityScore = getReliabilityScore(strikes, suspendedUntil);

  return {
    strikes,
    reliabilityScore,
    reliabilityLabel: getReliabilityLabel(reliabilityScore),
    shiftsSinceLastStrike,
    shiftsUntilStrikeRemoval: strikes > 0 ? Math.max(0, 5 - shiftsSinceLastStrike) : 0,
    recoveryProgress,
    suspendedUntil,
    isSuspended,
    completedShiftCount: user.completedShiftCount ?? 0,
    noShowCount: user.noShowCount ?? 0,
  };
}

/**
 * Check for users whose suspension has just expired and send reactivation emails
 * This should be called periodically (e.g., every 5 minutes) by a cron job
 * 
 * Uses a flag (reactivationEmailSent) to prevent sending duplicate emails
 */
export async function checkAndSendReactivationEmails(): Promise<{ processed: number; emailsSent: number }> {
  const db = getDb();
  if (!db) {
    console.warn('[REPUTATION] Database not available for reactivation check');
    return { processed: 0, emailsSent: 0 };
  }

  const now = new Date();
  let processed = 0;
  let emailsSent = 0;

  try {
    // Find users whose suspension has expired but haven't received reactivation email
    // We check for suspendedUntil <= now (expired) and suspendedUntil > 48h ago (recent)
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    
    // Get all professionals who had a suspension that recently expired
    const suspendedUsers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.role, 'professional'),
          // suspendedUntil is in the past (expired)
          // but not too far in the past (within last 1 hour window to avoid reprocessing)
          sql`${users.suspendedUntil} IS NOT NULL`,
          sql`${users.suspendedUntil} <= ${now}`,
          sql`${users.suspendedUntil} > ${new Date(now.getTime() - 60 * 60 * 1000)}` // Within last hour
        )
      );

    for (const user of suspendedUsers) {
      processed++;
      
      // Calculate shifts until strike removal
      const strikes = user.strikes ?? 0;
      const shiftsSinceLastStrike = user.shiftsSinceLastStrike ?? 0;
      const shiftsUntilStrikeRemoval = strikes > 0 ? Math.max(0, 5 - shiftsSinceLastStrike) : 0;

      try {
        const sent = await emailService.sendAccountRestoredEmail(
          user.email,
          user.name || user.email.split('@')[0],
          strikes,
          shiftsUntilStrikeRemoval
        );

        if (sent) {
          emailsSent++;
          console.log(`[REPUTATION] Reactivation email sent to ${user.email}`);
          
          // Clear the suspendedUntil field to mark as processed
          await db
            .update(users)
            .set({
              suspendedUntil: null,
              updatedAt: now,
            })
            .where(eq(users.id, user.id));
        }
      } catch (emailError) {
        console.error(`[REPUTATION] Failed to send reactivation email to ${user.email}:`, emailError);
      }
    }

    if (processed > 0) {
      console.log(`[REPUTATION] Reactivation check complete: ${processed} users processed, ${emailsSent} emails sent`);
    }
  } catch (error) {
    console.error('[REPUTATION] Error checking for expired suspensions:', error);
  }

  return { processed, emailsSent };
}
