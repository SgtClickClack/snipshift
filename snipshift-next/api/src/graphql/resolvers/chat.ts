import { GraphQLContext } from '../context.js';
import { eq, desc, sql, and, or, inArray } from 'drizzle-orm';
import { chats, messages } from '../../database/schema.js';
import { logger } from '../../utils/logger.js';

export const chatResolvers = {
  Query: {
    chats: async (_: any, { userId }: { userId: string }, context: GraphQLContext) => {
      if (!context.user || context.user.id !== userId) {
        throw new Error('Unauthorized');
      }

      // Find all chats where the user is a participant
      const userChats = await context.db
        .select()
        .from(chats)
        .where(sql`${chats.participants}::jsonb ? ${userId}`)
        .orderBy(desc(chats.updatedAt));

      return userChats;
    },

    chat: async (_: any, { chatId }: { chatId: string }, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const [chat] = await context.db
        .select()
        .from(chats)
        .where(and(
          eq(chats.id, chatId),
          sql`${chats.participants}::jsonb ? ${context.user.id}`
        ))
        .limit(1);

      return chat;
    },

    messages: async (
      _: any,
      { chatId, first = 50, after }: { chatId: string; first?: number; after?: string },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      // Verify user is participant in chat
      const [chat] = await context.db
        .select()
        .from(chats)
        .where(and(
          eq(chats.id, chatId),
          sql`${chats.participants}::jsonb ? ${context.user.id}`
        ))
        .limit(1);

      if (!chat) {
        throw new Error('Chat not found or access denied');
      }

      let conditions = [eq(messages.chatId, chatId)];

      if (after) {
        conditions.push(sql`${messages.timestamp} < ${after}`);
      }

      const messageList = await context.db
        .select()
        .from(messages)
        .where(and(...conditions))
        .orderBy(desc(messages.timestamp))
        .limit(first);

      return messageList.reverse(); // Return in chronological order
    },
  },

  Mutation: {
    createChat: async (
      _: any,
      { participants }: { participants: string[] },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      // Ensure current user is included in participants
      if (!participants.includes(context.user.id)) {
        participants.push(context.user.id);
      }

      // Remove duplicates
      participants = [...new Set(participants)];

      if (participants.length < 2) {
        throw new Error('Chat must have at least 2 participants');
      }

      // Get participant names for easier display
      const participantUsers = await context.db
        .select()
        .from(context.db.schema.users)
        .where(inArray(context.db.schema.users.id, participants));

      const participantNames: Record<string, string> = {};
      const participantRoles: Record<string, string> = {};

      participantUsers.forEach(user => {
        participantNames[user.id] = user.displayName || user.email;
        participantRoles[user.id] = user.currentRole || 'client';
      });

      try {
        const [newChat] = await context.db
          .insert(chats)
          .values({
            participants,
            participantNames,
            participantRoles,
          })
          .returning();

        logger.info(`Chat created with participants: ${participants.join(', ')}`);
        return newChat;
      } catch (error) {
        logger.error('Create chat error:', error);
        throw new Error('Failed to create chat');
      }
    },

    sendMessage: async (
      _: any,
      { chatId, receiverId, content }: { chatId: string; receiverId: string; content: string },
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      // Verify user is participant in chat
      const [chat] = await context.db
        .select()
        .from(chats)
        .where(and(
          eq(chats.id, chatId),
          sql`${chats.participants}::jsonb ? ${context.user.id}`,
          sql`${chats.participants}::jsonb ? ${receiverId}`
        ))
        .limit(1);

      if (!chat) {
        throw new Error('Chat not found or invalid participants');
      }

      try {
        const [newMessage] = await context.db
          .insert(messages)
          .values({
            chatId,
            senderId: context.user.id,
            receiverId,
            content,
          })
          .returning();

        // Update chat's last message info
        await context.db
          .update(chats)
          .set({
            lastMessage: content,
            lastMessageSenderId: context.user.id,
            lastMessageTimestamp: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(chats.id, chatId));

        logger.info(`Message sent in chat ${chatId}`);
        return newMessage;
      } catch (error) {
        logger.error('Send message error:', error);
        throw new Error('Failed to send message');
      }
    },

    markMessagesAsRead: async (
      _: any,
      { chatId, userId }: { chatId: string; userId: string },
      context: GraphQLContext
    ) => {
      if (!context.user || context.user.id !== userId) {
        throw new Error('Unauthorized');
      }

      // Verify user is participant in chat
      const [chat] = await context.db
        .select()
        .from(chats)
        .where(and(
          eq(chats.id, chatId),
          sql`${chats.participants}::jsonb ? ${userId}`
        ))
        .limit(1);

      if (!chat) {
        throw new Error('Chat not found or access denied');
      }

      try {
        // Mark messages as read
        await context.db
          .update(messages)
          .set({ isRead: true })
          .where(and(
            eq(messages.chatId, chatId),
            eq(messages.receiverId, userId),
            eq(messages.isRead, false)
          ));

        // Update chat's unread count for this user
        const unreadCount = chat.unreadCount as Record<string, number> || {};
        unreadCount[userId] = 0;

        await context.db
          .update(chats)
          .set({ unreadCount })
          .where(eq(chats.id, chatId));

        logger.info(`Messages marked as read in chat ${chatId}`);
        return true;
      } catch (error) {
        logger.error('Mark messages as read error:', error);
        throw new Error('Failed to mark messages as read');
      }
    },
  },

  Subscription: {
    messageReceived: {
      subscribe: (_: any, { userId }: { userId: string }, context: GraphQLContext) => {
        if (!context.user || context.user.id !== userId) {
          throw new Error('Unauthorized');
        }

        return {
          [Symbol.asyncIterator]() {
            return {
              next: () => Promise.resolve({ done: true, value: undefined }),
            };
          },
        };
      },
    },
  },
};
