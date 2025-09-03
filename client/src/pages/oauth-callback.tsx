import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export function OAuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        console.log('🔄 Processing OAuth callback');
        
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        console.log('✅ Authorization code received:', code.substring(0, 20) + '...');
        console.log('✅ State received:', state);
        
        // Create authenticated user from Google OAuth
        const googleUser = {
          id: `google_${Date.now()}`,
          email: 'user@gmail.com', // In production, this would come from token exchange
          password: '',
          role: 'client' as const, // Default role for new users
          provider: 'google' as const,
          googleId: `google_${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          displayName: 'Google User',
          profileImage: '',
        };

        console.log('🔧 Logging in user:', googleUser);
        login(googleUser);
        
        toast({
          title: "Welcome!",
          description: "Successfully signed in with Google! Choose your role to continue.",
        });

        console.log('🎯 Navigating to role selection');
        navigate('/role-selection');
        
      } catch (error) {
        console.error('❌ OAuth callback error:', error);
        toast({
          title: "Authentication failed",
          description: "There was an error processing your Google authentication. Please try again.",
          variant: "destructive",
        });
        navigate('/login');
      }
    };

    handleOAuthCallback();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h2 className="text-lg font-medium text-neutral-900">Processing your authentication...</h2>
        <p className="text-neutral-600 mt-2">Please wait while we complete your sign-in.</p>
      </div>
    </div>
  );
}