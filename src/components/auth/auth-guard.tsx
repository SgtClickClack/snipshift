import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/ui/loading-screen';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function AuthGuard({
  children,
  requireAuth = false,
  redirectTo,
}: AuthGuardProps) {
  // Minimalist guard: rely only on { user, isLoading } from AuthContext
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Automatic redirect: If user is authenticated and on a public-only route like /login, redirect to dashboard
  // This useEffect must be called unconditionally (React hooks rule)
  // The effect body handles the loading check internally
  useEffect(() => {
    if (!isLoading && user) {
      // If user is authenticated AND has completed onboarding, redirect from public-only routes
      const hasCompletedOnboarding = user.hasCompletedOnboarding !== false && user.isOnboarded !== false;
      if (location.pathname === '/login' || location.pathname === '/signup') {
        if (hasCompletedOnboarding) {
          console.log('[AuthGuard] User authenticated + onboarded, forcing navigation to /dashboard');
          navigate('/dashboard', { replace: true });
        } else {
          console.log('[AuthGuard] User authenticated but not onboarded, forcing navigation to /onboarding');
          navigate('/onboarding', { replace: true });
        }
      }
    }
  }, [user, isLoading, location.pathname, navigate]);

  // STRICT RULE: MUST return loading screen if isLoading is TRUE
  // This prevents any navigation decisions while auth handshake is in progress
  if (isLoading) {
    return <LoadingScreen />;
  }

  // STRICT RULE: Can ONLY navigate to /login if isLoading is FALSE AND user is NULL
  // This ensures we never redirect during the auth handshake
  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
