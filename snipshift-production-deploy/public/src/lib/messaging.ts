import { Chat, Message, InsertMessage } from '@shared/firebase-schema';
import { apiRequest } from '@/lib/queryClient';

export class MessagingService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Generate chat ID from two user IDs (consistent ordering)
  private generateChatId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }

  // Get or create a chat between two users
  async getOrCreateChat(currentUserId: string, otherUserId: string, currentUserName: string, otherUserName: string, currentUserRole: string, otherUserRole: string): Promise<string> {
    const chatId = this.generateChatId(currentUserId, otherUserId);
    
    try {
      // Try to create the chat (will work even if it exists)
      const response = await apiRequest('POST', '/api/chats', {
        chatId,
        participants: [currentUserId, otherUserId],
        participantNames: {
          [currentUserId]: currentUserName,
          [otherUserId]: otherUserName
        },
        participantRoles: {
          [currentUserId]: currentUserRole,
          [otherUserId]: otherUserRole
        }
      });

      return chatId;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }

  // Send a message
  async sendMessage(chatId: string, senderId: string, receiverId: string, content: string): Promise<void> {
    try {
      await apiRequest('POST', `/api/chats/${chatId}/messages`, {
        senderId,
        receiverId,
        content
      });
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Get user's chats
  async getUserChats(userId: string): Promise<Chat[]> {
    try {
      const response = await fetch(`/api/chats/user/${userId}`);
      const chats = await response.json();
      return chats;
    } catch (error) {
      console.error('Error fetching user chats:', error);
      return [];
    }
  }

  // Get messages for a chat
  async getChatMessages(chatId: string): Promise<Message[]> {
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`);
      const messages = await response.json();
      return messages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  // Mark messages as read
  async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    try {
      await apiRequest('PUT', `/api/chats/${chatId}/read/${userId}`, {});
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
  getOtherParticipant(chat: Chat, currentUserId: string): { id: string, name: string, role: string } | null {
    const otherUserId = chat.participants.find(id => id !== currentUserId);
    if (!otherUserId) return null;
    
    return {
      id: otherUserId,
      name: chat.participantNames[otherUserId] || 'Unknown User',
      role: chat.participantRoles[otherUserId] || 'user'
    };
  }
}

export const messagingService = new MessagingService();