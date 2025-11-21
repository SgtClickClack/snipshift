/**
 * Notification Service
 * 
 * Handles creation and management of user notifications
 */

import { getDb } from '../db';
import { notifications } from '../db/schema';

export type NotificationType = 'application_received' | 'application_status_change' | 'job_posted' | 'job_updated' | 'job_completed';

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/**
 * Create a new notification
 */
export async function createNotification(data: CreateNotificationData): Promise<typeof notifications.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    // In development, log notification instead of failing
    console.log('[NOTIFICATION]', data);
    return null;
  }

  try {
    const [newNotification] = await db
      .insert(notifications)
      .values({
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link || null,
        isRead: null, // Unread by default
      })
      .returning();

    return newNotification || null;
  } catch (error) {
    console.error('[NOTIFICATION ERROR]', error);
    return null;
  }
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
  // Otherwise, we could send email (future enhancement)
  if (candidateUserId) {
    const statusText = status === 'accepted' ? 'approved' : 'rejected';
    await createNotification({
      userId: candidateUserId,
      type: 'application_status_change',
      title: status === 'accepted' ? 'Application Approved!' : 'Application Update',
      message: `Your application for "${jobTitle}" has been ${statusText}.`,
      link: `/my-applications`,
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
  });

  // Notify professional if we have their userId
  if (professionalId) {
    await createNotification({
      userId: professionalId,
      type: 'job_completed',
      title: 'Job Completed',
      message: `The job "${jobTitle}" has been completed. Please rate your experience.`,
      link: `/review?jobId=${jobId}`,
    });
  }
}

