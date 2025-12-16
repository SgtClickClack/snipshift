import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardRoute } from '@/lib/roles';

/**
 * Unauthorized Page
 * 
 * Shown when a user tries to access a route they don't have permission for.
 * For example, a professional trying to access /shop/dashboard.
 */
export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoToDashboard = () => {
    if (user?.currentRole) {
      const dashboardRoute = getDashboardRoute(user.currentRole);
      navigate(dashboardRoute);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
            <ShieldX className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-muted-foreground">
            You don't have permission to access this page. This area is restricted to users with a different role.
          </p>

          {user && (
            <p className="text-sm text-muted-foreground">
              You are currently logged in as: <span className="font-medium text-foreground">{user.currentRole || 'Unknown Role'}</span>
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={handleGoBack}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            <Button 
              onClick={handleGoToDashboard}
              variant="default"
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Go to My Dashboard
            </Button>
          </div>

          {/* Help text */}
          <p className="text-xs text-muted-foreground">
            If you believe you should have access, please contact support or try switching your role in settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

