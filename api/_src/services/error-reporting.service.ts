/**
 * Error Reporting Service
 * 
 * Provides centralized error logging to external services (Sentry, LogSnag, etc.)
 * Supports correlation IDs for request tracing
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ErrorContext {
  correlationId?: string;
  userId?: string;
  userEmail?: string;
  path?: string;
  method?: string;
  metadata?: Record<string, any>;
  tags?: Record<string, string>;
}

export interface ErrorReport {
  message: string;
  severity: ErrorSeverity;
  error?: Error;
  context?: ErrorContext;
  timestamp?: string;
}

/**
 * Error Reporting Service Interface
 * Implement this interface for your chosen error reporting service
 */
export interface ErrorReportingService {
  captureError(report: ErrorReport): Promise<void>;
  captureMessage(message: string, severity: ErrorSeverity, context?: ErrorContext): Promise<void>;
  setUser(userId: string, email?: string): void;
  clearUser(): void;
}

/**
 * Console-based error reporting (fallback when no service configured)
 */
class ConsoleErrorReporting implements ErrorReportingService {
  async captureError(report: ErrorReport): Promise<void> {
    const logLevel = report.severity === 'critical' ? 'error' : report.severity;
    const logMethod = (logLevel === 'warning' ? console.warn : logLevel === 'error' ? console.error : logLevel === 'info' ? console.info : console.log) || console.error;
    
    const logData: any = {
      severity: report.severity,
      message: report.message,
      timestamp: report.timestamp || new Date().toISOString(),
      ...(report.context?.correlationId && { correlationId: report.context.correlationId }),
      ...(report.context?.userId && { userId: report.context.userId }),
      ...(report.context?.path && { path: report.context.path }),
      ...(report.context?.method && { method: report.context.method }),
      ...(report.error && {
        error: {
          message: report.error.message,
          stack: report.error.stack,
          name: report.error.name,
        },
      }),
      ...(report.context?.metadata && { metadata: report.context.metadata }),
      ...(report.context?.tags && { tags: report.context.tags }),
    };

    logMethod(`[ERROR_REPORTING] ${report.severity.toUpperCase()}:`, logData);
  }

  async captureMessage(message: string, severity: ErrorSeverity, context?: ErrorContext): Promise<void> {
    await this.captureError({
      message,
      severity,
      context,
    });
  }

  setUser(userId: string, email?: string): void {
    // No-op for console reporting
  }

  clearUser(): void {
    // No-op for console reporting
  }
}

/**
 * Sentry Error Reporting Implementation
 * 
 * To use Sentry, install: npm install @sentry/node
 * Then uncomment and configure the SentryErrorReporting class below
 */
/*
import * as Sentry from '@sentry/node';

class SentryErrorReporting implements ErrorReportingService {
  constructor() {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) {
      console.warn('[ERROR_REPORTING] SENTRY_DSN not set, using console fallback');
      return;
    }

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'production',
      tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
      beforeSend(event, hint) {
        // Add correlation ID to Sentry context
        if (hint.originalException?.correlationId) {
          event.tags = { ...event.tags, correlationId: hint.originalException.correlationId };
        }
        return event;
      },
    });
  }

  async captureError(report: ErrorReport): Promise<void> {
    const scope = new Sentry.Scope();
    
    if (report.context?.correlationId) {
      scope.setTag('correlationId', report.context.correlationId);
    }
    
    if (report.context?.userId) {
      scope.setUser({ id: report.context.userId, email: report.context.userEmail });
    }
    
    if (report.context?.path) {
      scope.setTag('path', report.context.path);
    }
    
    if (report.context?.method) {
      scope.setTag('method', report.context.method);
    }
    
    if (report.context?.metadata) {
      scope.setContext('metadata', report.context.metadata);
    }
    
    if (report.context?.tags) {
      Object.entries(report.context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    const level = report.severity === 'critical' ? 'fatal' : report.severity;
    
    if (report.error) {
      Sentry.captureException(report.error, { level, scope });
    } else {
      Sentry.captureMessage(report.message, { level, scope });
    }
  }

  async captureMessage(message: string, severity: ErrorSeverity, context?: ErrorContext): Promise<void> {
    await this.captureError({ message, severity, context });
  }

  setUser(userId: string, email?: string): void {
    Sentry.setUser({ id: userId, email });
  }

  clearUser(): void {
    Sentry.setUser(null);
  }
}
*/

