/**
 * Push Notification Service
 * 
 * Handles Firebase Cloud Messaging (FCM) registration and token management
 */

import { getMessaging, getToken, onMessage, Messaging, isSupported } from 'firebase/messaging';
import { app } from './firebase';
import { logger } from './logger';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

// Cache for browser support check - prevents repeated async calls
let messagingSupportedCache: boolean | null = null;
let messagingInstance: Messaging | null = null;

/**
 * Check if Firebase Messaging is supported in this browser (cached for performance)
 */
async function checkMessagingSupport(): Promise<boolean> {
  if (messagingSupportedCache !== null) {
    return messagingSupportedCache;
  }
  
  // Basic browser checks first (synchronous)
  if (typeof window === 'undefined') {
    messagingSupportedCache = false;
    return false;
  }
  
  if (!('serviceWorker' in navigator)) {
    messagingSupportedCache = false;
    return false;
  }
  
  if (!('Notification' in window)) {
    messagingSupportedCache = false;
    return false;
  }
  
  // E2E test environment check - skip messaging in tests
  if (import.meta.env.VITE_E2E === '1' || import.meta.env.MODE === 'test') {
    messagingSupportedCache = false;
    return false;
  }
  
  try {
    messagingSupportedCache = await isSupported();
    return messagingSupportedCache;
  } catch (error) {
    logger.warn('push-notifications', 'isSupported() check failed:', error);
    messagingSupportedCache = false;
    return false;
  }
}

/**
 * Safe getter for Firebase Messaging. Never throws.
 * Checks isSupported() before initializing to prevent "unsupported-browser" errors.
 * Firebase Installations can return 400 (e.g. project/sender mismatch); the app MUST still render.
 */
async function safeGetMessagingAsync(): Promise<Messaging | null> {
  // Return cached instance if available
  if (messagingInstance) {
    return messagingInstance;
  }
  
  // Check support first
  const supported = await checkMessagingSupport();
  if (!supported) {
    return null;
  }
  
  try {
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (error) {
    logger.warn('push-notifications', 'getMessaging failed (non-fatal, app will render):', error);
    return null;
  }
}

/**
 * Synchronous getter - only returns if already initialized
 * Use safeGetMessagingAsync() for first-time initialization
 */
function safeGetMessagingSync(): Messaging | null {
  // Only return if we've already checked support and initialized
  if (messagingSupportedCache === false) {
    return null;
  }
  return messagingInstance;
}

/**
 * Check if push notifications are supported in this browser.
 * Wrapped so Firebase Installations 400/errors never crash the app.
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

  // Check if Firebase Messaging is supported (can throw 400 from Installations)
  try {
    const supported = await isSupported();
    return supported;
  } catch (error) {
    logger.warn('push-notifications', 'FCM support check failed (non-fatal):', error);
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
  // Return null immediately if VAPID_KEY is undefined to prevent logger from firing
  if (!VAPID_KEY) {
    return null;
  }

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

    // Initialize Firebase Messaging (safe: 400 from Installations must not crash app)
    const messaging = await safeGetMessagingAsync();
    if (!messaging) return null;

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
    // Firebase Installations 400 / getToken errors must not crash the app
    logger.warn('push-notifications', 'FCM token error (non-fatal):', error);
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
 * Set up foreground message handler.
 * Safe: Firebase Installations 400 must not crash the app; returns null on failure.
 * Now async to properly check browser support before initializing.
 */
export async function setupForegroundMessageHandler(
  onMessageReceived: (payload: any) => void
): Promise<(() => void) | null> {
  try {
    // Check support first to avoid "unsupported-browser" errors
    const supported = await checkMessagingSupport();
    if (!supported) {
      logger.info('push-notifications', 'Messaging not supported, skipping foreground handler');
      return null;
    }
    
    const messaging = await safeGetMessagingAsync();
    if (!messaging) return null;
    
    const unsubscribe = onMessage(messaging, (payload) => {
      logger.info('push-notifications', 'Foreground message received:', payload);
      onMessageReceived(payload);
    });

    return unsubscribe;
  } catch (error) {
    logger.warn('push-notifications', 'Foreground message handler setup failed (non-fatal):', error);
    return null;
  }
}

/**
 * Initialize push notifications for a user. Call this when the user logs in.
 * Entirely wrapped: app MUST render even if Firebase Installations returns 400.
 */
export async function initializePushNotifications(userId: string): Promise<void> {
  try {
    const supported = await isPushNotificationSupported();
    if (!supported) {
      logger.info('push-notifications', 'Push notifications not supported, skipping initialization');
      return;
    }

    const token = await getFCMToken();
    if (!token) {
      logger.warn('push-notifications', 'Could not obtain FCM token');
      return;
    }

    await registerPushToken(token, userId);
  } catch (error) {
    logger.warn('push-notifications', 'Push init failed (non-fatal, app will continue):', error);
  }
}

/**
 * Clean up push notifications when user logs out.
 * Wrapped defensively so Firebase 400 (e.g. mismatched projectId/messagingSenderId)
 * or installations.delete() failures never crash the app or block logout.
 * 
 * INVESTOR BRIEFING FIX: Triple-wrapped to ensure Firebase Installations 400 errors
 * NEVER propagate to calling code or trigger any auth state machine resets.
 */
export async function cleanupPushNotifications(): Promise<void> {
  // Outer try-catch: ensures this function NEVER throws, regardless of internal failures
  try {
    // Check support first - no point trying to clean up if not supported
    const supported = await checkMessagingSupport();
    if (!supported) return;
    
    const messaging = await safeGetMessagingAsync();
    if (!messaging) return;

    // Inner try-catch: Firebase getToken can throw 400 from Installations API
    try {
      // Use a timeout to prevent hanging on Firebase Installations API
      const tokenPromise = getToken(messaging);
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
      
      const token = await Promise.race([tokenPromise, timeoutPromise]);
      if (token) {
        // Fire-and-forget: don't wait for backend unregister to complete
        unregisterPushToken(token).catch(() => {
          // Silently ignore backend unregister failures
        });
      }
    } catch (innerError: unknown) {
      // Firebase 400 / installations errors - silently swallow
      // This is the "jolt" prevention: never let this error propagate
      logger.warn('push-notifications', 'Token cleanup inner error (silenced):', innerError);
    }
  } catch (outerError: unknown) {
    // Ultimate fallback: if anything above throws, log and continue
    // This ensures logout() NEVER fails due to push notification cleanup
    logger.warn('push-notifications', 'Token cleanup outer error (silenced):', outerError);
  }
}
