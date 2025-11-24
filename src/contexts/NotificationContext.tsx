import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { 
  Notification, 
  fetchNotifications, 
  fetchUnreadCount, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from '../lib/api';
import { useToast } from '../hooks/use-toast';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const [data, countData] = await Promise.all([
        fetchNotifications(50),
        fetchUnreadCount()
      ]);
      setNotifications(data);
      setUnreadCount(countData.count);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load initial data
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // SSE Connection
  useEffect(() => {
    if (!user || !token) return;

    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout;
    
    // Use Vercel URL if available, otherwise default to standard relative path (via proxy)
    // Using relative path '/api' relies on Vite proxy in dev or Vercel rewrites in prod
    // Since standard EventSource doesn't support headers, we pass token in query param
    const connect = () => {
      // Close existing connection if any
      if (eventSource) {
        eventSource.close();
      }

      const url = `/api/notifications/stream?token=${token}`;
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        console.log('SSE Connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Ignore connection ping
          if (data.type === 'connected') return;

          // Handle new notification
          const newNotification = data as Notification;
          
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Show toast for new notification
          toast({
            title: newNotification.title,
            description: newNotification.message,
          });
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        eventSource?.close();
        
        // Retry connection after 5 seconds (handle Vercel timeout or network issues)
        retryTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearTimeout(retryTimeout);
    };
  }, [user, token, toast]);

  const handleMarkAsRead = async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));

      await markNotificationAsRead(id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Revert on error could be added here, but skipping for simplicity
      loadNotifications(); // Reload to sync state
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);

      await markAllNotificationsAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      loadNotifications(); // Reload to sync state
    }
  };

  return (
    <NotificationContext.Provider 
      value={{ 
        notifications, 
        unreadCount, 
        isLoading, 
        markAsRead: handleMarkAsRead, 
        markAllAsRead: handleMarkAllAsRead,
        refreshNotifications: loadNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

