/**
 * Notifications Repository
 * 
 * Encapsulates database queries for notifications
 */

import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { notifications } from '../db/schema';
import { getDb } from '../db';

/**
 * Get notifications for a user
 */
export async function getNotificationsForUser(
  userId: string,
  limit: number = 50
): Promise<typeof notifications.$inferSelect[]> {
  const db = getDb();
  if (!db) {
    return [];
  }

  const result = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return result;
}

/**
 * Get unread notification count for a user (lightweight query)
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const db = getDb();
  if (!db) {
    return 0;
  }

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      isNull(notifications.isRead)
    ));

  return Number(result[0]?.count || 0);
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<typeof notifications.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  // Verify ownership before updating
  const [updated] = await db
    .update(notifications)
    .set({
      isRead: sql`NOW()`,
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
export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  const db = getDb();
  if (!db) {
    return 0;
  }

  const result = await db
    .update(notifications)
    .set({
      isRead: sql`NOW()`,
    })
    .where(and(
      eq(notifications.userId, userId),
      isNull(notifications.isRead)
    ))
    .returning();

  return result.length;
}

