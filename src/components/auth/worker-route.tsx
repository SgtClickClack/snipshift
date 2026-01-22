import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/protected-route';

/**
 * WorkerRoute
 *
 * Clean-break route protection for worker-only surfaces.
 * Prevents venue accounts from accessing worker dashboards/routes.
 */
export function WorkerRoute() {
  const { user, isLoading } = useAuth();

  // If auth is ready and user is known, send clearly-mismatched roles to their correct home.
  if (!isLoading && (user?.currentRole === 'business' || user?.currentRole === 'hub')) {
    return <Navigate to="/venue/dashboard" replace />;
  }

  return (
    <ProtectedRoute requiredRole="professional">
      <Outlet />
    </ProtectedRoute>
  );
}

