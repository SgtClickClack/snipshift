import React from 'react';
import { AuthGuard } from './auth-guard';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'hub' | 'professional' | 'brand' | 'trainer' | 'admin' | 'business' | 'venue';
  allowedRoles?: Array<'hub' | 'professional' | 'brand' | 'trainer' | 'admin' | 'business' | 'venue'>;
}

export function ProtectedRoute({ children, requiredRole, allowedRoles }: ProtectedRouteProps) {
  // DEMO: Disable bounce-back during onboarding — never redirect to /login when on /onboarding.
  if (typeof window !== 'undefined' && (window.location.pathname === '/onboarding' || window.location.pathname.startsWith('/onboarding/'))) {
    return <>{children}</>;
  }
  return (
    <AuthGuard requireAuth={true} requiredRole={requiredRole} allowedRoles={allowedRoles}>
      {children}
    </AuthGuard>
  );
}