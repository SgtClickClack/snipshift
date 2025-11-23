/**
 * Conversations Repository
 * 
 * Encapsulates database queries for conversations
 */

import { eq, or, and, desc } from 'drizzle-orm';
import { conversations, messages, users, jobs } from '../db/schema.js';
import { getDb } from '../db/index.js';

/**
 * Get all conversations for a user (with latest message snippet)
 */
export async function getConversationsForUser(userId: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  // Get conversations where user is participant1 or participant2
  const userConversations = await db
    .select({
      id: conversations.id,
      jobId: conversations.jobId,
      participant1Id: conversations.participant1Id,
      participant2Id: conversations.participant2Id,
      lastMessageAt: conversations.lastMessageAt,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(
      or(
        eq(conversations.participant1Id, userId),
        eq(conversations.participant2Id, userId)
      )
    )
    .orderBy(desc(conversations.lastMessageAt), desc(conversations.createdAt));

  // For each conversation, get the other participant and latest message
  const enrichedConversations = await Promise.all(
    userConversations.map(async (conv) => {
      const otherParticipantId = conv.participant1Id === userId 
        ? conv.participant2Id 
        : conv.participant1Id;

      // Get other participant info
      const [otherParticipant] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, otherParticipantId))
        .limit(1);

      // Get latest message
      const [latestMessage] = await db
        .select({
          id: messages.id,
          content: messages.content,
          senderId: messages.senderId,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      // Get job info if exists
      let jobInfo = null;
      if (conv.jobId) {
        const [job] = await db
          .select({
            id: jobs.id,
            title: jobs.title,
          })
          .from(jobs)
          .where(eq(jobs.id, conv.jobId))
          .limit(1);
        jobInfo = job || null;
      }

      return {
        ...conv,
        otherParticipant: otherParticipant || null,
        latestMessage: latestMessage || null,
        job: jobInfo,
      };
    })
  );

  return enrichedConversations;
}

/**
 * Get conversation by ID (with security check)
 */
export async function getConversationById(conversationId: string, userId: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  // Verify user is a participant
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

  return conversation || null;
}

/**
 * Find existing conversation between two users (optionally for a job)
 */
export async function findConversation(
  participant1Id: string,
  participant2Id: string,
  jobId?: string
) {
  const db = getDb();
  if (!db) {
    return null;
  }

  // Try both orderings (participant1/participant2 can be swapped)
  const conditions = jobId
    ? [
        and(
          eq(conversations.participant1Id, participant1Id),
          eq(conversations.participant2Id, participant2Id),
          eq(conversations.jobId, jobId)
        ),
        and(
          eq(conversations.participant1Id, participant2Id),
          eq(conversations.participant2Id, participant1Id),
          eq(conversations.jobId, jobId)
        ),
      ]
    : [
        and(
          eq(conversations.participant1Id, participant1Id),
          eq(conversations.participant2Id, participant2Id),
          eq(conversations.jobId, null as any)
        ),
        and(
          eq(conversations.participant1Id, participant2Id),
          eq(conversations.participant2Id, participant1Id),
          eq(conversations.jobId, null as any)
        ),
      ];

  for (const condition of conditions) {
    const [existing] = await db
      .select()
      .from(conversations)
      .where(condition)
      .limit(1);

    if (existing) {
      return existing;
    }
  }

  return null;
}

/**
 * Create a new conversation
 */
export async function createConversation(data: {
  participant1Id: string;
  participant2Id: string;
  jobId?: string;
}) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [newConversation] = await db
    .insert(conversations)
    .values({
      participant1Id: data.participant1Id,
      participant2Id: data.participant2Id,
      jobId: data.jobId || null,
    })
    .returning();

  return newConversation || null;
}

/**
 * Update conversation's last message timestamp
 */
export async function updateConversationLastMessage(conversationId: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [updated] = await db
    .update(conversations)
    .set({
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, conversationId))
    .returning();

  return updated || null;
}

