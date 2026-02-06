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
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const supportMessage = "Something went wrong. Give it another shot or reach out to us at info@hospogo.com.";
  
  // MODULAR PATTERN: Use ONLY useAuth() hook - no direct auth object access
  const { user, isLoading: authLoading, isVenueMissing } = useAuth();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    // Clear pending state immediately when valid user is detected
    if (user) {
      navigate(isVenueMissing ? '/onboarding/hub' : '/dashboard', { replace: true });
    }
  }, [authLoading, user, isVenueMissing, navigate]);

  useEffect(() => {
    // Also check auth.currentUser directly for popup flow
    // This ensures we clear pending state even if context hasn't updated yet
    if (!authLoading && !user && auth.currentUser) {
      // Context will update via onAuthStateChanged, navigation will happen automatically
    }
  }, [authLoading, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const cleanEmail = formData.email.trim();
      const cleanPassword = formData.password.trim();
      
      // MODULAR SYNTAX: signInWithEmailAndPassword(auth, email, password)
      await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });

    } catch (error: unknown) {
      const code =
        typeof error === 'object' && error && 'code' in error
          ? String((error as { code: unknown }).code)
          : '';
      
      const errorMessage =
        typeof error === 'object' && error && 'message' in error
          ? String((error as { message: unknown }).message || '')
          : '';
      
      console.error("[Login] Sign-in error:", {
        code,
        message: errorMessage,
        error,
        timestamp: new Date().toISOString(),
      });
      
      let errorTitle = "Something went wrong";
      let errorDescription = supportMessage;
      
      if (code) {
        switch (code) {
          case 'auth/operation-not-allowed':
            console.error('[Login] Email/Password authentication is not enabled in Firebase Console');
            console.error('[Login] To fix: Go to Firebase Console > Authentication > Sign-in method > Enable "Email/Password"');
            errorTitle = "Authentication method disabled";
            errorDescription = "Email/Password sign-in is not enabled. Please contact support or try signing in with Google.";
            break;
          case 'auth/invalid-credential':
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
            console.warn('[Login] Unhandled Firebase error code:', code);
            errorDescription = supportMessage;
        }
      } else if (!code && typeof error === 'object' && error && 'message' in error) {
        const message = String((error as { message: unknown }).message || '');
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
  if (authLoading) {
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
                  name="email"
                  type="email"
                  autoComplete="username"
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
                    name="password"
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
