import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global Error Boundary for catching startup crashes.
 * Displays a simple red box with white text for debugging mobile crashes.
 * This is intentionally ugly but necessary for visibility on mobile devices.
 */
export class StartupErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console for debugging
    console.error('Startup Error Caught:', error, errorInfo);
    
    // Also log to window for external debugging tools
    if (typeof window !== 'undefined') {
      (window as any).__startupError = {
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      };
    }
  }

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.toString() || 'Unknown error occurred';
      
      return (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#dc2626', // red-600
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box',
            zIndex: 99999,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '16px',
            lineHeight: '1.5',
            overflow: 'auto',
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              width: '100%',
              textAlign: 'center',
            }}
          >
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                marginBottom: '20px',
                color: '#ffffff',
              }}
            >
              Startup Error
            </h1>
            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px',
                wordBreak: 'break-word',
                textAlign: 'left',
              }}
            >
              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                }}
              >
                {errorMessage}
              </pre>
            </div>
            {this.state.error?.stack && (
              <details
                style={{
                  marginTop: '16px',
                  textAlign: 'left',
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    marginBottom: '8px',
                    fontWeight: 'bold',
                  }}
                >
                  Stack Trace
                </summary>
                <pre
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    padding: '12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    overflow: 'auto',
                    maxHeight: '300px',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                  }}
                >
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                backgroundColor: '#ffffff',
                color: '#dc2626',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

