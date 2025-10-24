// Frontend logging service
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: unknown;
}

class FrontendLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      context,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // In development, log to console with colors
    if (this.isDevelopment) {
      const colors = {
        debug: '#888',
        info: '#0066cc',
        warn: '#ff8800',
        error: '#cc0000'
      };
      
      console.log(
        `%c[${level.toUpperCase()}] ${message}`,
        `color: ${colors[level]}`,
        context || ''
      );
    }

    // In production, send to backend logging endpoint
    if (!this.isDevelopment && level !== 'debug') {
      this.sendToBackend(logEntry).catch(() => {
        // Silently fail if backend logging fails
      });
    }
  }

  private async sendToBackend(logEntry: Record<string, unknown>) {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry),
        credentials: 'include'
      });
    } catch (error) {
      // Silently fail - don't create infinite logging loops
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }

  // Convenience methods for common scenarios
  userAction(action: string, context?: LogContext) {
    this.info(`User action: ${action}`, { ...context, action });
  }

  navigation(from: string, to: string, context?: LogContext) {
    this.info(`Navigation: ${from} → ${to}`, { ...context, from, to });
  }

  apiCall(method: string, endpoint: string, status?: number, context?: LogContext) {
    this.info(`API ${method} ${endpoint}`, { ...context, method, endpoint, status });
  }

  errorBoundary(error: Error, component: string, context?: LogContext) {
    this.error(`Error in ${component}: ${error.message}`, { 
      ...context, 
      component, 
      error: error.message,
      stack: error.stack 
    });
  }
}

export const frontendLogger = new FrontendLogger();
export default frontendLogger;
