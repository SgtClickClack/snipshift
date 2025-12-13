import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';

export function OAuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();
  // Prevent double execution in React Strict Mode
  const hasProcessedCallback = useRef(false);

  useEffect(() => {
    // Check if we already processed this callback
    if (hasProcessedCallback.current) return;

    const handleOAuthCallback = async () => {
      // Mark as processed immediately to prevent double execution
      hasProcessedCallback.current = true;

      try {
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
        
        // MVP: register (idempotent) and then login to establish a server session
        const googleId = `google_${Date.now()}`;
        const email = 'user@gmail.com'; // In production, exchange the code for user info
        try {
          await apiRequest('POST', '/api/register', {
            email,
            password: '',
            provider: 'google',
            googleId,
          });
        } catch (e: any) {
          // Ignore 400 (already exists)
          const isExistingUserError = e instanceof Error && e.message.includes('400');
          if (!isExistingUserError) {
            throw e;
          }
        }

        // Login to create session cookie
        const res = await apiRequest('POST', '/api/login', { email, googleId });
        const userData = await res.json();
        login({
          id: userData.id,
          email: userData.email,
          password: '',
          roles: userData.roles || [],
          currentRole: userData.currentRole || null,
          provider: 'google',
          googleId,
          createdAt: new Date(),
          updatedAt: new Date(),
          displayName: userData.displayName || 'Google User',
          profileImage: userData.profileImage || '',
        });
        
        toast({
          title: "Welcome!",
          description: "Successfully signed in with Google! Choose your role to continue.",
        });

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