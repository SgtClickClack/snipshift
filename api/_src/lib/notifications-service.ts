/**
 * Notification Service for Shift Workflow
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
HospoGo Team
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
 * Notify a professional when a confirmed shift they accepted is modified by the shop.
 * Used for safety when rescheduling a CONFIRMED shift.
 */
export async function notifyProfessionalOfShiftChange(
  professionalId: string,
  payload: {
    shiftId: string;
    title: string;
    oldStartTime: Date | string;
    oldEndTime: Date | string;
    newStartTime: Date | string;
    newEndTime: Date | string;
    reason: string;
    employerId?: string;
  }
): Promise<void> {
  try {
    let businessName = 'Business';
    if (payload.employerId) {
      const employer = await usersRepo.getUserById(payload.employerId);
      businessName = employer?.name || 'Business';
    }

    const oldStart = new Date(payload.oldStartTime);
    const oldEnd = new Date(payload.oldEndTime);
    const nextStart = new Date(payload.newStartTime);
    const nextEnd = new Date(payload.newEndTime);

    const title = 'Shift Updated';
    const message = `${businessName} updated your confirmed shift: ${nextStart.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;

    await createInAppNotification(professionalId, 'SYSTEM', title, message, {
      shiftId: payload.shiftId,
      type: 'shift_changed',
      reason: payload.reason,
      oldStartTime: oldStart.toISOString(),
      oldEndTime: oldEnd.toISOString(),
      newStartTime: nextStart.toISOString(),
      newEndTime: nextEnd.toISOString(),
      link: '/professional-dashboard?view=calendar',
    });

    const professional = await usersRepo.getUserById(professionalId);
    if (professional?.email) {
      const emailBody = `
Hello ${professional.name || 'Professional'},

Your confirmed shift has been updated by ${businessName}.

Old time:
- ${oldStart.toLocaleString('en-US')} → ${oldEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}

New time:
- ${nextStart.toLocaleString('en-US')} → ${nextEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}

Reason provided by the venue:
${payload.reason}

Please log in to review the updated shift details.

Best regards,
HospoGo Team
      `.trim();

      await sendEmailMock(professional.email, title, emailBody);
    }
  } catch (error: any) {
    console.error('[notifyProfessionalOfShiftChange] Error:', {
      message: error?.message,
      professionalId,
      shiftId: payload.shiftId,
    });
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
HospoGo Team
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

/**
 * Notify a business when a professional applies for their shift
 */
export async function notifyBusinessOfApplication(
  businessId: string,
  applicationDetails: {
    id: string;
    shiftId: string;
    professionalName: string;
    shiftTitle: string;
  }
): Promise<void> {
  try {
    const title = 'New Shift Application';
    const message = `${applicationDetails.professionalName} applied for your shift: ${applicationDetails.shiftTitle}`;

    // Create in-app notification
    await createInAppNotification(
      businessId,
      'SYSTEM',
      title,
      message,
      {
        applicationId: applicationDetails.id,
        shiftId: applicationDetails.shiftId,
        professionalName: applicationDetails.professionalName,
        type: 'shift_application',
      }
    );

    // Get business owner's email
    const business = await usersRepo.getUserById(businessId);
    if (business?.email) {
      const emailBody = `
Hello ${business.name || 'Business Owner'},

You have received a new application for your shift.

Shift: ${applicationDetails.shiftTitle}
Applicant: ${applicationDetails.professionalName}

Please log in to review and respond to this application.

Best regards,
HospoGo Team
      `.trim();

      await sendEmailMock(
        business.email,
        title,
        emailBody
      );
    }
  } catch (error: any) {
    console.error('[notifyBusinessOfApplication] Error:', {
      message: error?.message,
      businessId,
      applicationId: applicationDetails.id,
    });
    // Don't throw - notification failures shouldn't break the workflow
  }
}

/**
 * Notify venue owner when their subscription is downgraded due to payment failure
 * This is called after 3 failed payment attempts to inform them they've lost Business perks
 */
export async function notifyVenueOfDowngrade(
  venueOwnerId: string,
  reason: string
): Promise<void> {
  try {
    const title = 'Subscription Downgraded';
    const message = 'Your Business subscription has been canceled due to payment failure.';

    // Create in-app notification
    await createInAppNotification(
      venueOwnerId,
      'SYSTEM',
      title,
      message,
      {
        type: 'subscription_downgraded',
        reason,
        link: '/wallet',
      }
    );

    // Get venue owner's email
    const venueOwner = await usersRepo.getUserById(venueOwnerId);
    if (venueOwner?.email) {
      const emailBody = `
IMPORTANT: Subscription Downgraded

Hello ${venueOwner.name || 'Venue Owner'},

Your Business subscription has been canceled due to repeated payment failures.

What this means:
- A $20 booking fee will now apply to each shift booking
- You no longer have access to Business tier features

Reason: ${reason}

To restore your Business subscription and remove booking fees:
1. Log in to your HospoGo account
2. Go to Wallet settings
3. Update your payment method
4. Resubscribe to the Business plan

If you believe this is an error or need assistance, please contact our support team.

Best regards,
HospoGo Team
      `.trim();

      await sendEmailMock(
        venueOwner.email,
        'IMPORTANT: Your HospoGo Business Subscription Has Been Downgraded',
        emailBody
      );
    }
  } catch (error: any) {
    console.error('[notifyVenueOfDowngrade] Error:', {
      message: error?.message,
      venueOwnerId,
    });
    // Don't throw - notification failures shouldn't break the workflow
  }
}

/**
 * Notify shop owner when payment fails for a shift
 */
export async function notifyShopOfPaymentFailure(
  shopId: string,
  shiftId: string,
  shiftTitle: string,
  paymentIntentId: string
): Promise<void> {
  try {
    const title = 'Payment Failed for Shift';
    const message = `Payment failed for shift: ${shiftTitle}. Please update your payment method.`;

    // Create in-app notification
    await createInAppNotification(
      shopId,
      'SYSTEM',
      title,
      message,
      {
        shiftId,
        paymentIntentId,
        type: 'payment_failed',
      }
    );

    // Get shop owner's email
    const shop = await usersRepo.getUserById(shopId);
    if (shop?.email) {
      const emailBody = `
URGENT: Payment Failed for Shift

Hello ${shop.name || 'Shop Owner'},

Payment authorization failed for the following shift:

Shift ID: #${shiftId.substring(0, 8)}
Shift Title: ${shiftTitle}
Payment Intent: ${paymentIntentId}

A staff member has accepted this shift, but we were unable to authorize payment. Please:

1. Update your payment method in your billing settings
2. Contact support if you believe this is an error

The shift will remain in "Payment Failed" status until the issue is resolved.

Best regards,
HospoGo Team
      `.trim();

      await sendEmailMock(
        shop.email,
        `URGENT: Payment Failed for Shift #${shiftId.substring(0, 8)}`,
        emailBody
      );
    }
  } catch (error: any) {
    console.error('[notifyShopOfPaymentFailure] Error:', {
      message: error?.message,
      shopId,
      shiftId,
    });
    // Don't throw - notification failures shouldn't break the workflow
  }
}

