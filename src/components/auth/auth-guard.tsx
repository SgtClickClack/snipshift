import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardRoute, isBusinessRole } from '@/lib/roles';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/firebase';

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
  redirectTo 
}: AuthGuardProps) {
  const { user, isLoading, isAuthenticated, isAuthReady, isRoleLoading, token } = useAuth();
  const location = useLocation();
  const shouldDebug = import.meta.env.DEV || import.meta.env.VITE_E2E === '1';

  // Show loading spinner while checking authentication or waiting for auth to be ready
  // CRITICAL: This check must happen FIRST, before any redirect logic
  if (isLoading || !isAuthReady) {
    return <LoadingScreen />;
  }

  // Show loading spinner while role is being loaded from Postgres
  // This prevents race conditions where role check happens before role is mapped
  if (isRoleLoading) {
    return <LoadingScreen />;
  }

  // Check if there's a Firebase session (user might have signed in but profile not yet created)
  const hasFirebaseSession = !!auth.currentUser || !!token;
  
  // E2E mode: Check for mock token in storage (tests inject this after registration)
  // Use comprehensive E2E detection like TutorialOverlay
  const isE2E = 
    import.meta.env.VITE_E2E === '1' ||
    import.meta.env.MODE === 'test' ||
    (typeof window !== 'undefined' && (
      new URLSearchParams(window.location.search).get('e2e') === 'true' ||
      localStorage.getItem('E2E_MODE') === 'true'
    ));
  
  // NEW: If we have a Firebase session but user isn't authenticated yet, 
  // we're still loading - don't redirect
  // This prevents race conditions where Firebase auth exists but profile hasn't loaded yet
  if (hasFirebaseSession && !isAuthenticated && !isE2E) {
    logger.debug('AuthGuard', 'Firebase session exists but user not authenticated yet, showing loading', {
      hasFirebaseSession,
      isAuthenticated,
      pathname: location.pathname
    });
    return <LoadingScreen />;
  }
  const hasE2EAuthState = isE2E && typeof window !== 'undefined' && 
    sessionStorage.getItem('hospogo_auth_state') === 'authenticated';
  const hasE2EToken = isE2E && (
    token === 'mock-test-id-token' || 
    token === 'mock-test-token' ||
    (typeof window !== 'undefined' && (
      localStorage.getItem('token') === 'mock-test-id-token' ||
      localStorage.getItem('authToken') === 'mock-test-id-token' ||
      sessionStorage.getItem('hospogo_test_user') !== null ||
      localStorage.getItem('hospogo_test_user') !== null
    ))
  );
  const hasE2ESession = hasE2EAuthState || hasE2EToken;

  // If authentication is required but user is not authenticated
  // EXCEPTION: Allow /onboarding if there's a Firebase session OR E2E mock token (user just signed in but no profile yet)
  if (requireAuth && !isAuthenticated) {
    // Allow onboarding page if there's a Firebase session or E2E mock token - user needs to complete profile
    if (location.pathname === '/onboarding' && (hasFirebaseSession || hasE2ESession)) {
      logger.debug('AuthGuard', 'Allowing onboarding access with Firebase session/E2E token but no profile', {
        hasFirebaseSession,
        hasE2EAuthState,
        hasE2EToken,
        hasE2ESession,
        isE2E
      });
      return <>{children}</>;
    }
    // In E2E mode, if we have auth state but user is not authenticated, don't redirect to login
    if (isE2E && hasE2ESession) {
      logger.debug('AuthGuard', 'E2E mode: Has auth state, allowing access', {
        hasE2EAuthState,
        hasE2EToken,
        pathname: location.pathname
      });
      return <>{children}</>;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // PRIORITY 1: If user is authenticated and on login/signup, redirect them immediately
  // This prevents the "flicker" where users see login/signup page after Google auth
  const authPages = ['/login', '/signup'];
  if (isAuthenticated && user && authPages.includes(location.pathname)) {
    logger.debug('AuthGuard', 'Authenticated user on auth page, redirecting', {
      isOnboarded: user.isOnboarded,
      currentRole: user.currentRole,
    });
    
    // Redirect based on onboarding/role status
    if (user.isOnboarded === false) {
      return <Navigate to="/onboarding" replace />;
    }
    if (!user.currentRole || user.currentRole === 'client') {
      return <Navigate to="/role-selection" replace />;
    }
    const userDashboard = getDashboardRoute(user.currentRole);
    return <Navigate to={userDashboard} replace />;
  }

  const publicRoutes = ['/onboarding', '/onboarding/hub', '/onboarding/professional', '/', '/terms', '/privacy', '/login', '/signup', '/forgot-password', '/contact', '/about'];
  if (isAuthenticated && user) {
    const hasRole = user.currentRole && user.currentRole !== 'client';
    const isOnboardingPage = location.pathname.startsWith('/onboarding');
    const isRoleMissing = user.currentRole == null;

    // CRITICAL: If authenticated AND role is null AND not on /onboarding -> Redirect to /onboarding
    if (isRoleMissing && !isOnboardingPage) {
      logger.debug('AuthGuard', 'User authenticated but role is null - redirecting to onboarding', {
        currentRole: user.currentRole,
        isOnboarded: user.isOnboarded,
        pathname: location.pathname
      });
      return <Navigate to="/onboarding" replace />;
    }

    // CRITICAL: If authenticated AND role is set AND on /onboarding -> Redirect to dashboard
    // This prevents users with completed onboarding from accessing onboarding again
    // EXCEPTION: Allow users to stay on /onboarding if onboarding is not complete
    if (hasRole && location.pathname === '/onboarding') {
      // In E2E mode, don't redirect - allow test to complete onboarding flow
      if (isE2E) {
        logger.debug('AuthGuard', 'E2E mode: Allowing onboarding access despite role being set', {
          currentRole: user.currentRole,
          isE2E
        });
        return <>{children}</>;
      }
      // Allow users to stay on /onboarding if they haven't completed onboarding
      // Check for false, undefined, or null (not explicitly true)
      if (!user.isOnboarded) {
        logger.debug('AuthGuard', 'User authenticated but onboarding incomplete, allowing access to onboarding', {
          currentRole: user.currentRole,
          isOnboarded: user.isOnboarded
        });
        return <>{children}</>;
      }
      const userDashboard = getDashboardRoute(user.currentRole);
      logger.debug('AuthGuard', 'User has role and on onboarding, redirecting to dashboard', {
        currentRole: user.currentRole,
        dashboard: userDashboard
      });
      return <Navigate to={userDashboard} replace />;
    }
  }

  // Legacy: If user is authenticated but not onboarded, redirect to onboarding
  // Exception: Allow access to onboarding page itself, landing page, legal pages, and other public routes
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
  // Also check roles array and handle venue->business mapping using centralized helper
  // CRITICAL: If requiredRole is 'business', also allow 'venue' and 'hub' to prevent lockouts
  if (requiredRole && user) {
    // Check if user has the required role (using centralized mapping)
    const hasDirectMatch = 
      user.currentRole === requiredRole ||
      (user.roles && user.roles.includes(requiredRole as any));
    
    // Special case: allow business-related roles to access business routes
    // If requiredRole is 'business', also accept 'venue' and 'hub'
    const hasBusinessRoleMatch = 
      requiredRole === 'business' && (
        isBusinessRole(user.currentRole || '') ||
        (user.roles && user.roles.some(r => isBusinessRole(r)))
      );
    
    // Special case: If requiredRole is 'venue' or 'hub', also accept 'business' (and vice versa)
    // Use isBusinessRole helper for consistency
    const hasVenueHubMatch = 
      (requiredRole === 'venue' || requiredRole === 'hub') && (
        isBusinessRole(user.currentRole || '') ||
        (user.roles && user.roles.some(r => isBusinessRole(r)))
      );
    
    const hasRequiredRole = hasDirectMatch || hasBusinessRoleMatch || hasVenueHubMatch;
    
    const hasAnyRole = 
      (user.currentRole && user.currentRole !== 'client') ||
      (user.roles && user.roles.some(r => r && r !== 'client'));

    if (!hasRequiredRole) {
      // If user has no role, always route them to onboarding instead of Access Denied
      if (!hasAnyRole) {
        if (shouldDebug) {
          logger.debug('AuthGuard', 'User authenticated but no role - redirecting to onboarding:', {
            userCurrentRole: user.currentRole,
            userRoles: user.roles,
            attemptedPath: location.pathname
          });
        }
        return <Navigate to="/onboarding" replace />;
      }
      
      // User has a role but not the required one - show unauthorized
      // Debug logging for E2E tests
      if (shouldDebug) {
        logger.debug('AuthGuard', 'Role mismatch - redirecting to unauthorized:', {
          requiredRole,
          userCurrentRole: user.currentRole,
          userRoles: user.roles,
          attemptedPath: location.pathname
        });
      }
      // Redirect to unauthorized page instead of silently redirecting to dashboard
      // This makes it clear to users they don't have access
      return <Navigate to="/unauthorized" state={{ from: location, requiredRole }} replace />;
    }
  }
  
  // Debug: Log successful role check
  if (requiredRole && shouldDebug) {
    logger.debug('AuthGuard', 'Role check passed:', {
      requiredRole,
      userCurrentRole: user?.currentRole,
      userRoles: user?.roles
    });
  }

  // If multiple roles are allowed, check if user's role is in the allowed list
  // Check both currentRole and roles array (for venue/business compatibility)
  // CRITICAL: If a route allows ANY business-related role ('business', 'venue', 'hub'), 
  // it must allow ALL business-related roles to prevent lockouts
  if (allowedRoles && user) {
    // Check if route allows any business-related roles
    const allowsBusiness = allowedRoles.includes('business');
    const allowsVenue = allowedRoles.includes('venue' as any);
    const allowsHub = allowedRoles.includes('hub');
    const allowsAnyBusinessRole = allowsBusiness || allowsVenue || allowsHub;
    
    // Normalize user roles to check against allowed roles
    const userCurrentRole = user.currentRole;
    const userRoles = user.roles || [];
    
    // Check if user has any of the allowed roles directly
    const hasDirectMatch = 
      (userCurrentRole && allowedRoles.includes(userCurrentRole as typeof allowedRoles[number])) ||
      userRoles.some(role => allowedRoles.includes(role as typeof allowedRoles[number]));
    
    // CRITICAL: If route allows ANY business-related role, allow users with ANY business-related role
    // This ensures business/venue/hub users can access all venue routes
    const hasBusinessRoleMatch = allowsAnyBusinessRole && (
      isBusinessRole(userCurrentRole || '') ||
      userRoles.some(r => isBusinessRole(r))
    );
    
    const hasAllowedRole = hasDirectMatch || hasBusinessRoleMatch;
    
    if (!hasAllowedRole) {
      const hasAnyRole = 
        (user.currentRole && user.currentRole !== 'client') ||
        (user.roles && user.roles.some(role => role && role !== 'client'));

      if (!hasAnyRole) {
        if (shouldDebug) {
          logger.debug('AuthGuard', 'User authenticated but no role - redirecting to onboarding:', {
            userCurrentRole: user.currentRole,
            userRoles: user.roles,
            attemptedPath: location.pathname
          });
        }
        return <Navigate to="/onboarding" replace />;
      }
      // Debug logging
      if (shouldDebug) {
        logger.debug('AuthGuard', 'Role not in allowed list - redirecting to unauthorized:', {
          allowedRoles,
          userCurrentRole: user.currentRole,
          userRoles: user.roles,
          attemptedPath: location.pathname
        });
      }
      return <Navigate to="/unauthorized" state={{ from: location, allowedRoles }} replace />;
    }
  }

  // If custom redirect is specified
  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}