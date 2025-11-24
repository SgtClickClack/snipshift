import { describe, it, expect, beforeEach } from 'vitest';
import * as conversationsRepo from '../../repositories/conversations.repository.js';
import * as messagesRepo from '../../repositories/messages.repository.js';
import * as usersRepo from '../../repositories/users.repository.js';
import { getDb } from '../../db/index.js';
import { conversations, messages, users } from '../../db/schema.js';

describe('Conversations & Messages Repository (Integration)', () => {
  const db = getDb();

  // Clean DB before each test
  beforeEach(async () => {
    if (db) {
      await db.delete(messages);
      await db.delete(conversations);
      await db.delete(users);
    }
  });

  const createTestUsers = async () => {
    const userA = await usersRepo.createUser({
      email: 'userA@test.com',
      name: 'User A',
      role: 'professional',
    });

    const userB = await usersRepo.createUser({
      email: 'userB@test.com',
      name: 'User B',
      role: 'business',
    });

    if (!userA || !userB) throw new Error('Failed to create test users');
    return { userA, userB };
  };

  describe('Conversations', () => {
    it('should create a conversation between two users', async () => {
      const { userA, userB } = await createTestUsers();

      const conversation = await conversationsRepo.createConversation({
        participant1Id: userA.id,
        participant2Id: userB.id,
      });

      expect(conversation).toBeDefined();
      expect(conversation?.id).toBeDefined();
      expect(conversation?.participant1Id).toBe(userA.id);
      expect(conversation?.participant2Id).toBe(userB.id);
    });

    it('should find an existing conversation', async () => {
      const { userA, userB } = await createTestUsers();

      await conversationsRepo.createConversation({
        participant1Id: userA.id,
        participant2Id: userB.id,
      });

      // Test finding (should work regardless of participant order)
      const found1 = await conversationsRepo.findConversation(userA.id, userB.id);
      expect(found1).toBeDefined();

      const found2 = await conversationsRepo.findConversation(userB.id, userA.id);
      expect(found2).toBeDefined();
      expect(found2?.id).toBe(found1?.id);
    });

    it('should get conversations for a user with enriched details', async () => {
      const { userA, userB } = await createTestUsers();

      const conversation = await conversationsRepo.createConversation({
        participant1Id: userA.id,
        participant2Id: userB.id,
      });

      // Add a message so it shows up properly if logic depends on it (though getConversationsForUser should work without messages too, but let's see)
      await messagesRepo.createMessage({
        conversationId: conversation!.id,
        senderId: userA.id,
        content: 'Hello',
      });

      const conversationsList = await conversationsRepo.getConversationsForUser(userA.id);
      expect(conversationsList).toHaveLength(1);
      
      const conv = conversationsList![0];
      expect(conv.id).toBe(conversation?.id);
      expect(conv.otherParticipant).toBeDefined();
      expect(conv.otherParticipant?.id).toBe(userB.id);
      expect(conv.latestMessage).toBeDefined();
      expect(conv.latestMessage?.content).toBe('Hello');
    });
  });

  describe('Messages', () => {
    it('should add a message to a conversation', async () => {
      const { userA, userB } = await createTestUsers();
      const conversation = await conversationsRepo.createConversation({
        participant1Id: userA.id,
        participant2Id: userB.id,
      });

      const message = await messagesRepo.createMessage({
        conversationId: conversation!.id,
        senderId: userA.id,
        content: 'Test message',
      });

      expect(message).toBeDefined();
      expect(message?.content).toBe('Test message');
      expect(message?.senderId).toBe(userA.id);
      expect(message?.createdAt).toBeDefined();
    });

    it('should get messages for a conversation ordered by time', async () => {
      const { userA, userB } = await createTestUsers();
      const conversation = await conversationsRepo.createConversation({
        participant1Id: userA.id,
        participant2Id: userB.id,
      });

      // Create messages
      await messagesRepo.createMessage({
        conversationId: conversation!.id,
        senderId: userA.id,
        content: 'First',
      });

      // Small delay to ensure timestamp difference if needed, but usually sequential awaits are enough
      await messagesRepo.createMessage({
        conversationId: conversation!.id,
        senderId: userB.id,
        content: 'Second',
      });

      const messagesList = await messagesRepo.getMessagesForConversation(conversation!.id, userA.id);
      
      expect(messagesList).toHaveLength(2);
      expect(messagesList![0].content).toBe('First');
      expect(messagesList![1].content).toBe('Second');
      expect(messagesList![0].sender.email).toBe(userA.email);
    });

    it('should mark messages as read', async () => {
      const { userA, userB } = await createTestUsers();
      const conversation = await conversationsRepo.createConversation({
        participant1Id: userA.id,
        participant2Id: userB.id,
      });

      // User A sends message (User B needs to read it)
      await messagesRepo.createMessage({
        conversationId: conversation!.id,
        senderId: userA.id,
        content: 'Hello',
      });

      // User B marks as read
      const updated = await messagesRepo.markMessagesAsRead(conversation!.id, userB.id);
      
      expect(updated).toBeDefined();
      expect(updated).toHaveLength(1);
      expect(updated![0].isRead).not.toBeNull();

      // Verify in DB
      const messagesList = await messagesRepo.getMessagesForConversation(conversation!.id, userB.id);
      expect(messagesList![0].isRead).not.toBeNull();
    });
  });
});

