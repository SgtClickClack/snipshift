import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  Clock,
  Server,
  Zap
} from "lucide-react";

interface NetworkErrorHandlerProps {
  error?: Error | null;
  onRetry?: () => void;
  onGoOffline?: () => void;
  retryCount?: number;
  maxRetries?: number;
}

export default function NetworkErrorHandler({ 
  error, 
  onRetry, 
  onGoOffline,
  retryCount = 0,
  maxRetries = 3
}: NetworkErrorHandlerProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retryDelay, setRetryDelay] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (retryDelay > 0) {
      const timer = setTimeout(() => {
        setRetryDelay(retryDelay - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [retryDelay]);

  const handleRetry = async () => {
    if (retryCount >= maxRetries) return;
    
    setIsRetrying(true);
    
    // Exponential backoff: 1s, 2s, 4s, 8s
    const delay = Math.pow(2, retryCount) * 1000;
    setRetryDelay(delay / 1000);
    
    setTimeout(() => {
      onRetry?.();
      setIsRetrying(false);
    }, delay);
  };

  const getErrorType = () => {
    if (!isOnline) return 'offline';
    if (error?.message?.includes('timeout')) return 'timeout';
    if (error?.message?.includes('500')) return 'server';
    if (error?.message?.includes('429')) return 'rate-limit';
    if (error?.message?.includes('connection')) return 'connection';
    return 'generic';
  };

  const errorType = getErrorType();

  const getErrorConfig = () => {
    switch (errorType) {
      case 'offline':
        return {
          icon: <WifiOff className="h-6 w-6 text-orange-600" />,
          title: "You're offline",
          description: "Please check your internet connection and try again.",
          action: "Go Offline Mode",
          onAction: onGoOffline
        };
      case 'timeout':
        return {
          icon: <Clock className="h-6 w-6 text-yellow-600" />,
          title: "Request timed out",
          description: "The server is taking too long to respond. This might be temporary.",
          action: "Retry",
          onAction: handleRetry
        };
      case 'server':
        return {
          icon: <Server className="h-6 w-6 text-red-600" />,
          title: "Server error",
          description: "Something went wrong on our end. We're working to fix it.",
          action: "Retry",
          onAction: handleRetry
        };
      case 'rate-limit':
        return {
          icon: <Zap className="h-6 w-6 text-purple-600" />,
          title: "Too many requests",
          description: "You're making requests too quickly. Please wait a moment.",
          action: "Wait and Retry",
          onAction: handleRetry
        };
      case 'connection':
        return {
          icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
          title: "Connection failed",
          description: "Unable to connect to the server. Please check your connection.",
          action: "Retry",
          onAction: handleRetry
        };
      default:
        return {
          icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
          title: "Network error",
          description: "Something went wrong with your request. Please try again.",
          action: "Retry",
          onAction: handleRetry
        };
    }
  };

  const config = getErrorConfig();

  if (!error) return null;

  return (
    <div className="p-4" data-testid="network-error-handler">
      <Alert variant="destructive">
        <div className="flex items-start space-x-3">
          {config.icon}
          <div className="flex-1">
            <AlertDescription>
              <div className="space-y-2">
                <div>
                  <h4 className="font-medium">{config.title}</h4>
                  <p className="text-sm mt-1">{config.description}</p>
                </div>
                
                {retryCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Retry attempt {retryCount} of {maxRetries}
                  </p>
                )}
                
                {retryDelay > 0 && (
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Retrying in {retryDelay}s...</span>
                  </div>
                )}
              </div>
            </AlertDescription>
          </div>
        </div>
      </Alert>

      <div className="mt-4 flex space-x-2">
        {config.onAction && (
          <Button
            variant="outline"
            size="sm"
            onClick={config.onAction}
            disabled={isRetrying || retryDelay > 0 || retryCount >= maxRetries}
            data-testid="retry-button"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {config.action}
              </>
            )}
          </Button>
        )}
        
        {retryCount >= maxRetries && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onGoOffline}
            data-testid="offline-mode"
          >
            <WifiOff className="h-4 w-4 mr-2" />
            Go Offline
          </Button>
        )}
      </div>

      {errorType === 'rate-limit' && (
        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-purple-600" />
            <span className="text-sm text-purple-800" data-testid="retry-after-timer">
              Please wait before making another request
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
