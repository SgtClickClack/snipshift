import { initializeApp, getApp, getApps } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  setPersistence,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { logger } from '@/lib/logger';

const getEnv = (key: keyof ImportMetaEnv) => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing Firebase environment variable: ${key}`);
  }
  return value;
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: 'hospogo.com',
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID'),
  measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID'),
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export { app };
export const auth = getAuth(app);
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const signInWithGoogle = async () => {
  await setPersistence(auth, browserLocalPersistence);
  logger.debug('Firebase', '[Firebase] Starting Google redirect sign-in');
  await signInWithRedirect(auth, googleProvider);
  return null;
};

export const handleGoogleRedirectResult = async () => {
  await setPersistence(auth, browserLocalPersistence);
  const result = await getRedirectResult(auth);
  if (result?.user) {
    await result.user.getIdToken(true);
  }
  return result?.user ?? null;
};

export const signOutUser = async () => {
  await signOut(auth);
};

export const sendPasswordReset = async (email: string) => {
  const cleanEmail = email.trim();

  if (import.meta.env.VITE_E2E === '1') {
    logger.debug('Firebase', '[Password Reset] E2E mode - skipping Firebase call');
    return;
  }

  await sendPasswordResetEmail(auth, cleanEmail);
};
