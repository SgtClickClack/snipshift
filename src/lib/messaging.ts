import { Chat, Message, InsertMessage } from '@shared/firebase-schema';
import { apiRequest } from '@/lib/queryClient';

export class MessagingService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Generate chat ID from two user IDs (consistent ordering)
  private generateChatId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }

  // Get or create a conversation between two users
  async getOrCreateChat(currentUserId: string, otherUserId: string, currentUserName: string, otherUserName: string, currentUserRole: string, otherUserRole: string, jobId?: string): Promise<string> {
    try {
      // Create or get existing conversation
      const response = await apiRequest('POST', '/api/conversations', {
        participant2Id: otherUserId,
        jobId: jobId || undefined
      });
      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  // Send a message
  async sendMessage(conversationId: string, senderId: string, receiverId: string, content: string): Promise<Message> {
    try {
      const response = await apiRequest('POST', '/api/messages', {
        conversationId,
        content
      });
      const data = await response.json();
      // Transform API response to Message format
      return {
        id: data.id,
        chatId: data.conversationId,
        senderId: data.senderId,
        content: data.content,
        timestamp: data.createdAt,
        read: false,
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Get user's conversations
  async getUserChats(userId: string): Promise<Chat[]> {
    try {
      // If userId is missing, don't attempt fetch
      if (!userId) return [];

      const response = await apiRequest('GET', '/api/conversations');
      
      // Graceful handling of 401/404/etc without throwing globally if apiRequest doesn't throw
      // (apiRequest throws if !res.ok, so we catch it below)
      
      const conversations = await response.json();
      
      if (!Array.isArray(conversations)) {
        console.error('Invalid conversations response format:', conversations);
        return [];
      }
      
      // Transform conversations to Chat format for backward compatibility
      // Note: This is a temporary adapter - consider updating components to use Conversation type
      return conversations.map((conv: any) => ({
        id: conv.id,
        participants: [conv.otherParticipant?.id || '', userId],
        lastMessage: conv.latestMessage ? {
          id: conv.latestMessage.id,
          chatId: conv.id,
          senderId: conv.latestMessage.senderId,
          content: conv.latestMessage.content,
          timestamp: conv.latestMessage.createdAt,
          read: false // Default to false, will be updated when conversation is opened
        } : undefined,
        lastMessageAt: conv.lastMessageAt,
        createdAt: conv.createdAt
      }));
    } catch (error: any) {
      // Silence 401/404 errors to prevent loop spam in console/UI
      if (error.message?.includes('401') || error.message?.includes('404')) {
        return [];
      }
      console.error('Error fetching user conversations:', error);
      return [];
    }
  }

  // Get messages for a conversation
  async getChatMessages(conversationId: string): Promise<Message[]> {
    try {
      const response = await apiRequest('GET', `/api/conversations/${conversationId}`);
      const data = await response.json();
      
      // The response includes both conversation and messages
      const messages = data.messages || [];
      
      if (!Array.isArray(messages)) {
        console.error('Invalid messages response format:', messages);
        return [];
      }
      
      // Transform to Message format (mapping conversation API to Chat schema)
      return messages.map((msg: any) => ({
        id: msg.id,
        chatId: conversationId, // Map conversationId to chatId for backward compatibility
        senderId: msg.senderId,
        content: msg.content,
        timestamp: msg.createdAt, // Map createdAt to timestamp
        read: msg.isRead !== undefined ? msg.isRead : false // Map isRead to read
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      await apiRequest('PATCH', `/api/conversations/${conversationId}/read`, {});
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  // Simulate real-time listener for user's chats using polling
  onChatsChange(userId: string, callback: (chats: Chat[]) => void): () => void {
    const pollChats = async () => {
      try {
        const chats = await this.getUserChats(userId);
        callback(chats);
      } catch (error) {
        console.error('Error polling chats:', error);
      }
    };

    // Initial fetch
    pollChats();

    // Poll every 3 seconds for updates
    const interval = setInterval(pollChats, 3000);
    this.pollingIntervals.set(`chats_${userId}`, interval);

    // Return cleanup function
    return () => {
      if (this.pollingIntervals.has(`chats_${userId}`)) {
        clearInterval(this.pollingIntervals.get(`chats_${userId}`));
        this.pollingIntervals.delete(`chats_${userId}`);
      }
    };
  }

  // Simulate real-time listener for chat messages using polling
  onMessagesChange(chatId: string, callback: (messages: Message[]) => void): () => void {
    const pollMessages = async () => {
      try {
        const messages = await this.getChatMessages(chatId);
        callback(messages);
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    };

    // Initial fetch
    pollMessages();

    // Poll every 2 seconds for new messages
    const interval = setInterval(pollMessages, 2000);
    this.pollingIntervals.set(`messages_${chatId}`, interval);

    // Return cleanup function
    return () => {
      if (this.pollingIntervals.has(`messages_${chatId}`)) {
        clearInterval(this.pollingIntervals.get(`messages_${chatId}`));
        this.pollingIntervals.delete(`messages_${chatId}`);
      }
    };
  }

  // Get other participant in a chat
  // Note: This method may need to be updated as Chat interface doesn't include participant names/roles
  // Consider fetching participant details separately or updating the Chat interface
  getOtherParticipant(chat: Chat, currentUserId: string): { id: string, name: string, role: string } | null {
    const otherUserId = chat.participants.find(id => id !== currentUserId);
    if (!otherUserId) return null;
    
    // Return basic info - name and role would need to be fetched separately
    return {
      id: otherUserId,
      name: 'Unknown User', // Would need to fetch from user service
      role: 'user' // Would need to fetch from user service
    };
  }
}

export const messagingService = new MessagingService();