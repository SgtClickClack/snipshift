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

  // Initialize push notifications when user logs in.
  // Wrapped so Firebase Installations 400 / getMessaging errors never crash the dashboard.
  useEffect(() => {
    try {
      if (!user?.id) {
        // Clean up when user logs out
        if (initializedRef.current) {
          cleanupPushNotifications().catch((error) => {
            logger.warn('usePushNotifications', 'Push cleanup failed (non-fatal):', error);
          });
          initializedRef.current = false;
        }
        return;
      }

      // Only initialize once per user session
      if (initializedRef.current) {
        return;
      }

      // Initialize push notifications (non-blocking; failures must not prevent render)
      initializePushNotifications(user.id)
        .then(() => {
          initializedRef.current = true;
          logger.info('usePushNotifications', 'Push notifications initialized');
        })
        .catch((error) => {
          logger.warn('usePushNotifications', 'Push init failed (non-fatal):', error);
        });

      // Set up foreground message handler (safe: returns null on Firebase 400)
      const unsubscribe = setupForegroundMessageHandler((payload) => {
        logger.info('usePushNotifications', 'Foreground notification received:', payload);
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
    } catch (error) {
      logger.warn('usePushNotifications', 'Effect error (non-fatal, app will render):', error);
    }
  }, [user?.id, toast]);
}
