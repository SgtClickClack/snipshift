/**
 * Hospitality cancellation logic
 *
 * The goal is to centralize staff-cancellation behavior so routes/jobs can call it consistently.
 *
 * Rules:
 * - If the cancellation happens within the shift's cancellation window (default 24h),
 *   it becomes an emergency-fill shift and we trigger a penalty + notify the venue.
 * - Otherwise, we republish the shift normally.
 */

import * as shiftsRepo from '../repositories/shifts.repository.js';
import * as profilesRepo from '../repositories/profiles.repository.js';
import * as usersRepo from '../repositories/users.repository.js';
import * as notificationsService from '../lib/notifications-service.js';
import * as reputationService from '../lib/reputation-service.js';

export type HandleStaffCancellationResult =
  | { ok: true; branch: 'late'; updatedShiftId: string }
  | { ok: true; branch: 'early'; updatedShiftId: string }
  | { ok: false; error: 'SHIFT_NOT_FOUND' | 'SHIFT_START_TIME_INVALID' };

export interface HandleStaffCancellationParams {
  shiftId: string;
  staffId: string;
  reason?: string;
  now?: Date;
}

export interface HandleStaffCancellationDeps {
  /**
   * Trigger a penalty against the staff member (e.g. strike, fee, reduced ranking).
   * This is injected for testability; default implementation is a no-op.
   */
  triggerPenalty?: (staffId: string, meta: { shiftId: string; timeUntilShiftHours: number }) => Promise<void>;

  /**
   * Notify the venue with an urgent message. Defaults to an in-app notification.
   */
  notifyVenue?: (venueId: string, message: string, meta: { shiftId: string; staffId: string }) => Promise<void>;

  /**
   * Republish the shift as open (and optionally emergency-fill).
   */
  republishShift?: (shiftId: string, updates: { isEmergencyFill: boolean; staffCancellationReason?: string | null }) => Promise<void>;
}

function hoursUntil(now: Date, startTime: Date): number {
  return (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
}

/**
 * Increment a staff member's reliability strikes and suspend if threshold reached.
 *
 * Uses the new reputation service for late cancellation handling.
 * Only applies a strike if the cancellation is within 4 hours of shift start.
 */
export async function triggerPenalty(
  staffId: string,
  meta: { shiftId: string; timeUntilShiftHours: number; shiftStartTime?: Date }
): Promise<{ strikes: number; suspended: boolean } | null> {
  // Use reputation service for late cancellations (< 4h notice)
  if (meta.shiftStartTime) {
    const result = await reputationService.handleLateCancellation(
      staffId,
      meta.shiftId,
      meta.shiftStartTime
    );

    return {
      strikes: result.strikeCount,
      suspended: result.reliabilityScore === 'suspended',
    };
  }

  // Fallback: use legacy profiles repo logic if shiftStartTime not provided
  const strikes = await profilesRepo.incrementReliabilityStrikes(staffId);
  if (strikes === null) return null;

  const suspended = strikes >= 3;
  if (suspended) {
    // "account_status = SUSPENDED" maps to isActive=false.
    await usersRepo.banUser(staffId);
  }

  const title = suspended ? 'Account Suspended' : 'Reliability Strike Issued';
  const message = suspended
    ? `You have reached ${strikes} reliability strikes. Your account has been suspended due to repeated late cancellations.`
    : `You received a reliability strike for a late cancellation. You now have ${strikes} strike${strikes === 1 ? '' : 's'}.`;

  await notificationsService.createInAppNotification(staffId, 'SYSTEM', title, message, {
    type: 'reliability_strike',
    strikes,
    suspended,
    shiftId: meta.shiftId,
    timeUntilShiftHours: meta.timeUntilShiftHours,
  });

  return { strikes, suspended };
}

/**
 * Handle a staff member cancelling a shift assignment.
 */
export async function handleStaffCancellation(
  params: HandleStaffCancellationParams,
  deps: HandleStaffCancellationDeps = {}
): Promise<HandleStaffCancellationResult> {
  const now = params.now ?? new Date();
  const shift = await shiftsRepo.getShiftById(params.shiftId);

  if (!shift) return { ok: false, error: 'SHIFT_NOT_FOUND' };

  const startTime = new Date((shift as any).startTime);
  if (Number.isNaN(startTime.getTime())) return { ok: false, error: 'SHIFT_START_TIME_INVALID' };

  const cancellationWindowHours =
    typeof (shift as any).cancellationWindowHours === 'number'
      ? (shift as any).cancellationWindowHours
      : 24;

  const timeUntilShiftHours = hoursUntil(now, startTime);
  const isLateCancellation = timeUntilShiftHours < cancellationWindowHours;

  const staffCancellationReason =
    typeof params.reason === 'string' && params.reason.trim().length > 0 ? params.reason.trim() : null;

  const republishShift =
    deps.republishShift ??
    (async (shiftId, updates) => {
      await shiftsRepo.updateShift(shiftId, {
        status: 'open',
        assigneeId: null,
        isEmergencyFill: updates.isEmergencyFill,
        staffCancellationReason: updates.staffCancellationReason ?? null,
      });
    });

  const notifyVenue =
    deps.notifyVenue ??
    (async (venueId, message, meta) => {
      await notificationsService.createInAppNotification(
        venueId,
        'SYSTEM',
        message,
        `${message} (Shift ${meta.shiftId})`,
        {
          shiftId: meta.shiftId,
          staffId: meta.staffId,
          type: 'staff_cancelled',
        }
      );
    });

  const triggerPenaltyImpl = deps.triggerPenalty ?? (async (staffId: string, meta: { shiftId: string; timeUntilShiftHours: number; shiftStartTime?: Date }) => {
    await triggerPenalty(staffId, meta);
  });

  if (isLateCancellation) {
    // Late cancellation: mark as emergency-fill and alert the venue.
    await Promise.all([
      triggerPenaltyImpl(params.staffId, { shiftId: params.shiftId, timeUntilShiftHours, shiftStartTime: startTime }),
      notifyVenue(shift.employerId, 'CRITICAL: Staff cancelled late.', {
        shiftId: params.shiftId,
        staffId: params.staffId,
      }),
      republishShift(params.shiftId, {
        isEmergencyFill: true,
        staffCancellationReason,
      }),
    ]);

    return { ok: true, branch: 'late', updatedShiftId: params.shiftId };
  }

  // Early cancellation: republish normally.
  await republishShift(params.shiftId, {
    isEmergencyFill: false,
    staffCancellationReason,
  });

  return { ok: true, branch: 'early', updatedShiftId: params.shiftId };
}

