import { useState, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { googleOAuth } from "@/lib/google-oauth-direct";

// Lazy load the Google icon to reduce initial bundle size
const FcGoogle = lazy(() => import("react-icons/fc").then(module => ({ default: module.FcGoogle })));

interface GoogleAuthButtonProps {
  mode: "signin" | "signup";
  onSuccess?: () => void;
}

export default function GoogleAuthButton({ mode, onSuccess }: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    
    try {
      console.log('🔧 Starting Google OAuth with direct method');
      // Show immediate feedback, then start OAuth
      await googleOAuth.signIn();
    } catch (error: any) {
      console.error("Google auth error:", error);
      toast({
        title: "Authentication failed",
        description: "There was an error starting Google authentication. Please try again.",
        variant: "destructive",
      });
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
      <Suspense fallback={<div className="w-5 h-5 mr-2 bg-gray-300 rounded animate-pulse" />}>
        <FcGoogle className="w-5 h-5 mr-2" />
      </Suspense>
      {isLoading 
        ? "Connecting..." 
        : `${mode === "signin" ? "Sign in" : "Sign up"} with Google`
      }
    </Button>
  );
}