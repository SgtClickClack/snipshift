import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

interface GoogleAuthProps {
  mode: 'signin' | 'signup';
  onSuccess?: (userData: any) => void;
}

// Declare Google Identity Services types
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

export function GoogleAuth({ mode, onSuccess }: GoogleAuthProps) {
  const { toast } = useToast();
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const initializeGoogleAuth = () => {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
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
    } else {
      setTimeout(initializeGoogleAuth, 100);
    }
  };

  const handleCredentialResponse = async (response: any) => {
    setIsProcessing(true);
    
    try {
      if (!response.credential) {
        throw new Error('No credential received from Google');
      }

      // Send the credential to your backend for verification
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: response.credential,
          mode
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Google authentication failed');
      }

      const userData = await res.json();
      
      toast({
        title: "Success!",
        description: `Successfully ${mode === 'signin' ? 'signed in' : 'signed up'} with Google`,
      });

      onSuccess?.(userData);
    } catch (error: any) {
      console.error('Google auth error:', error);
      toast({
        title: "Authentication failed",
        description: error.message || "There was an error with Google authentication. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoogleSignIn = () => {
    if (!isGoogleLoaded) {
      toast({
        title: "Not Ready",
        description: "Google authentication is still loading. Please wait.",
        variant: "destructive",
      });
      return;
    }

    try {
      window.google.accounts.id.prompt();
    } catch (error) {
      console.error('Failed to show Google sign-in prompt:', error);
      toast({
        title: "Error",
        description: "Failed to open Google sign-in. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full">
      <Button
        onClick={handleGoogleSignIn}
        disabled={!isGoogleLoaded || isProcessing}
        variant="outline"
        className="w-full h-12 text-sm font-medium border-steel-300 hover:bg-steel-50"
        data-testid={`google-${mode}-button`}
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
        {isProcessing 
          ? "Processing..." 
          : !isGoogleLoaded 
          ? "Loading..."
          : `${mode === 'signin' ? 'Sign in' : 'Sign up'} with Google`
        }
      </Button>
    </div>
  );
}