/**
 * Notification Service
 * 
 * Handles creation and management of user notifications
 */

import { EventEmitter } from 'events';
import * as notificationsRepo from '../repositories/notifications.repository.js';
import type { WaitlistEntry } from '../repositories/waitlist.repository.js';

// Event bus for real-time notifications
export const notificationBus = new EventEmitter();

// Map internal business events to schema types
export type NotificationEvent = 
  | 'application_received' 
  | 'application_status_change' 
  | 'job_posted' 
  | 'job_updated' 
  | 'job_completed' 
  | 'message_received';

export interface CreateNotificationData {
  userId: string;
  type: NotificationEvent;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a new notification
 */
export async function createNotification(data: CreateNotificationData) {
  // Map specific event types to generic database enum types
  let dbType: 'job_alert' | 'application_update' | 'chat_message' | 'system';

  switch (data.type) {
    case 'message_received':
      dbType = 'chat_message';
      break;
    case 'application_received':
    case 'application_status_change':
      dbType = 'application_update';
      break;
    case 'job_posted':
    case 'job_updated':
    case 'job_completed':
      dbType = 'job_alert';
      break;
    default:
      dbType = 'system';
  }

  // Persist to database
  const notification = await notificationsRepo.create({
    userId: data.userId,
    type: dbType,
    title: data.title,
    message: data.message,
    data: {
      ...data.metadata,
      link: data.link,
      originalType: data.type
    }
  });

  if (notification) {
    // Emit event for real-time updates (SSE)
    notificationBus.emit('new_notification', { 
      userId: data.userId, 
      notification: {
        ...notification,
        // Ensure data structure matches frontend expectations
        link: (notification.data as any)?.link || null,
        isRead: !!notification.isRead
      } 
    });
    
    // Integration with Email Service is handled by specific notification functions
  }

  return notification;
}

/**
 * Create notification for job owner when application is received
 */
export async function notifyApplicationReceived(
  jobOwnerId: string,
  applicantName: string,
  jobTitle: string,
  jobId: string
): Promise<void> {
  await createNotification({
    userId: jobOwnerId,
    type: 'application_received',
    title: 'New Application Received',
    message: `${applicantName} applied for your job: ${jobTitle}`,
    link: `/manage-jobs`,
    metadata: { jobId }
  });
}

/**
 * Create notification for candidate when application status changes
 */
export async function notifyApplicationStatusChange(
  candidateUserId: string | null,
  candidateEmail: string,
  jobTitle: string,
  status: 'accepted' | 'rejected',
  jobId: string
): Promise<void> {
  // If we have userId, create notification
  if (candidateUserId) {
    const statusText = status === 'accepted' ? 'approved' : 'rejected';
    await createNotification({
      userId: candidateUserId,
      type: 'application_status_change',
      title: status === 'accepted' ? 'Application Approved!' : 'Application Update',
      message: `Your application for "${jobTitle}" has been ${statusText}.`,
      link: `/my-applications`,
      metadata: { jobId, status }
    });
  }
}

/**
 * Create notification for both parties when a job is completed
 */
export async function notifyJobCompleted(
  jobId: string,
  employerId: string,
  professionalId: string | null,
  jobTitle: string
): Promise<void> {
  // Notify employer
  await createNotification({
    userId: employerId,
    type: 'job_completed',
    title: 'Job Completed',
    message: `Your job "${jobTitle}" has been marked as completed. Please rate your experience.`,
    link: `/review?jobId=${jobId}`,
    metadata: { jobId }
  });

  // Notify professional if we have their userId
  if (professionalId) {
    await createNotification({
      userId: professionalId,
      type: 'job_completed',
      title: 'Job Completed',
      message: `The job "${jobTitle}" has been completed. Please rate your experience.`,
      link: `/review?jobId=${jobId}`,
      metadata: { jobId }
    });
  }
}

/**
 * Notify professional when their application is approved
 */
export async function notifyApplicationApproved(
  professionalId: string,
  shift: any | null,
  job: any | null
): Promise<void> {
  const title = shift?.title || job?.title || 'Position';
  await createNotification({
    userId: professionalId,
    type: 'application_status_change',
    title: 'Application Approved! 🎉',
    message: `Congratulations! Your application for "${title}" has been approved.`,
    link: `/professional-dashboard?view=applications`,
    metadata: { 
      shiftId: shift?.id,
      jobId: job?.id,
      status: 'accepted'
    }
  });
}

/**
 * Notify professional when their application is declined
 */
export async function notifyApplicationDeclined(
  professionalId: string,
  shift: any | null,
  job: any | null
): Promise<void> {
  const title = shift?.title || job?.title || 'Position';
  await createNotification({
    userId: professionalId,
    type: 'application_status_change',
    title: 'Application Update',
    message: `Your application for "${title}" was not successful this time.`,
    link: `/professional-dashboard?view=applications`,
    metadata: { 
      shiftId: shift?.id,
      jobId: job?.id,
      status: 'rejected'
    }
  });
}

/**
 * Notification Provider Interface
 * Supports different notification delivery methods (email, SMS, push, etc.)
 */
export interface NotificationProvider {
  send(payload: NotificationPayload): Promise<boolean>;
}

export interface NotificationPayload {
  to: string;
  subject: string;
  body: string;
  metadata: {
    name: string;
    role: 'venue' | 'staff';
    approvedAt: string; // Localized Brisbane time string
    entryId: string;
  };
}

/**
 * Mock Notification Provider
 * Logs notification payload to console for development/testing
 */
class MockNotificationProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<boolean> {
    console.log('='.repeat(80));
    console.log('🔔 [NOTIFICATION SERVICE] Waitlist Approval Notification');
    console.log('='.repeat(80));
    console.log('To:', payload.to);
    console.log('Subject:', payload.subject);
    console.log('Body:', payload.body);
    console.log('Metadata:', JSON.stringify(payload.metadata, null, 2));
    console.log('='.repeat(80));
    console.log('');
    return true;
  }
}

