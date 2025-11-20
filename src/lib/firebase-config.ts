// Firebase configuration for Google OAuth
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { fallbackConfig } from './firebase-fallback';

// Helper to sanitize env vars and handle common issues like accidental whitespace
const sanitizeEnv = (val: string | undefined) => {
  if (!val || val === 'undefined' || val === 'null') return undefined;
  // Remove all whitespace including newlines, carriage returns, tabs, etc.
  // Also remove quotes if they were accidentally included in the value
  return String(val).replace(/[\s"']/g, '');
};

const apiKey = sanitizeEnv(import.meta.env.VITE_FIREBASE_API_KEY);

// Firebase config using Google Console Client ID
const firebaseConfig = apiKey ? {
  apiKey,
  authDomain: sanitizeEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: sanitizeEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: sanitizeEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: sanitizeEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: sanitizeEnv(import.meta.env.VITE_FIREBASE_APP_ID),
  measurementId: sanitizeEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID),
} : fallbackConfig;

// Debug Firebase config (dev only)
if (import.meta.env.MODE !== 'production' || !apiKey) {
  console.log('🔧 Firebase Config:', {
    apiKey: firebaseConfig.apiKey ? 'Set' : 'Missing',
    authDomain: firebaseConfig.authDomain || 'Missing',
    projectId: firebaseConfig.projectId || 'Missing',
    storageBucket: firebaseConfig.storageBucket || 'Missing',
    messagingSenderId: firebaseConfig.messagingSenderId || 'Missing',
    appId: (firebaseConfig as any).appId ? 'Set' : 'Missing',
  });
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure Google Provider with exact Client ID from Google Console
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-out error:', error);
    throw error;
  }
};
