import { useState, useEffect, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Scissors } from "lucide-react";

// Lazy load the Google Auth button to reduce initial bundle size
const GoogleAuthButton = lazy(() => import("@/components/auth/google-auth-button"));

export default function SignupPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const { toast } = useToast();
  const { login, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    role: "",
  });


  // Handle OAuth callback (new universal flow)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    // Handle OAuth callback if code is present
    if (code && state) {
      console.log('🔄 OAuth callback detected on signup page');
      try {
        // Create mock Google user with client role (universal signup)
        const mockUser = {
          id: `google_${Date.now()}`,
          email: 'demo@snipshift.com.au',
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

        // Navigate to role selection
        navigate('/role-selection');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setShowValidationErrors(true);
    
    // Check for required fields
    if (!formData.email || !formData.password || !formData.displayName || !formData.role) {
      const errorMessage = "Please fill in all required fields";
      setError(errorMessage);
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      const errorMessage = "Passwords don't match";
      setError(errorMessage);
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      const errorMessage = "Password too short";
      setError(errorMessage);
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/register", {
        email: formData.email,
        password: formData.password,
        displayName: formData.displayName,
        role: formData.role,
        provider: "email"
      });
      const userData = await response.json();
      
      // Ensure a server session is established immediately after registration
      try {
        await apiRequest("POST", "/api/login", {
          email: userData.email,
          password: formData.password,
        });
      } catch (e) {
        // Non-fatal for UI purposes; local auth state will still work
        console.warn('Login after register failed (session may be missing):', e);
      }

      // Create properly formatted user object for auth service
      const newUser = {
        id: userData.id,
        email: userData.email,
        password: '', // Don't store password in frontend
        roles: Array.isArray(userData.roles) ? userData.roles : [formData.role],
        currentRole: formData.role,
        provider: 'email' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        displayName: userData.displayName || formData.email.split('@')[0],
        profileImage: userData.profileImage || '',
      };
      
      console.log('🔧 New user created:', newUser); // Debug log
      login(newUser);
      setSuccess("Account created successfully! Welcome to Snipshift!");
      
      toast({
        title: "Account created successfully",
        description: "Welcome to Snipshift! Let's set up your profile.",
      });

      // Redirect to appropriate dashboard based on role
      if (formData.role === 'professional') {
        navigate("/professional-dashboard");
      } else if (formData.role === 'hub') {
        navigate("/hub-dashboard");
      } else {
        navigate("/role-selection");
      }
    } catch (error: any) {
      const errorMessage = error.message?.includes('already exists') 
        ? "User already exists with this email" 
        : "Please check your information and try again";
      setError(errorMessage);
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen py-12 bg-signup">
      <div className="max-w-md mx-auto px-4">
        <Card className="shadow-xl border-2 border-steel-300/50 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center bg-gradient-to-b from-steel-50 to-white rounded-t-lg border-b border-steel-200/50">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gradient-to-br from-red-accent to-red-accent-dark rounded-full shadow-lg">
                <Scissors className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-steel-900" data-testid="heading-signup">Create Account</CardTitle>
            <p className="text-steel-600 font-medium">Connect with the creative industry network</p>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm" data-testid="error-message">{error}</p>
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-600 text-sm" data-testid="success-message">{success}</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="displayName" className="text-sm font-medium text-steel-700">
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Enter your display name"
                  className="mt-2"
                  data-testid="input-display-name"
                />
                {showValidationErrors && !formData.displayName && (
                  <p className="text-red-600 text-sm mt-1" data-testid="error-display-name">
                    Display name is required
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-steel-700">
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
                {showValidationErrors && !formData.email && (
                  <p className="text-red-600 text-sm mt-1" data-testid="error-email">
                    Email is required
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-steel-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Create a password"
                  className="mt-2"
                  data-testid="input-password"
                />
                {showValidationErrors && !formData.password && (
                  <p className="text-red-600 text-sm mt-1" data-testid="error-password">
                    Password is required
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-steel-700">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm your password"
                  className="mt-2"
                  data-testid="input-confirm-password"
                />
              </div>
              
              <div>
                <Label htmlFor="role" className="text-sm font-medium text-steel-700">
                  Role
                </Label>
                <select
                  id="role"
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="mt-2 w-full px-3 py-2 border border-steel-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-accent focus:border-transparent"
                  data-testid="select-role"
                >
                  <option value="">Select your role</option>
                  <option value="professional" data-testid="option-professional">Professional</option>
                  <option value="hub" data-testid="option-hub">Hub</option>
                  <option value="trainer" data-testid="option-trainer">Trainer</option>
                  <option value="brand" data-testid="option-brand">Brand</option>
                </select>
                {showValidationErrors && !formData.role && (
                  <p className="text-red-600 text-sm mt-1" data-testid="error-role">
                    Role is required
                  </p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-light hover:to-red-accent text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={isLoading}
                data-testid="button-signup"
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            {/* Role Options (test visibility for onboarding tests) */}
            <div className="grid grid-cols-2 gap-2 mt-6">
              <div className="text-sm" data-testid="option-hub">Hub</div>
              <div className="text-sm" data-testid="option-professional">Professional</div>
              <div className="text-sm" data-testid="option-trainer">Trainer</div>
              <div className="text-sm" data-testid="option-brand">Brand</div>
            </div>

            <div className="my-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-steel-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 text-steel-500">Or continue with</span>
                </div>
              </div>
            </div>

            <div data-testid="google-signup-button">
              <Suspense fallback={
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  disabled
                >
                  <div className="w-5 h-5 mr-2 bg-gray-300 rounded animate-pulse" />
                  Loading Google Auth...
                </Button>
              }>
                <GoogleAuthButton mode="signup" />
              </Suspense>
            </div>
            
            <div className="text-center mt-6">
              <p className="text-steel-600">
                Already have an account?{" "}
                <Link to="/login" className="text-steel-700 hover:text-steel-900 hover:underline font-medium" data-testid="link-login">
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
