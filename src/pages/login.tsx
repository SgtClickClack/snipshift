import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";
import { FastForward, Eye, EyeOff } from "lucide-react";
import GoogleAuthButton from "@/components/auth/google-auth-button";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { logger } from "@/lib/logger";

import { useAuth } from "@/contexts/AuthContext";
import { getDashboardRoute } from "@/lib/roles";

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const supportMessage = "Something went wrong. Give it another shot or reach out to us at info@hospogo.com.";
  const { user, isAuthReady, isAuthenticated, isLoading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!isAuthReady) return;
    
    // Case 1: User is fully authenticated with database record
    if (user) {
      // User is already logged in, redirect to appropriate dashboard
      if (user.isOnboarded === false) {
        navigate("/onboarding", { replace: true });
        return;
      }
      
      if (user.currentRole && user.currentRole !== 'client') {
        const dashboardRoute = getDashboardRoute(user.currentRole);
        navigate(dashboardRoute, { replace: true });
        return;
      }
      
      navigate("/dashboard", { replace: true });
      return;
    }
    
    // Case 2: Firebase user exists but no database record yet (just completed Google signin)
    if (auth.currentUser && !user) {
      logger.debug('Login', 'Firebase user exists but no database record, redirecting to onboarding', {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
      });
      navigate('/onboarding', { replace: true });
      return;
    }
  }, [isAuthReady, user, navigate]);

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
      // Fix 1: Ghost Space - Trim email to handle copy-paste trailing spaces
      const cleanEmail = formData.email.trim();
      const cleanPassword = formData.password.trim();

      // Removed test bypass - E2E tests need to use proper authentication
      // Proceed with normal Firebase authentication
      
      await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });

      // Set flag to wait for auth state to sync and user profile to load
      // The useEffect above will handle the role-based redirection
      setPendingRedirect(true);
    } catch (error: unknown) {
      // CRITICAL: Always log the error code for debugging
      const code =
        typeof error === 'object' && error && 'code' in error
          ? String((error as { code: unknown }).code)
          : '';
      
      const errorMessage =
        typeof error === 'object' && error && 'message' in error
          ? String((error as { message: unknown }).message || '')
          : '';
      
      // Log full error details including code for debugging
      console.error("[Login] Sign-in error:", {
        code,
        message: errorMessage,
        error,
        timestamp: new Date().toISOString(),
      });
      
      let errorTitle = "Something went wrong";
      let errorDescription = supportMessage;
      
      // Handle Firebase auth errors with specific error codes
      if (code) {
        switch (code) {
          case 'auth/operation-not-allowed':
            // Email/Password provider is disabled in Firebase Console
            console.error('[Login] Email/Password authentication is not enabled in Firebase Console');
            console.error('[Login] To fix: Go to Firebase Console > Authentication > Sign-in method > Enable "Email/Password"');
            errorTitle = "Authentication method disabled";
            errorDescription = "Email/Password sign-in is not enabled. Please contact support or try signing in with Google.";
            break;
          case 'auth/invalid-credential':
            // Invalid email or password (Firebase 9+ uses this instead of wrong-password/user-not-found)
            console.error('[Login] Invalid credentials provided');
            errorTitle = "Invalid credentials";
            errorDescription = "The email or password you entered is incorrect. Please try again.";
            break;
          case 'auth/wrong-password':
            errorTitle = "Incorrect password";
            errorDescription = "The password you entered is incorrect. Please try again.";
            break;
          case 'auth/user-not-found':
            errorTitle = "Account not found";
            errorDescription = "No account found with this email address. Please check your email or sign up.";
            break;
          case 'auth/user-disabled':
            errorTitle = "Account disabled";
            errorDescription = "This account has been disabled. Please contact support.";
            break;
          case 'auth/network-request-failed':
            errorTitle = "Network error";
            errorDescription = "Please check your connection and try again";
            break;
          case 'auth/too-many-requests':
            errorTitle = "Too many attempts";
            errorDescription = "Please try again later";
            break;
          case 'auth/internal-error':
            errorTitle = "Something went wrong";
            errorDescription = supportMessage;
            break;
          case 'auth/invalid-email':
            errorTitle = "Invalid email";
            errorDescription = "Please check your email address";
            break;
          default:
            // For unknown Firebase errors, log the code and show generic message
            console.warn('[Login] Unhandled Firebase error code:', code);
            errorDescription = supportMessage;
        }
      } else if (!code && typeof error === 'object' && error && 'message' in error) {
        const message = String((error as { message: unknown }).message || '');
        // Handle non-Firebase errors (e.g., network errors without code)
        if (message.includes('network') || message.includes('fetch')) {
          errorTitle = "Network error";
          errorDescription = "Please check your connection and try again";
        } else {
          errorDescription = supportMessage;
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

  // Show loading state while auth is initializing
  if (authLoading || !isAuthReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FastForward className="text-primary text-4xl mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-6 md:py-12">
      <div className="max-w-md mx-auto px-4">
        <Card className="shadow-sm">
          <CardHeader className="text-center">
            <FastForward className="text-primary text-3xl mx-auto mb-4" />
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
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    Created account with Google? Click 'Sign in with Google' below.
                  </p>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary hover:underline font-medium whitespace-nowrap ml-3"
                  >
                    Forgot password?
                  </Link>
                </div>
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
