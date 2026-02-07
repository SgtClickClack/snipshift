import { Component, ReactNode } from 'react';

interface CalendarErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class CalendarErrorBoundary extends Component<
  { children: ReactNode },
  CalendarErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): CalendarErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[CALENDAR ERROR BOUNDARY] Caught error:', error);
    console.error('[CALENDAR ERROR BOUNDARY] Error info:', errorInfo);
    console.error('[CALENDAR ERROR BOUNDARY] Error stack:', error.stack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex items-center justify-center h-full min-h-[600px]"
          data-testid="calendar-error-boundary"
        >
          <div className="text-muted-foreground">
            Calendar render error: {this.state.error?.message || 'Unknown error'}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
