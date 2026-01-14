import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { signInWithGoogleDevAware } from "@/lib/auth";
import { Chrome } from "lucide-react";
import { logger } from "@/lib/logger";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface GoogleAuthButtonProps {
  mode: "signin" | "signup";
  onSuccess?: () => void;
}

export default function GoogleAuthButton({ mode, onSuccess }: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  // Prevent double-click/double-fire in Strict Mode
  const isAuthInProgress = useRef(false);

  /**
   * Ensures the Google user exists in our database.
   * This is called BEFORE AuthContext fetches the profile to avoid race conditions.
   */
  const ensureUserInDatabase = async (firebaseUser: any) => {
    const email = firebaseUser.email;
    if (!email) {
      throw new Error("No email provided by Google");
    }

    const token = await firebaseUser.getIdToken();

    // Register user in our database (idempotent - 409 if exists is OK)
    const registerRes = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email,
        name: firebaseUser.displayName || email.split("@")[0],
        password: "", // Passwordless/OAuth
      }),
    });

    // 201 = created, 409 = already exists - both are fine
    if (!registerRes.ok && registerRes.status !== 409) {
      const errorData = await registerRes.json().catch(() => ({} as any));

      // If the database is temporarily unavailable (e.g. provider compute quota exceeded),
      // show a clear, actionable message instead of a generic "internal server error".
      if (registerRes.status === 503 && errorData?.code === "DB_QUOTA_EXCEEDED") {
        throw new Error(
          "Google sign-in succeeded, but the database is temporarily unavailable. Please try again in a few minutes."
        );
      }

      throw new Error(errorData?.message || "Failed to create user account");
    }
    
    logger.debug("GoogleAuthButton", "User ensured in database", { email });
  };

  const handleGoogleAuth = async () => {
    // GATEKEEPER: Prevent double-clicks and concurrent auth attempts
    if (isAuthInProgress.current || isLoading) {
      logger.debug('GoogleAuthButton', 'Auth already in progress, ignoring click');
      return;
    }
    
    // Lock immediately before any async operations
    isAuthInProgress.current = true;
    setIsLoading(true);
    
    // Clear any stale auth-related localStorage before starting new auth
    try {
      localStorage.removeItem('onboarding_step');
      localStorage.removeItem('redirect_url');
      localStorage.removeItem('pending_redirect');
    } catch (e) {
      // Ignore storage errors
    }
    
    try {
      // Step 1: Firebase authentication (popup flow - COOP warning is expected but auth works)
      const firebaseUser = await signInWithGoogleDevAware();
      
      if (!firebaseUser) {
        // Popup was closed without completing auth
        logger.debug('GoogleAuthButton', 'No user returned from Google auth');
        return;
      }
      
      // Step 2: Ensure user exists in our database BEFORE AuthContext tries to fetch profile
      // This prevents race conditions where /api/me fails because user doesn't exist yet
      await ensureUserInDatabase(firebaseUser);
      
      // Add cooldown to allow DB replication if using a distributed database
      // This ensures the user record is available when /api/me is called
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 3: Show success toast with HospoGo brand neon green styling
      toast({
        title: "Welcome!",
        description: "Successfully signed in with Google!",
        variant: "success",
      });
      
      // Step 4: Refresh user profile and redirect
      // This triggers AuthContext to fetch the profile and determine the correct redirect
      try {
        await refreshUser();
      } catch (refreshError) {
        logger.debug('GoogleAuthButton', 'refreshUser failed, navigating to onboarding', refreshError);
      }
      
      // NEW: Wait for AuthContext to process before checking redirect
      // This prevents race conditions where we check redirect before AuthContext has finished
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 5: Force redirect to onboarding as fallback (AuthContext should handle this, 
      // but we add a fallback to ensure navigation happens)
      // Give AuthContext a moment to process, then navigate if still on auth pages
      setTimeout(() => {
        const currentPath = window.location.pathname;
        if (currentPath === '/login' || currentPath === '/signup') {
          logger.debug('GoogleAuthButton', 'Fallback redirect to onboarding');
          navigate('/onboarding', { replace: true });
        }
      }, 500);
      
      // Call onSuccess if provided (for custom handling)
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error: any) {
      const errorCode = error?.code ? String(error.code) : 'unknown';
      const errorMessage = error?.message ? String(error.message) : 'Unknown error';
      
      // Check for specific error codes
      if (errorCode === 'auth/popup-blocked') {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for this site to sign in with Google.",
          variant: "destructive",
        });
      } else if (errorCode === 'auth/popup-timeout' || errorMessage.includes('popup-timeout')) {
        // Popup timed out - likely COOP blocking communication
        console.warn('[GoogleAuthButton] Popup timed out - switching to redirect flow');
        toast({
          title: "Switching to redirect",
          description: "Popup timed out. Redirecting to complete sign-in...",
          variant: "default",
        });
        // The redirect should have been triggered in firebase.ts, but we'll wait a moment
        // and check if we need to manually trigger it
        setTimeout(() => {
          if (window.location.pathname === '/login' || window.location.pathname === '/signup') {
            // Redirect flow should have started, but if we're still here, something went wrong
            console.error('[GoogleAuthButton] Redirect flow did not start after timeout');
          }
        }, 1000);
      } else if (errorCode === 'auth/popup-closed-by-user') {
        // User closed popup - silently ignore, no toast needed
        logger.debug('GoogleAuthButton', 'User closed Google auth popup');
      } else if (errorCode === 'auth/unauthorized-domain') {
        toast({
          title: "Configuration Error",
          description: "This domain is not authorized for Google Auth. Please contact support.",
          variant: "destructive",
        });
        console.error('[GoogleAuthButton] Unauthorized domain. Check:');
        console.error('  1. Firebase Console > Authentication > Settings > Authorized domains');
        console.error('  2. Google Cloud Console > APIs & Services > Credentials > Authorized JavaScript origins');
        console.error('  3. Current domain:', window.location.hostname);
      } else {
        // Log actual authentication errors (not user-cancelled)
        console.error('[GoogleAuthButton] Google sign-in failed:', {
          code: errorCode,
          message: errorMessage,
          error,
        });
        toast({
          title: "Authentication failed",
          description: errorMessage || "There was an error signing in with Google.",
          variant: "destructive",
        });
      }
    } finally {
      // Always reset state
      isAuthInProgress.current = false;
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleGoogleAuth}
      disabled={isLoading}
      data-testid="button-google-auth"
    >
      <Chrome className="w-5 h-5 mr-2 text-blue-500" />
      {isLoading 
        ? "Connecting..." 
        : `${mode === "signin" ? "Sign in" : "Sign up"} with Google`
      }
    </Button>
  );
}
