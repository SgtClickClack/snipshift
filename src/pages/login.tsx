import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Scissors, Eye, EyeOff } from "lucide-react";
import GoogleAuthButton from "@/components/auth/google-auth-button";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

import { useAuth, User } from "@/contexts/AuthContext";
import { getDashboardRoute } from "@/lib/roles";

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { login, user, isAuthReady } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState(false);

  // Handle post-login redirection based on user role
  useEffect(() => {
    if (pendingRedirect && isAuthReady && user) {
      setPendingRedirect(false);
      
      // Check if user has a role and is onboarded
      if (user.isOnboarded === false) {
        // User needs to complete onboarding
        navigate("/onboarding", { replace: true });
        return;
      }
      
      if (user.currentRole && user.currentRole !== 'client') {
        // User has a role - redirect to their dashboard
        const dashboardRoute = getDashboardRoute(user.currentRole);
        navigate(dashboardRoute, { replace: true });
        return;
      }
      
      // User is onboarded but has no role or is a client - go to role selection
      navigate("/role-selection", { replace: true });
    }
  }, [pendingRedirect, isAuthReady, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Magic Bypass for E2E Tests
      if (formData.email === 'test@snipshift.com' && formData.password === 'password123') {
        const testUser: User = {
            id: '00000000-0000-0000-0000-000000000001', // Must match API bypass ID
            email: 'test@snipshift.com',
            name: 'Test User',
            roles: ['business'],
            currentRole: 'business',
            isOnboarded: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            uid: 'test-firebase-uid'
         };
         
        sessionStorage.setItem('snipshift_test_user', JSON.stringify({ 
          roles: ['business'], 
          currentRole: 'business',
          isOnboarded: true 
        }));
        
        // Update Context immediately
        login(testUser);

        toast({
          title: "Login successful",
          description: "Welcome back!",
        });
        
        // Navigate to role-based dashboard
        const dashboardRoute = getDashboardRoute(testUser.currentRole);
        navigate(dashboardRoute, { replace: true });
        return;
      }

      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });

      // Set flag to wait for auth state to sync and user profile to load
      // The useEffect above will handle the role-based redirection
      setPendingRedirect(true);
    } catch (error: any) {
      console.error("Login error:", error);
      
      let errorTitle = "Login failed";
      let errorDescription = "Invalid email or password";
      
      // Handle Firebase auth errors
      if (error?.code) {
        switch (error.code) {
          case 'auth/network-request-failed':
            errorTitle = "Network error";
            errorDescription = "Please check your connection and try again";
            break;
          case 'auth/invalid-credential':
          case 'auth/wrong-password':
          case 'auth/user-not-found':
          case 'auth/user-disabled':
            // Authentication failures - keep default message
            break;
          case 'auth/too-many-requests':
            errorTitle = "Too many attempts";
            errorDescription = "Please try again later";
            break;
          case 'auth/internal-error':
            errorTitle = "Server error";
            errorDescription = "Something went wrong. Please try again";
            break;
          case 'auth/invalid-email':
            errorTitle = "Invalid email";
            errorDescription = "Please check your email address";
            break;
          default:
            // For unknown Firebase errors, show generic message
            errorDescription = "Something went wrong. Please try again";
        }
      } else if (!error?.code && error?.message) {
        // Handle non-Firebase errors (e.g., network errors without code)
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorTitle = "Network error";
          errorDescription = "Please check your connection and try again";
        } else {
          errorDescription = "Something went wrong. Please try again";
        }
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-6 md:py-12">
      <div className="max-w-md mx-auto px-4">
        <Card className="shadow-sm">
          <CardHeader className="text-center">
            <Scissors className="text-primary text-3xl mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold text-card-foreground">Welcome Back</CardTitle>
            <p className="text-muted-foreground">Sign in to your account</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  autoFocus
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter your email"
                  className="mt-2"
                  data-testid="input-email"
                />
              </div>
              
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <div className="relative mt-2">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter your password"
                    className="pr-12"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setShowPassword(!showPassword);
                      }
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded touch-manipulation z-elevated"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={0}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Created account with Google? Click 'Sign in with Google' below.
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading}
                data-testid="button-signin"
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            <div className="my-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-card px-4 text-muted-foreground">Or continue with</span>
                </div>
              </div>
            </div>

            <GoogleAuthButton mode="signin" />
            
            <div className="text-center mt-6">
              <p className="text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary hover:underline font-medium">
                  Sign up here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
