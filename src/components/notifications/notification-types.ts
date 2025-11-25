export interface Notification {
  id: string;
  recipientId?: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  type: 'new_application' | 'application_received' | 'application_status_change' | 'new_message' | 'post_like' | 'new_comment' | 'job_posted' | 'job_updated' | 'job_completed' | 'profile_view';
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  link?: string;
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
    case 'application_received':
      return 'briefcase';
    case 'application_status_change':
      return 'check-circle';
    case 'new_message':
      return 'message-circle';
    case 'post_like':
      return 'heart';
    case 'new_comment':
      return 'message-square';
    case 'job_posted':
    case 'job_updated':
      return 'plus-circle';
    case 'job_completed':
      return 'check-circle';
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
    case 'job_completed':
      return 'text-purple-600 bg-purple-100';
    case 'profile_view':
      return 'text-steel-600 bg-steel-100';
    default:
      return 'text-steel-600 bg-steel-100';
  }
};