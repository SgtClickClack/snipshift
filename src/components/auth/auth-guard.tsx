import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/loading/loading-spinner';

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
  const { user, isLoading, hasFirebaseUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isOnboardingPath = location.pathname === '/onboarding' || location.pathname.startsWith('/onboarding/');

  useEffect(() => {
    if (isLoading) return;

    if (hasFirebaseUser && !user && !isOnboardingPath) {
      navigate('/onboarding', { replace: true });
      return;
    }

    if (hasFirebaseUser && user && isOnboardingPath) {
      navigate('/dashboard', { replace: true });
    }
  }, [hasFirebaseUser, user, isOnboardingPath, isLoading, navigate]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (hasFirebaseUser && !user && !isOnboardingPath) {
    return <LoadingSpinner />;
  }

  if (hasFirebaseUser && user && isOnboardingPath) {
    return <LoadingSpinner />;
  }

  if (requireAuth && !hasFirebaseUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
