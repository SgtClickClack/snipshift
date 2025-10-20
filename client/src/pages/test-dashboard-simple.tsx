import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function TestDashboardSimple() {
  const { user, authError, setAuthError } = useAuth();
  const { toast } = useToast();
  
  const getDashboardTitle = () => {
    if (!user?.currentRole) return 'Dashboard';
    return user.currentRole.charAt(0).toUpperCase() + user.currentRole.slice(1) + ' Dashboard';
  };
  
  const getDashboardTestId = () => {
    if (!user?.currentRole) return 'dashboard';
    return `${user.currentRole}-dashboard`;
  };

  // Display error message if there's an auth error
  useEffect(() => {
    if (authError) {
      toast({
        title: "Access Denied",
        description: authError,
        variant: "destructive",
      });
      // Clear the error after a delay to allow test to find it
      setTimeout(() => {
        setAuthError(null);
      }, 2000);
    }
  }, [authError, toast, setAuthError]);
  
  return (
    <div data-testid={getDashboardTestId()}>
      <h1>{getDashboardTitle()}</h1>
      <p>This is a simple test dashboard</p>
      <p data-testid="current-role">{user?.currentRole ? user.currentRole.charAt(0).toUpperCase() + user.currentRole.slice(1) : 'No Role'}</p>
      
      {/* Error message for testing */}
      {authError && (
        <div data-testid="error-message" className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {authError}
        </div>
      )}
    </div>
  );
}

