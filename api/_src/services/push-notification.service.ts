/**
 * Push Notification Service
 * 
 * Handles sending push notifications via Firebase Cloud Messaging
 * Only sends pushes when user is not actively viewing the relevant content
 */

import * as admin from 'firebase-admin';
import * as pushTokensRepo from '../repositories/push-tokens.repository.js';
import * as messagesRepo from '../repositories/messages.repository.js';
import * as conversationsRepo from '../repositories/conversations.repository.js';
import { getDb } from '../db/index.js';
import { messages, conversations } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

// Lazy initialization of Firebase Messaging
let messagingInstance: admin.messaging.Messaging | null = null;

function getMessaging(): admin.messaging.Messaging | null {
  if (messagingInstance) {
    return messagingInstance;
  }

  try {
    // Get Firebase Admin app (already initialized in firebase.ts)
    const app = admin.app('hospogo-worker-v2');
    messagingInstance = admin.messaging(app);
    return messagingInstance;
  } catch (error: any) {
    console.error('[PushNotification] Error initializing Firebase Messaging:', error);
    return null;
  }
}

/**
 * Check if user is actively viewing a conversation
 * Returns true if the user has read messages in the conversation recently (within last 2 minutes)
 */
async function isUserActiveInConversation(
  userId: string,
  conversationId: string
): Promise<boolean> {
  try {
    const db = getDb();
    if (!db) {
      return false;
    }

    // Get the most recent message in the conversation
    const [latestMessage] = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(1);

    if (!latestMessage) {
      return false;
    }

    // If the latest message is from the user, they're active
    if (latestMessage.senderId === userId) {
      return true;
    }

    // Check if the user has read the latest message (within last 2 minutes)
    if (latestMessage.isRead) {
      const readTime = new Date(latestMessage.isRead);
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      
      // If read within last 2 minutes, user is likely active
      if (readTime > twoMinutesAgo) {
        return true;
      }
    }

    return false;
  } catch (error: any) {
    console.error('[PushNotification] Error checking active conversation:', error);
    // Default to false (send push) if we can't determine
    return false;
  }
}

/**
 * Send push notification to a user
 */
async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
    const messaging = getMessaging();
    if (!messaging) {
      console.error('[PushNotification] Firebase Messaging not initialized');
      return false;
    }

    const message: admin.messaging.Message = {
      token,
      notification: {
        title,
        body,
      },
      data: data ? Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ) : undefined,
      webpush: {
        notification: {
          title,
          body,
          icon: '/brand-logo-192.png',
          badge: '/brand-logo-192.png',
        },
        fcmOptions: {
          link: data?.link || '/',
        },
      },
    };

    const response = await messaging.send(message);
    console.log('[PushNotification] Successfully sent message:', response);
    return true;
  } catch (error: any) {
    // Handle invalid token errors gracefully
    if (error?.code === 'messaging/invalid-registration-token' || 
        error?.code === 'messaging/registration-token-not-registered') {
      console.log('[PushNotification] Invalid token, deactivating:', token);
      await pushTokensRepo.deactivateToken(token);
    } else {
      console.error('[PushNotification] Error sending push notification:', error);
    }
    return false;
  }
}

/**
 * Send push notification for a new message
 * Only sends if user is not actively viewing the conversation
 */
export async function sendMessagePushNotification(
  recipientId: string,
  senderName: string,
  messageContent: string,
  conversationId: string,
  link?: string
): Promise<void> {
  try {
    // Check if user is active in the conversation
    const isActive = await isUserActiveInConversation(recipientId, conversationId);
    if (isActive) {
      console.log('[PushNotification] User is active in conversation, skipping push');
      return;
    }

    // Get active push tokens for the user
    const tokens = await pushTokensRepo.getActiveTokensForUser(recipientId);
    if (tokens.length === 0) {
      console.log('[PushNotification] No active push tokens for user:', recipientId);
      return;
    }

    // Truncate message content for notification
    const truncatedContent = messageContent.length > 100 
      ? messageContent.substring(0, 100) + '...'
      : messageContent;

    const title = 'New Message';
    const body = `${senderName}: ${truncatedContent}`;
    const data: Record<string, string> = {
      type: 'message_received',
      conversationId,
      link: link || `/messages?conversation=${conversationId}`,
    };

    // Send to all active tokens
    const sendPromises = tokens.map(token => 
      sendPushNotification(token.token, title, body, data)
    );

    await Promise.allSettled(sendPromises);
  } catch (error: any) {
    console.error('[PushNotification] Error sending message push notification:', error);
  }
}

/**
 * Send push notification for application status change
 */
export async function sendApplicationStatusPushNotification(
  userId: string,
  title: string,
  message: string,
  link?: string,
  metadata?: Record<string, string>
): Promise<void> {
  try {
    // Get active push tokens for the user
    const tokens = await pushTokensRepo.getActiveTokensForUser(userId);
    if (tokens.length === 0) {
      console.log('[PushNotification] No active push tokens for user:', userId);
      return;
    }

    const data: Record<string, string> = {
      type: 'application_status_change',
      link: link || '/my-applications',
      ...metadata,
    };

    // Send to all active tokens
    const sendPromises = tokens.map(token => 
      sendPushNotification(token.token, title, message, data)
    );

    await Promise.allSettled(sendPromises);
  } catch (error: any) {
    console.error('[PushNotification] Error sending application status push notification:', error);
  }
}

/**
 * Send push notification for a new application received (for venue owners)
 */
export async function sendNewApplicationPushNotification(
  venueOwnerId: string,
  applicantName: string,
  jobTitle: string,
  jobId: string,
  link?: string
): Promise<void> {
  try {
    // Get active push tokens for the user
    const tokens = await pushTokensRepo.getActiveTokensForUser(venueOwnerId);
    if (tokens.length === 0) {
      console.log('[PushNotification] No active push tokens for user:', venueOwnerId);
      return;
    }

    const title = 'New Application Received';
    const body = `${applicantName} applied for your job: ${jobTitle}`;
    const data: Record<string, string> = {
      type: 'application_received',
      jobId,
      link: link || '/manage-jobs',
    };

    // Send to all active tokens
    const sendPromises = tokens.map(token => 
      sendPushNotification(token.token, title, body, data)
    );

    await Promise.allSettled(sendPromises);
  } catch (error: any) {
    console.error('[PushNotification] Error sending new application push notification:', error);
  }
}

/**
 * Send generic push notification
 */
export async function sendGenericPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  try {
    // Get active push tokens for the user
    const tokens = await pushTokensRepo.getActiveTokensForUser(userId);
    if (tokens.length === 0) {
      console.log('[PushNotification] No active push tokens for user:', userId);
      return;
    }

    // Send to all active tokens
    const sendPromises = tokens.map(token => 
      sendPushNotification(token.token, title, body, data)
    );

    await Promise.allSettled(sendPromises);
  } catch (error: any) {
    console.error('[PushNotification] Error sending generic push notification:', error);
  }
}
