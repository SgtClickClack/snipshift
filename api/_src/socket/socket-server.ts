/**
 * Socket.io Server Setup
 * 
 * Handles real-time messaging via WebSocket connections
 */

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import * as conversationsRepo from '../repositories/conversations.repository.js';
import * as messagesRepo from '../repositories/messages.repository.js';
import * as usersRepo from '../repositories/users.repository.js';

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.io server
 */
export function initializeSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io/',
  });

  // Authentication middleware for socket connections
  io.use(async (socket: Socket, next: (err?: Error) => void) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify token using Firebase Admin (similar to HTTP middleware)
      const { auth } = await import('../config/firebase.js');
      if (!auth) {
        return next(new Error('Firebase auth not initialized'));
      }

      const decodedToken = await auth.verifyIdToken(token);
      const user = await usersRepo.getUserByEmail(decodedToken.email || '');

      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user info to socket
      (socket as any).userId = user.id;
      (socket as any).userEmail = decodedToken.email;
      next();
    } catch (error: any) {
      console.error('[SOCKET AUTH ERROR]', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`[SOCKET] User ${userId} connected: ${socket.id}`);

    // Join user's personal room for notifications
    socket.join(`user:${userId}`);

    // Handle joining a conversation room
    socket.on('join_room', async (data: { conversationId: string }) => {
      try {
        const { conversationId } = data;
        
        // Verify user has access to this conversation
        const conversation = await conversationsRepo.getConversationById(conversationId, userId);
        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found or access denied' });
          return;
        }

        // Join the conversation room
        socket.join(`conversation:${conversationId}`);
        console.log(`[SOCKET] User ${userId} joined conversation: ${conversationId}`);
        
        socket.emit('joined_room', { conversationId });
      } catch (error: any) {
        console.error('[SOCKET JOIN ROOM ERROR]', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Handle leaving a conversation room
    socket.on('leave_room', (data: { conversationId: string }) => {
      const { conversationId } = data;
      socket.leave(`conversation:${conversationId}`);
      console.log(`[SOCKET] User ${userId} left conversation: ${conversationId}`);
    });

    // Handle sending a message
    socket.on('send_message', async (data: { conversationId: string; content: string }) => {
      try {
        const { conversationId, content } = data;

        if (!content || !content.trim()) {
          socket.emit('error', { message: 'Message content cannot be empty' });
          return;
        }

        // Verify user has access to this conversation
        const conversation = await conversationsRepo.getConversationById(conversationId, userId);
        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found or access denied' });
          return;
        }

        // Create message in database
        const newMessage = await messagesRepo.createMessage({
          conversationId,
          senderId: userId,
          content: content.trim(),
        });

        if (!newMessage) {
          socket.emit('error', { message: 'Failed to create message' });
          return;
        }

        // Update conversation's last message timestamp
        await conversationsRepo.updateConversationLastMessage(conversationId);

        // Get sender info
        const sender = await usersRepo.getUserById(userId);
        if (!sender) {
          socket.emit('error', { message: 'Sender not found' });
          return;
        }

        // Get recipient ID
        const recipientId = conversation.participant1Id === userId
          ? conversation.participant2Id
          : conversation.participant1Id;

        // Prepare message payload
        const messagePayload = {
          id: newMessage.id,
          conversationId: newMessage.conversationId,
          senderId: newMessage.senderId,
          content: newMessage.content,
          isRead: false,
          createdAt: newMessage.createdAt.toISOString(),
          sender: {
            id: sender.id,
            name: sender.name,
            email: sender.email,
          },
        };

        // Emit to all users in the conversation room
        io!.to(`conversation:${conversationId}`).emit('new_message', messagePayload);

        // Also notify the recipient in their personal room if they're not in the conversation room
        io!.to(`user:${recipientId}`).emit('new_message', messagePayload);

        console.log(`[SOCKET] Message sent in conversation ${conversationId} by user ${userId}`);
      } catch (error: any) {
        console.error('[SOCKET SEND MESSAGE ERROR]', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[SOCKET] User ${userId} disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Get the Socket.io server instance
 */
export function getSocketIO(): SocketIOServer | null {
  return io;
}
