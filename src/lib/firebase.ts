import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  connectAuthEmulator,
  type User as FirebaseAuthUser,
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

// Load Firebase configuration from environment variables.
// We intentionally fail fast if required env vars are missing to avoid silently
// initializing against the wrong Firebase project in production.
// SECURITY: Strict project ID enforcement - only allow 'snipshift-75b04'
const REQUIRED_PROJECT_ID = 'snipshift-75b04';

// CRITICAL: Auth domain configuration for Firebase Authentication.
// Production must use 'hospogo.com' as the auth domain.
const authDomain = 'hospogo.com';

const firebaseConfig = {
  apiKey: sanitizeEnv(import.meta.env.VITE_FIREBASE_API_KEY, 'VITE_FIREBASE_API_KEY'),
  // ESSENTIAL: Uses rebranded domain (hospogo.com) when configured via environment variable.
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// SECURITY: Double-check the initialized app's project ID
if (app.options.projectId !== REQUIRED_PROJECT_ID) {
  throw new Error(`Unauthorized Project ID: Initialized app project_id '${app.options.projectId}' does not match required '${REQUIRED_PROJECT_ID}'`);
}

export { app };
export const auth = getAuth(app);

// Connect to Firebase Auth Emulator in E2E mode if explicitly enabled and available
// Only connect if VITE_USE_FIREBASE_EMULATOR is set to "1" to avoid connection errors
// when the emulator is not running. Tests can use real Firebase by default.
if (
  import.meta.env.VITE_E2E === "1" && 
  import.meta.env.VITE_USE_FIREBASE_EMULATOR === "1" &&
  typeof window !== 'undefined'
) {
  // Check if emulator is available before connecting
  const emulatorUrl = "http://localhost:9099";
  try {
    // Try to connect to emulator
    connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
    logger.debug('Firebase', '[Firebase] Connected to Auth Emulator for E2E tests');
  } catch (error: any) {
    // If emulator connection fails (e.g., emulator not running or already connected), continue without it
    // The test will use real Firebase instead
    if (error?.message?.includes('already') || error?.code === 'auth/emulator-config-failed') {
      logger.debug('Firebase', '[Firebase] Auth Emulator already connected');
    } else {
      console.warn('[Firebase] Auth Emulator not available, falling back to real Firebase');
      console.warn('[Firebase] To use emulator, start it with: firebase emulators:start --only auth');
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
    logger.debug('Firebase', '[Firebase] Initiating Google sign-in with redirect flow');
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
      // Use dynamic domain instead of hardcoded hospogo.com
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

// Handle redirect result (call this on app load)
export const handleGoogleRedirectResult = async () => {
  try {
    // CRITICAL: Set persistence BEFORE getRedirectResult to help browser remember session across domains
    // This ensures the session is persisted even if the redirect handshake is blocked
    await setPersistence(auth, browserLocalPersistence);
    
    const result = await getRedirectResult(auth);
    if (result?.user) {
      // CRITICAL: Force token refresh to ensure it's persisted and ready for backend
      // This prevents race conditions where onAuthStateChange fires before token is ready
      await result.user.getIdToken(true);
    }
    return result?.user || null;
  } catch (error) {
    console.error('Google redirect error:', error);
    // Log full error details for debugging cross-origin issues
    console.dir(error, { depth: null });
    throw error;
  }
};

// Sign out
export const signOutUser = async () => {
  await signOut(auth);
};

// Auth state listener
export const onAuthStateChange = (callback: (user: FirebaseAuthUser | null) => void) => {
  return firebaseOnAuthStateChanged(auth, callback);
};

// Export the raw Firebase function for direct use
export const onAuthStateChanged = firebaseOnAuthStateChanged;

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
    logger.debug('Firebase', '[Password Reset] E2E mode - skipping Firebase call');
    return;
  }

  logger.debug('Firebase', '[Password Reset] Attempting to send reset email to:', cleanEmail);
  logger.debug('Firebase', '[Password Reset] Firebase project:', auth.app.options.projectId);
  
  try {
    await sendPasswordResetEmail(auth, cleanEmail);
    logger.debug('Firebase', '[Password Reset] Firebase accepted the request successfully');
  } catch (error) {
    console.error('[Password Reset] Firebase rejected the request:', error);
    throw error;
  }
};
