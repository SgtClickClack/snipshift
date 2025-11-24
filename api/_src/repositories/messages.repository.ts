/**
 * Messages Repository
 * 
 * Encapsulates database queries for messages
 */

import { eq, and, or, desc, isNull } from 'drizzle-orm';
import { messages, conversations, users } from '../db/schema.js';
import { getDb } from '../db/index.js';

/**
 * Get all messages for a conversation (with security check)
 */
export async function getMessagesForConversation(conversationId: string, userId: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  // Verify user is a participant in the conversation
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        or(
          eq(conversations.participant1Id, userId),
          eq(conversations.participant2Id, userId)
        )
      )
    )
    .limit(1);

  if (!conversation) {
    return null; // User is not a participant
  }

  // Get messages with sender info
  const messageList = await db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      senderId: messages.senderId,
      content: messages.content,
      isRead: messages.isRead,
      createdAt: messages.createdAt,
      sender: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  return messageList;
}

/**
 * Create a new message
 */
export async function createMessage(data: {
  conversationId: string;
  senderId: string;
  content: string;
}) {
  const db = getDb();
  if (!db) {
    return null;
  }

  // Verify sender is a participant
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, data.conversationId),
        or(
          eq(conversations.participant1Id, data.senderId),
          eq(conversations.participant2Id, data.senderId)
        )
      )
    )
    .limit(1);

  if (!conversation) {
    return null; // Sender is not a participant
  }

  const [newMessage] = await db
    .insert(messages)
    .values({
      conversationId: data.conversationId,
      senderId: data.senderId,
      content: data.content,
    })
    .returning();

  return newMessage || null;
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(conversationId: string, userId: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  // Get conversation to find other participant
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!conversation) {
    return null;
  }

  const otherParticipantId = conversation.participant1Id === userId
    ? conversation.participant2Id
    : conversation.participant1Id;

  // Mark messages from other participant as read
  const result = await db
    .update(messages)
    .set({
      isRead: new Date(),
    })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.senderId, otherParticipantId),
        isNull(messages.isRead)
      )
    )
    .returning();

  return result;
}

