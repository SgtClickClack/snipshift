import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Persistent Layout component that wraps authenticated routes
 * This prevents the layout from re-mounting when navigating between
 * routes that share the same layout (e.g., Dashboard <-> Messages)
 * 
 * The layout persists across route changes, only the page content changes
 */
export function PersistentLayout() {
  useAuth();
  
  // This component will persist across route changes
  // The Outlet will render the current route's page component
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  );
}
