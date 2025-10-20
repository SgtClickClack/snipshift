import React from 'react';
import { AuthGuard } from './AuthGuard';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'hub' | 'professional' | 'brand' | 'trainer' | 'admin' | 'shop' | 'barber';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  return (
    <AuthGuard requireAuth={true} requiredRole={requiredRole}>
      {children}
    </AuthGuard>
  );
}