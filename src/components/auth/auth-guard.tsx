import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  const isOnboardingPath = location.pathname === '/onboarding' || location.pathname.startsWith('/onboarding/');

  // Check for E2E mode test user (for Playwright tests)
  const isE2EMode = typeof window !== 'undefined' && 
    (localStorage.getItem('E2E_MODE') === 'true' || import.meta.env.VITE_E2E === '1');
  const hasE2ETestUser = isE2EMode && typeof window !== 'undefined' && 
    !!sessionStorage.getItem('hospogo_test_user');
  const hasAuth = hasFirebaseUser || hasE2ETestUser;

  useEffect(() => {
    if (isLoading) return;

    if (hasFirebaseUser && !user && !isOnboardingPath) {
      navigate('/onboarding', { replace: true });
      return;
    }

    // Redirect to dashboard only when isOnboarded is true (single source of truth from API).
    // Exception: do NOT redirect from /onboarding/hub when venue is missing (404) — user must complete venue setup.
    if (hasFirebaseUser && user && user.isOnboarded === true && isOnboardingPath && !isVenueMissing) {
      navigate('/dashboard', { replace: true });
    }
  }, [hasFirebaseUser, user, isOnboardingPath, isVenueMissing, isLoading, navigate]);

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
