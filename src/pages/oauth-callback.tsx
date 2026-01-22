import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * Safe landing page for Google auth redirects.
 *
 * Important:
 * - We do NOT implement a manual Google OAuth code exchange here.
 * - Firebase redirect completion is handled centrally in `AuthProvider` via `getRedirectResult()`.
 * - This route exists only to give the browser a stable place to land while that happens, then
 *   forward the user into the normal app redirect flow.
 * 
 * Race Condition Fix:
 * - We now wait for BOTH isAuthReady AND user profile verification before redirecting
 * - This prevents the onboarding page from crashing due to missing user data
 */
export function OAuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasUser, hasFirebaseUser, isLoading } = useAuth();
  const [statusMessage, setStatusMessage] = useState('Completing sign-in…');

  // Prevent double execution in React Strict Mode
  const hasProcessed = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    // Give Firebase redirect processing + profile handshake a moment to complete.
    // Extended timeout to account for database user record verification
    timeoutRef.current = window.setTimeout(() => {
      // If we still aren't authenticated after the grace period, send to login.
      // (This is also the desired behavior if a user hits this route directly.)
      if (!hasRedirected.current) {
        toast({
          title: 'Authentication pending',
          description: 'Please sign in again to continue.',
          variant: 'destructive',
        });
        navigate('/login', { replace: true });
      }
    }, 10000); // Extended from 6s to 10s to allow for database verification

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update status message based on auth state
  useEffect(() => {
    if (isLoading) {
      setStatusMessage('Completing sign-in…');
    } else if (hasFirebaseUser && !hasUser) {
      setStatusMessage('Verifying your account…');
    } else if (hasUser) {
      setStatusMessage('Redirecting to your dashboard…');
    }
  }, [isLoading, hasFirebaseUser, hasUser]);

  useEffect(() => {
    if (isLoading) return; // Wait for loading to complete
    if (hasRedirected.current) return;

    if (hasUser) {
      // User is authenticated AND we have their profile data
      // Safe to redirect now
      hasRedirected.current = true;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      navigate('/dashboard', { replace: true });
      return;
    }
    
    // If auth is ready but no user after loading completes, 
    // the user might need to complete onboarding
    // AuthContext will handle the redirect to /onboarding if needed
  }, [hasUser, isLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-medium text-foreground">{statusMessage}</h2>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Please wait while we finish your authentication.
          </p>
        </div>
        {/* Progress indicator */}
        <div className="flex justify-center gap-1.5 pt-2">
          <div className={`h-1.5 w-8 rounded-full transition-colors duration-300 ${!isLoading ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`h-1.5 w-8 rounded-full transition-colors duration-300 ${hasFirebaseUser ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`h-1.5 w-8 rounded-full transition-colors duration-300 ${hasUser ? 'bg-primary' : 'bg-muted'}`} />
        </div>
      </div>
    </div>
  );
}