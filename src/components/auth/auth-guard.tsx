import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayoutSkeleton } from '@/components/loading/skeleton-loaders';

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
  // Minimalist guard: rely on Firebase session + DB profile
  const { user, isLoading, hasFirebaseUser, isVenueMissing } = useAuth();
  const location = useLocation();

  const isOnboardingPath = location.pathname === '/onboarding' || location.pathname.startsWith('/onboarding/');

  // Check for E2E mode test user (for Playwright tests)
  const isE2EMode = typeof window !== 'undefined' && 
    (localStorage.getItem('E2E_MODE') === 'true' || import.meta.env.VITE_E2E === '1');
  const hasE2ETestUser = isE2EMode && typeof window !== 'undefined' && 
    !!sessionStorage.getItem('hospogo_test_user');
  const hasAuth = hasFirebaseUser || hasE2ETestUser;

  // DISABLED: Global Redirect Lockdown - AuthContext is the sole authority for redirects.
  // These useEffects conflicted with AuthContext rules and caused flashing. Routes don't mount until
  // isNavigationLocked is false, at which point AuthContext has already navigated to the correct path.
  // useEffect(() => {
  //   if (isLoading) return;
  //   if (hasFirebaseUser && !user && !isOnboardingPath) {
  //     navigate('/onboarding', { replace: true });
  //     return;
  //   }
  //   if (hasFirebaseUser && user && user.isOnboarded === true && isOnboardingPath && !isVenueMissing) {
  //     navigate('/dashboard', { replace: true });
  //   }
  // }, [hasFirebaseUser, user, isOnboardingPath, isVenueMissing, isLoading, navigate]);

  if (isLoading) {
    return <DashboardLayoutSkeleton />;
  }

  if (hasFirebaseUser && !user && !isOnboardingPath) {
    return <DashboardLayoutSkeleton />;
  }

  // Show skeleton on onboarding paths when user is onboarded and not venue-missing (mid-redirect to dashboard).
  // When isVenueMissing, allow hub to render so user can complete venue setup.
  if (hasFirebaseUser && user && user.isOnboarded === true && isOnboardingPath && !isVenueMissing) {
    return <DashboardLayoutSkeleton />;
  }

  if (requireAuth && !hasAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
