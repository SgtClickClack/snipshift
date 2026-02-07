import { useEffect, type ReactNode } from 'react';

/**
 * PopupGuard — Fixes shrunk UI in Google Auth popups
 *
 * When Firebase's signInWithPopup redirects the popup to our app (e.g. /signup) instead of
 * closing—due to proxy failure, authDomain misconfiguration, or continueUrl—the popup would
 * load our full SPA with mobile-first layout in a tiny window, causing a "shrunk" signup screen.
 *
 * This guard detects that state (popup + non-auth route) and renders a minimal "Completing
 * sign-in..." UI instead, then closes the popup. The parent window remains on the auth
 * trigger page so the user can retry.
 *
 * v1.1.25: Catches ALL non-auth paths in popup context, not just a hardcoded list.
 * Firebase's `/__/auth/*` paths are the only legitimate popup destinations.
 */
export function PopupGuard({ children }: { children: ReactNode }) {
  const isPopup = typeof window !== 'undefined' && !!window.opener;
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  const isAuthHandlerPath = path.startsWith('/__/auth/');
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