/**
 * Format date to Brisbane Local Time (AEST)
 * Returns a human-readable string in Brisbane timezone
 */
function formatBrisbaneDateTime(date: Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }

  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      return 'N/A';
    }

    // Format as 'MMM d, yyyy HH:mm AEST' in Brisbane timezone
    const formatter = new Intl.DateTimeFormat('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Australia/Brisbane',
    });

    const formatted = formatter.format(dateObj);
    return `${formatted} AEST`;
  } catch (error) {
    console.error('[NOTIFICATION] Error formatting Brisbane date:', error);
    return 'N/A';
  }
}

/**
 * Send approval notification for waitlist entry
 * 
 * This function is called when a waitlist entry status is updated to 'approved'.
 * It generates a notification payload with localized Brisbane time and sends it
 * via the configured notification provider (Mock for now).
 * 
 * @param entry - Waitlist entry that was approved
 * @param provider - Notification provider to use (defaults to Mock)
 */
export async function sendApprovalNotification(
  entry: WaitlistEntry,
  provider?: NotificationProvider
): Promise<boolean> {
  // Use Mock provider if none specified
  const notificationProvider = provider || new MockNotificationProvider();

  // Validate entry has required data
  if (!entry.name || !entry.contact) {
    console.error('[NOTIFICATION] Invalid waitlist entry: missing name or contact', {
      entryId: entry.id,
      hasName: !!entry.name,
      hasContact: !!entry.contact,
    });
    return false;
  }

  // Format approvedAt to Brisbane Local Time (AEST)
  const approvedAtBrisbane = formatBrisbaneDateTime(entry.approvedAt);

  // Determine role display name
  const roleDisplayName = entry.role === 'venue' ? 'Venue' : 'Staff';

  // Generate notification body with high-energy, professional Brisbane-centric branding
  const notificationBody = `
🎉 Welcome to Neon Valley: Your HospoGo Access is Approved!

Hey ${entry.name},

Massive news! Your waitlist application has been approved, and you're now part of the HospoGo Brisbane community!

Your Details:
• Role: ${roleDisplayName}
• Location: ${entry.location || 'Brisbane, AU'}
• Approved: ${approvedAtBrisbane}

What's Next?
Get ready to dive into Brisbane's hospitality scene! Whether you're looking for shifts or need to fill them, HospoGo is your platform to connect, work, and thrive in the Neon Valley.

Ready to get started? Head over to HospoGo and complete your profile setup.

Welcome aboard! 🚀

---
HospoGo Brisbane
Neon Valley Hospitality Platform
  `.trim();

  // Create notification payload
  const payload: NotificationPayload = {
    to: entry.contact,
    subject: 'Welcome to Neon Valley: Your HospoGo Access',
    body: notificationBody,
    metadata: {
      name: entry.name,
      role: entry.role,
      approvedAt: approvedAtBrisbane,
      entryId: entry.id,
    },
  };

  try {
    // Send notification via provider
    const success = await notificationProvider.send(payload);

    if (success) {
      console.log('[NOTIFICATION] Approval notification sent successfully', {
        entryId: entry.id,
        contact: entry.contact,
        role: entry.role,
      });
    } else {
      console.error('[NOTIFICATION] Failed to send approval notification', {
        entryId: entry.id,
        contact: entry.contact,
      });
    }

    return success;
  } catch (error: any) {
    console.error('[NOTIFICATION] Error sending approval notification:', {
      error: error?.message || error,
      entryId: entry.id,
      contact: entry.contact,
    });
    return false;
  }
}