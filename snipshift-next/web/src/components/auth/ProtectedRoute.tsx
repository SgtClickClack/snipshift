import React from 'react';
import { AuthGuard } from './AuthGuard';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'professional' | 'business';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  return (
    <AuthGuard requireAuth={true} requiredRole={requiredRole}>
      {children}
    </AuthGuard>
  );
}