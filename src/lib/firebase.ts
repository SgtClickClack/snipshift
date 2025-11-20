import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";

// Helper to sanitize env vars and handle common issues like accidental whitespace
const sanitizeEnv = (val: string | undefined) => {
  if (!val) return undefined;
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

const firebaseConfig = {
  apiKey: sanitizeEnv(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain,
  projectId,
  storageBucket,
  appId: sanitizeEnv(import.meta.env.VITE_FIREBASE_APP_ID),
};

// Log configuration status (safe for production, doesn't expose secrets)
console.log('🔥 Firebase Config Status:', {
  authDomain,
  projectId: projectId ? 'Set' : 'Missing',
  apiKey: firebaseConfig.apiKey ? 'Set' : 'Missing',
  appId: firebaseConfig.appId ? 'Set' : 'Missing',
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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