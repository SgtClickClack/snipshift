import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface ErrorFallbackProps {
  error?: Error | null;
  resetErrorBoundary?: () => void;
  title?: string;
  message?: string;
}

/**
 * ErrorFallback Component
 * 
 * A friendly error UI shown when a page crashes (White Screen of Death prevention).
 * This component is designed to be used with React Error Boundaries.
 */
export function ErrorFallback({ 
  error, 
  resetErrorBoundary,
  title = "Something went wrong",
  message = "We're sorry, but something unexpected happened. Our team has been notified."
}: ErrorFallbackProps) {
  // Log the error for debugging (in production, this would go to an error tracking service)
  useEffect(() => {
    if (error) {
      console.error('[ErrorFallback] Caught error:', error);
      // In production, you might want to send this to an error tracking service like Sentry
      // errorTrackingService.captureException(error);
    }
  }, [error]);

  const handleRefresh = () => {
    if (resetErrorBoundary) {
      resetErrorBoundary();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-lg border-destructive/20">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-muted-foreground">
            {message}
          </p>

          {/* Error details (collapsed by default in production) */}
          {error && process.env.NODE_ENV === 'development' && (
            <details className="text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 justify-center">
                <Bug className="h-4 w-4" />
                <span>Technical Details</span>
              </summary>
              <div className="mt-2 p-3 bg-muted rounded-lg overflow-auto max-h-40">
                <code className="text-xs text-destructive whitespace-pre-wrap break-all">
                  {error.message}
                  {error.stack && (
                    <>
                      <br /><br />
                      <span className="text-muted-foreground">{error.stack}</span>
                    </>
                  )}
                </code>
              </div>
            </details>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={handleRefresh}
              variant="default"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button 
              onClick={handleGoHome}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Go to Home
            </Button>
          </div>

          {/* Help text */}
          <p className="text-xs text-muted-foreground">
            If this problem persists, please try clearing your browser cache or contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ErrorFallback;

