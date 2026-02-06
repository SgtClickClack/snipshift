import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * IntegrationErrorBoundary – isolates integration UI (e.g. Xero) from app crashes.
 * A failed API call in the integration card won't white-screen the app.
 */
export class IntegrationErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.PROD) {
      console.error('[IntegrationErrorBoundary] Integration error occurred');
    } else {
      console.error('[IntegrationErrorBoundary] Error:', error);
      console.error('[IntegrationErrorBoundary] Component stack:', errorInfo.componentStack);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-destructive/10 p-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-medium text-foreground">
                {this.props.fallbackTitle ?? 'Integration unavailable'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {this.props.fallbackDescription ??
                  'This integration encountered an error. You can retry or continue using the rest of the app.'}
              </p>
              <Button variant="outline" size="sm" onClick={this.handleRetry} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
