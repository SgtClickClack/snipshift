import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * PopupGuard — Prevents our SPA from rendering inside Google Auth popups
 *
 * When Firebase's signInWithPopup flow fails to close the popup (due to proxy
 * failure, COOP header breaking window.opener, or authDomain misconfiguration),
 * the popup can load our full SPA. This guard detects that state and renders
 * minimal recovery UI instead, then auto-closes the popup.
 *
 * v1.1.26: Three critical fixes:
 *  1. Uses useLocation() so route changes (e.g. /__/auth/ → /login) trigger re-render
 *  2. Detects popup via localStorage signal (set by auth.ts before signInWithPopup)
 *     as fallback when COOP breaks window.opener after Google cross-origin redirect
 *  3. Firebase's `/__/auth/*` paths are the only legitimate popup destinations
 */

/** Key used by auth.ts to signal an active popup auth flow */
export const POPUP_AUTH_SIGNAL_KEY = 'hospogo_popup_auth_pending';

/**
 * Detect whether this window is a popup opened for auth.
 * Primary: window.opener (works when COOP doesn't break the reference)
 * Fallback: localStorage signal + small window heuristic (for when COOP
 *   breaks window.opener after Google cross-origin redirect)
 */
function detectPopupContext(): boolean {
  if (typeof window === 'undefined') return false;

  // Primary: window.opener exists (same-origin popup that hasn't navigated cross-origin)
  if (window.opener) return true;

  // Fallback: auth.ts sets a localStorage signal before signInWithPopup.
  // If that signal exists AND this window has popup characteristics (short
  // history, small size), it's almost certainly the auth popup.
  try {
    const signal = localStorage.getItem(POPUP_AUTH_SIGNAL_KEY);
    if (signal) {
      const signalAge = Date.now() - Number(signal);
      // Signal is fresh (< 2 minutes) AND window looks like a popup
      const isFreshSignal = signalAge > 0 && signalAge < 120_000;
      const isSmallWindow = window.innerWidth < 800 && window.innerHeight < 800;
      const isShortHistory = window.history.length <= 3;
      if (isFreshSignal && isSmallWindow && isShortHistory) return true;
    }
  } catch {
    // localStorage may be blocked
  }

  return false;
}

export function PopupGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isPopup = detectPopupContext();
  const isAuthHandlerPath = location.pathname.startsWith('/__/auth/');
  const isWrongPopupPath = isPopup && !isAuthHandlerPath;

  useEffect(() => {
    if (!isWrongPopupPath) return;
    const t = setTimeout(() => {
      try {
        window.close();
      } catch {
        // Some browsers restrict window.close() — ignore
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [isWrongPopupPath]);

  if (isWrongPopupPath) {
    return (
      <div
        className="fixed inset-0 z-[10001] flex flex-col items-center justify-center bg-background min-w-[400px]"
        data-testid="popup-guard-recovery"
      >
        <div className="text-center space-y-4 px-6">
          <div className="h-12 w-12 rounded-full bg-primary/20 animate-pulse mx-auto" />
          <h2 className="text-lg font-medium text-foreground">Completing sign-in…</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            This window will close automatically. If it doesn&apos;t, close it manually and try again.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
