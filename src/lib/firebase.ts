import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getInstallations, getToken } from 'firebase/installations';

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

// LAZY INITIALIZATION: Firebase instances are initialized on first access
// This moves ~100-200ms of blocking work off the critical path
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _storage: FirebaseStorage | null = null;
let _initPromise: Promise<void> | null = null;

function initFirebaseSync(): { app: FirebaseApp; auth: Auth; storage: FirebaseStorage } {
  const firebaseConfig = buildConfig();
  const app = initializeApp(firebaseConfig);
  g[globalKey] = app;
  return {
    app,
    auth: getAuth(app),
    storage: getStorage(app),
  };
}

/**
 * Initialize Firebase lazily. Returns immediately if already initialized.
 * Call this early in the app lifecycle but non-blockingly.
 */
export function initializeFirebase(): Promise<void> {
  if (_initPromise) return _initPromise;
  
  _initPromise = new Promise((resolve) => {
    // Use requestIdleCallback if available, otherwise setTimeout
    const init = () => {
      try {
        const existing = g[globalKey];
        if (existing) {
          _app = existing;
          _auth = getAuth(_app);
          _storage = getStorage(_app);
        } else {
          const inited = initFirebaseSync();
          _app = inited.app;
          _auth = inited.auth;
          _storage = inited.storage;
        }
      } catch (error) {
        console.warn('[firebase] Lazy initialization failed; retrying...', error);
        try {
          const inited = initFirebaseSync();
          _app = inited.app;
          _auth = inited.auth;
          _storage = inited.storage;
        } catch (e2) {
          console.error('[firebase] Retry failed:', e2);
        }
      }
      resolve();
    };

    // Initialize as soon as the main thread is idle
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(init, { timeout: 100 });
    } else {
      // Fallback for browsers without requestIdleCallback (Safari)
      setTimeout(init, 0);
    }
  });

  return _initPromise;
}

// Getter functions for lazy access
function getApp(): FirebaseApp {
  if (!_app) {
    // Fallback to sync init if accessed before lazy init completes
    const existing = g[globalKey];
    if (existing) {
      _app = existing;
    } else {
      const inited = initFirebaseSync();
      _app = inited.app;
      _auth = inited.auth;
      _storage = inited.storage;
    }
  }
  return _app;
}

function getAuthInstance(): Auth {
  if (!_auth) {
    const app = getApp();
    _auth = getAuth(app);
  }
  return _auth;
}

function getStorageInstance(): FirebaseStorage {
  if (!_storage) {
    const app = getApp();
    _storage = getStorage(app);
  }
  return _storage;
}

// Export as getters that trigger lazy init on first access
// This preserves the existing API while making init non-blocking
export const app = new Proxy({} as FirebaseApp, {
  get(_, prop) {
    return Reflect.get(getApp(), prop);
  },
});

export const auth = new Proxy({} as Auth, {
  get(_, prop) {
    const authInstance = getAuthInstance();
    const value = Reflect.get(authInstance, prop);
    // Bind methods to the auth instance
    if (typeof value === 'function') {
      return value.bind(authInstance);
    }
    return value;
  },
});

export const storage = new Proxy({} as FirebaseStorage, {
  get(_, prop) {
    const storageInstance = getStorageInstance();
    const value = Reflect.get(storageInstance, prop);
    if (typeof value === 'function') {
      return value.bind(storageInstance);
    }
    return value;
  },
});

// Immediately kick off lazy initialization
// This runs after the module is loaded but doesn't block rendering
initializeFirebase();

/**
 * Silently initialize Firebase Installations for background services.
 * Wrapped in robust error handling to prevent 400 errors from disrupting session state.
 * Common 400 errors occur during token refresh on certain network conditions.
 */
async function initInstallationsLayer(): Promise<void> {
  try {
    const firebaseApp = getApp();
    const installations = getInstallations(firebaseApp);
    
    // Attempt to get token - this validates the installations layer
    await getToken(installations, /* forceRefresh */ false);
  } catch (error: unknown) {
    // Gracefully handle 400 errors from Firebase Installations
    // These are non-critical background errors that shouldn't affect user session
    const errorCode = (error as { code?: string })?.code;
    const errorStatus = (error as { status?: number })?.status;
    
    if (errorStatus === 400 || errorCode?.includes('400')) {
      console.log('[firebase] System: Installations Layer Backgrounded.');
    } else {
      // Log other errors at warn level - still non-blocking
      console.warn('[firebase] Installations layer initialization deferred:', error);
    }
  }
}

// Kick off installations layer after main Firebase init completes
// This is non-blocking and will silently handle any 400 errors
initializeFirebase().then(() => {
  initInstallationsLayer();
});
