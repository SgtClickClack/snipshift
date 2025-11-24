import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardRoute } from '@/lib/roles';

export default function DashboardRedirect() {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.currentRole) {
    return <Navigate to={getDashboardRoute(user.currentRole)} replace />;
  }

  return <Navigate to="/role-selection" replace />;
}

