import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ""
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // In production, you would send this to your error reporting service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorId: this.state.errorId
    };

    // Store locally for now (in production, send to error reporting service)
    const existingErrors = JSON.parse(localStorage.getItem('error-reports') || '[]');
    existingErrors.push(errorReport);
    localStorage.setItem('error-reports', JSON.stringify(existingErrors));
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ""
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportError = () => {
    const errorReport = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    // In a real app, this would open a feedback form or send to support
    console.log('Error report:', errorReport);
    alert(`Error reported with ID: ${this.state.errorId}`);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-steel-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md" data-testid="error-boundary">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl text-steel-900">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-steel-600 text-center">
                We're sorry, but something unexpected happened. Our team has been notified.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="bg-red-50 p-3 rounded-lg">
                  <summary className="cursor-pointer text-sm font-medium text-red-800">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 text-xs text-red-700 whitespace-pre-wrap">
                    {this.state.error.message}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="space-y-2">
                <Button 
                  className="w-full" 
                  onClick={this.handleRetry}
                  data-testid="retry-button"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={this.handleGoHome}
                  data-testid="go-home-button"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
                
                <Button 
                  variant="ghost" 
                  className="w-full" 
                  onClick={this.handleReportError}
                  data-testid="report-error"
                >
                  <Bug className="h-4 w-4 mr-2" />
                  Report Issue
                </Button>
              </div>

              <p className="text-xs text-steel-500 text-center">
                Error ID: {this.state.errorId}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
