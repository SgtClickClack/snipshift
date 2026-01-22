import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/ui/loading-screen';

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
  // Minimalist guard: rely only on { user, isLoading } from AuthContext
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // STRICT RULE: MUST return loading screen if isLoading is TRUE
  // This prevents any navigation decisions while auth handshake is in progress
  if (isLoading) {
    return <LoadingScreen />;
  }

  // STRICT RULE: Can ONLY navigate to /login if isLoading is FALSE AND user is NULL
  // This ensures we never redirect during the auth handshake
  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
