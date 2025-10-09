import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Notification } from "@/components/notifications/notification-types";

// Mock notification data for demonstration
const generateMockNotifications = (userId: string): Notification[] => [
  {
    id: "notif-1",
    recipientId: userId,
    senderId: "user-2",
    senderName: "Sarah Johnson",
    senderAvatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150&h=150&fit=crop&crop=face",
    type: "new_application",
    message: "Applied for your Senior Barber position at Elite Cuts Sydney",
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    isRead: false,
    actionUrl: "/hub-dashboard?tab=applications",
    metadata: { applicationId: "app-1", jobId: "job-1" }
  },
  {
    id: "notif-2",
    recipientId: userId,
    senderId: "user-3",
    senderName: "Mike Chen",
    senderAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    type: "new_message",
    message: "Hey! I'm interested in discussing the barber position. When would be a good time to chat?",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    isRead: false,
    actionUrl: "/messages",
    metadata: { messageId: "msg-1" }
  },
  {
    id: "notif-3",
    recipientId: userId,
    senderId: "user-4",
    senderName: "StyleCraft Studios",
    senderAvatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face",
    type: "post_like",
    message: "Liked your post about advanced fade techniques",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    isRead: true,
    actionUrl: "/community",
    metadata: { postId: "post-1" }
  },
  {
    id: "notif-4",
    recipientId: userId,
    senderId: "user-5",
    senderName: "Emma Rodriguez",
    senderAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    type: "new_comment",
    message: "Commented: \"These techniques look amazing! Do you offer one-on-one training?\"",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    isRead: true,
    actionUrl: "/community",
    metadata: { postId: "post-2" }
  },
  {
    id: "notif-5",
    recipientId: userId,
    senderId: "user-6",
    senderName: "The Cutting Room",
    senderAvatar: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=150&h=150&fit=crop&crop=face",
    type: "job_posted",
    message: "Posted a new job: Part-time Barber - Weekend Shifts Available",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    isRead: true,
    actionUrl: "/home?tab=jobs",
    metadata: { jobId: "job-2" }
  },
  {
    id: "notif-6",
    recipientId: userId,
    senderId: "user-7",
    senderName: "Alex Thompson",
    senderAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    type: "profile_view",
    message: "Viewed your profile",
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    isRead: true,
    actionUrl: "/profile",
    metadata: {}
  }
];

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [simulatedNotifications, setSimulatedNotifications] = useState<Notification[]>([]);

  // Initialize with mock data
  useEffect(() => {
    if (user?.id) {
      setSimulatedNotifications(generateMockNotifications(user.id));
    }
  }, [user?.id]);

  // Fetch notifications (in real app would be from API)
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", user?.id],
    initialData: simulatedNotifications,
    enabled: !!user?.id,
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      // In real app would make API call
      return { notificationId };
    },
    onSuccess: (_, notificationId) => {
      queryClient.setQueryData(
        ["/api/notifications", user?.id],
        (oldNotifications: Notification[] = []) =>
          oldNotifications.map(n =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
      );
      
      // Update local state as well
      setSimulatedNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      // In real app would make API call
      return {};
    },
    onSuccess: () => {
      queryClient.setQueryData(
        ["/api/notifications", user?.id],
        (oldNotifications: Notification[] = []) =>
          oldNotifications.map(n => ({ ...n, isRead: true }))
      );
      
      // Update local state as well
      setSimulatedNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );
    },
  });

  // Simulate new notification arriving
  const simulateNewNotification = useCallback(() => {
    if (!user?.id) return;

    const newNotificationTypes = [
      {
        type: 'new_application' as const,
        message: 'Applied for your Junior Barber position',
        senderName: 'Jessica Davis',
      },
      {
        type: 'new_message' as const,
        message: 'Sent you a message about the upcoming workshop',
        senderName: 'David Kim',
      },
      {
        type: 'post_like' as const,
        message: 'Liked your recent portfolio post',
        senderName: 'Maria Santos',
      },
      {
        type: 'new_comment' as const,
        message: 'Commented: "Great work! Love the attention to detail"',
        senderName: 'Ryan Mitchell',
      },
    ];

    const randomNotification = newNotificationTypes[
      Math.floor(Math.random() * newNotificationTypes.length)
    ];

    const newNotification: Notification = {
      id: `notif-${Date.now()}`,
      recipientId: user.id,
      senderId: `user-${Math.floor(Math.random() * 1000)}`,
      senderName: randomNotification.senderName,
      senderAvatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000000)}?w=150&h=150&fit=crop&crop=face`,
      type: randomNotification.type,
      message: randomNotification.message,
      timestamp: new Date().toISOString(),
      isRead: false,
      actionUrl: "/community",
      metadata: {}
    };

    // Update both query cache and local state
    queryClient.setQueryData(
      ["/api/notifications", user.id],
      (oldNotifications: Notification[] = []) => [newNotification, ...oldNotifications]
    );

    setSimulatedNotifications(prev => [newNotification, ...prev]);
  }, [user?.id, queryClient]);

  // Auto-simulate notifications every 30 seconds for demo
  useEffect(() => {
    const interval = setInterval(() => {
      // Only simulate if there are fewer than 10 unread notifications
      const unreadCount = notifications.filter(n => !n.isRead).length;
      if (unreadCount < 5 && Math.random() > 0.7) { // 30% chance every 30 seconds
        simulateNewNotification();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [simulateNewNotification, notifications]);

  const handleNotificationClick = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllRead = () => {
    markAllAsReadMutation.mutate();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    notifications: simulatedNotifications.length > 0 ? simulatedNotifications : notifications,
    unreadCount,
    isLoading,
    handleNotificationClick,
    handleMarkAllRead,
    simulateNewNotification,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}