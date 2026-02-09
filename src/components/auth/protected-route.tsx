import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { isBusinessRole, isFounderEmail } from '@/lib/roles';

// INVESTOR BRIEFING FIX: Removed 'brand' and 'trainer' roles - system only knows Venue Owner and Professional
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'hub' | 'professional' | 'admin' | 'business' | 'venue';
  allowedRoles?: Array<'hub' | 'professional' | 'admin' | 'business' | 'venue'>;
}

/**
 * ProtectedRoute - Guards authenticated routes with proper loading states.
 * 
 * HOSPOGO_CORE_SYSTEM_RECOVERY: Added 500ms Grace Period
 * 
 * PERFORMANCE: Uses isSystemReady to ensure both Firebase AND Postgres profile
 * are fully hydrated before rendering children. This prevents:
 * - Flash of unauthenticated content
 * - Flash of loading skeletons
 * - Hydration waterfall delays
 * 
 * GRACE PERIOD: When auth is in a "loading" state, we wait 500ms before
 * making any redirect decisions. This prevents premature redirects to /login
 * during the Firebase auth handshake window.
 * 
 * Shows LoadingScreen while auth is transitioning to prevent content flash.
 * Redirects to /login if user is not authenticated AFTER grace period expires.
 * Checks role requirements if specified.
 */
export function ProtectedRoute({ children, requiredRole, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, isTransitioning, hasFirebaseUser, isSystemReady, isHydrating } = useAuth();
  const location = useLocation();
  
  // GRACE PERIOD: Track whether we've waited long enough to make redirect decisions
  // This prevents seeing 'loading' as 'not authenticated' during Firebase handshake
  const [gracePeriodExpired, setGracePeriodExpired] = useState(false);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    // Start grace period timer when component mounts or when loading state changes
    if (isLoading || isTransitioning || !isSystemReady) {
      // Reset grace period when auth is still loading
      setGracePeriodExpired(false);
      
      // Clear any existing timer
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current);
      }
      
      // Set new 500ms grace period timer
      graceTimerRef.current = setTimeout(() => {
        setGracePeriodExpired(true);
      }, 500);
    } else {
      // Auth is ready - grace period is effectively expired (no need to wait)
      setGracePeriodExpired(true);
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current);
      }
    }
    
    return () => {
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current);
      }
    };
  }, [isLoading, isTransitioning, isSystemReady]);

  // Check for E2E mode test user
  const isE2EMode = typeof window !== 'undefined' && 
    (localStorage.getItem('E2E_MODE') === 'true' || import.meta.env.VITE_E2E === '1');
  const hasE2ETestUser = isE2EMode && typeof window !== 'undefined' && 
    !!(sessionStorage.getItem('hospogo_test_user') || localStorage.getItem('hospogo_test_user'));

  // REDIRECT STORM FIX: Absolute freeze while Firebase hasn't spoken yet.
  // No redirect to /login, no content — just loading screen.
  if (isHydrating) {
    return <LoadingScreen />;
  }

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

  // GRACE PERIOD CHECK: Don't redirect during the 500ms grace period
  // This gives Firebase time to complete its auth handshake
  if (!gracePeriodExpired) {
    return <LoadingScreen />;
  }

  // Not authenticated - redirect to login
  // RESILIENCE: Check for recently valid auth (prevents redirect during token refresh)
  // Firebase token refresh can briefly cause hasFirebaseUser to be false
  const hasRecentAuth = typeof window !== 'undefined' &&
    sessionStorage.getItem('hospogo_auth_timestamp') &&
    Date.now() - parseInt(sessionStorage.getItem('hospogo_auth_timestamp') || '0') < 10000;

  const hasAuth = hasFirebaseUser || hasE2ETestUser || hasRecentAuth;
  if (!hasAuth || (!user && !hasRecentAuth)) {
    // REDIRECT STORM FIX v2: Belt-and-suspenders — if isHydrating is STILL true
    // (e.g. due to a React batching edge case), never emit <Navigate>.
    // Return null to render nothing — the Router Hard Guard in AppRoutes is the primary defense.
    if (isHydrating) {
      return null;
    }
    // Store the attempted URL for post-login redirect
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role requirements (guard: user may be null when hasRecentAuth)
  const userRole = String(user?.currentRole ?? (user as { role?: unknown })?.role ?? '');
  const userRoles = (user?.roles ?? [userRole]).map(r => String(r ?? ''));

  if (requiredRole) {
    // INVESTOR BRIEFING FIX: Removed 'brand' from business-type role check
    // For business-type roles, use isBusinessRole helper for consistency
    if (['hub', 'business', 'venue'].includes(requiredRole)) {
      if (!isBusinessRole(userRole) && !userRoles.some(r => isBusinessRole(r))) {
        return <Navigate to="/unauthorized" replace />;
      }
    } else if (userRole !== requiredRole && !userRoles.includes(String(requiredRole))) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  if (allowedRoles && allowedRoles.length > 0) {
    // FOUNDER ACCESS OVERRIDE: Founders bypass all role checks for admin routes
    // This ensures Rick can access CTO Dashboard during investor demos
    // even if the 'admin' role isn't explicitly assigned in the database
    const isFounder = isFounderEmail(user?.email ?? '');
    
    const hasAllowedRole = allowedRoles.some(role => {
      // INVESTOR BRIEFING FIX: Removed 'brand' from business-type role check
      // For business-type roles, use isBusinessRole helper
      if (['hub', 'business', 'venue'].includes(role)) {
        return isBusinessRole(userRole) || userRoles.some(r => isBusinessRole(r));
      }
      return userRole === role || userRoles.includes(String(role));
    });

    // Allow access if user is founder OR has required role
    if (!isFounder && !hasAllowedRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}