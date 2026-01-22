import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardRoute, isBusinessRole } from '@/lib/roles';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { logger } from '@/lib/logger';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: 'hub' | 'professional' | 'brand' | 'trainer' | 'admin' | 'business' | 'venue';
  allowedRoles?: Array<'hub' | 'professional' | 'brand' | 'trainer' | 'admin' | 'business' | 'venue'>;
  redirectTo?: string;
}

export function AuthGuard({
  children,
  requireAuth = false,
  requiredRole,
  allowedRoles,
  redirectTo,
}: AuthGuardProps) {
  // MODULAR PATTERN: Use ONLY useAuth() hook - no direct auth object access
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const shouldDebug = import.meta.env.DEV;

  // Show loading screen while auth is initializing
  if (isLoading) {
    return <LoadingScreen />;
  }

  // PUBLIC ROUTES: Allow access to onboarding pages during onboarding flow
  const isOnboardingRoute = location.pathname.startsWith('/onboarding');
  if (isOnboardingRoute) {
    // Allow access if user is authenticated (useAuth handles Firebase session state)
    if (user) {
      return <>{children}</>;
    }
  }

  // REQUIRE AUTH: User must be authenticated
  if (requireAuth && !user) {
    // Allow onboarding routes if user is authenticated but not yet onboarded
    if (isOnboardingRoute && user) {
      logger.debug('AuthGuard', 'User authenticated, allowing onboarding access');
      return <>{children}</>;
    }
    
    // User not authenticated - redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // AUTHENTICATED USER ON AUTH PAGES: Redirect away from login/signup
  const authPages = ['/login', '/signup'];
  if (user && authPages.includes(location.pathname)) {
    logger.debug('AuthGuard', 'Authenticated user on auth page, redirecting', {
      isOnboarded: user.isOnboarded,
      currentRole: user.currentRole,
    });
    
    if (user.isOnboarded === false) {
      return <Navigate to="/onboarding" replace />;
    }
    if (!user.currentRole || user.currentRole === 'client') {
      return <Navigate to="/role-selection" replace />;
    }
    const userDashboard = getDashboardRoute(user.currentRole);
    return <Navigate to={userDashboard} replace />;
  }

  // ONBOARDING CHECK: User not onboarded should go to onboarding
  const publicRoutes = ['/onboarding', '/', '/terms', '/privacy', '/login', '/signup', '/forgot-password', '/contact', '/about'];
  if (user && user.isOnboarded === false) {
    if (!publicRoutes.includes(location.pathname) && !isOnboardingRoute) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  // ROLE CHECK: If no role, redirect to onboarding or role selection
  const roleAgnosticRoutes = ['/messages', '/profile', '/settings', '/notifications', '/wallet', '/earnings'];
  if (user && user.isOnboarded !== false && (!user.currentRole || user.currentRole === 'client')) {
    if (roleAgnosticRoutes.includes(location.pathname)) {
      return <>{children}</>;
    }
    if (!publicRoutes.includes(location.pathname) && location.pathname !== '/role-selection') {
      return <Navigate to="/role-selection" replace />;
    }
  }

  // REQUIRED ROLE CHECK
  if (requiredRole && user) {
    const hasDirectMatch = 
      user.currentRole === requiredRole ||
      (user.roles && user.roles.includes(requiredRole as any));
    
    const hasBusinessRoleMatch = 
      requiredRole === 'business' && isBusinessRole(user.currentRole || '');
    
    const hasVenueHubMatch = 
      (requiredRole === 'venue' || requiredRole === 'hub') && isBusinessRole(user.currentRole || '');
    
    const hasRequiredRole = hasDirectMatch || hasBusinessRoleMatch || hasVenueHubMatch;
    
    if (!hasRequiredRole) {
      const hasAnyRole = user.currentRole && user.currentRole !== 'client';
      
      if (!hasAnyRole) {
        if (shouldDebug) {
          logger.debug('AuthGuard', 'User has no role, redirecting to onboarding');
        }
        return <Navigate to="/onboarding" replace />;
      }
      
      if (shouldDebug) {
        logger.debug('AuthGuard', 'Role mismatch, redirecting to unauthorized', {
          requiredRole,
          userCurrentRole: user.currentRole,
        });
      }
      return <Navigate to="/unauthorized" state={{ from: location, requiredRole }} replace />;
    }
  }

  // ALLOWED ROLES CHECK
  if (allowedRoles && user) {
    const allowsAnyBusinessRole = allowedRoles.some(r => 
      r === 'business' || r === 'venue' || r === 'hub'
    );
    
    const hasDirectMatch = 
      (user.currentRole && allowedRoles.includes(user.currentRole as typeof allowedRoles[number])) ||
      (user.roles && user.roles.some(role => allowedRoles.includes(role as typeof allowedRoles[number])));
    
    const hasBusinessRoleMatch = allowsAnyBusinessRole && isBusinessRole(user.currentRole || '');
    
    const hasAllowedRole = hasDirectMatch || hasBusinessRoleMatch;
    
    if (!hasAllowedRole) {
      const hasAnyRole = user.currentRole && user.currentRole !== 'client';
      
      if (!hasAnyRole) {
        return <Navigate to="/onboarding" replace />;
      }
      
      if (shouldDebug) {
        logger.debug('AuthGuard', 'Role not in allowed list', {
          allowedRoles,
          userCurrentRole: user.currentRole,
        });
      }
      return <Navigate to="/unauthorized" state={{ from: location, allowedRoles }} replace />;
    }
  }

  // CUSTOM REDIRECT
  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
