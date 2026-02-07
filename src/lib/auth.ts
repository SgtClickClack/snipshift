// Temporary compatibility shim: prefer useAuth from contexts/AuthContext
import type { User } from '@shared/firebase-schema';
import { POPUP_AUTH_SIGNAL_KEY } from '@/components/auth/PopupGuard';

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
 * Google sign-in with same-origin popup flow:
 * - Uses popup with hospogo.com authDomain (same-origin with COOP policy)
 * - Falls back to redirect flow if popup is blocked or fails
 * - COOP same-origin-allow-popups allows seamless popup communication
 * - Auth completes cleanly without cross-origin restrictions
 */
export async function signInWithGoogleLocalDevPopup() {
  await maybeResetFirebaseSession();
  const { auth } = await import('./firebase');
  const googleProvider = await getGoogleProvider();
  const { signInWithPopup, setPersistence, browserLocalPersistence } = await import('firebase/auth');

  try {
    await setPersistence(auth, browserLocalPersistence);

    // Signal PopupGuard that a popup auth flow is starting.
    // PopupGuard uses this as a fallback to detect the popup window when
    // COOP breaks window.opener after the Google cross-origin redirect.
    try { localStorage.setItem(POPUP_AUTH_SIGNAL_KEY, Date.now().toString()); } catch { /* storage blocked */ }

    // Popup flow with same-origin authDomain (hospogo.com) — no cross-origin issues.
    // onAuthStateChanged in AuthContext fires immediately on success and handles hydration + navigation.
    const result = await signInWithPopup(auth, googleProvider);

    // Clear popup signal on success
    try { localStorage.removeItem(POPUP_AUTH_SIGNAL_KEY); } catch { /* storage blocked */ }

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

    // Clear popup signal on any terminal error (not redirect fallback — that still uses popup)
    if (code !== 'auth/popup-blocked') {
      try { localStorage.removeItem(POPUP_AUTH_SIGNAL_KEY); } catch { /* storage blocked */ }
    }

    if (isHttp400StyleAuthFailure(error)) {
      shouldResetFirebaseSessionBeforeNextAttempt = true;
      console.warn('[Auth] Marking Firebase session for reset before next attempt (400-style auth failure).');
    }
    throw error;
  }
}

/**
 * Force popup-based Google sign-in to bypass Chrome's bounce tracking mitigations.
 * Popup flow keeps the user on the primary domain and provides a direct identity
 * signal that Chrome cannot delete, eliminating cross-domain redirect issues.
 */
export async function signInWithGoogleDevAware() {
  await maybeResetFirebaseSession();

  // Always use popup flow to bypass Chrome bounce tracking mitigations
  // This eliminates cross-domain redirects that Chrome may block
  try {
    const user = await signInWithGoogleLocalDevPopup();
    
    // Popup flow will trigger React state updates and navigation via AuthContext
    // and the calling components (e.g. GoogleAuthButton). Avoid hard reloads here
    // to prevent redirect loops and preserve SPA state.
    if (user && typeof window !== 'undefined') {
      console.debug('[Auth] Popup auth complete, navigation handled by GoogleAuthButton → /onboarding');
      // Intentionally no hard redirect here; navigation is handled upstream.
    }
    
    return user;
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


