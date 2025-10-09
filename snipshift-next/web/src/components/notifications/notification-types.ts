export interface Notification {
  id: string;
  recipientId: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  type: 'new_application' | 'new_message' | 'post_like' | 'new_comment' | 'job_posted' | 'profile_view';
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  metadata?: {
    postId?: string;
    jobId?: string;
    messageId?: string;
    applicationId?: string;
  };
}

export const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'new_application':
      return 'briefcase';
    case 'new_message':
      return 'message-circle';
    case 'post_like':
      return 'heart';
    case 'new_comment':
      return 'message-square';
    case 'job_posted':
      return 'plus-circle';
    case 'profile_view':
      return 'user';
    default:
      return 'bell';
  }
};

export const getNotificationColor = (type: Notification['type']) => {
  switch (type) {
    case 'new_application':
      return 'text-green-600 bg-green-100';
    case 'new_message':
      return 'text-blue-600 bg-blue-100';
    case 'post_like':
      return 'text-red-600 bg-red-100';
    case 'new_comment':
      return 'text-purple-600 bg-purple-100';
    case 'job_posted':
      return 'text-orange-600 bg-orange-100';
    case 'profile_view':
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};