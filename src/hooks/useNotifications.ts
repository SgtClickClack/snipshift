import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead, Notification as APINotification } from "@/lib/api";
import { logger } from "@/lib/logger";

// Transform API notification to component notification format
function transformNotification(apiNotif: APINotification): any {
  return {
    id: apiNotif.id,
    type: apiNotif.type,
    title: apiNotif.title,
    message: apiNotif.message,
    timestamp: apiNotif.createdAt,
    isRead: apiNotif.isRead,
    actionUrl: apiNotif.link,
    link: apiNotif.link,
  };
}

export function useNotifications() {
  const { user, isSystemReady, isLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch notifications from API
  // PERF FIX: Wait for isSystemReady (Firebase token + user profile) before API calls
  // This prevents 401 errors when user is restored from sessionStorage cache before auth completes
  const { data: apiNotifications = [], isLoading: isNotificationsLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      try {
        return await fetchNotifications(50);
      } catch (error) {
        // Silently handle errors during background polling to prevent disrupting the user
        // Return empty array instead of throwing to prevent error boundaries from triggering
        logger.debug("useNotifications", "Polling error (silently handled):", error);
        return [];
      }
    },
    enabled: !!user?.id && isSystemReady && !isLoading,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: false, // Don't retry on error
    refetchOnWindowFocus: false, // Don't refetch on window focus to avoid unnecessary requests
  });

  // Transform API notifications to component format
  const notifications = apiNotifications.map(transformNotification);

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: (response, notificationId) => {
      queryClient.setQueryData(['notifications', user?.id], (old: APINotification[] = []) =>
        old.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.setQueryData(['notifications', user?.id], (old: APINotification[] = []) =>
        old.map(n => ({ ...n, isRead: true }))
      );
    },
  });

  const handleNotificationClick = (notificationId: string) => {
    const notification = apiNotifications.find(n => n.id === notificationId);
    if (notification) {
      // Mark as read
      markAsReadMutation.mutate(notificationId);
      
      // Navigate to link if provided
      if (notification.link) {
        navigate(notification.link);
      }
    }
  };

  const handleMarkAllRead = () => {
    markAllAsReadMutation.mutate();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    isLoading: isNotificationsLoading,
    handleNotificationClick,
    handleMarkAllRead,
    simulateNewNotification: () => {}, // No longer needed with real API
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}