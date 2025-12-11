import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { signInWithGoogle } from "@/lib/firebase";
import { Chrome } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getDashboardRoute } from "@/lib/roles";

interface GoogleAuthButtonProps {
  mode: "signin" | "signup";
  onSuccess?: () => void;
}

export default function GoogleAuthButton({ mode, onSuccess }: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    
    try {
      const firebaseUser = await signInWithGoogle();
      
      if (!firebaseUser) {
        setIsLoading(false);
        return; // Popup closed or redirect happened
      }
      
      const email = firebaseUser.email;
      const googleId = firebaseUser.uid;
      
      if (!email) {
        throw new Error("No email provided by Google");
      }

      // Get Firebase token for authentication
      const token = await firebaseUser.getIdToken();

      // 1. Try to register (idempotent - ignores if exists)
      try {
        const registerRes = await fetch('/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            email,
            name: firebaseUser.displayName || email.split('@')[0],
            password: '', // Passwordless/OAuth
          })
        });
        
        // Only throw if it's not a 409 (user already exists) or 201 (created)
        if (!registerRes.ok && registerRes.status !== 409) {
          const errorData = await registerRes.json().catch(() => ({}));
          throw new Error(errorData.message || 'Registration failed');
        }
      } catch (e: any) {
        // If it's a 409 (user already exists), that's fine - continue to login
        // Otherwise, log the error but continue - the login endpoint will create the user if needed
        if (e.message && !e.message.includes('already exists') && !e.message.includes('409')) {
          console.warn('Registration attempt failed, continuing with login:', e.message);
        }
      }

      // 2. Login to establish server session using Firebase token
      const loginRes = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!loginRes.ok) {
        const errorData = await loginRes.json().catch(() => ({}));
        throw new Error(errorData.message || 'Login failed');
      }
      
      const userData = await loginRes.json();
      
      // Fetch full user profile from /api/me to get all user data
      const profileRes = await fetch('/api/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      let fullUserData = userData;
      if (profileRes.ok) {
        fullUserData = await profileRes.json();
      }
      
      login({
        id: fullUserData.id,
        email: fullUserData.email,
        password: '',
        roles: Array.isArray(fullUserData.roles) ? fullUserData.roles : [fullUserData.role || 'professional'],
        currentRole: fullUserData.currentRole || fullUserData.role || 'professional',
        provider: 'google',
        googleId,
        createdAt: fullUserData.createdAt ? new Date(fullUserData.createdAt) : new Date(),
        updatedAt: fullUserData.updatedAt ? new Date(fullUserData.updatedAt) : new Date(),
        displayName: fullUserData.displayName || fullUserData.name || firebaseUser.displayName || 'Google User',
        profileImage: fullUserData.profileImage || fullUserData.avatarUrl || firebaseUser.photoURL || '',
        isOnboarded: fullUserData.isOnboarded ?? false,
        uid: firebaseUser.uid,
      });
      
      toast({
        title: "Welcome!",
        description: "Successfully signed in with Google!",
      });

      if (onSuccess) {
        onSuccess();
      } else {
        // Role-based redirection: check user's current role and onboarding status
        if (userData.isOnboarded === false) {
          // User needs to complete onboarding
          navigate('/onboarding', { replace: true });
        } else if (userData.currentRole && userData.currentRole !== 'client') {
          // User has a role - redirect to their dashboard
          const dashboardRoute = getDashboardRoute(userData.currentRole);
          navigate(dashboardRoute, { replace: true });
        } else {
          // User is onboarded but has no role or is a client - go to role selection
          navigate('/role-selection', { replace: true });
        }
      }
      
    } catch (error: any) {
      console.error("Google auth error:", error);
      
      // Check for specific error codes
      if (error.code === 'auth/popup-blocked') {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for this site to sign in with Google.",
          variant: "destructive",
        });
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
