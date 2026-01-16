/* eslint-disable no-undef */
/* eslint-disable no-restricted-globals */
/**
 * Firebase Cloud Messaging Service Worker
 * 
 * Handles push notifications when the app is in the background or closed.
 * This service worker must be registered at the root of the domain.
 */

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration - these values are injected at build time
// In production, these should match your Firebase project settings
const firebaseConfig = {
  apiKey: 'AIzaSyAeEQ0qFLP_w_8wpD3I9x7SEK5qhxeu0_I',
  authDomain: 'snipshift-75b04.firebaseapp.com',
  projectId: 'snipshift-75b04',
  storageBucket: 'snipshift-75b04.firebasestorage.app',
  messagingSenderId: '769818802438',
  appId: '1:769818802438:web:37254646426bd6aaf3c687',
  measurementId: 'G-LVF9BT8EQ2',
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'HospoGo';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/brand-logo-192.png',
    badge: '/brand-logo-192.png',
    image: payload.notification?.image,
    data: payload.data || {},
    tag: payload.data?.conversationId || payload.data?.notificationId || 'hospogo-notification',
    requireInteraction: false,
    silent: false,
  };

  // Show notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.', event);
  
  event.notification.close();

  // Extract data from notification
  const data = event.notification.data || {};
  const link = data.link || '/';
  
  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url === link && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(link);
      }
    })
  );
});
