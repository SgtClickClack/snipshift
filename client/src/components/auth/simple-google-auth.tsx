import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/lib/auth';
import { useLocation } from 'wouter';
import { useState, useEffect } from 'react';

interface SimpleGoogleAuthProps {
  mode: 'signin' | 'signup';
  onSuccess?: () => void;
}

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
          renderButton: (element: HTMLElement, config: any) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

export function SimpleGoogleAuth({ mode, onSuccess }: SimpleGoogleAuthProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

  useEffect(() => {
    // Load Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('Google Identity Services script loaded');
      initializeGoogleAuth();
    };
    script.onerror = () => {
      console.error('Failed to load Google Identity Services script');
      toast({
        title: "Google Auth Error",
        description: "Failed to load Google authentication services.",
        variant: "destructive",
      });
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const initializeGoogleAuth = () => {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        
        setIsGoogleLoaded(true);
        console.log('Google Auth initialized successfully');
      } catch (error) {
        console.error('Google Auth initialization error:', error);
        toast({
          title: "Google Auth Error",
          description: "Failed to initialize Google authentication.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCredentialResponse = (response: any) => {
    try {
      console.log('Google credential response received');
      
      if (!response.credential) {
        throw new Error('No credential received from Google');
      }

      // Decode JWT manually (simple base64 decode for demo)
      const parts = response.credential.split('.');
      const payload = JSON.parse(atob(parts[1]));
      
      console.log('JWT payload decoded:', { email: payload.email, name: payload.name });
      
      // Get role from URL
      const urlParams = new URLSearchParams(window.location.search);
      const roleFromUrl = urlParams.get('role') || 'professional';
      const validRole = ['hub', 'professional', 'brand', 'trainer'].includes(roleFromUrl) ? roleFromUrl : 'professional';
      
      // Create user object
      const googleUser = {
        id: `google_${payload.sub}`,
        email: payload.email,
        password: '',
        role: validRole as 'hub' | 'professional' | 'brand' | 'trainer',
        provider: 'google' as const,
        googleId: payload.sub,
        createdAt: new Date(),
        updatedAt: new Date(),
        displayName: payload.name,
        profileImage: payload.picture || '',
      };

      authService.login(googleUser);
      
      toast({
        title: mode === 'signin' ? "Welcome back!" : "Account created!",
        description: `Successfully ${mode === 'signin' ? 'signed in' : 'signed up'} with Google as ${payload.name}`,
      });

      // Navigate to appropriate dashboard
      const dashboardMap = {
        hub: '/hub-dashboard',
        professional: '/home',
        brand: '/brand-dashboard',
        trainer: '/trainer-dashboard'
      };
      
      const targetDashboard = dashboardMap[validRole as keyof typeof dashboardMap];
      console.log('Navigating to dashboard:', targetDashboard);
      
      navigate(targetDashboard);
      onSuccess?.();
      
    } catch (error) {
      console.error('Google auth error:', error);
      toast({
        title: `${mode === 'signin' ? 'Sign-in' : 'Sign-up'} failed`,
        description: "There was an error with Google authentication. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGoogleSignIn = () => {
    if (!isGoogleLoaded || !window.google) {
      toast({
        title: "Google Auth Not Ready",
        description: "Google authentication is still loading. Please wait a moment.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Starting Google sign-in process');
      window.google.accounts.id.prompt();
    } catch (error) {
      console.error('Error starting Google sign-in:', error);
      toast({
        title: "Sign-in Error",
        description: "Failed to start Google authentication process.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full">
      <Button
        onClick={handleGoogleSignIn}
        variant="outline"
        className="w-full h-12 text-sm font-medium border-neutral-300 hover:bg-neutral-50"
        disabled={!isGoogleLoaded}
        data-testid={`simple-google-${mode}-button`}
      >
        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
          <path
            fill="#4285f4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34a853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#fbbc05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#ea4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {!isGoogleLoaded ? 'Loading Google...' : (mode === 'signin' ? 'Sign in with Google' : 'Sign up with Google')}
      </Button>
    </div>
  );
}