import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { fallbackConfig } from "./firebase-fallback";

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

// Load Firebase configuration from environment variables with fallback support
// Falls back to fallbackConfig when env vars are missing (useful for development)
const firebaseConfig = {
  apiKey: sanitizeEnv(import.meta.env.VITE_FIREBASE_API_KEY, 'VITE_FIREBASE_API_KEY', fallbackConfig.apiKey),
  authDomain: sanitizeEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, 'VITE_FIREBASE_AUTH_DOMAIN', fallbackConfig.authDomain),
  projectId: sanitizeEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID, 'VITE_FIREBASE_PROJECT_ID', fallbackConfig.projectId),
  storageBucket: sanitizeEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, 'VITE_FIREBASE_STORAGE_BUCKET', fallbackConfig.storageBucket),
  messagingSenderId: sanitizeEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, 'VITE_FIREBASE_MESSAGING_SENDER_ID', fallbackConfig.messagingSenderId),
  appId: sanitizeEnv(import.meta.env.VITE_FIREBASE_APP_ID, 'VITE_FIREBASE_APP_ID', fallbackConfig.appId),
  measurementId: sanitizeEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, 'VITE_FIREBASE_MEASUREMENT_ID', fallbackConfig.measurementId),
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const storage = getStorage(app);

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
