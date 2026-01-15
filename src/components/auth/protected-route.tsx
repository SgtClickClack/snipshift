import React from 'react';
import { AuthGuard } from './auth-guard';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'hub' | 'professional' | 'brand' | 'trainer' | 'admin' | 'business' | 'venue';
  allowedRoles?: Array<'hub' | 'professional' | 'brand' | 'trainer' | 'admin' | 'business' | 'venue'>;
}

export function ProtectedRoute({ children, requiredRole, allowedRoles }: ProtectedRouteProps) {
  return (
    <AuthGuard requireAuth={true} requiredRole={requiredRole} allowedRoles={allowedRoles}>
      {children}
    </AuthGuard>
  );
}