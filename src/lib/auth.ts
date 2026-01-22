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
  const { GoogleAuthProvider } = await import('firebase/auth');

  // Cache the provider instance so we don't recreate it on every call.
  const g = globalThis as unknown as { __hospogoGoogleProvider?: InstanceType<typeof GoogleAuthProvider> };
  if (!g.__hospogoGoogleProvider) {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({ prompt: 'select_account' });
    g.__hospogoGoogleProvider = provider;
  }

  return g.__hospogoGoogleProvider;
}

/**
 * Local-dev focused Google sign-in:
 * - Uses popup with resilient handling for COOP (Cross-Origin-Opener-Policy) issues
 * - Falls back to redirect flow if popup is blocked or fails
 * - COOP only affects window.closed detection, not the actual auth result
 * - Auth completes via postMessage/iframe even with COOP blocking
 */
export async function signInWithGoogleLocalDevPopup() {
  await maybeResetFirebaseSession();
  const { auth } = await import('./firebase');
  const googleProvider = await getGoogleProvider();
  const { signInWithPopup, signInWithRedirect, setPersistence, browserLocalPersistence } = await import('firebase/auth');

  try {
    await setPersistence(auth, browserLocalPersistence);
    // Popup flow - COOP warning is expected but auth still works via postMessage
    const result = await signInWithPopup(auth, googleProvider);
    
    // URL-PARAM BRIDGE: Redirect a lightweight popup to /auth/bridge with uid in query params.
    // This avoids storage partitioning issues by using same-origin routing + cookies.
    if (result?.user && typeof window !== 'undefined') {
      const bridgeUrl = new URL('/auth/bridge', window.location.origin);
      bridgeUrl.searchParams.set('uid', result.user.uid);

      try {
        const bridgeWindow = window.open(bridgeUrl.toString(), 'hospogo_auth_bridge', 'width=420,height=560');
        if (bridgeWindow) {
          bridgeWindow.focus();
        } else {
          console.warn('[Auth] Bridge popup was blocked; falling back to localStorage bridge.');
          localStorage.setItem(
            'hospogo_auth_bridge',
            JSON.stringify({ uid: result.user.uid, ts: Date.now() })
          );
        }
      } catch (bridgeError) {
        console.warn('[Auth] Failed to open bridge popup (non-critical):', bridgeError);
      }
    }
    
    return result.user;
  } catch (error) {
    const code = (error as any)?.code;
    
    // Fallback to redirect flow if popup is blocked or fails due to COOP policy
    // This handles cases where browsers block popups or COOP prevents communication
    if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user' || 
        (typeof window !== 'undefined' && code?.includes('popup'))) {
      console.warn('[Auth] Popup blocked or failed, falling back to redirect flow');
      try {
        const { signInWithRedirect } = await import('firebase/auth');
        await signInWithRedirect(auth, googleProvider);
        // Return null - redirect will happen and handleGoogleRedirectResult() will process it
        return null;
      } catch (redirectError) {
        console.error('[Auth] Redirect fallback also failed:', redirectError);
        throw redirectError;
      }
    }
    
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
 * - Use popup flow on localhost for dev convenience.
 * - Use redirect flow elsewhere to avoid COOP popup blocks.
 */
export async function signInWithGoogleDevAware() {
  await maybeResetFirebaseSession();

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  try {
    if (isLocalhost) {
      return await signInWithGoogleLocalDevPopup();
    }

    const { auth } = await import('./firebase');
    const googleProvider = await getGoogleProvider();
    const { signInWithRedirect, setPersistence, browserLocalPersistence } = await import('firebase/auth');

    await setPersistence(auth, browserLocalPersistence);
    await signInWithRedirect(auth, googleProvider);

    // Redirect flow: auth completion happens after navigation, so return null.
    return null;
  } catch (error) {
    if (isHttp400StyleAuthFailure(error)) {
      shouldResetFirebaseSessionBeforeNextAttempt = true;
      console.warn('[Auth] Marking Firebase session for reset before next attempt (400-style auth failure).');
    }
    throw error;
  }
}

export async function sendPasswordReset(email: string) {
  const cleanEmail = email.trim();

  if (import.meta.env.VITE_E2E === '1') {
    // Keep E2E deterministic (no outbound email).
    return;
  }

  const { auth } = await import('./firebase');
  const { sendPasswordResetEmail } = await import('firebase/auth');
  await sendPasswordResetEmail(auth, cleanEmail);
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


