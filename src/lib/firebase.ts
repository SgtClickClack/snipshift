import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  connectAuthEmulator,
} from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { logger } from "@/lib/logger";

// Helper to sanitize env vars and handle common issues like accidental whitespace
const sanitizeEnv = (val: string | undefined, keyName: string, fallback?: string): string => {
  if (!val || val === 'undefined' || val === 'null') {
    if (fallback) {
      return fallback;
    }
    throw new Error(`Firebase environment variable ${keyName} is missing or invalid`);
  }
  // Remove all whitespace including newlines, carriage returns, tabs, etc.
  // Also remove quotes if they were accidentally included in the value
  const sanitized = String(val).replace(/[\s"']/g, '');
  if (!sanitized) {
    if (fallback) {
      return fallback;
    }
    throw new Error(`Firebase environment variable ${keyName} is empty after sanitization`);
  }
  return sanitized;
};

// SECURITY: Strict project ID enforcement - only allow 'snipshift-75b04'
const REQUIRED_PROJECT_ID = 'snipshift-75b04';

// CRITICAL: Auth domain configuration for Firebase Authentication.
// Production must use 'hospogo.com' as the auth domain.
const authDomain = 'hospogo.com';

const firebaseConfig = {
  apiKey: sanitizeEnv(import.meta.env.VITE_FIREBASE_API_KEY, 'VITE_FIREBASE_API_KEY'),
  authDomain,
  projectId: sanitizeEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID, 'VITE_FIREBASE_PROJECT_ID'),
  storageBucket: sanitizeEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, 'VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: sanitizeEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, 'VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: sanitizeEnv(import.meta.env.VITE_FIREBASE_APP_ID, 'VITE_FIREBASE_APP_ID'),
  measurementId: sanitizeEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, 'VITE_FIREBASE_MEASUREMENT_ID'),
};

// SECURITY: Validate project ID before initialization
if (firebaseConfig.projectId !== REQUIRED_PROJECT_ID) {
  throw new Error(`Unauthorized Project ID: Expected '${REQUIRED_PROJECT_ID}', got '${firebaseConfig.projectId}'`);
}

// Initialize Firebase - prevent re-initialization if app already exists
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// SECURITY: Double-check the initialized app's project ID
if (app.options.projectId !== REQUIRED_PROJECT_ID) {
  throw new Error(`Unauthorized Project ID: Initialized app project_id '${app.options.projectId}' does not match required '${REQUIRED_PROJECT_ID}'`);
}

export { app };

// MODULAR SDK v10: Initialize Auth and Export as constant
// CRITICAL: This MUST be a direct constant export - no lazy initialization, no wrappers
// This is the ONLY correct way to initialize auth in Firebase v9+
export const auth = getAuth(app);

// Runtime validation: Ensure auth is never undefined
if (!auth) {
  throw new Error('Firebase Auth initialization failed: auth is undefined');
}

// For debugging in console - expose auth to window for inspection
if (typeof window !== 'undefined') {
  (window as any).firebaseAuth = auth;
  if (import.meta.env.DEV) {
    console.debug('[Firebase] Auth instance initialized and exposed to window.firebaseAuth');
  }
}

// Connect to Firebase Auth Emulator in E2E mode if explicitly enabled
if (
  import.meta.env.VITE_E2E === "1" && 
  import.meta.env.VITE_USE_FIREBASE_EMULATOR === "1" &&
  typeof window !== 'undefined'
) {
  const emulatorUrl = "http://localhost:9099";
  try {
    connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
    logger.debug('Firebase', '[Firebase] Connected to Auth Emulator for E2E tests');
  } catch (error: any) {
    if (error?.message?.includes('already') || error?.code === 'auth/emulator-config-failed') {
      logger.debug('Firebase', '[Firebase] Auth Emulator already connected');
    } else {
      console.warn('[Firebase] Auth Emulator not available, falling back to real Firebase');
    }
  }
} else if (import.meta.env.VITE_E2E === "1" && typeof window !== 'undefined') {
  logger.debug('Firebase', '[Firebase] E2E mode: Using real Firebase (set VITE_USE_FIREBASE_EMULATOR=1 to use emulator)');
}

