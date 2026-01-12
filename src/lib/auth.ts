// Temporary compatibility shim: prefer useAuth from contexts/AuthContext
import type { User } from '@shared/firebase-schema';

let currentUser: User | null = null;

/**
 * Clean-break guard: if a prior auth attempt failed with a "400-style" error (often indicative of
 * a bad/stale internal auth state), force a Firebase sign-out *before the next attempt*.
 */
let shouldResetFirebaseSessionBeforeNextAttempt = false;

function isHttp400StyleAuthFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const anyErr = error as any;

  // Common shapes we might see in thrown errors.
  const status = anyErr?.status ?? anyErr?.response?.status ?? anyErr?.httpStatus;
  if (status === 400) return true;

  const message = typeof anyErr?.message === 'string' ? anyErr.message : '';
  // Fallback heuristic when status isn't plumbed through.
  if (message.includes(' 400 ') || message.includes('400')) return true;

  return false;
}

async function maybeResetFirebaseSession() {
  if (!shouldResetFirebaseSessionBeforeNextAttempt) return;
  shouldResetFirebaseSessionBeforeNextAttempt = false;

  try {
    const { auth } = await import('./firebase');
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
  } catch (e) {
    // Best-effort reset; never block sign-in attempts if reset fails.
    console.warn('[Auth] Failed to reset Firebase session (best-effort):', e);
  }

  // Also clear known redirect/session artifacts that can cause "session ghosts".
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem('firebase:previous_external_idp_params');
    } catch {
      // ignore
    }
  }
}

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
 * - Uses popup with resilient handling for COOP (Cross-Origin-Opener-Policy) issues
 * - COOP only affects window.closed detection, not the actual auth result
 * - Auth completes via postMessage/iframe even with COOP blocking
 */
export async function signInWithGoogleLocalDevPopup() {
  await maybeResetFirebaseSession();
  const { auth } = await import('./firebase');
  const googleProvider = await getGoogleProvider();
  const { signInWithPopup, setPersistence, browserLocalPersistence } = await import('firebase/auth');

  try {
    await setPersistence(auth, browserLocalPersistence);
    // Popup flow - COOP warning is expected but auth still works via postMessage
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    const code = (error as any)?.code;
    
    // Don't log user-cancelled popups - this is expected behavior
    if (code !== 'auth/popup-closed-by-user') {
      console.error('[Auth] Google popup sign-in error:', error);
    }

    if (isHttp400StyleAuthFailure(error)) {
      shouldResetFirebaseSessionBeforeNextAttempt = true;
      console.warn('[Auth] Marking Firebase session for reset before next attempt (400-style auth failure).');
    }
    throw error;
  }
}

/**
 * Environment-aware Google sign-in:
 * - localhost => popup flow (COOP warnings are expected but auth still works)
 * - everything else => use the existing implementation (popup with redirect fallback)
 */
export async function signInWithGoogleDevAware() {
  await maybeResetFirebaseSession();
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (isLocalhost) {
    // Use popup flow - COOP warning is expected but auth completes via postMessage
    return await signInWithGoogleLocalDevPopup();
  }

  const { signInWithGoogle } = await import('./firebase');
  try {
    return await signInWithGoogle();
  } catch (error) {
    if (isHttp400StyleAuthFailure(error)) {
      shouldResetFirebaseSessionBeforeNextAttempt = true;
      console.warn('[Auth] Marking Firebase session for reset before next attempt (400-style auth failure).');
    }
    throw error;
  }
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


