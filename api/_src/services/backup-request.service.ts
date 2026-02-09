/**
 * Backup Request Service
 * 
 * Handles venue owner requests for immediate backup from waitlist
 * when assigned worker is late or unresponsive.
 */

import { getDb } from '../db/index.js';
import { shifts } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import * as shiftWaitlistRepo from '../repositories/shift-waitlist.repository.js';
import * as shiftsRepo from '../repositories/shifts.repository.js';
import * as usersRepo from '../repositories/users.repository.js';
import * as notificationsService from '../lib/notifications-service.js';
import * as pushNotificationService from './push-notification.service.js';
import * as reputationService from '../lib/reputation-service.js';
import * as proVerificationService from './pro-verification.service.js';

/**
 * Request backup from waitlist for a shift
 * Sends immediate start push to top 3 waitlisted workers
 */
export async function requestBackupFromWaitlist(
  shiftId: string,
  venueOwnerId: string
): Promise<{
  success: boolean;
  notifiedWorkers: number;
  message: string;
}> {
  const db = getDb();
  if (!db) {
    return {
      success: false,
      notifiedWorkers: 0,
      message: 'Database not available',
    };
  }

  try {
    // Get shift
    const shift = await shiftsRepo.getShiftById(shiftId);
    if (!shift) {
      return {
        success: false,
        notifiedWorkers: 0,
        message: 'Shift not found',
      };
    }

    // Verify venue owner
    if (shift.employerId !== venueOwnerId) {
      return {
        success: false,
        notifiedWorkers: 0,
        message: 'Unauthorized: You are not the owner of this shift',
      };
    }

    // Check if shift has an assignee
    if (!shift.assigneeId) {
      return {
        success: false,
        notifiedWorkers: 0,
        message: 'Shift has no assigned worker',
      };
    }

    // Check if backup already requested
    if ((shift as any).backupRequestedAt) {
      return {
        success: false,
        notifiedWorkers: 0,
        message: 'Backup has already been requested for this shift',
      };
    }

    // Check if backup already accepted
    if ((shift as any).backupWorkerId) {
      return {
        success: false,
        notifiedWorkers: 0,
        message: 'Backup worker has already been assigned',
      };
    }

    // Check if shift has waitlisted workers
    const waitlistCount = await shiftWaitlistRepo.getWaitlistCount(shiftId);
    if (waitlistCount === 0) {
      return {
        success: false,
        notifiedWorkers: 0,
        message: 'No workers on waitlist for this shift',
      };
    }

    // Get top 3 waitlisted workers
    const topWorkers = await shiftWaitlistRepo.getTopWaitlistedWorkers(shiftId, 3);

    if (topWorkers.length === 0) {
      return {
        success: false,
        notifiedWorkers: 0,
        message: 'No active waitlisted workers found',
      };
    }

    // Mark backup as requested
    const now = new Date();
    await db
      .update(shifts)
      .set({
        backupRequestedAt: now,
        originalWorkerId: shift.assigneeId,
        updatedAt: now,
      })
      .where(eq(shifts.id, shiftId));

    // Send immediate start push notifications to top 3 workers
    let notifiedCount = 0;
    for (const entry of topWorkers) {
      try {
        const worker = await usersRepo.getUserById(entry.workerId);
        const workerName = worker?.name || 'Worker';

        const title = '🚨 Immediate Start Available!';
        const message = `"${shift.title}" needs immediate backup. First to accept gets the shift!`;

        // Create in-app notification
        await notificationsService.createInAppNotification(
          entry.workerId,
          'SYSTEM',
          title,
          message,
          {
            shiftId: shift.id,
            shiftTitle: shift.title,
            startTime: shift.startTime.toISOString(),
            endTime: shift.endTime.toISOString(),
            location: shift.location,
            hourlyRate: shift.hourlyRate.toString(),
            waitlistRank: entry.rank,
            immediateStart: true,
            backupRequest: true,
            link: `/shifts/${shiftId}?backup=true`,
          }
        );

        // Send push notification
        await pushNotificationService.sendGenericPushNotification(
          entry.workerId,
          title,
          message,
          {
            type: 'backup_request',
            shiftId: shift.id,
            link: `/shifts/${shiftId}?backup=true`,
            immediateStart: 'true',
          }
        );

        notifiedCount++;
      } catch (error) {
        console.error(`[BACKUP_REQUEST] Error notifying worker ${entry.workerId}:`, error);
      }
    }

    console.log(`[BACKUP_REQUEST] Notified ${notifiedCount} waitlisted worker(s) for backup shift ${shiftId}`);

    return {
      success: true,
      notifiedWorkers: notifiedCount,
      message: `Backup request sent to ${notifiedCount} waitlisted worker(s)`,
    };
  } catch (error) {
    console.error('[BACKUP_REQUEST] Error requesting backup:', error);
    return {
      success: false,
      notifiedWorkers: 0,
      message: 'Failed to request backup',
    };
  }
}

