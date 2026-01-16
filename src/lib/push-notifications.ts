/**
 * Push Notification Service
 * 
 * Handles Firebase Cloud Messaging (FCM) registration and token management
 */

import { getMessaging, getToken, onMessage, Messaging, isSupported } from 'firebase/messaging';
import { app } from './firebase';
import { logger } from './logger';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

/**
 * Check if push notifications are supported in this browser
 */
export async function isPushNotificationSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  // Check for service worker support
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  // Check for notification permission API
  if (!('Notification' in window)) {
    return false;
  }

  // Check if Firebase Messaging is supported
  try {
    const supported = await isSupported();
    return supported;
  } catch (error) {
    logger.error('push-notifications', 'Error checking FCM support:', error);
    return false;
  }
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    logger.warn('push-notifications', 'Notifications not supported in this browser');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    logger.warn('push-notifications', 'Notification permission was previously denied');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    logger.info('push-notifications', `Notification permission: ${permission}`);
    return permission;
  } catch (error) {
    logger.error('push-notifications', 'Error requesting notification permission:', error);
    return 'denied';
  }
}

/**
 * Register service worker for push notifications
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    // Register the Firebase messaging service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    });

    logger.info('push-notifications', 'Service worker registered:', registration.scope);
    return registration;
  } catch (error) {
    logger.error('push-notifications', 'Service worker registration failed:', error);
    return null;
  }
}

/**
 * Get FCM token for the current device
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    // Check if push notifications are supported
    const supported = await isPushNotificationSupported();
    if (!supported) {
      logger.warn('push-notifications', 'Push notifications not supported');
      return null;
    }

    // Request permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      logger.warn('push-notifications', 'Notification permission not granted');
      return null;
    }

    // Register service worker
    const registration = await registerServiceWorker();
    if (!registration) {
      logger.error('push-notifications', 'Failed to register service worker');
      return null;
    }

    // Initialize Firebase Messaging
    const messaging = getMessaging(app);

    // Get FCM token
    if (!VAPID_KEY) {
      logger.error('push-notifications', 'VAPID key not configured');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      logger.info('push-notifications', 'FCM token obtained');
      return token;
    } else {
      logger.warn('push-notifications', 'No FCM token available');
      return null;
    }
  } catch (error: any) {
    logger.error('push-notifications', 'Error getting FCM token:', error);
    
    // Handle specific Firebase errors
    if (error?.code === 'messaging/permission-blocked') {
      logger.warn('push-notifications', 'Notification permission blocked by user');
    } else if (error?.code === 'messaging/permission-default') {
      logger.warn('push-notifications', 'Notification permission not yet requested');
    }
    
    return null;
  }
}

/**
 * Register push token with the backend
 */
export async function registerPushToken(token: string, userId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/push-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        platform: 'web',
        deviceId: getDeviceId(),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('push-notifications', 'Failed to register push token:', error);
      return false;
    }

    logger.info('push-notifications', 'Push token registered successfully');
    return true;
  } catch (error) {
    logger.error('push-notifications', 'Error registering push token:', error);
    return false;
  }
}

/**
 * Unregister push token from the backend
 */
export async function unregisterPushToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/push-tokens/${encodeURIComponent(token)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      logger.error('push-notifications', 'Failed to unregister push token');
      return false;
    }

    logger.info('push-notifications', 'Push token unregistered successfully');
    return true;
  } catch (error) {
    logger.error('push-notifications', 'Error unregistering push token:', error);
    return false;
  }
}

/**
 * Get or create a device ID for tracking
 */
function getDeviceId(): string {
  const STORAGE_KEY = 'hospogo_device_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  
  if (!deviceId) {
    deviceId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  
  return deviceId;
}

/**
 * Set up foreground message handler
 * This handles notifications when the app is in the foreground
 */
export function setupForegroundMessageHandler(
  onMessageReceived: (payload: any) => void
): (() => void) | null {
  try {
    const messaging = getMessaging(app);
    
    const unsubscribe = onMessage(messaging, (payload) => {
      logger.info('push-notifications', 'Foreground message received:', payload);
      onMessageReceived(payload);
    });

    return unsubscribe;
  } catch (error) {
    logger.error('push-notifications', 'Error setting up foreground message handler:', error);
    return null;
  }
}

/**
 * Initialize push notifications for a user
 * Call this when the user logs in
 */
export async function initializePushNotifications(userId: string): Promise<void> {
  try {
    // Check if supported
    const supported = await isPushNotificationSupported();
    if (!supported) {
      logger.info('push-notifications', 'Push notifications not supported, skipping initialization');
      return;
    }

    // Get FCM token
    const token = await getFCMToken();
    if (!token) {
      logger.warn('push-notifications', 'Could not obtain FCM token');
      return;
    }

    // Register token with backend
    await registerPushToken(token, userId);
  } catch (error) {
    logger.error('push-notifications', 'Error initializing push notifications:', error);
  }
}

/**
 * Clean up push notifications when user logs out
 */
export async function cleanupPushNotifications(): Promise<void> {
  try {
    // Get current token if available
    const messaging = getMessaging(app);
    const token = await getToken(messaging);
    
    if (token) {
      await unregisterPushToken(token);
    }
  } catch (error) {
    logger.error('push-notifications', 'Error cleaning up push notifications:', error);
  }
}
