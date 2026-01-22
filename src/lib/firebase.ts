import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const getEnv = (key: keyof ImportMetaEnv) => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing Firebase environment variable: ${key}`);
  }
  return value;
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  // Use custom domain (hospogo.com) for auth to prevent Chrome bounce tracking
  // from stripping apiKey params during redirect from firebaseapp.com
  // This ensures the browser never leaves our primary domain during the handshake
  authDomain: 'hospogo.com',
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID'),
  measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID'),
};

// Modular Firebase v10-only initialization.
// NOTE: We intentionally avoid legacy compat patterns.
// Also, Vite HMR can re-evaluate modules; cache the initialized app on globalThis.
export const app =
  (globalThis as unknown as { __hospogoFirebaseApp?: ReturnType<typeof initializeApp> })
    .__hospogoFirebaseApp ?? initializeApp(firebaseConfig);

(globalThis as unknown as { __hospogoFirebaseApp?: ReturnType<typeof initializeApp> }).__hospogoFirebaseApp =
  app;

export const auth = getAuth(app);
export const storage = getStorage(app);
