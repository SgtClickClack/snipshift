/**
 * Notifications Repository
 * 
 * Encapsulates database queries for notifications
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { notifications, notificationTypeEnum } from '../db/schema.js';
import { getDb } from '../db/index.js';

export type CreateNotificationParams = {
  userId: string;
  type: typeof notificationTypeEnum.enumValues[number];
  title: string;
  message: string;
  data?: Record<string, any>;
};

/**
 * Create a new notification
 */
export async function create(data: CreateNotificationParams) {
  const db = getDb();
  if (!db) return null;

  const [newNotification] = await db
    .insert(notifications)
    .values({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data,
      isRead: false,
    })
    .returning();

  return newNotification;
}

/**
 * Get notifications for a user
 */
export async function findByUserId(
  userId: string,
  limit: number = 50
) {
  const db = getDb();
  if (!db) return [];

  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

/**
 * Get unread notification count for a user (lightweight query)
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false)
    ));

  return Number(result[0]?.count || 0);
}

/**
 * Mark a notification as read
 */
export async function markAsRead(
  notificationId: string,
  userId: string
) {
  const db = getDb();
  if (!db) return null;

  const [updated] = await db
    .update(notifications)
    .set({
      isRead: true,
    })
    .where(and(
      eq(notifications.id, notificationId),
      eq(notifications.userId, userId)
    ))
    .returning();

  return updated || null;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string) {
  const db = getDb();
  if (!db) return 0;

  const result = await db
    .update(notifications)
    .set({
      isRead: true,
    })
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false)
    ))
    .returning();

  return result.length;
}
