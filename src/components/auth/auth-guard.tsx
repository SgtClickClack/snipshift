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
  // Minimalist guard: rely only on { user, isLoading, token } from AuthContext
  const { user, isLoading, token } = useAuth();
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
  
  // Handle case where Firebase auth succeeded but DB profile doesn't exist (404)
  // Redirect to onboarding if we have a token (Firebase auth succeeded) but no user (DB profile missing)
  useEffect(() => {
    if (isLoading) return;
    
    // Check Firebase user directly in the effect to ensure reactivity
    const hasFirebaseUserNow = auth.currentUser !== null;
    
    // If we have Firebase auth (token exists) but no DB user profile, redirect to onboarding
    // This handles the 404 case where Firebase auth succeeds but /api/me returns 404
    if (token && !user && hasFirebaseUserNow) {
      // Don't redirect if we're already on onboarding or other public routes
      const publicRoutes = ['/onboarding', '/login', '/signup', '/', '/forgot-password'];
      const isOnPublicRoute = publicRoutes.some(route => location.pathname.startsWith(route));
      
      if (!isOnPublicRoute) {
        console.log('[AuthGuard] Firebase auth succeeded but DB profile missing (404), redirecting to /onboarding');
        navigate('/onboarding', { replace: true });
      }
    }
  }, [token, user, isLoading, location.pathname, navigate]);
  
  // PRIORITY CHECK: Always allow onboarding if we're on the onboarding path
  // This prevents blocking when DB profile doesn't exist yet
  if (location.pathname.startsWith('/onboarding')) {
    // If we have Firebase auth (token or currentUser), allow passage
    // The onboarding page will handle creating the DB profile
    if (hasFirebaseUser || token) {
      console.log('[AuthGuard] On onboarding path with Firebase auth, allowing passage');
      return <>{children}</>;
    }
    // If no Firebase auth but still loading, show loading screen
    if (isLoading) {
      return <LoadingScreen />;
    }
    // If no Firebase auth and not loading, allow passage (user can sign in on onboarding page)
    console.log('[AuthGuard] On onboarding path without Firebase auth, allowing passage');
    return <>{children}</>;
  }

  // PRIORITY CHECK: If Firebase user exists and not loading, check if we need to redirect
  // If DB profile exists, allow passage; otherwise, the useEffect above will handle redirect
  if (hasFirebaseUser && !isLoading) {
    // If we have a DB user, allow passage immediately
    if (user) {
      console.log('[AuthGuard] Firebase user exists + DB profile loaded, allowing passage');
      return <>{children}</>;
    }
    // Otherwise, wait for the useEffect to redirect (or show loading if still processing)
    if (!token) {
      // No token yet, still loading
      return <LoadingScreen />;
    }
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
