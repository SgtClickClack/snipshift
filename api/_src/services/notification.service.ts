/**
 * Notification Service
 * 
 * Handles creation and management of user notifications
 */

import { EventEmitter } from 'events';
import * as notificationsRepo from '../repositories/notifications.repository.js';

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