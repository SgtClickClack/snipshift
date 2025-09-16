import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';

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
        
        // CRITICAL: Verify state parameter to prevent CSRF attacks
        const storedState = sessionStorage.getItem('oauth_state');
        if (!storedState || state !== storedState) {
          throw new Error('Invalid state parameter - possible CSRF attack');
        }

        // Retrieve PKCE verifier for secure token exchange
        const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
        if (!codeVerifier) {
          throw new Error('No PKCE code verifier found - session may have expired');
        }

        console.log('✅ State verified successfully');
        
        // Exchange code with server using PKCE, which sets session and returns user
        const res = await apiRequest('POST', '/api/oauth/google/exchange', {
          code,
          redirectUri: window.location.origin + '/oauth/callback',
          codeVerifier, // Include PKCE verifier for secure exchange
        });

        // Clear sensitive data from storage after successful exchange
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_code_verifier');
        const userData = await res.json();
        console.log('🔧 Logging in user:', userData);
        login({
          id: userData.id,
          email: userData.email,
          password: '',
          roles: userData.roles || [],
          currentRole: userData.currentRole || null,
          provider: 'google',
          googleId: userData.googleId || undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
          displayName: userData.displayName || 'Google User',
          profileImage: userData.profileImage || '',
        });
        
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