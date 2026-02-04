import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const getEnv = (key: keyof ImportMetaEnv) => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing Firebase environment variable: ${key}`);
  }
  return value;
};

// Project snipshift-75b04: VITE_FIREBASE_PROJECT_ID and VITE_FIREBASE_MESSAGING_SENDER_ID
// must match this project exactly; mismatches cause Firebase 400 errors (e.g. on token cleanup).
// 
// CRITICAL: authDomain must use env variable to avoid COOP (Cross-Origin-Opener-Policy) errors.
// Hardcoding authDomain causes popup auth to fail with "window.closed" blocked errors.
function buildConfig() {
  // For local development, use the Firebase default authDomain if VITE_FIREBASE_AUTH_DOMAIN is not set
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 
                     `${getEnv('VITE_FIREBASE_PROJECT_ID')}.firebaseapp.com`;
  
  return {
    apiKey: getEnv('VITE_FIREBASE_API_KEY'),
    authDomain,
    projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnv('VITE_FIREBASE_APP_ID'),
    measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID'),
  };
}

const globalKey = '__hospogoFirebaseApp' as const;
const g = globalThis as unknown as { [key: string]: FirebaseApp | undefined };

function initFirebase(): { app: FirebaseApp; auth: Auth; storage: FirebaseStorage } {
  const firebaseConfig = buildConfig();
  const app = initializeApp(firebaseConfig);
  g[globalKey] = app;
  return {
    app,
    auth: getAuth(app),
    storage: getStorage(app),
  };
}

// Modular Firebase v10-only initialization.
// Wrap init in try/catch so Firebase Installations 400 (or other init errors) do not block app render.
// If you see 400 errors for firebaseinstallations: enable the "Firebase Installations API" in
// Google Cloud Console for this project (APIs & Services → Enable APIs).
let app: FirebaseApp;
let auth: Auth;
let storage: FirebaseStorage;

try {
  const existing = g[globalKey];
  if (existing) {
    app = existing;
    auth = getAuth(app);
    storage = getStorage(app);
  } else {
    const inited = initFirebase();
    app = inited.app;
    auth = inited.auth;
    storage = inited.storage;
  }
} catch (error) {
  console.warn('[firebase] Initialization failed (e.g. 400 from Installations); retrying or using existing app.', error);
  const existing = g[globalKey];
  if (existing) {
    app = existing;
    auth = getAuth(app);
    storage = getStorage(app);
  } else {
    try {
      const inited = initFirebase();
      app = inited.app;
      auth = inited.auth;
      storage = inited.storage;
    } catch (e2) {
      console.error('[firebase] Retry failed:', e2);
      throw e2;
    }
  }
}

export { app, auth, storage };
