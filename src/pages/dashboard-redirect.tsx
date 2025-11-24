import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardRoute } from '@/lib/roles';
import { LoadingScreen } from '@/components/ui/loading-screen';

export default function DashboardRedirect() {
  const { user, isLoading } = useAuth();
  
  console.log('DashboardRedirect: Rendering', { user, isLoading, currentRole: user?.currentRole });

  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    console.log('DashboardRedirect: No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (user.currentRole) {
    const target = getDashboardRoute(user.currentRole);
    console.log('DashboardRedirect: Has role, redirecting to', target);
    return <Navigate to={target} replace />;
  }

  console.log('DashboardRedirect: No role, redirecting to selection');
  return <Navigate to="/role-selection" replace />;
}

