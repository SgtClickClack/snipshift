import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { handleGoogleRedirectResult, signInWithGoogle } from "@/lib/firebase";
import { Chrome } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getDashboardRoute } from "@/lib/roles";
import { logger } from "@/lib/logger";

interface GoogleAuthButtonProps {
  mode: "signin" | "signup";
  onSuccess?: () => void;
}

export default function GoogleAuthButton({ mode, onSuccess }: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { login } = useAuth();
  const navigate = useNavigate();
  const hasHandledRedirect = useRef(false);
  // Prevent double-click/double-fire in Strict Mode
  const isAuthInProgress = useRef(false);

  const completeGoogleAuth = async (firebaseUser: any) => {
    const email = firebaseUser.email;
    const googleId = firebaseUser.uid;

    if (!email) {
      throw new Error("No email provided by Google");
    }

    // Get Firebase token for authentication
    const token = await firebaseUser.getIdToken();

    // 1. Try to register (idempotent - ignore if exists)
    try {
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

      // Only throw if it's not a 409 (user already exists) or 201 (created)
      if (!registerRes.ok && registerRes.status !== 409) {
        const errorData = await registerRes.json().catch(() => ({}));
        throw new Error(errorData.message || "Registration failed");
      }
    } catch (e: any) {
      // If it's a 409 (user already exists), that's fine - continue to login
      // Otherwise, log the error but continue - the login endpoint can create the user if needed
      if (e?.message && !e.message.includes("already exists") && !e.message.includes("409")) {
        logger.debug("GoogleAuthButton", "Registration attempt failed, continuing with login:", e.message);
      }
    }

    // 2. Login to establish server session using Firebase token
    const loginRes = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!loginRes.ok) {
      const errorData = await loginRes.json().catch(() => ({}));
      throw new Error(errorData.message || "Login failed");
    }

    const userData = await loginRes.json();

    // Fetch full user profile from /api/me to get all user data
    const profileRes = await fetch("/api/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    let fullUserData = userData;
    if (profileRes.ok) {
      fullUserData = await profileRes.json();
    }

    login({
      id: fullUserData.id,
      email: fullUserData.email,
      password: "",
      roles: Array.isArray(fullUserData.roles)
        ? fullUserData.roles
        : [fullUserData.role || "professional"],
      currentRole: fullUserData.currentRole || fullUserData.role || "professional",
      provider: "google",
      googleId,
      createdAt: fullUserData.createdAt ? new Date(fullUserData.createdAt) : new Date(),
      updatedAt: fullUserData.updatedAt ? new Date(fullUserData.updatedAt) : new Date(),
      displayName: fullUserData.displayName || fullUserData.name || firebaseUser.displayName || "Google User",
      profileImage: fullUserData.profileImage || fullUserData.avatarUrl || firebaseUser.photoURL || "",
      isOnboarded: fullUserData.isOnboarded ?? false,
      uid: firebaseUser.uid,
    });

    toast({
      title: "Welcome!",
      description: "Successfully signed in with Google!",
    });

    if (onSuccess) {
      onSuccess();
      return;
    }

    // Role-based redirection: check user's current role and onboarding status
    if (userData.isOnboarded === false) {
      navigate("/onboarding", { replace: true });
    } else if (userData.currentRole && userData.currentRole !== "client") {
      const dashboardRoute = getDashboardRoute(userData.currentRole);
      navigate(dashboardRoute, { replace: true });
    } else {
      navigate("/role-selection", { replace: true });
    }
  };

  // Handle popup-blocked redirect flow: Firebase completes auth after redirect,
  // but we still need to establish backend session + DB user.
  useEffect(() => {
    if (hasHandledRedirect.current) return;
    hasHandledRedirect.current = true;

    const run = async () => {
      // Check if auth is already in progress (e.g., from another button click)
      if (isAuthInProgress.current) {
        logger.debug('GoogleAuthButton', 'Auth already in progress, skipping redirect check');
        return;
      }
      
      try {
        // Don't set loading immediately - only if there's actually a redirect result
        const firebaseUser = await handleGoogleRedirectResult();
        if (!firebaseUser) return;
        
        // Now that we have a result, lock and set loading
        isAuthInProgress.current = true;
        setIsLoading(true);
        
        await completeGoogleAuth(firebaseUser);
      } catch (error: any) {
        // If there's no redirect result, Firebase returns null; avoid noisy errors.
        // Only toast on real failures.
        if (error?.code || error?.message) {
          toast({
            title: "Authentication failed",
            description: error.message || "There was an error signing in with Google.",
            variant: "destructive",
          });
        }
      } finally {
        isAuthInProgress.current = false;
        setIsLoading(false);
      }
    };

    run();
  }, [toast]); // navigate/login are stable enough; we only want this once per mount

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
      const firebaseUser = await signInWithGoogle();
      
      if (!firebaseUser) {
        // Popup closed or redirect happened - keep lock for redirect case
        // Unlock only if popup was closed (no redirect)
        isAuthInProgress.current = false;
        return;
      }
      await completeGoogleAuth(firebaseUser);
      
    } catch (error: any) {
      console.error("Google auth error:", error);
      
      // Check for specific error codes
      if (error.code === 'auth/popup-blocked') {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for this site to sign in with Google.",
          variant: "destructive",
        });
      } else if (error.code === 'auth/popup-closed-by-user') {
        // User closed popup - silently ignore, no toast needed
        logger.debug('GoogleAuthButton', 'User closed Google auth popup');
      } else if (error.code === 'auth/unauthorized-domain') {
        toast({
          title: "Configuration Error",
          description: "This domain is not authorized for Google Auth. Please contact support.",
          variant: "destructive",
        });
        console.error("Instruction for User: Please add this domain to Google Cloud Console > APIs & Services > Credentials > Authorized Javascript Origins");
      } else {
        toast({
          title: "Authentication failed",
          description: error.message || "There was an error signing in with Google.",
          variant: "destructive",
        });
      }
    } finally {
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
