import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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

  // If user is authenticated but doesn't have a role, redirect to role selection
  if (isAuthenticated && user && (!user.role || user.role === 'client')) {
    return <Navigate to="/role-selection" replace />;
  }

  // If specific role is required but user doesn't have it
  if (requiredRole && user && user.role !== requiredRole) {
    // Redirect to their appropriate dashboard
    const dashboardMap = {
      hub: '/hub-dashboard',
      professional: '/professional-dashboard',
      brand: '/brand-dashboard',
      trainer: '/trainer-dashboard'
    };
    const userDashboard = dashboardMap[user.role as keyof typeof dashboardMap];
    return <Navigate to={userDashboard || '/home'} replace />;
  }

  // If user is authenticated and on login/signup, redirect to their dashboard
  if (isAuthenticated && user && user.role && user.role !== 'client') {
    const currentPath = location.pathname;
    if (currentPath === '/login' || currentPath === '/signup' || currentPath === '/role-selection') {
      const dashboardMap = {
        hub: '/hub-dashboard',
        professional: '/professional-dashboard',  
        brand: '/brand-dashboard',
        trainer: '/trainer-dashboard'
      };
      const userDashboard = dashboardMap[user.role as keyof typeof dashboardMap];
      return <Navigate to={userDashboard || '/home'} replace />;
    }
  }

  // If custom redirect is specified
  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}