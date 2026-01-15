import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/protected-route';

/**
 * VenueRoute
 *
 * Clean-break route protection for venue-only surfaces.
 * Prevents worker/professional accounts from accessing venue dashboards/routes.
 */
export function VenueRoute() {
  const { user, isAuthReady } = useAuth();

  // If auth is ready and user is known, send clearly-mismatched roles to their correct home.
  if (isAuthReady && user?.currentRole === 'professional') {
    return <Navigate to="/worker/dashboard" replace />;
  }

  return (
    <ProtectedRoute allowedRoles={['hub', 'business', 'venue']}>
      <Outlet />
    </ProtectedRoute>
  );
}

