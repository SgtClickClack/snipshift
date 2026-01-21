import { Navigate } from 'react-router-dom';
import { useAuth, DEMO_AUTH_BYPASS_LOADING } from '@/contexts/AuthContext';
import { getDashboardRoute } from '@/lib/roles';
import { LoadingScreen } from '@/components/ui/loading-screen';

export default function DashboardRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    // DEMO: Send to venue dashboard instead of /login so /dashboard shows a dashboard
    return <Navigate to={DEMO_AUTH_BYPASS_LOADING ? '/venue/dashboard' : '/login'} replace />;
  }

  if (user.currentRole) {
    return <Navigate to={getDashboardRoute(user.currentRole)} replace />;
  }

  return <Navigate to="/role-selection" replace />;
}

