import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  // STRICT RULE: MUST return loading screen if isLoading is TRUE
  // This prevents any navigation decisions while auth handshake is in progress
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Automatic redirect: If user is authenticated and on a public-only route like /login, redirect to dashboard
  useEffect(() => {
    if (!isLoading && user && location.pathname === '/login') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, location.pathname, navigate]);

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