/**
 * Accept backup shift (first-to-accept)
 * Assigns worker to shift and cancels original worker with late-cancel penalty
 */
export async function acceptBackupShift(
  shiftId: string,
  workerId: string
): Promise<{
  success: boolean;
  message: string;
  shift?: any;
}> {
  const db = getDb();
  if (!db) {
    return {
      success: false,
      message: 'Database not available',
    };
  }

  try {
    // Get shift
    const shift = await shiftsRepo.getShiftById(shiftId);
    if (!shift) {
      return {
        success: false,
        message: 'Shift not found',
      };
    }

    // Check if backup was requested
    if (!(shift as any).backupRequestedAt) {
      return {
        success: false,
        message: 'Backup has not been requested for this shift',
      };
    }

    // Check if backup already accepted
    if ((shift as any).backupWorkerId) {
      return {
        success: false,
        message: 'Backup worker has already been assigned',
      };
    }

    // Check if worker is on waitlist
    const isOnWaitlist = await shiftWaitlistRepo.isWorkerOnWaitlist(shiftId, workerId);
    if (!isOnWaitlist) {
      return {
        success: false,
        message: 'You are not on the waitlist for this shift',
      };
    }

    // Use transaction to ensure atomicity (first-to-accept)
    let assigned = false;
    let originalWorkerId: string | null = null;

    await db.transaction(async (tx) => {
      // Re-check if backup already accepted (race condition protection)
      const currentShift = await shiftsRepo.getShiftById(shiftId);
      if (!currentShift || (currentShift as any).backupWorkerId) {
        return; // Already assigned
      }

      originalWorkerId = currentShift.assigneeId || null;

      // Assign backup worker
      await tx
        .update(shifts)
        .set({
          assigneeId: workerId,
          backupWorkerId: workerId,
          status: 'confirmed',
          updatedAt: new Date(),
        })
        .where(eq(shifts.id, shiftId));

      assigned = true;
    });

    if (!assigned) {
      return {
        success: false,
        message: 'Backup shift was already assigned to another worker',
      };
    }

    // Mark waitlist entry as converted
    await shiftWaitlistRepo.markAsConverted(shiftId, workerId);

    // Action-as-signature: Replace contract (backup worker replaces original; new professional bound to MSA)
    const { replaceContractProfessional } = await import('./contract.service.js');
    await replaceContractProfessional(shiftId, shift.employerId, workerId);

    // Apply late-cancel penalties to original worker
    if (originalWorkerId) {
      try {
        // Apply same penalties as no-show (2 strikes, suspension, etc.)
        await reputationService.handleNoShow(originalWorkerId, shiftId);
        await reputationService.deductRatingForNoShow(originalWorkerId, 0.5);
        await proVerificationService.onNoShow(originalWorkerId, shiftId);
        await reputationService.calculateAndUpdateReliabilityScore(originalWorkerId);

        // Notify original worker
        await notificationsService.createInAppNotification(
          originalWorkerId,
          'SYSTEM',
          'Shift Cancelled - Late Arrival',
          `Your shift "${shift.title}" was cancelled due to late arrival. A backup worker has been assigned.`,
          {
            shiftId: shift.id,
            reason: 'late_cancel',
            backupAssigned: true,
            link: '/professional-dashboard',
          }
        );

        console.log(`[BACKUP_REQUEST] Applied late-cancel penalties to original worker ${originalWorkerId}`);
      } catch (error) {
        console.error('[BACKUP_REQUEST] Error applying penalties to original worker:', error);
      }
    }

    // Get updated shift
    const updatedShift = await shiftsRepo.getShiftById(shiftId);

    // Notify venue owner
    const venueOwner = await usersRepo.getUserById(shift.employerId);
    const backupWorker = await usersRepo.getUserById(workerId);
    const backupWorkerName = backupWorker?.name || 'Worker';

    await notificationsService.createInAppNotification(
      shift.employerId,
      'SYSTEM',
      '✅ Backup Worker Assigned',
      `${backupWorkerName} has accepted the backup request for "${shift.title}"`,
      {
        shiftId: shift.id,
        backupWorkerId: workerId,
        backupWorkerName,
        link: `/venue/dashboard?shift=${shiftId}`,
      }
    );

    console.log(`[BACKUP_REQUEST] Backup worker ${workerId} assigned to shift ${shiftId}`);

    return {
      success: true,
      message: 'Backup shift accepted successfully',
      shift: updatedShift,
    };
  } catch (error) {
    console.error('[BACKUP_REQUEST] Error accepting backup shift:', error);
    return {
      success: false,
      message: 'Failed to accept backup shift',
    };
  }
}
