import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Safe landing page for Google auth redirects.
 *
 * Important:
 * - We do NOT implement a manual Google OAuth code exchange here.
 * - Firebase redirect completion is handled centrally in `AuthProvider` via `getRedirectResult()`.
 * - This route exists only to give the browser a stable place to land while that happens, then
 *   forward the user into the normal app redirect flow.
 */
export function OAuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthReady, isAuthenticated, user, triggerPostAuthRedirect } = useAuth();

  // Prevent double execution in React Strict Mode
  const hasProcessed = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    // Give Firebase redirect processing + profile handshake a moment to complete.
    timeoutRef.current = window.setTimeout(() => {
      // If we still aren't authenticated after the grace period, send to login.
      // (This is also the desired behavior if a user hits this route directly.)
      toast({
        title: 'Authentication pending',
        description: 'Please sign in again to continue.',
        variant: 'destructive',
      });
      navigate('/login', { replace: true });
    }, 6000);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;

    if (isAuthenticated && user) {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      // Centralize post-auth routing in AuthContext (role-based clean-break redirects, etc.).
      triggerPostAuthRedirect();
      return;
    }
  }, [isAuthReady, isAuthenticated, user, triggerPostAuthRedirect]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h2 className="text-lg font-medium text-foreground">Completing sign-in…</h2>
        <p className="text-muted-foreground mt-2">Please wait while we finish your authentication.</p>
      </div>
    </div>
  );
}