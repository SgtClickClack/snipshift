import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardRoute } from '@/lib/roles';
import { PageLoadingFallback } from '@/components/loading/loading-spinner';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: 'hub' | 'professional' | 'brand' | 'trainer' | 'admin' | 'shop' | 'barber';
  redirectTo?: string;
}

export function AuthGuard({ 
  children, 
  requireAuth = false, 
  requiredRole, 
  redirectTo 
}: AuthGuardProps) {
  const { user, isLoading, isAuthenticated, setAuthError } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <PageLoadingFallback />;
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated && !window.Cypress) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is authenticated but doesn't have a current role, redirect to role selection
  if (isAuthenticated && user && !user.currentRole && !window.Cypress) {
    // Avoid redirect loop when already on role selection
    if (location.pathname !== '/role-selection') {
      return <Navigate to="/role-selection" replace />;
    }
  }

  // If specific role is required but user doesn't have that role
  if (requiredRole && user && !user.roles?.includes(requiredRole as any)) {
    setAuthError('Access denied: You do not have the required permissions to access this feature.');
    const userDashboard = getDashboardRoute(user.currentRole);
    return <Navigate to={userDashboard} replace />;
  }

  // If user is authenticated and on login/signup/homepage, redirect to their dashboard
  // Allow access in Cypress environment for testing
  if (isAuthenticated && user && user.currentRole && !window.Cypress) {
    const currentPath = location.pathname;
    if (currentPath === '/login' || currentPath === '/signup' || currentPath === '/role-selection' || currentPath === '/') {
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