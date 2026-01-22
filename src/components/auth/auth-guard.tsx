import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { auth } from '@/lib/firebase';

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

  // Detect Firebase auth params in URL and force navigation to dashboard
  // This catches cases where popup auth completes and user lands on home page (/) with ?apiKey params
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const searchParams = new URLSearchParams(location.search);
    const hasApiKey = searchParams.has('apiKey');
    const hasAuthMode = searchParams.get('mode') === 'signIn' || searchParams.get('mode') === 'signUp';
    
    if (hasApiKey || hasAuthMode) {
      // Check if Firebase user exists (even if context hasn't updated yet)
      const hasFirebaseUser = auth.currentUser !== null;
      
      if (hasFirebaseUser && !isLoading) {
        // User is authenticated - force immediate navigation to dashboard
        const hasCompletedOnboarding = user?.hasCompletedOnboarding !== false && user?.isOnboarded !== false;
        const targetPath = hasCompletedOnboarding ? '/dashboard' : '/onboarding';
        
        console.log('[AuthGuard] Auth params detected + Firebase user exists, forcing navigation to', targetPath);
        
        // Clean URL parameters before navigating
        const cleanUrl = location.pathname;
        window.history.replaceState({}, '', cleanUrl);
        
        // Navigate immediately
        navigate(targetPath, { replace: true });
      }
    }
  }, [location.search, location.pathname, user, isLoading, navigate]);

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

  // CRITICAL: Check auth.currentUser directly for popup flow
  // If popup auth succeeded but context hasn't updated yet, allow immediate passage
  // This bypasses "Authentication pending" state when popup completes before context hydration
  const hasFirebaseUser = auth.currentUser !== null;
  
  // PRIORITY CHECK: If Firebase user exists and not loading, immediately clear pending state
  // and allow passage to dashboard
  if (hasFirebaseUser && !isLoading) {
    // User is authenticated via popup - allow passage immediately
    console.log('[AuthGuard] Firebase user exists, bypassing pending state');
    return <>{children}</>;
  }

  // Show loading screen only if auth handshake is still in progress
  if (isLoading) {
    return <LoadingScreen />;
  }

  // No Firebase user and requireAuth - redirect to login
  if (requireAuth && !user && !hasFirebaseUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
