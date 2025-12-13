import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-96 flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <h2 className="text-xl font-semibold text-red-600">Something went wrong</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                We encountered an error while displaying this content.
              </p>
              <div className="bg-gray-100 dark:bg-steel-800 p-4 rounded text-left text-xs overflow-auto max-h-32">
                <code>{this.state.error?.message}</code>
              </div>
              <Button 
                onClick={() => this.setState({ hasError: false })}
                variant="outline"
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
