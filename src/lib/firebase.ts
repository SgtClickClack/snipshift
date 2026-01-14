import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  connectAuthEmulator,
  type User as FirebaseAuthUser,
} from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";

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

// Load Firebase configuration from environment variables.
// We intentionally fail fast if required env vars are missing to avoid silently
// initializing against the wrong Firebase project in production.
const firebaseConfig = {
  apiKey: sanitizeEnv(import.meta.env.VITE_FIREBASE_API_KEY, 'VITE_FIREBASE_API_KEY'),
  // ESSENTIAL: Forces the rebrand domain for auth handshakes
  // Can be overridden via VITE_FIREBASE_AUTH_DOMAIN if needed.
  authDomain: sanitizeEnv(
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    'VITE_FIREBASE_AUTH_DOMAIN',
    'hospogo.com'
  ),
  projectId: sanitizeEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID, 'VITE_FIREBASE_PROJECT_ID'),
  storageBucket: sanitizeEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, 'VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: sanitizeEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, 'VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: sanitizeEnv(import.meta.env.VITE_FIREBASE_APP_ID, 'VITE_FIREBASE_APP_ID'),
  measurementId: sanitizeEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, 'VITE_FIREBASE_MEASUREMENT_ID'),
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Connect to Firebase Auth Emulator in E2E mode if available
// This allows tests to use the emulator instead of hitting production Firebase
if (import.meta.env.VITE_E2E === "1" && typeof window !== 'undefined') {
  try {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    console.log('[Firebase] Connected to Auth Emulator for E2E tests');
  } catch (error: any) {
    // If emulator connection fails (e.g., emulator not running or already connected), continue without it
    // The test will use API mocking instead (see tests/core-marketplace.spec.ts)
    if (error?.message?.includes('already') || error?.code === 'auth/emulator-config-failed') {
      console.log('[Firebase] Auth Emulator already connected');
    } else {
      console.log('[Firebase] Auth Emulator not available, will use API mocking in tests');
    }
  }
}

export const googleProvider = new GoogleAuthProvider();
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const storage = getStorage(app);

// Configure Google provider
googleProvider.addScope('email');
googleProvider.addScope('profile');
// Force Google to show the account picker (helps bypass stale/broken sessions from legacy domains).
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Google sign-in using redirect flow (permanent fix for COOP issues).
 * 
 * Redirect flow is 100% reliable against COOP (Cross-Origin-Opener-Policy) blocking
 * because it doesn't rely on popup-to-window communication. The user is redirected
 * to Google, then back to the app, where handleGoogleRedirectResult() processes the result.
 * 
 * This is the recommended approach for production after the HospoGo rebrand to avoid
 * infinite loading screens caused by COOP blocking the popup handshake.
 */
export const signInWithGoogle = async () => {
  try {
    // CRITICAL: Set persistence BEFORE signing in to prevent logout on refresh
    // browserLocalPersistence stores auth state in localStorage, surviving page reloads
    await setPersistence(auth, browserLocalPersistence);
    
    // Use redirect flow - 100% reliable against COOP blocking
    console.log('[Firebase] Initiating Google sign-in with redirect flow');
    await signInWithRedirect(auth, googleProvider);
    
    // Return null - the redirect will happen and handleGoogleRedirectResult() will process it
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
    
    // Check for unauthorized domain (configuration issue)
    if (code === 'auth/unauthorized-domain') {
      console.error('[Firebase] Unauthorized domain error. Check:');
      console.error('  1. Firebase Console > Authentication > Settings > Authorized domains');
      console.error('  2. Google Cloud Console > APIs & Services > Credentials > Authorized JavaScript origins');
      console.error('  3. Google Cloud Console > Authorized redirect URIs must include: https://hospogo.com/__/auth/handler');
      console.error('  4. Current authDomain:', firebaseConfig.authDomain);
      console.error('  5. Current hostname:', typeof window !== 'undefined' ? window.location.hostname : 'unknown');
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

// Handle redirect result (call this on app load)
export const handleGoogleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (error) {
    console.error('Google redirect error:', error);
    throw error;
  }
};

// Sign out
export const signOutUser = async () => {
  await signOut(auth);
};

// Auth state listener
export const onAuthStateChange = (callback: (user: FirebaseAuthUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Send a password reset email via Firebase Auth.
 *
 * Notes:
 * - In E2E runs (VITE_E2E=1), this resolves immediately to avoid external network dependency.
 * - We intentionally do NOT pass a custom continue URL by default. Passing an unauthorized URL
 *   can cause Firebase to reject the request (e.g. `auth/unauthorized-continue-uri`) and the email
 *   will not be sent. Firebase's default reset handler is the most compatible.
 */
export const sendPasswordReset = async (email: string) => {
  const cleanEmail = email.trim();

  // E2E mode: avoid hitting Firebase network in automation.
  if (import.meta.env.VITE_E2E === "1") {
    console.log('[Password Reset] E2E mode - skipping Firebase call');
    return;
  }

  console.log('[Password Reset] Attempting to send reset email to:', cleanEmail);
  console.log('[Password Reset] Firebase project:', auth.app.options.projectId);
  
  try {
    await sendPasswordResetEmail(auth, cleanEmail);
    console.log('[Password Reset] Firebase accepted the request successfully');
  } catch (error) {
    console.error('[Password Reset] Firebase rejected the request:', error);
    throw error;
  }
};
