import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import { useToast } from "@/hooks/useToast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { FastForward, Eye, EyeOff } from "lucide-react";
import GoogleAuthButton from "@/components/auth/google-auth-button";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function SignupPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { login, isAuthenticated, isAuthReady, user } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  // Prevent double execution in React Strict Mode
  const hasProcessedOAuthCallback = useRef(false);
  const hasShownConnectingToast = useRef(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showManualDashboardLink, setShowManualDashboardLink] = useState(false);

  // REDIRECT: If user is authenticated in Firebase but has no database record (404 case),
  // redirect them to onboarding to complete their profile and choose their role
  useEffect(() => {
    if (!isAuthReady) return;
    
    // If user is authenticated in Firebase (has token) but no user object (404 from backend),
    // redirect to onboarding to complete profile setup
    if (isAuthenticated && !user && auth.currentUser) {
      console.log('[Signup] User authenticated in Firebase but no database record, redirecting to onboarding');
      navigate('/onboarding', { replace: true });
      return;
    }
  }, [isAuthReady, isAuthenticated, user, navigate]);

  // IMMEDIATE REDIRECT GUARD: Check for localStorage bridge on mount
  // If popup just completed auth, immediately redirect without showing signup UI
  useEffect(() => {
    try {
      const bridgeData = localStorage.getItem('hospogo_auth_bridge');
      if (!bridgeData) return;

      const parsed = JSON.parse(bridgeData) as { uid?: string; ts?: number };
      if (!parsed.uid || !parsed.ts) return;

      // Only process if bridge is recent (less than 30 seconds old)
      const age = Date.now() - parsed.ts;
      if (age > 30000) {
        // Bridge is stale, clean it up
        localStorage.removeItem('hospogo_auth_bridge');
        return;
      }

      // Bridge is fresh - popup just completed auth
      console.log('[Signup] localStorage bridge detected, finalizing auth...', { uid: parsed.uid, age });
      setIsFinalizing(true);
      
      // Show "Finalizing..." state and redirect immediately
      setTimeout(() => {
        navigate('/onboarding', { replace: true });
      }, 500);
    } catch (error) {
      console.debug('[Signup] Failed to check localStorage bridge', error);
    }
  }, [navigate]);

  // Check for email, role, and plan in query params (e.g. redirect from login, landing page, or pricing)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    const roleParam = urlParams.get('role');
    const planParam = urlParams.get('plan');
    const trialParam = urlParams.get('trial');
    
    if (emailParam) {
      setFormData(prev => ({ ...prev, email: emailParam }));
    }
    
    // Store role preference in sessionStorage to pass to onboarding
    if (roleParam && (roleParam === 'hub' || roleParam === 'professional')) {
      sessionStorage.setItem('signupRolePreference', roleParam);
    }
    
    // Handle plan selection from pricing page (Starter, Business, Enterprise)
    // Plan selection implies venue/hub role since pricing is for businesses
    if (planParam) {
      sessionStorage.setItem('signupPlanPreference', planParam);
      // If coming from pricing, default to hub role (business owner)
      if (!roleParam) {
        sessionStorage.setItem('signupRolePreference', 'hub');
      }
      // Store trial flag if present
      if (trialParam === 'true') {
        sessionStorage.setItem('signupTrialMode', 'true');
      }
    }
  }, []);

  // Handle OAuth callback (new universal flow)
  useEffect(() => {
    // Check if we already processed this callback
    if (hasProcessedOAuthCallback.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    // Handle OAuth callback if code is present
    if (code && state) {
      // Mark as processed immediately to prevent double execution
      hasProcessedOAuthCallback.current = true;
      try {
        // Create mock Google user with client role (universal signup)
        const mockUser = {
          id: `google_${Date.now()}`,
          email: 'demo@hospogo.com',
          password: '',
          roles: ['client' as const],
          currentRole: 'client' as const,
          provider: 'google' as const,
          googleId: `google_${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          displayName: 'Google User',
          profileImage: '',
        };

        login(mockUser);
        
        toast({
          title: "Welcome!",
          description: "Successfully signed up with Google! Let's set up your profile.",
        });

        // Navigate to home (role selection)
        navigate('/home');
      } catch (error) {
        console.error('❌ OAuth callback error:', error);
        toast({
          title: "Authentication Error",
          description: "There was an issue processing your Google authentication.",
          variant: "destructive",
        });
      }
      return;
    }
  }, [navigate, toast]);

  useEffect(() => {
    if (isLoading && !hasShownConnectingToast.current) {
      hasShownConnectingToast.current = true;
      toast({
        title: "Connecting...",
        description: "Finishing sign-up. If redirect stalls, you can navigate manually.",
      });
    }

    if (!isLoading) {
      hasShownConnectingToast.current = false;
    }
  }, [isLoading, toast]);

  useEffect(() => {
    if (!isLoading) {
      setShowManualDashboardLink(false);
      return;
    }

    const timeout = setTimeout(() => {
      setShowManualDashboardLink(true);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      toast({
        title: "Terms agreement required",
        description: "Please agree to the Terms of Service and Privacy Policy to continue",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create user in Firebase to establish auth session
      await createUserWithEmailAndPassword(auth, formData.email, formData.password);

      // 2. Create user in Backend DB
      const response = await apiRequest("POST", "/api/register", {
        email: formData.email,
        password: formData.password,
        provider: "email"
      });
      const userData = await response.json();
      
      // Create properly formatted user object for auth service
      // Backend returns: id, email, name, role
      // Frontend expects: id, email, roles (array), currentRole, displayName, etc.
      const newUser = {
        id: userData.id,
        email: userData.email,
        password: '', // Don't store password in frontend
        roles: Array.isArray(userData.roles) ? userData.roles : [userData.role || 'client'],
        currentRole: userData.currentRole || userData.role || 'client',
        provider: 'email' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        displayName: userData.displayName || userData.name || formData.email.split('@')[0],
        profileImage: userData.profileImage || '',
        isOnboarded: userData.isOnboarded ?? false, // Ensure isOnboarded is set for AuthGuard
      };
      
      // Removed test bypass - E2E tests need to use proper authentication
      
      login(newUser);
      
      toast({
        title: "Account created successfully",
        description: "Welcome to HospoGo! Let's set up your profile.",
      });

      // Get role preference from sessionStorage if available
      const rolePreference = sessionStorage.getItem('signupRolePreference');
      const onboardingPath = rolePreference ? `/onboarding?role=${rolePreference}` : '/onboarding';
      
      // Clear the preference after using it
      sessionStorage.removeItem('signupRolePreference');

      // Force navigation to ensure we leave the page
      window.location.href = onboardingPath;
    } catch (error: any) {
      console.error("Signup error:", error);
      let message = "Please check your information and try again";
      
      // Handle Firebase auth errors
      if (error?.code === 'auth/email-already-in-use') {
        message = "This email is already in use";
      } else if (error?.code === 'auth/weak-password') {
        message = "Password is too weak";
      } else if (error?.code === 'auth/invalid-email') {
        message = "Invalid email address";
      } else if (error?.code === 'auth/network-request-failed') {
        message = "Network error. Please check your connection and try again";
      }
      // Handle API errors (format: "status: message")
      else if (error?.message) {
        const errorMsg = error.message;
        // Check if it's an API error (format: "status: message")
        const apiErrorMatch = errorMsg.match(/^\d+:\s*(.+)$/);
        if (apiErrorMatch) {
          const apiMessage = apiErrorMatch[1];
          // Try to parse JSON error message from backend
          try {
            const parsed = JSON.parse(apiMessage);
            message = parsed.message || apiMessage;
          } catch {
            // If not JSON, use the message as-is
            message = apiMessage;
          }
        } else {
          // Use the error message directly if it's not in the API format
          message = errorMsg;
        }
      }

      toast({
        title: "Registration failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };



  // Show "Finalizing..." spinner if bridge detected
  if (isFinalizing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="shadow-xl border-2 border-border/50 bg-card/95 backdrop-blur-sm max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-brand-neon rounded-full shadow-neon-realistic animate-pulse">
                <FastForward className="h-8 w-8 text-brand-dark" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-card-foreground mb-2">Finalizing...</CardTitle>
            <p className="text-muted-foreground">Completing your sign-up</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-6 md:py-12">
      <div className="max-w-md mx-auto px-4">
        <Card className="shadow-xl border-2 border-border/50 bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center bg-gradient-to-b from-muted/50 to-card rounded-t-lg border-b border-border/50">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-brand-neon rounded-full shadow-neon-realistic">
                <FastForward className="h-8 w-8 text-brand-dark" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-card-foreground" data-testid="heading-signup">Join HospoGo</CardTitle>
            <p className="text-muted-foreground font-medium">Connect with the industry network</p>
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
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Create a password"
                    className="pr-12"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground focus:outline-none touch-manipulation z-elevated"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirm Password
                </Label>
                <div className="relative mt-2">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirm your password"
                    className="pr-12"
                    data-testid="input-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground focus:outline-none touch-manipulation z-elevated"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  className="mt-1"
                  data-testid="checkbox-terms"
                />
                <Label
                  htmlFor="terms"
                  className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                >
                  I agree to the{" "}
                  <Link to="/terms" className="text-primary hover:underline font-medium" target="_blank">
                    Terms of Service
                  </Link>
                  {" "}and{" "}
                  <Link to="/privacy" className="text-primary hover:underline font-medium" target="_blank">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
              
              <Button 
                type="submit" 
                variant="accent"
                className="w-full font-medium shadow-neon-realistic"
                disabled={isLoading || !agreedToTerms}
                data-testid="button-signup"
              >
                {isLoading ? "Creating Account..." : "Create Account"}
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

            <GoogleAuthButton mode="signup" />

            {showManualDashboardLink && (
              <div className="text-center mt-4">
                <Link to="/dashboard" className="text-primary hover:underline font-medium">
                  Manual Dashboard
                </Link>
              </div>
            )}
            
            <div className="text-center mt-6">
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  );
}
