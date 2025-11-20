import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardRoute } from '@/lib/roles';
import { PageLoadingFallback } from '@/components/loading/loading-spinner';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: 'hub' | 'professional' | 'brand' | 'trainer' | 'admin';
  redirectTo?: string;
}

export function AuthGuard({ 
  children, 
  requireAuth = false, 
  requiredRole, 
  redirectTo 
}: AuthGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <PageLoadingFallback />;
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is authenticated but doesn't have a current role, redirect to role selection
  if (isAuthenticated && user && (!user.currentRole || user.currentRole === 'client')) {
    // Avoid redirect loop when already on role selection
    if (location.pathname !== '/role-selection') {
      return <Navigate to="/role-selection" replace />;
    }
  }

  // If specific role is required but user's currentRole doesn't match
  if (requiredRole && user && user.currentRole !== requiredRole) {
    const userDashboard = getDashboardRoute(user.currentRole);
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