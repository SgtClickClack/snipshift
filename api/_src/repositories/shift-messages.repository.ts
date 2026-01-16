/**
 * Shift Messages Repository
 * 
 * Encapsulates database queries for shift messaging functionality
 */

import { eq, and, desc, sql, or, isNull, inArray } from 'drizzle-orm';
import { shiftMessages } from '../db/schema/shifts.js';
import { shifts } from '../db/schema/shifts.js';
import { getDb } from '../db/index.js';

export interface CreateShiftMessageInput {
  shiftId: string;
  senderId: string;
  recipientId: string;
  content: string;
}

/**
 * Create a new shift message
 */
export async function createShiftMessage(
  input: CreateShiftMessageInput
): Promise<typeof shiftMessages.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [newMessage] = await db
    .insert(shiftMessages)
    .values({
      shiftId: input.shiftId,
      senderId: input.senderId,
      recipientId: input.recipientId,
      content: input.content,
      readAt: null, // Messages start as unread
    })
    .returning();

  return newMessage || null;
}

/**
 * Get all messages for a shift thread
 * Only returns messages if the shift is 'filled' and not archived (within 24 hours of completion)
 */
export async function getShiftMessages(
  shiftId: string,
  userId: string
): Promise<typeof shiftMessages.$inferSelect[]> {
  const db = getDb();
  if (!db) {
    return [];
  }

  // First verify the shift exists and user has access
  const [shift] = await db
    .select()
    .from(shifts)
    .where(eq(shifts.id, shiftId));

  if (!shift) {
    return [];
  }

  // Check if user is authorized (must be employer or assignee)
  const isAuthorized = shift.employerId === userId || shift.assigneeId === userId;
  if (!isAuthorized) {
    return [];
  }

  // Check if shift is filled (required for messaging)
  if (shift.status !== 'filled' && shift.status !== 'completed' && shift.status !== 'confirmed') {
    return [];
  }

  // Check if channel is archived (24 hours after completion)
  if (shift.status === 'completed' || shift.status === 'confirmed') {
    const completedAt = shift.updatedAt || shift.createdAt;
    if (completedAt) {
      const completedDate = new Date(completedAt);
      const now = new Date();
      const hoursSinceCompletion = (now.getTime() - completedDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceCompletion > 24) {
        // Channel is archived, return empty array
        return [];
      }
    }
  }

  // Get all messages for this shift, ordered by creation time
  return await db
    .select()
    .from(shiftMessages)
    .where(eq(shiftMessages.shiftId, shiftId))
    .orderBy(desc(shiftMessages.createdAt));
}

/**
 * Mark messages as read for a specific recipient in a shift thread
 */
export async function markShiftMessagesAsRead(
  shiftId: string,
  recipientId: string
): Promise<number> {
  const db = getDb();
  if (!db) {
    return 0;
  }

  const result = await db
    .update(shiftMessages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(shiftMessages.shiftId, shiftId),
        eq(shiftMessages.recipientId, recipientId),
        isNull(shiftMessages.readAt) // Only update unread messages
      )
    )
    .returning();

  return result.length;
}

/**
 * Get unread message count for a user across all their shift threads
 */
export async function getUnreadShiftMessageCount(userId: string): Promise<number> {
  const db = getDb();
  if (!db) {
    return 0;
  }

  // Get all shifts where user is either employer or assignee
  const userShifts = await db
    .select({ id: shifts.id })
    .from(shifts)
    .where(
      or(
        eq(shifts.employerId, userId),
        eq(shifts.assigneeId, userId)
      )
    );

  if (userShifts.length === 0) {
    return 0;
  }

  const shiftIds = userShifts.map(s => s.id);

  // Count unread messages where user is the recipient
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(shiftMessages)
    .where(
      and(
        inArray(shiftMessages.shiftId, shiftIds),
        eq(shiftMessages.recipientId, userId),
        isNull(shiftMessages.readAt)
      )
    );

  return Number(result?.count || 0);
}

/**
 * Get unread message count for a specific shift thread
 */
export async function getUnreadShiftMessageCountForShift(
  shiftId: string,
  userId: string
): Promise<number> {
  const db = getDb();
  if (!db) {
    return 0;
  }

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(shiftMessages)
    .where(
      and(
        eq(shiftMessages.shiftId, shiftId),
        eq(shiftMessages.recipientId, userId),
        isNull(shiftMessages.readAt)
      )
    );

  return Number(result?.count || 0);
}