export const googleProvider = new GoogleAuthProvider();
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const storage = getStorage(app);

// Configure Google provider
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Google sign-in using redirect flow (100% reliable against COOP blocking).
 * MODULAR SYNTAX: signInWithRedirect(auth, provider) NOT auth.signInWithRedirect()
 */
export const signInWithGoogle = async () => {
  try {
    // MODULAR SYNTAX: setPersistence(auth, ...) NOT auth.setPersistence(...)
    await setPersistence(auth, browserLocalPersistence);
    logger.debug('Firebase', '[Firebase] Initiating Google sign-in with redirect flow');
    await signInWithRedirect(auth, googleProvider);
    return null;
  } catch (error: unknown) {
    const code =
      typeof error === 'object' && error && 'code' in error
        ? String((error as { code: unknown }).code)
        : '';
    
    const errorMessage =
      typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : '';
    
    if (code === 'auth/unauthorized-domain') {
      console.error('[Firebase] Unauthorized domain error. Check:');
      console.error('  1. Firebase Console > Authentication > Settings > Authorized domains');
      console.error('  2. Google Cloud Console > APIs & Services > Credentials > Authorized JavaScript origins');
      const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'hospogo.com';
      const redirectUri = `https://${currentDomain}/__/auth/handler`;
      console.error(`  3. Google Cloud Console > Authorized redirect URIs must include: ${redirectUri}`);
      console.error('  4. Current authDomain:', firebaseConfig.authDomain);
      console.error('  5. Current hostname:', currentDomain);
    }
    
    console.error('[Firebase] Google redirect sign-in error:', {
      code,
      message: errorMessage,
      error,
      authDomain: firebaseConfig.authDomain,
      currentDomain: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
    });
    
    throw error;
  }
};

/**
 * Handle redirect result (call this on app load).
 * MODULAR SYNTAX: getRedirectResult(auth) NOT auth.getRedirectResult()
 */
export const handleGoogleRedirectResult = async () => {
  try {
    // MODULAR SYNTAX: setPersistence(auth, ...) NOT auth.setPersistence(...)
    await setPersistence(auth, browserLocalPersistence);
    
    // MODULAR SYNTAX: getRedirectResult(auth) NOT auth.getRedirectResult()
    const result = await getRedirectResult(auth);
    if (result?.user) {
      await result.user.getIdToken(true);
    }
    return result?.user || null;
  } catch (error) {
    console.error('Google redirect error:', error);
    console.dir(error, { depth: null });
    throw error;
  }
};

/**
 * Sign out user.
 * MODULAR SYNTAX: signOut(auth) NOT auth.signOut()
 */
export const signOutUser = async () => {
  await signOut(auth);
};

/**
 * Send a password reset email via Firebase Auth.
 * MODULAR SYNTAX: sendPasswordResetEmail(auth, email) NOT auth.sendPasswordResetEmail()
 */
export const sendPasswordReset = async (email: string) => {
  const cleanEmail = email.trim();

  if (import.meta.env.VITE_E2E === "1") {
    logger.debug('Firebase', '[Password Reset] E2E mode - skipping Firebase call');
    return;
  }

  logger.debug('Firebase', '[Password Reset] Attempting to send reset email to:', cleanEmail);
  logger.debug('Firebase', '[Password Reset] Firebase project:', auth.app.options.projectId);
  
  try {
    // MODULAR SYNTAX: sendPasswordResetEmail(auth, email) NOT auth.sendPasswordResetEmail()
    await sendPasswordResetEmail(auth, cleanEmail);
    logger.debug('Firebase', '[Password Reset] Firebase accepted the request successfully');
  } catch (error) {
    console.error('[Password Reset] Firebase rejected the request:', error);
    throw error;
  }
};
