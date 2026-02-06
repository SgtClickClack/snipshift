import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardRoute, normalizeVenueToBusiness } from '@/lib/roles';
import { LoadingScreen } from '@/components/ui/loading-screen';

export default function DashboardRedirect() {
  const { user, isLoading, isVenueMissing } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Venue users with no venue record must complete setup on hub (avoid redirect loop)
  if (isVenueMissing) {
    return <Navigate to="/onboarding/hub" replace />;
  }

  if (user.currentRole) {
    return <Navigate to={getDashboardRoute(normalizeVenueToBusiness(user.currentRole))} replace />;
  }

  // INVESTOR BRIEFING FIX: Redirect to /onboarding instead of /role-selection
  return <Navigate to="/onboarding" replace />;
}
