import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  FileX, 
  UserX, 
  CreditCard, 
  Database,
  WifiOff,
  Clock,
  Shield,
  RefreshCw,
  Home,
  Mail,
  Phone
} from "lucide-react";

interface ErrorStateProps {
  type: '404' | '500' | 'auth' | 'payment' | 'network' | 'timeout' | 'rate-limit' | 'maintenance' | 'generic';
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  onContactSupport?: () => void;
}

export default function ErrorState({ 
  type, 
  title, 
  message, 
  onRetry, 
  onGoHome, 
  onContactSupport 
}: ErrorStateProps) {
  const getErrorConfig = () => {
    switch (type) {
      case '404':
        return {
          icon: <FileX className="h-12 w-12 text-orange-600" />,
          title: title || "Page Not Found",
          message: message || "The page you're looking for doesn't exist or has been moved.",
          actions: [
            { label: "Go Home", onClick: onGoHome, variant: "default" as const },
            { label: "Go Back", onClick: () => window.history.back(), variant: "outline" as const }
          ]
        };
      case '500':
        return {
          icon: <AlertTriangle className="h-12 w-12 text-red-600" />,
          title: title || "Server Error",
          message: message || "Something went wrong on our end. We're working to fix it.",
          actions: [
            { label: "Try Again", onClick: onRetry, variant: "default" as const },
            { label: "Go Home", onClick: onGoHome, variant: "outline" as const }
          ]
        };
      case 'auth':
        return {
          icon: <Shield className="h-12 w-12 text-red-600" />,
          title: title || "Access Denied",
          message: message || "You don't have permission to access this resource.",
          actions: [
            { label: "Go Home", onClick: onGoHome, variant: "default" as const },
            { label: "Contact Admin", onClick: onContactSupport, variant: "outline" as const }
          ]
        };
      case 'payment':
        return {
          icon: <CreditCard className="h-12 w-12 text-red-600" />,
          title: title || "Payment Failed",
          message: message || "There was an issue processing your payment. Please try again.",
          actions: [
            { label: "Try Again", onClick: onRetry, variant: "default" as const },
            { label: "Update Payment Method", onClick: onContactSupport, variant: "outline" as const }
          ]
        };
      case 'network':
        return {
          icon: <WifiOff className="h-12 w-12 text-orange-600" />,
          title: title || "Connection Lost",
          message: message || "Please check your internet connection and try again.",
          actions: [
            { label: "Retry", onClick: onRetry, variant: "default" as const },
            { label: "Go Offline", onClick: () => {}, variant: "outline" as const }
          ]
        };
      case 'timeout':
        return {
          icon: <Clock className="h-12 w-12 text-yellow-600" />,
          title: title || "Request Timed Out",
          message: message || "The request is taking too long. Please try again.",
          actions: [
            { label: "Try Again", onClick: onRetry, variant: "default" as const },
            { label: "Go Home", onClick: onGoHome, variant: "outline" as const }
          ]
        };
      case 'rate-limit':
        return {
          icon: <AlertTriangle className="h-12 w-12 text-purple-600" />,
          title: title || "Too Many Requests",
          message: message || "You're making requests too quickly. Please wait a moment.",
          actions: [
            { label: "Wait and Retry", onClick: onRetry, variant: "default" as const },
            { label: "Go Home", onClick: onGoHome, variant: "outline" as const }
          ]
        };
      case 'maintenance':
        return {
          icon: <Database className="h-12 w-12 text-blue-600" />,
          title: title || "System Maintenance",
          message: message || "We're currently performing maintenance. Please check back soon.",
          actions: [
            { label: "Check Status", onClick: onRetry, variant: "default" as const },
            { label: "Contact Support", onClick: onContactSupport, variant: "outline" as const }
          ]
        };
      default:
        return {
          icon: <AlertTriangle className="h-12 w-12 text-red-600" />,
          title: title || "Something Went Wrong",
          message: message || "An unexpected error occurred. Please try again.",
          actions: [
            { label: "Try Again", onClick: onRetry, variant: "default" as const },
            { label: "Go Home", onClick: onGoHome, variant: "outline" as const }
          ]
        };
    }
  };

  const config = getErrorConfig();

  return (
    <div className="min-h-screen bg-steel-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md" data-testid={`${type}-error`}>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-sm">
            {config.icon}
          </div>
          <CardTitle className="text-xl text-steel-900">
            {config.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <p className="text-steel-600 text-center">
            {config.message}
          </p>

          {type === 'rate-limit' && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Please wait before making another request. You can try again in a few minutes.
              </AlertDescription>
            </Alert>
          )}

          {type === 'maintenance' && (
            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                Maintenance is usually completed within 30 minutes. We'll be back online soon!
              </AlertDescription>
            </Alert>
          )}

          {type === 'payment' && (
            <Alert>
              <CreditCard className="h-4 w-4" />
              <AlertDescription>
                Common issues: expired card, insufficient funds, or bank restrictions.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            {config.actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant}
                className="w-full"
                onClick={action.onClick}
                data-testid={action.label.toLowerCase().replace(/\s+/g, '-') + '-button'}
              >
                {action.label}
              </Button>
            ))}
          </div>

          {onContactSupport && (
            <div className="pt-4 border-t">
              <p className="text-sm text-steel-600 text-center mb-3">
                Need help? Contact our support team
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open('mailto:support@snipshift.com')}
                  data-testid="contact-support"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open('tel:+1234567890')}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Specific error state components for common use cases
export function NotFoundError({ onGoHome }: { onGoHome?: () => void }) {
  return (
    <ErrorState 
      type="404" 
      onGoHome={onGoHome}
      data-testid="404-error"
    />
  );
}

export function ServerError({ onRetry, onGoHome }: { onRetry?: () => void; onGoHome?: () => void }) {
  return (
    <ErrorState 
      type="500" 
      onRetry={onRetry}
      onGoHome={onGoHome}
      data-testid="server-error"
    />
  );
}

export function AuthError({ onGoHome, onContactSupport }: { 
  onGoHome?: () => void; 
  onContactSupport?: () => void;
}) {
  return (
    <ErrorState 
      type="auth" 
      onGoHome={onGoHome}
      onContactSupport={onContactSupport}
      data-testid="unauthorized-error"
    />
  );
}

export function PaymentError({ onRetry, onContactSupport }: { 
  onRetry?: () => void; 
  onContactSupport?: () => void;
}) {
  return (
    <ErrorState 
      type="payment" 
      onRetry={onRetry}
      onContactSupport={onContactSupport}
      data-testid="payment-error"
    />
  );
}

export function NetworkError({ onRetry, onGoHome }: { 
  onRetry?: () => void; 
  onGoHome?: () => void;
}) {
  return (
    <ErrorState 
      type="network" 
      onRetry={onRetry}
      onGoHome={onGoHome}
      data-testid="connection-error"
    />
  );
}

export function MaintenanceError({ onRetry, onContactSupport }: { 
  onRetry?: () => void; 
  onContactSupport?: () => void;
}) {
  return (
    <ErrorState 
      type="maintenance" 
      onRetry={onRetry}
      onContactSupport={onContactSupport}
      data-testid="maintenance-mode"
    />
  );
}
