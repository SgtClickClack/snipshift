/**
 * Mock chat data for the Professional Messages page
 * This file provides sample conversation data for development and testing
 */

export type MessageType = 'user' | 'salon' | 'system';

export interface ChatMessage {
  id: string;
  type: MessageType;
  content: string;
  timestamp: string;
  senderId?: string;
  senderName?: string;
}

export interface Conversation {
  id: string;
  salonId: string;
  salonName: string;
  salonAvatar?: string;
  isOnline: boolean;
  jobId?: string;
  jobTitle?: string;
  lastMessage: string;
  lastMessageTimestamp: string;
  unreadCount: number;
  messages: ChatMessage[];
}

// Generate a date N minutes/hours/days ago
const getDateAgo = (minutes?: number, hours?: number, days?: number): string => {
  const date = new Date();
  if (days) {
    date.setDate(date.getDate() - days);
  }
  if (hours) {
    date.setHours(date.getHours() - hours);
  }
  if (minutes) {
    date.setMinutes(date.getMinutes() - minutes);
  }
  return date.toISOString();
};

// Generate a future date
const getFutureDate = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

export const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    salonId: 'salon-1',
    salonName: 'Elite Cuts',
    salonAvatar: undefined,
    isOnline: true,
    jobId: 'job-1',
    jobTitle: 'Senior Barber Position',
    lastMessage: 'Great! Looking forward to working with you.',
    lastMessageTimestamp: getDateAgo(15), // 15 minutes ago
    unreadCount: 2,
    messages: [
      {
        id: 'msg-1',
        type: 'system',
        content: 'Application Shortlisted',
        timestamp: getDateAgo(2, 0, 3), // 3 days ago
      },
      {
        id: 'msg-2',
        type: 'salon',
        content: 'Hi! We reviewed your application and would like to schedule an interview. Are you available this week?',
        timestamp: getDateAgo(2, 0, 3),
        senderId: 'salon-1',
        senderName: 'Elite Cuts',
      },
      {
        id: 'msg-3',
        type: 'user',
        content: 'Thank you! Yes, I\'m available. What days work best for you?',
        timestamp: getDateAgo(1, 0, 3),
        senderId: 'user-1',
        senderName: 'You',
      },
      {
        id: 'msg-4',
        type: 'salon',
        content: 'How about Wednesday or Thursday afternoon?',
        timestamp: getDateAgo(0, 20, 2),
        senderId: 'salon-1',
        senderName: 'Elite Cuts',
      },
      {
        id: 'msg-5',
        type: 'user',
        content: 'Wednesday works perfectly for me. What time?',
        timestamp: getDateAgo(0, 18, 2),
        senderId: 'user-1',
        senderName: 'You',
      },
      {
        id: 'msg-6',
        type: 'salon',
        content: 'Great! Looking forward to working with you.',
        timestamp: getDateAgo(15), // 15 minutes ago
        senderId: 'salon-1',
        senderName: 'Elite Cuts',
      },
    ],
  },
  {
    id: 'conv-2',
    salonId: 'salon-2',
    salonName: 'Style Studio',
    salonAvatar: undefined,
    isOnline: false,
    jobId: 'job-2',
    jobTitle: 'Hair Stylist - Full Day',
    lastMessage: 'The shift is confirmed for next Monday at 9 AM.',
    lastMessageTimestamp: getDateAgo(0, 3), // 3 hours ago
    unreadCount: 0,
    messages: [
      {
        id: 'msg-7',
        type: 'system',
        content: 'Shift Confirmed',
        timestamp: getDateAgo(0, 5, 1), // 1 day, 5 hours ago
      },
      {
        id: 'msg-8',
        type: 'salon',
        content: 'Hi! We\'d like to confirm your shift for next Monday. Can you confirm your availability?',
        timestamp: getDateAgo(0, 5, 1),
        senderId: 'salon-2',
        senderName: 'Style Studio',
      },
      {
        id: 'msg-9',
        type: 'user',
        content: 'Yes, I\'m available! Looking forward to it.',
        timestamp: getDateAgo(0, 4, 1),
        senderId: 'user-1',
        senderName: 'You',
      },
      {
        id: 'msg-10',
        type: 'salon',
        content: 'Perfect! The shift is confirmed for next Monday at 9 AM. Please arrive 15 minutes early.',
        timestamp: getDateAgo(0, 3),
        senderId: 'salon-2',
        senderName: 'Style Studio',
      },
      {
        id: 'msg-11',
        type: 'user',
        content: 'Will do! See you then.',
        timestamp: getDateAgo(0, 2, 0),
        senderId: 'user-1',
        senderName: 'You',
      },
    ],
  },
  {
    id: 'conv-3',
    salonId: 'salon-3',
    salonName: 'Hair Haven',
    salonAvatar: undefined,
    isOnline: true,
    jobId: 'job-3',
    jobTitle: 'Color Specialist Wanted',
    lastMessage: 'Thanks for your interest! We\'ll review your application and get back to you soon.',
    lastMessageTimestamp: getDateAgo(0, 0, 1), // 1 day ago
    unreadCount: 1,
    messages: [
      {
        id: 'msg-12',
        type: 'system',
        content: 'Application Received',
        timestamp: getDateAgo(0, 0, 2), // 2 days ago
      },
      {
        id: 'msg-13',
        type: 'user',
        content: 'Hello! I just submitted my application for the Color Specialist position. I have 5 years of experience in color work.',
        timestamp: getDateAgo(0, 0, 2),
        senderId: 'user-1',
        senderName: 'You',
      },
      {
        id: 'msg-14',
        type: 'salon',
        content: 'Thanks for your interest! We\'ll review your application and get back to you soon.',
        timestamp: getDateAgo(0, 0, 1),
        senderId: 'salon-3',
        senderName: 'Hair Haven',
      },
    ],
  },
  {
    id: 'conv-4',
    salonId: 'salon-4',
    salonName: 'The Barber Shop',
    salonAvatar: undefined,
    isOnline: false,
    jobId: 'job-4',
    jobTitle: 'Barber for Weekend Shifts',
    lastMessage: 'I can work both Saturday and Sunday if needed.',
    lastMessageTimestamp: getDateAgo(0, 0, 5), // 5 days ago
    unreadCount: 0,
    messages: [
      {
        id: 'msg-15',
        type: 'salon',
        content: 'Hi! We saw your application. Are you available for weekend shifts?',
        timestamp: getDateAgo(0, 0, 7),
        senderId: 'salon-4',
        senderName: 'The Barber Shop',
      },
      {
        id: 'msg-16',
        type: 'user',
        content: 'Yes, I\'m available for weekends. Which days specifically?',
        timestamp: getDateAgo(0, 0, 6),
        senderId: 'user-1',
        senderName: 'You',
      },
      {
        id: 'msg-17',
        type: 'salon',
        content: 'We need someone for Saturday mornings and Sunday afternoons.',
        timestamp: getDateAgo(0, 0, 6),
        senderId: 'salon-4',
        senderName: 'The Barber Shop',
      },
      {
        id: 'msg-18',
        type: 'user',
        content: 'I can work both Saturday and Sunday if needed.',
        timestamp: getDateAgo(0, 0, 5),
        senderId: 'user-1',
        senderName: 'You',
      },
    ],
  },
];

// Helper function to get conversation by ID
export const getConversationById = (id: string): Conversation | undefined => {
  return mockConversations.find(conv => conv.id === id);
};

// Helper function to get all conversations
export const getAllConversations = (): Conversation[] => {
  return mockConversations;
};

