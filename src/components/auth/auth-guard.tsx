import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardRoute } from '@/lib/roles';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { logger } from '@/lib/logger';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: 'hub' | 'professional' | 'brand' | 'trainer' | 'admin' | 'business';
  allowedRoles?: Array<'hub' | 'professional' | 'brand' | 'trainer' | 'admin' | 'business'>;
  redirectTo?: string;
}

export function AuthGuard({ 
  children, 
  requireAuth = false, 
  requiredRole, 
  allowedRoles,
  redirectTo 
}: AuthGuardProps) {
  const { user, isLoading, isAuthenticated, isAuthReady } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication or waiting for auth to be ready
  if (isLoading || !isAuthReady) {
    return <LoadingScreen />;
  }


  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is authenticated but not onboarded, redirect to onboarding
  // Exception: Allow access to onboarding page itself, landing page, legal pages, and other public routes
  const publicRoutes = ['/onboarding', '/', '/terms', '/privacy', '/login', '/signup', '/forgot-password', '/contact', '/about'];
  if (isAuthenticated && user && user.isOnboarded === false) {
    // Avoid redirect loop when already on a public route
    if (!publicRoutes.includes(location.pathname)) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  // If user is already onboarded but tries to access onboarding page, redirect to dashboard
  if (isAuthenticated && user && user.isOnboarded === true && location.pathname === '/onboarding') {
    const userDashboard = user.currentRole ? getDashboardRoute(user.currentRole) : '/user-dashboard';
    return <Navigate to={userDashboard} replace />;
  }

  // If user is authenticated but doesn't have a current role, redirect to role selection
  // But only if they're already onboarded (onboarding sets the role)
  // Exception: Allow public routes to be viewed
  if (isAuthenticated && user && user.isOnboarded !== false && (!user.currentRole || user.currentRole === 'client')) {
    // Avoid redirect loop when already on a public route
    if (!publicRoutes.includes(location.pathname) && location.pathname !== '/role-selection') {
      return <Navigate to="/role-selection" replace />;
    }
  }

  // If specific role is required but user's currentRole doesn't match
  if (requiredRole && user && user.currentRole !== requiredRole) {
    // Debug logging for E2E tests
    if (process.env.NODE_ENV === 'development' || process.env.VITE_E2E === '1') {
      logger.debug('AuthGuard', 'Role mismatch:', {
        requiredRole,
        userCurrentRole: user.currentRole,
        userRoles: user.roles,
        redirectingTo: getDashboardRoute(user.currentRole)
      });
    }
    const userDashboard = getDashboardRoute(user.currentRole);
    return <Navigate to={userDashboard} replace />;
  }
  
  // Debug: Log successful role check
  if (requiredRole && (process.env.NODE_ENV === 'development' || process.env.VITE_E2E === '1')) {
    logger.debug('AuthGuard', 'Role check passed:', {
      requiredRole,
      userCurrentRole: user?.currentRole,
      userRoles: user?.roles
    });
  }

  // If multiple roles are allowed, check if user's role is in the allowed list
  if (allowedRoles && user && user.currentRole && !allowedRoles.includes(user.currentRole as typeof allowedRoles[number])) {
    const userDashboard = getDashboardRoute(user.currentRole as any);
    return <Navigate to={userDashboard} replace />;
  }

  // If user is authenticated and on login/signup, redirect to their dashboard
  if (isAuthenticated && user && user.currentRole && user.currentRole !== 'client') {
    const currentPath = location.pathname;
    if (currentPath === '/login' || currentPath === '/signup' || currentPath === '/role-selection') {
      const userDashboard = getDashboardRoute(user.currentRole);
      return <Navigate to={userDashboard} replace />;
    }
  }

  // If custom redirect is specified
  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}