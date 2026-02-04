import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { isBusinessRole } from '@/lib/roles';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'hub' | 'professional' | 'brand' | 'trainer' | 'admin' | 'business' | 'venue';
  allowedRoles?: Array<'hub' | 'professional' | 'brand' | 'trainer' | 'admin' | 'business' | 'venue'>;
}

/**
 * ProtectedRoute - Guards authenticated routes with proper loading states.
 * 
 * PERFORMANCE: Uses isSystemReady to ensure both Firebase AND Postgres profile
 * are fully hydrated before rendering children. This prevents:
 * - Flash of unauthenticated content
 * - Flash of loading skeletons
 * - Hydration waterfall delays
 * 
 * Shows LoadingScreen while auth is transitioning to prevent content flash.
 * Redirects to /login if user is not authenticated.
 * Checks role requirements if specified.
 */
export function ProtectedRoute({ children, requiredRole, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, isTransitioning, hasFirebaseUser, isSystemReady } = useAuth();
  const location = useLocation();

  // Check for E2E mode test user
  const isE2EMode = typeof window !== 'undefined' && 
    (localStorage.getItem('E2E_MODE') === 'true' || import.meta.env.VITE_E2E === '1');
  const hasE2ETestUser = isE2EMode && typeof window !== 'undefined' && 
    !!(sessionStorage.getItem('hospogo_test_user') || localStorage.getItem('hospogo_test_user'));

  // PERFORMANCE: Show stable loading UI until system is FULLY ready
  // This includes: Firebase auth + /api/me + /api/venues/me (for venue users)
  // Using isSystemReady instead of just isLoading/isTransitioning prevents
  // the "flash" of content before the entire auth hydration completes
  if (isLoading || isTransitioning || !isSystemReady) {
    // E2E mode bypass - don't block if test user is present
    if (!hasE2ETestUser) {
      return <LoadingScreen />;
    }
  }

  // Not authenticated - redirect to login
  // RESILIENCE: Check for recently valid auth (prevents redirect during token refresh)
  // Firebase token refresh can briefly cause hasFirebaseUser to be false
  const hasRecentAuth = typeof window !== 'undefined' && 
    sessionStorage.getItem('hospogo_auth_timestamp') && 
    Date.now() - parseInt(sessionStorage.getItem('hospogo_auth_timestamp') || '0') < 10000;
  
  const hasAuth = hasFirebaseUser || hasE2ETestUser || hasRecentAuth;
  if (!hasAuth || (!user && !hasRecentAuth)) {
    // Store the attempted URL for post-login redirect
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role requirements
  const userRole = user.currentRole || user.role || '';
  const userRoles = user.roles || [userRole];

  if (requiredRole) {
    // For business-type roles, use isBusinessRole helper for consistency
    if (['hub', 'business', 'venue', 'brand'].includes(requiredRole)) {
      if (!isBusinessRole(userRole) && !userRoles.some(r => isBusinessRole(r))) {
        return <Navigate to="/unauthorized" replace />;
      }
    } else if (userRole !== requiredRole && !userRoles.includes(requiredRole)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(role => {
      // For business-type roles, use isBusinessRole helper
      if (['hub', 'business', 'venue', 'brand'].includes(role)) {
        return isBusinessRole(userRole) || userRoles.some(r => isBusinessRole(r));
      }
      return userRole === role || userRoles.includes(role);
    });

    if (!hasAllowedRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}