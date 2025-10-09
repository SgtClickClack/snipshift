import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Wifi,
  Database,
  Server
} from "lucide-react";

interface ErrorRecoveryProps {
  error: Error;
  onRetry: () => void;
  onFallback?: () => void;
  retryCount?: number;
  maxRetries?: number;
}

export default function ErrorRecovery({ 
  error, 
  onRetry, 
  onFallback,
  retryCount = 0,
  maxRetries = 3
}: ErrorRecoveryProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryProgress, setRetryProgress] = useState(0);
  const [retryDelay, setRetryDelay] = useState(0);
  const [recoverySteps, setRecoverySteps] = useState<string[]>([]);

  useEffect(() => {
    if (isRetrying && retryDelay > 0) {
      const timer = setTimeout(() => {
        setRetryDelay(retryDelay - 1);
        setRetryProgress(((retryDelay - 1) / retryDelay) * 100);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isRetrying, retryDelay]);

  const getErrorType = () => {
    const message = error.message.toLowerCase();
    if (message.includes('network') || message.includes('fetch')) return 'network';
    if (message.includes('database') || message.includes('db')) return 'database';
    if (message.includes('server') || message.includes('500')) return 'server';
    if (message.includes('timeout')) return 'timeout';
    return 'generic';
  };

  const getRecoverySteps = (errorType: string) => {
    switch (errorType) {
      case 'network':
        return [
          'Checking network connection...',
          'Attempting to reconnect...',
          'Verifying server availability...',
          'Retrying request...'
        ];
      case 'database':
        return [
          'Checking database connection...',
          'Attempting to reconnect to database...',
          'Verifying data integrity...',
          'Retrying operation...'
        ];
      case 'server':
        return [
          'Checking server status...',
          'Attempting to contact server...',
          'Verifying service availability...',
          'Retrying request...'
        ];
      case 'timeout':
        return [
          'Checking connection timeout...',
          'Attempting with extended timeout...',
          'Verifying server response...',
          'Retrying request...'
        ];
      default:
        return [
          'Analyzing error...',
          'Attempting recovery...',
          'Verifying system status...',
          'Retrying operation...'
        ];
    }
  };

  const handleRetry = async () => {
    if (retryCount >= maxRetries) return;

    setIsRetrying(true);
    setRetryProgress(0);
    
    const errorType = getErrorType();
    const steps = getRecoverySteps(errorType);
    setRecoverySteps(steps);

    // Simulate recovery steps with progress
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setRetryProgress(((i + 1) / steps.length) * 100);
    }

    // Exponential backoff delay
    const delay = Math.pow(2, retryCount);
    setRetryDelay(delay);
    
    setTimeout(() => {
      onRetry();
      setIsRetrying(false);
      setRetryProgress(0);
      setRetryDelay(0);
    }, delay * 1000);
  };

  const getErrorIcon = () => {
    const errorType = getErrorType();
    switch (errorType) {
      case 'network':
        return <Wifi className="h-6 w-6 text-orange-600" />;
      case 'database':
        return <Database className="h-6 w-6 text-red-600" />;
      case 'server':
        return <Server className="h-6 w-6 text-red-600" />;
      case 'timeout':
        return <Clock className="h-6 w-6 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-red-600" />;
    }
  };

  const getErrorMessage = () => {
    const errorType = getErrorType();
    switch (errorType) {
      case 'network':
        return 'Network connection issue detected';
      case 'database':
        return 'Database connection problem';
      case 'server':
        return 'Server error occurred';
      case 'timeout':
        return 'Request timed out';
      default:
        return 'An unexpected error occurred';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="error-recovery">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
          {getErrorIcon()}
        </div>
        <CardTitle className="text-lg text-steel-900">
          {getErrorMessage()}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error.message}
          </AlertDescription>
        </Alert>

        {isRetrying && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Recovery in progress...</span>
              <span>{Math.round(retryProgress)}%</span>
            </div>
            <Progress value={retryProgress} className="h-2" />
            
            {recoverySteps.length > 0 && (
              <div className="space-y-1">
                {recoverySteps.map((step, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-steel-600">{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {retryDelay > 0 && (
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2">
              <Clock className="h-4 w-4 text-steel-600" />
              <span className="text-sm text-steel-600">
                Retrying in {retryDelay} seconds...
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Button 
            className="w-full" 
            onClick={handleRetry}
            disabled={isRetrying || retryDelay > 0 || retryCount >= maxRetries}
            data-testid="retry-with-backoff"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Recovering...
              </>
            ) : retryCount >= maxRetries ? (
              'Max retries reached'
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry ({retryCount + 1}/{maxRetries})
              </>
            )}
          </Button>
          
          {onFallback && (
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={onFallback}
              data-testid="fallback-content"
            >
              Use Fallback Content
            </Button>
          )}
        </div>

        {retryCount >= maxRetries && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Maximum retry attempts reached. Please try again later or contact support.
            </AlertDescription>
          </Alert>
        )}

        <div className="text-center">
          <p className="text-xs text-steel-500">
            Attempt {retryCount + 1} of {maxRetries}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
