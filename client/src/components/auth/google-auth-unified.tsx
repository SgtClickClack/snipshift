import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/lib/auth";
import { FcGoogle } from "react-icons/fc";
import { useLocation } from "wouter";

interface GoogleAuthUnifiedProps {
  mode: "signin" | "signup";
}

export default function GoogleAuthUnified({ mode }: GoogleAuthUnifiedProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    
    try {
      // For demo purposes, simulate Google OAuth flow
      // In production, this would integrate with actual Google OAuth
      const mockGoogleUser = {
        id: `google_${Date.now()}`,
        email: "demo@snipshift.com.au",
        password: "",
        role: "professional" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        displayName: "Demo User",
        profileImage: `https://ui-avatars.com/api/?name=Demo+User&background=random`,
        provider: "google"
      };

      // Register or login the user
      if (mode === "signup") {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mockGoogleUser),
        });

        if (response.ok) {
          const user = await response.json();
          authService.login(user);
          toast({
            title: "Account created successfully!",
            description: "Welcome to Snipshift",
          });
          navigate('/home');
        } else {
          throw new Error("Registration failed");
        }
      } else {
        // Login mode
        const response = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: mockGoogleUser.email,
            provider: "google"
          }),
        });

        if (response.ok) {
          const user = await response.json();
          authService.login(user);
          toast({
            title: "Welcome back!",
            description: "Successfully signed in with Google",
          });
          
          // Navigate based on role
          switch (user.role) {
            case 'hub':
              navigate('/hub-dashboard');
              break;
            case 'professional':
              navigate('/home');
              break;
            case 'brand':
              navigate('/brand-dashboard');
              break;
            case 'trainer':
              navigate('/trainer-dashboard');
              break;
            default:
              navigate('/home');
          }
        } else {
          throw new Error("Login failed");
        }
      }
    } catch (error) {
      console.error("Google auth error:", error);
      toast({
        title: `${mode === "signin" ? "Sign-in" : "Sign-up"} failed`,
        description: "Demo Google authentication. In production, configure Google OAuth Client ID.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="w-full flex items-center gap-2"
      onClick={handleGoogleAuth}
      disabled={isLoading}
      data-testid={`google-${mode}-button`}
    >
      <FcGoogle className="h-4 w-4" />
      {isLoading 
        ? `${mode === "signin" ? "Signing in" : "Signing up"}...` 
        : `${mode === "signin" ? "Sign in" : "Sign up"} with Google`
      }
    </Button>
  );
}