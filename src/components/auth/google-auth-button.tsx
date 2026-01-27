import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { signInWithGoogleDevAware } from "@/lib/auth";
import { Chrome } from "lucide-react";
import { logger } from "@/lib/logger";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { trackSignup, trackLogin } from "@/lib/analytics";

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

    // 200 = existing/updated, 201 = created - both are success; 409 = legacy already-exists
    if (!registerRes.ok && registerRes.status !== 409) {
      const errorData = await registerRes.json().catch(() => ({} as any));

      // If the database is temporarily unavailable (e.g. provider compute quota exceeded),
      // show a clear, actionable message instead of a generic "internal server error".
      if (registerRes.status === 503 && errorData?.code === "DB_QUOTA_EXCEEDED") {
        throw new Error(
          "Google sign-in succeeded, but the database is temporarily unavailable. Please try again in a few minutes."
        );
      }

      // For 500 errors, check if it's a database schema issue
      if (registerRes.status === 500) {
        const errorMessage = errorData?.message || errorData?.error || "Failed to create user account";
        const errorDetails = errorData?.details || "";
        
        // Check for common database schema errors
        if (errorMessage.includes("column") && errorMessage.includes("does not exist")) {
          throw new Error(
            "Database schema is out of sync. Please contact support or try again after the database is updated."
          );
        }
        
        // Log full error details for debugging
        console.error('[GoogleAuthButton] Registration failed:', {
          status: registerRes.status,
          message: errorMessage,
          details: errorDetails,
          error: errorData
        });
        
        throw new Error(errorMessage);
      }

      throw new Error(errorData?.message || errorData?.error || "Failed to create user account");
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
      // Step 1: Firebase authentication via popup flow
      // Popup flow bypasses Chrome's bounce tracking mitigations by keeping the user
      // on the primary domain and providing a direct identity signal
      const firebaseUser = await signInWithGoogleDevAware();
      
      // Popup flow always returns a user (or throws an error)
      // If null is returned, it means popup was blocked and fallback redirect was used
      if (!firebaseUser) {
        // Fallback redirect flow: user will be redirected away
        // The loading state will persist until redirect happens
        logger.debug('GoogleAuthButton', 'Popup blocked, fallback redirect initiated');
        return; // Don't reset state - redirect is happening
      }
      
      // Popup flow: Handle the user immediately
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
      
      // NON-BLOCKING Analytics: Track signup/login event (never await - redirect happens immediately)
      // This call is wrapped in try-catch internally and will never block the auth flow
      try {
        // Determine if this is signup or login based on whether user already existed
        // For simplicity, we'll track as signup if we just created the user, login otherwise
        // The ensureUserInDatabase function returns 201 for new users, 409 for existing
        // Since we can't easily check that here, we'll use the mode prop if available
        // For now, we'll track based on the component's mode prop
        if (mode === 'signup') {
          trackSignup('google');
        } else {
          trackLogin('google');
        }
      } catch (error) {
        // Silently ignore analytics errors - authentication should never fail due to tracking
        logger.debug('GoogleAuthButton', 'Analytics tracking failed (non-blocking):', error);
      }
      
      // Step 4: Refresh user profile to trigger AuthContext hydration
      // This ensures onAuthStateChanged fires and processes the user
      try {
        await refreshUser();
      } catch (refreshError) {
        logger.debug('GoogleAuthButton', 'refreshUser failed, navigating to dashboard', refreshError);
      }
      
      // Step 5: Immediate navigation to dashboard after popup success
      // This forces navigation inside the popup promise resolution, bypassing bounce tracking
      // AuthContext's onAuthStateChanged will handle the final redirect based on onboarding status
      logger.debug('GoogleAuthButton', 'Popup auth successful, navigating to dashboard');
      navigate('/dashboard', { replace: true });
      
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
        console.error('  3. Google Cloud Console > Authorized redirect URIs must include: https://hospogo.com/__/auth/handler');
        console.error('  4. Current domain:', window.location.hostname);
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
      // Reset state
      // Note: For redirect flow, the page will navigate away before this executes,
      // so state will be reset when the page reloads after redirect anyway
      isAuthInProgress.current = false;
      setIsLoading(false);
    }
  };

  return (
    <Button
      id="google-auth-button"
      name="google-auth-button"
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
