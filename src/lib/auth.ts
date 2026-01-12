// Temporary compatibility shim: prefer useAuth from contexts/AuthContext
import type { User } from '@shared/firebase-schema';

let currentUser: User | null = null;

/**
 * Lazily loads and returns the Firebase Google provider with hardened parameters.
 *
 * We set `prompt: 'select_account'` to force the account picker and reduce the chance
 * of Google silently reusing stale/broken legacy sessions.
 */
export async function getGoogleProvider() {
  const { googleProvider } = await import('./firebase');
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  return googleProvider;
}

/**
 * Local-dev focused Google sign-in:
 * - Uses popup only (avoids redirect_uri_mismatch headaches on localhost)
 * - Logs the exact error object for debugging
 */
export async function signInWithGoogleLocalDevPopup() {
  const { auth } = await import('./firebase');
  const googleProvider = await getGoogleProvider();
  const { signInWithPopup, setPersistence, browserLocalPersistence } = await import('firebase/auth');

  try {
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    // Log the exact error object (requested)
    console.error('[Auth] Google popup sign-in error (exact object):', error);
    throw error;
  }
}

/**
 * Environment-aware Google sign-in:
 * - localhost => popup-only
 * - everything else => use the existing implementation (popup with redirect fallback)
 */
export async function signInWithGoogleDevAware() {
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (isLocalhost) {
    return await signInWithGoogleLocalDevPopup();
  }

  const { signInWithGoogle } = await import('./firebase');
  return await signInWithGoogle();
}

export const authService = {
  async initialize() {},
  login(user: User) {
    currentUser = user;
  },
  async logout() {
    currentUser = null;
  },
  getCurrentUser(): User | null {
    return currentUser;
  },
  isAuthenticated(): boolean {
    return !!currentUser;
  },
};


