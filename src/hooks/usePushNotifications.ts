/**
 * Push Notifications Hook
 * 
 * Initializes and manages push notifications for the authenticated user
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  initializePushNotifications,
  cleanupPushNotifications,
  setupForegroundMessageHandler,
} from '@/lib/push-notifications';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/useToast';

/**
 * Hook to initialize push notifications when user is authenticated
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const initializedRef = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize push notifications when user logs in
  useEffect(() => {
    if (!user?.id) {
      // Clean up when user logs out
      if (initializedRef.current) {
        cleanupPushNotifications().catch((error) => {
          logger.error('usePushNotifications', 'Error cleaning up push notifications:', error);
        });
        initializedRef.current = false;
      }
      return;
    }

    // Only initialize once per user session
    if (initializedRef.current) {
      return;
    }

    // Initialize push notifications
    initializePushNotifications(user.id)
      .then(() => {
        initializedRef.current = true;
        logger.info('usePushNotifications', 'Push notifications initialized');
      })
      .catch((error) => {
        logger.error('usePushNotifications', 'Error initializing push notifications:', error);
      });

    // Set up foreground message handler
    const unsubscribe = setupForegroundMessageHandler((payload) => {
      logger.info('usePushNotifications', 'Foreground notification received:', payload);
      
      // Show toast notification for foreground messages
      if (payload.notification) {
        toast({
          title: payload.notification.title || 'New Notification',
          description: payload.notification.body || '',
          duration: 5000,
        });
      }
    });

    if (unsubscribe) {
      unsubscribeRef.current = unsubscribe;
    }

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user?.id, toast]);
}
