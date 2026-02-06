/**
 * ErrorBoundary - Foundry Recovery State
 * 
 * A branded error boundary that catches React component failures
 * and displays a professional "Foundry Recovery" state.
 * 
 * Branding:
 * - Brand primary borders
 * - Urbanist 900 typography
 * - Professional messaging: "Component Idling—Engine maintaining state. Refresh to re-engage."
 * 
 * Purpose: Investor demos never see ugly React error screens
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * FOUNDRY RECOVERY ERROR BOUNDARY
 * 
 * Catches unhandled errors in child components and displays
 * a branded recovery state instead of crashing the entire app.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging
    console.error('[ErrorBoundary] Component Error:', error);
    console.error('[ErrorBoundary] Component Stack:', errorInfo.componentStack);
    
    this.setState({ errorInfo });
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Allow custom fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default Foundry Recovery UI
      return (
        <div 
          className="min-h-[200px] flex items-center justify-center p-6"
          data-testid="foundry-recovery-state"
        >
          <div 
            className="max-w-md w-full rounded-xl border-2 border-primary/50 bg-zinc-900/95 backdrop-blur-sm p-6 space-y-4"
            style={{
              boxShadow: '0 0 30px hsl(var(--primary) / 0.15), inset 0 0 20px hsl(var(--primary) / 0.05)',
            }}
          >
            {/* Header with Icon */}
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 
                  className="text-lg font-black italic text-white"
                  style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 900 }}
                >
                  Foundry Recovery
                </h3>
                <p className="text-xs text-zinc-500">Engine maintaining state</p>
              </div>
            </div>

            {/* Status Message */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p 
                  className="text-sm text-zinc-300"
                  style={{ fontFamily: 'Urbanist, sans-serif' }}
                >
                  Component Idling—Engine maintaining state.
                </p>
                <p className="text-xs text-zinc-500">
                  Refresh to re-engage.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Try Again
              </Button>
              <Button
                size="sm"
                onClick={this.handleRefresh}
                className="flex-1 bg-primary text-zinc-900 hover:bg-primary/90 font-semibold"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Error Details (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-xs text-zinc-500 border-t border-zinc-800 pt-3 mt-3">
                <summary className="cursor-pointer hover:text-zinc-400">
                  Technical Details (Dev Only)
                </summary>
                <pre className="mt-2 p-2 rounded bg-zinc-950 overflow-x-auto text-[10px] text-red-400">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            {/* HOSPO-GO Branding Footer */}
            <div className="pt-3 border-t border-zinc-800 flex justify-center">
              <span className="text-[10px] text-zinc-600 tracking-wider">
                Protected by <span className="font-black italic">HOSPO<span className="text-primary">GO</span></span> Engine
              </span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * withErrorBoundary - HOC wrapper for functional components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

