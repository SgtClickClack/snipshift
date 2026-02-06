import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * GlobalErrorBoundary – top-level error boundary for the app.
 * Catches crashes (e.g. Firebase Notification errors) and shows a
 * "Something went wrong" UI with "Reload App" instead of black screen or unhandled toasts.
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.PROD) {
      // In production, avoid logging internal stack traces or error objects
      console.error('[GlobalErrorBoundary] An unexpected error occurred');
    } else {
      // In development, keep detailed logging for easier debugging
      console.error('[GlobalErrorBoundary] Uncaught error:', error);
      console.error('[GlobalErrorBoundary] Component stack:', errorInfo.componentStack);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
              <p className="text-muted-foreground">
                We're sorry. The app hit an unexpected error. Reload the app to try again.
              </p>
            </div>
            <Button
              onClick={this.handleReload}
              className="gap-2"
              size="lg"
            >
              <RefreshCw className="h-4 w-4" />
              Reload App
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
