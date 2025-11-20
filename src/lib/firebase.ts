import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { fallbackConfig } from "./firebase-fallback";

// Helper to sanitize env vars and handle common issues like accidental whitespace
const sanitizeEnv = (val: string | undefined) => {
  if (!val || val === 'undefined' || val === 'null') return undefined;
  // Remove all whitespace including newlines, carriage returns, tabs, etc.
  // Also remove quotes if they were accidentally included in the value
  return String(val).replace(/[\s"']/g, '');
};

const projectId = sanitizeEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID);

// Prioritize explicit auth domain, fallback to constructed one
const authDomain = sanitizeEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) || 
  (projectId ? `${projectId}.firebaseapp.com` : undefined);

const storageBucket = sanitizeEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) || 
  (projectId ? `${projectId}.firebasestorage.app` : undefined);

const apiKey = sanitizeEnv(import.meta.env.VITE_FIREBASE_API_KEY);

// Construct config with fallback logic
const firebaseConfig = apiKey ? {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId: sanitizeEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: sanitizeEnv(import.meta.env.VITE_FIREBASE_APP_ID),
  measurementId: sanitizeEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID),
} : fallbackConfig;

// Log configuration status (safe for production, doesn't expose secrets)
console.log('🔥 Firebase Config Status:', {
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  apiKey: firebaseConfig.apiKey ? `Set (${firebaseConfig.apiKey.substring(0, 5)}...)` : 'Missing',
  appId: (firebaseConfig as any).appId ? 'Set' : 'Missing',
});

if (!firebaseConfig.apiKey) {
  console.error('❌ Firebase API Key is missing! Check VITE_FIREBASE_API_KEY environment variable.');
} else if (firebaseConfig === fallbackConfig) {
  console.warn('⚠️ Using fallback Firebase configuration. Environment variables may be missing.');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Configure Google provider
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Google sign-in methods
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    // If popup is blocked, fallback to redirect
    if (error.code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, googleProvider);
      return null; // Will be handled by redirect result
    }
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
export const onAuthStateChange = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, callback);
};
