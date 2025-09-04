import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardRoute } from '@/lib/roles';
import { useNavigate } from 'react-router-dom';

interface GoogleUserData {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  buttonText?: string;
}

export function GoogleSignInButton({ onSuccess, buttonText = "Sign in with Google" }: GoogleSignInButtonProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google');
      }

      // Decode the JWT token to get user data
      const decoded = jwtDecode<GoogleUserData>(credentialResponse.credential);
      
      // Simulate backend API call for Google authentication
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          googleId: decoded.sub,
          email: decoded.email,
          name: decoded.name,
          profilePicture: decoded.picture,
        }),
      });

      if (!response.ok) {
        throw new Error('Google authentication failed');
      }

      const userData = await response.json();
      
      // Update auth state
      login(userData as any);
      
      toast({
        title: "Welcome back!",
        description: `Successfully signed in with Google as ${userData.name}`,
      });

      // Navigate based on user role
      const dashboardPath = getDashboardRoute((userData as any).role);
      navigate(dashboardPath);
      
      onSuccess?.();
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast({
        title: "Sign-in failed",
        description: "There was an error signing in with Google. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGoogleError = () => {
    toast({
      title: "Sign-in cancelled",
      description: "Google sign-in was cancelled or failed.",
      variant: "destructive",
    });
  };

  

  return (
    <div className="w-full">
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        text="signin_with"
        size="large"
        width="100%"
        logo_alignment="left"
        data-testid="google-signin-button"
      />
    </div>
  );
}