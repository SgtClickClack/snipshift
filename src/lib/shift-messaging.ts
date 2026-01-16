/**
 * Shift Messaging Service
 * 
 * Handles messaging functionality for shift-specific chat channels
 */

import { apiRequest } from '@/lib/queryClient';

export interface ShiftMessage {
  id: string;
  shiftId: string;
  senderId: string;
  recipientId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export class ShiftMessagingService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Get all messages for a shift thread
   */
  async getShiftMessages(shiftId: string): Promise<ShiftMessage[]> {
    try {
      const response = await apiRequest('GET', `/api/shifts/${shiftId}/messages`);
      const messages = await response.json();
      
      if (!Array.isArray(messages)) {
        console.error('Invalid messages response format:', messages);
        return [];
      }
      
      return messages;
    } catch (error: any) {
      // Gracefully handle errors (e.g., shift not found, unauthorized, etc.)
      if (error.message?.includes('401') || error.message?.includes('403') || error.message?.includes('404')) {
        return [];
      }
      console.error('Error fetching shift messages:', error);
      return [];
    }
  }

  /**
   * Send a message in a shift thread
   */
  async sendShiftMessage(shiftId: string, content: string): Promise<ShiftMessage | null> {
    try {
      const response = await apiRequest('POST', `/api/shifts/${shiftId}/messages`, {
        content: content.trim(),
      });
      const message = await response.json();
      return message;
    } catch (error) {
      console.error('Error sending shift message:', error);
      throw error;
    }
  }

  /**
   * Get unread message count for a specific shift
   */
  async getUnreadCount(shiftId: string): Promise<number> {
    try {
      const messages = await this.getShiftMessages(shiftId);
      // Count messages where readAt is null and current user is recipient
      // Note: This is a simplified check - the backend handles the actual unread count
      return messages.filter(msg => !msg.readAt).length;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Simulate real-time listener for shift messages using polling
   */
  onShiftMessagesChange(shiftId: string, callback: (messages: ShiftMessage[]) => void): () => void {
    const pollMessages = async () => {
      try {
        const messages = await this.getShiftMessages(shiftId);
        callback(messages);
      } catch (error) {
        console.error('Error polling shift messages:', error);
      }
    };

    // Initial fetch
    pollMessages();

    // Poll every 2 seconds for new messages
    const interval = setInterval(pollMessages, 2000);
    this.pollingIntervals.set(`shift_messages_${shiftId}`, interval);

    // Return cleanup function
    return () => {
      if (this.pollingIntervals.has(`shift_messages_${shiftId}`)) {
        clearInterval(this.pollingIntervals.get(`shift_messages_${shiftId}`));
        this.pollingIntervals.delete(`shift_messages_${shiftId}`);
      }
    };
  }
}

export const shiftMessagingService = new ShiftMessagingService();
