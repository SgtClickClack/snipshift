/**
 * Notification Service for Booking Workflow
 * 
 * Handles in-app notifications and email notifications for shift-related events
 */

import * as notificationsRepo from '../repositories/notifications.repository.js';
import * as usersRepo from '../repositories/users.repository.js';
import { notificationBus } from '../services/notification.service.js';

export type NotificationType = 'SHIFT_INVITE' | 'SHIFT_CONFIRMED' | 'SHIFT_CANCELLED' | 'SYSTEM';

export interface ShiftDetails {
  id: string;
  title: string;
  startTime: Date | string;
  endTime: Date | string;
  location?: string | null;
  hourlyRate?: string | null;
}

/**
 * Create an in-app notification
 */
export async function createInAppNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  metadata?: Record<string, any>
): Promise<any> {
  try {
    const notification = await notificationsRepo.create({
      userId,
      type: type as any, // Type assertion needed due to enum mismatch
      title,
      message,
      data: metadata || {},
    });

    if (notification) {
      // Emit event for real-time updates (SSE)
      notificationBus.emit('new_notification', {
        userId,
        notification: {
          ...notification,
          isRead: !!notification.isRead,
        },
      });
    }

    return notification;
  } catch (error: any) {
    console.error('[createInAppNotification] Error creating notification:', {
      message: error?.message,
      userId,
      type,
      title,
    });
    throw error;
  }
}

/**
 * Mock email sending function
 * For now, just logs to console
 */
export async function sendEmailMock(
  to: string,
  subject: string,
  body: string
): Promise<boolean> {
  console.log('='.repeat(60));
  console.log('📧 EMAIL SENT (MOCK)');
  console.log('='.repeat(60));
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${body}`);
  console.log('='.repeat(60));
  console.log('');
  
  return Promise.resolve(true);
}

/**
 * Notify a professional when they receive a shift invite
 */
export async function notifyProfessionalOfInvite(
  professionalId: string,
  shiftDetails: ShiftDetails & { employerId?: string }
): Promise<void> {
  try {
    // Get business/employer information
    const shift = shiftDetails;
    let businessName = 'Business';
    if (shift.employerId) {
      const employer = await usersRepo.getUserById(shift.employerId);
      businessName = employer?.name || 'Business';
    }
    
    // Format date for display
    const startDate = new Date(shift.startTime);
    const dateStr = startDate.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });

    const title = 'New Shift Offer';
    const message = `New Shift Offer: ${businessName} - ${dateStr}`;

    // Create in-app notification
    await createInAppNotification(
      professionalId,
      'SHIFT_INVITE',
      title,
      message,
      {
        shiftId: shift.id,
        offerId: shift.id, // Using shiftId as offerId for now
        type: 'shift_invite',
      }
    );

    // Get professional's email
    const professional = await usersRepo.getUserById(professionalId);
    if (professional?.email) {
      const emailBody = `
Hello ${professional.name || 'Professional'},

You have received a new shift offer!

Shift Details:
- Title: ${shift.title}
- Date: ${dateStr}
- Time: ${startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
${shift.location ? `- Location: ${shift.location}` : ''}
${shift.hourlyRate ? `- Rate: $${shift.hourlyRate}/hour` : ''}

Please log in to view and respond to this offer.

Best regards,
Snipshift Team
      `.trim();

      await sendEmailMock(
        professional.email,
        title,
        emailBody
      );
    }
  } catch (error: any) {
    console.error('[notifyProfessionalOfInvite] Error:', {
      message: error?.message,
      professionalId,
      shiftId: shiftDetails.id,
    });
    // Don't throw - notification failures shouldn't break the workflow
  }
}

/**
 * Notify a business when a professional accepts their shift
 */
export async function notifyBusinessOfAcceptance(
  businessId: string,
  professionalName: string,
  shiftDetails: ShiftDetails
): Promise<void> {
  try {
    // Format date for display
    const startDate = new Date(shiftDetails.startTime);
    const dateStr = startDate.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });

    const title = 'Shift Accepted';
    const message = `${professionalName} accepted your shift for ${dateStr}`;

    // Create in-app notification
    await createInAppNotification(
      businessId,
      'SHIFT_CONFIRMED',
      title,
      message,
      {
        shiftId: shiftDetails.id,
        professionalName,
        type: 'shift_confirmed',
      }
    );

    // Get business owner's email
    const business = await usersRepo.getUserById(businessId);
    if (business?.email) {
      const emailBody = `
Hello ${business.name || 'Business Owner'},

Great news! ${professionalName} has accepted your shift offer.

Shift Details:
- Title: ${shiftDetails.title}
- Date: ${dateStr}
- Time: ${startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
${shiftDetails.location ? `- Location: ${shiftDetails.location}` : ''}
${shiftDetails.hourlyRate ? `- Rate: $${shiftDetails.hourlyRate}/hour` : ''}

The shift has been confirmed and added to your calendar.

Best regards,
Snipshift Team
      `.trim();

      await sendEmailMock(
        business.email,
        title,
        emailBody
      );
    }
  } catch (error: any) {
    console.error('[notifyBusinessOfAcceptance] Error:', {
      message: error?.message,
      businessId,
      shiftId: shiftDetails.id,
    });
    // Don't throw - notification failures shouldn't break the workflow
  }
}