/**
 * LogSnag Error Reporting Implementation
 * 
 * To use LogSnag, install: npm install logsnag
 * Then uncomment and configure the LogSnagErrorReporting class below
 */
/*
import LogSnag from 'logsnag';

class LogSnagErrorReporting implements ErrorReportingService {
  private client: LogSnag | null = null;

  constructor() {
    const apiKey = process.env.LOGSNAG_API_KEY;
    const project = process.env.LOGSNAG_PROJECT || 'hospogo';
    
    if (!apiKey) {
      console.warn('[ERROR_REPORTING] LOGSNAG_API_KEY not set, using console fallback');
      return;
    }

    this.client = new LogSnag({
      token: apiKey,
      project,
    });
  }

  async captureError(report: ErrorReport): Promise<void> {
    if (!this.client) {
      await new ConsoleErrorReporting().captureError(report);
      return;
    }

    const channel = report.severity === 'critical' ? 'errors' : 'warnings';
    const icon = report.severity === 'critical' ? '🚨' : '⚠️';
    
    const tags: Record<string, string> = {
      severity: report.severity,
      ...(report.context?.correlationId && { correlationId: report.context.correlationId }),
      ...(report.context?.path && { path: report.context.path }),
      ...(report.context?.method && { method: report.context.method }),
      ...(report.context?.tags),
    };

    await this.client.publish({
      channel,
      event: report.message,
      icon,
      tags,
      ...(report.context?.userId && { userId: report.context.userId }),
      ...(report.context?.metadata && { description: JSON.stringify(report.context.metadata) }),
    });
  }

  async captureMessage(message: string, severity: ErrorSeverity, context?: ErrorContext): Promise<void> {
    await this.captureError({ message, severity, context });
  }

  setUser(userId: string, email?: string): void {
    // LogSnag tracks users automatically via userId in events
  }

  clearUser(): void {
    // LogSnag doesn't require explicit user clearing
  }
}
*/

/**
 * Get the configured error reporting service
 */
let errorReportingService: ErrorReportingService | null = null;

export function getErrorReportingService(): ErrorReportingService {
  if (errorReportingService) {
    return errorReportingService;
  }

  // Check for Sentry
  if (process.env.SENTRY_DSN) {
    // Uncomment when Sentry is installed
    // errorReportingService = new SentryErrorReporting();
    // return errorReportingService;
  }

  // Check for LogSnag
  if (process.env.LOGSNAG_API_KEY) {
    // Uncomment when LogSnag is installed
    // errorReportingService = new LogSnagErrorReporting();
    // return errorReportingService;
  }

  // Fallback to console
  errorReportingService = new ConsoleErrorReporting();
  return errorReportingService;
}

/**
 * Convenience functions for common error reporting scenarios
 */
export const errorReporting = {
  /**
   * Report a critical error (e.g., Stripe webhook signature failure)
   */
  async captureCritical(message: string, error?: Error, context?: ErrorContext): Promise<void> {
    const service = getErrorReportingService();
    await service.captureError({
      message,
      severity: 'critical',
      error,
      context,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Report a warning (e.g., failed geofence clock-in attempt)
   */
  async captureWarning(message: string, context?: ErrorContext): Promise<void> {
    const service = getErrorReportingService();
    await service.captureMessage(message, 'warning', context);
  },

  /**
   * Report an error (e.g., unhandled 500 error)
   */
  async captureError(message: string, error?: Error, context?: ErrorContext): Promise<void> {
    const service = getErrorReportingService();
    await service.captureError({
      message,
      severity: 'error',
      error,
      context,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Report an info message
   */
  async captureInfo(message: string, context?: ErrorContext): Promise<void> {
    const service = getErrorReportingService();
    await service.captureMessage(message, 'info', context);
  },

  /**
   * Set user context for error reporting
   */
  setUser(userId: string, email?: string): void {
    const service = getErrorReportingService();
    service.setUser(userId, email);
  },

  /**
   * Clear user context
   */
  clearUser(): void {
    const service = getErrorReportingService();
    service.clearUser();
  },
};
