import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { signInWithGoogle } from "@/lib/firebase";
import { Chrome } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

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
      console.log('🔧 Starting Google OAuth with Firebase');
      const firebaseUser = await signInWithGoogle();
      
      if (!firebaseUser) {
        setIsLoading(false);
        return; // Popup closed or redirect happened
      }

      console.log('✅ Firebase Auth Success:', firebaseUser.email);
      
      const email = firebaseUser.email;
      const googleId = firebaseUser.uid;
      
      if (!email) {
        throw new Error("No email provided by Google");
      }

      // 1. Try to register (idempotent - ignores if exists)
      try {
        await apiRequest('POST', '/api/register', {
          email,
          password: '', // Passwordless/OAuth
          provider: 'google',
          googleId,
          displayName: firebaseUser.displayName,
          profileImage: firebaseUser.photoURL
        });
      } catch (e: any) {
        // Ignore 400 (already exists)
        // We can't easily distinguish 400 from other errors without parsing message, 
        // but typically duplicate email is the cause here.
        console.log('Registration check:', e);
      }

      // 2. Login to establish server session
      const res = await apiRequest('POST', '/api/login', { email, googleId });
      const userData = await res.json();
      
      console.log('🔧 Logging in user:', userData);
      login({
        id: userData.id,
        email: userData.email,
        password: '',
        roles: userData.roles || [],
        currentRole: userData.currentRole || null,
        provider: 'google',
        googleId,
        createdAt: new Date(userData.createdAt),
        updatedAt: new Date(userData.updatedAt),
        displayName: userData.displayName || firebaseUser.displayName || 'Google User',
        profileImage: userData.profileImage || firebaseUser.photoURL || '',
      });
      
      toast({
        title: "Welcome!",
        description: "Successfully signed in with Google!",
      });

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/role-selection');
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
