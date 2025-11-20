import React from 'react';
import { AuthGuard } from './auth-guard';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'hub' | 'professional' | 'brand' | 'trainer' | 'admin';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  return (
    <AuthGuard requireAuth={true} requiredRole={requiredRole}>
      {children}
    </AuthGuard>
  );
}