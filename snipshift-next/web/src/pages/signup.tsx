import React from 'react';

import { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Scissors } from 'lucide-react';
import { AuthErrorBoundary } from '@/components/auth/AuthErrorBoundary';

// Zod validation schema
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

// Lazy load the Google Auth button to reduce initial bundle size
const GoogleAuthButton = lazy(() => import('@/components/auth/google-auth-button'));

export default function SignupPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { login, isAuthenticated } = useAuth();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange'
  });


  // Handle OAuth callback (proper backend integration)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    // Handle OAuth callback if code is present
    if (code && state) {
      console.log('🔄 OAuth callback detected on signup page');
      handleOAuthCallback(code, state);
      return;
    }
  }, [navigate, toast]);

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      setIsLoading(true);
      
      // Call backend OAuth exchange endpoint
      const response = await apiRequest('POST', '/api/oauth/google/exchange', {
        code,
        redirectUri: window.location.origin + '/oauth/callback',
        codeVerifier: sessionStorage.getItem('pkce_verifier')
      });
      
      const userData = await response.json();
      
      // Create properly formatted user object for auth service
      const newUser = {
        id: userData.id,
        email: userData.email,
        password: '', // Don't store password in frontend
        roles: Array.isArray(userData.roles) ? userData.roles : ['professional'],
        currentRole: userData.currentRole ?? 'professional',
        provider: 'google' as const,
        googleId: userData.googleId,
        createdAt: new Date(),
        updatedAt: new Date(),
        displayName: userData.displayName || userData.email.split('@')[0],
        profileImage: userData.profileImage || '',
      };
      
      login(newUser);
      
      toast({
        title: 'Welcome!',
        description: "Successfully signed up with Google! Let's set up your profile.",
      });

      // Navigate to role selection
      navigate('/role-selection');
    } catch (error) {
      console.error('❌ OAuth callback error:', error);
      toast({
        title: 'Authentication Error',
        description: 'There was an issue processing your Google authentication.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);

    try {
      const response = await apiRequest('POST', '/api/register', {
        email: data.email,
        password: data.password,
        provider: 'email'
      });
      const userData = await response.json();
      
      // Create properly formatted user object for auth service
      const newUser = {
        id: userData.id,
        email: userData.email,
        password: '', // Don't store password in frontend
        roles: Array.isArray(userData.roles) ? userData.roles : ['professional'],
        currentRole: userData.currentRole ?? 'professional',
        provider: 'email' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        displayName: userData.displayName || data.email.split('@')[0],
        profileImage: userData.profileImage || '',
      };
      
      console.log('🔧 New user created:', newUser); // Debug log
      login(newUser);
      
      toast({
        title: 'Account created successfully',
        description: "Welcome to Snipshift! Let's set up your profile.",
      });

      // Redirect to role selection
      navigate('/role-selection');
    } catch (error) {
      toast({
        title: 'Registration failed',
        description: 'Please check your information and try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <AuthErrorBoundary>
      <div className="min-h-screen py-12 bg-signup">
      <div className="max-w-md mx-auto px-4">
        <Card className="shadow-xl border-2 border-steel-300/50 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center bg-gradient-to-b from-steel-50 to-white rounded-t-lg border-b border-steel-200/50">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gradient-to-br from-red-accent to-red-accent-dark rounded-full shadow-lg">
                <Scissors className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-steel-900" data-testid="heading-signup">Join Snipshift</CardTitle>
            <p className="text-steel-600 font-medium">Connect with the creative industry network</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-steel-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="Enter your email"
                  className="mt-2"
                  data-testid="input-email"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-steel-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  placeholder="Create a password"
                  className="mt-2"
                  data-testid="input-password"
                />
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-steel-700">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword')}
                  placeholder="Confirm your password"
                  className="mt-2"
                  data-testid="input-confirm-password"
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-red-accent to-red-accent-dark hover:from-red-accent-light hover:to-red-accent text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={isLoading}
                data-testid="button-signup"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
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
            
            <div className="text-center mt-6">
              <p className="text-steel-600">
                Already have an account?{' '}
                <Link to="/login" className="text-steel-700 hover:text-steel-900 hover:underline font-medium" data-testid="link-login">
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
    </AuthErrorBoundary>
  );
}
