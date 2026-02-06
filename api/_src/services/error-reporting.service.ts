/**
 * Error Reporting Service
 *
 * Provides centralized error logging to external services (Google Cloud, Sentry, LogSnag, etc.)
 * Supports correlation IDs for request tracing
 */

import {
  isGoogleCloudEnabled,
  reportErrorToGoogleCloud,
  writeLogToGoogleCloud,
} from '../lib/google-cloud.js';

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
    // AUTH REHYDRATION FIX: Filter out handshake 401 errors from console noise
    if (isHandshake401Error(report.error, report.context)) {
      // Optionally log at debug level for troubleshooting
      if (process.env.DEBUG_AUTH === 'true') {
        console.debug('[ERROR_REPORTING] Filtered handshake 401:', report.message);
      }
      return;
    }
    
    // FINAL_HOSPOGO_STABILIZATION_PUSH: Filter Firebase background hiccups
    if (isFirebaseBackgroundHiccup(report.error, report.context)) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.debug('[ERROR_REPORTING] Filtered Firebase hiccup:', report.message);
      }
      return;
    }
    
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
 * Google Cloud Error Reporting + Logging implementation
 * Pipes errors to Error Reporting and Logs Explorer when GOOGLE_CLOUD_PROJECT is set
 */
class GoogleCloudErrorReporting implements ErrorReportingService {
  private consoleFallback = new ConsoleErrorReporting();

  async captureError(report: ErrorReport): Promise<void> {
    // Filter handshake 401 and Firebase hiccups (same as console)
    if (isHandshake401Error(report.error, report.context)) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.debug('[ERROR_REPORTING] Filtered handshake 401:', report.message);
      }
      return;
    }
    if (isFirebaseBackgroundHiccup(report.error, report.context)) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.debug('[ERROR_REPORTING] Filtered Firebase hiccup:', report.message);
      }
      return;
    }

    // Always log to console
    await this.consoleFallback.captureError(report);

    // Pipe to Google Cloud when enabled
    if (isGoogleCloudEnabled()) {
      const errorToReport = report.error || new Error(report.message);
      await reportErrorToGoogleCloud(errorToReport);

      const severityMap = {
        info: 'INFO' as const,
        warning: 'WARNING' as const,
        error: 'ERROR' as const,
        critical: 'ERROR' as const,
      };
      const gcpSeverity = severityMap[report.severity];
      await writeLogToGoogleCloud(gcpSeverity, report.message, {
        severity: report.severity,
        correlationId: report.context?.correlationId,
        userId: report.context?.userId,
        path: report.context?.path,
        method: report.context?.method,
        ...report.context?.metadata,
        ...(report.error && {
          errorMessage: report.error.message,
          errorName: report.error.name,
        }),
      });
    }
  }

  async captureMessage(message: string, severity: ErrorSeverity, context?: ErrorContext): Promise<void> {
    await this.captureError({ message, severity, context });
  }

  setUser(_userId: string, _email?: string): void {
    // Google Cloud Error Reporting doesn't require explicit user context
  }

  clearUser(): void {
    // No-op
  }
}

/**
 * AUTH REHYDRATION FIX: Handshake 401 Detection
 * 
 * These paths are expected to return 401 during the initial Firebase handshake phase.
 * Filter them from Sentry to avoid noise during every deployment.
 */
const HANDSHAKE_401_PATHS = [
  '/api/me',
  '/api/auth/me',
  '/api/bootstrap',
  '/api/notifications',
  '/api/conversations/unread-count',
  '/api/integrations/xero/sync-history',
  '/api/admin/support/intelligence-gaps',
  '/api/admin/leads/brisbane-100',
  '/api/admin/chat',
];

/**
 * FINAL_HOSPOGO_STABILIZATION_PUSH: Firebase Background Hiccup Detection
 * 
 * These are confirmed non-critical 400 'Bad Request' errors from Firebase infrastructure
 * (specifically firebaseinstallations.googleapis.com) that occur during normal operation.
 * Filter them from Sentry to avoid noise.
 */
const FIREBASE_BACKGROUND_HICCUP_PATTERNS = [
  'firebaseinstallations.googleapis.com',
  'firebase-installations',
  'Firebase Installation',
  'installations.firebaseapp.com',
];

/**
 * Check if an error is a handshake 401 that should be filtered from Sentry
 */
export function isHandshake401Error(error: Error | unknown, context?: ErrorContext): boolean {
  if (!error) return false;
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Check for 401 status code in message
  if (!errorMessage.includes('401')) return false;
  
  // Check if it's explicitly marked as a handshake 401
  if (error instanceof Error && (error as any).isHandshake401) {
    return true;
  }
  
  // Check if the path is a known handshake endpoint
  const path = context?.path || '';
  if (HANDSHAKE_401_PATHS.some(p => path.includes(p) || path.startsWith(p))) {
    return true;
  }
  
  // Check for specific handshake-related message patterns
  const handshakePatterns = [
    'Auth backoff in progress',
    'Firebase handshake',
    'Token refresh',
    'Session expired',
    'initial auth',
  ];
  
  return handshakePatterns.some(pattern => 
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * FINAL_HOSPOGO_STABILIZATION_PUSH: Check if error is a Firebase background hiccup
 * 
 * Filters 400 'Bad Request' errors from firebaseinstallations.googleapis.com
 * These are confirmed non-critical background hiccups that should not pollute Sentry.
 */
export function isFirebaseBackgroundHiccup(error: Error | unknown, context?: ErrorContext): boolean {
  if (!error) return false;
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = errorMessage.toLowerCase();
  
  // Check for 400 status code or 'bad request' in message
  const is400Error = errorString.includes('400') || errorString.includes('bad request');
  if (!is400Error) return false;
  
  // Check if it matches Firebase installations patterns
  const path = context?.path || '';
  const fullContext = `${errorMessage} ${path}`.toLowerCase();
  
  return FIREBASE_BACKGROUND_HICCUP_PATTERNS.some(pattern => 
    fullContext.includes(pattern.toLowerCase())
  );
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
        // AUTH REHYDRATION FIX: Filter out handshake 401 errors
        // These are expected during initial Firebase/auth handshake phase
        const exception = hint.originalException;
        if (exception instanceof Error) {
          // Check if it's a handshake 401
          if (isHandshake401Error(exception)) {
            console.log('[Sentry] Filtering handshake 401:', exception.message);
            return null; // Drop the event
          }
          
          // FINAL_HOSPOGO_STABILIZATION_PUSH: Filter Firebase background hiccups
          if (isFirebaseBackgroundHiccup(exception)) {
            console.log('[Sentry] Filtering Firebase hiccup:', exception.message);
            return null; // Drop the event
          }
        }
        
        // Also check for 401 errors in the exception chain
        if (event.exception?.values?.some(e => 
          e.value?.includes('401') && (
            e.value?.includes('/api/me') ||
            e.value?.includes('/api/bootstrap') ||
            e.value?.includes('/api/notifications') ||
            e.value?.includes('Auth backoff')
          )
        )) {
          console.log('[Sentry] Filtering 401 event based on exception values');
          return null;
        }
        
        // FINAL_HOSPOGO_STABILIZATION_PUSH: Filter Firebase installation errors from event values
        if (event.exception?.values?.some(e => 
          (e.value?.includes('400') || e.value?.toLowerCase().includes('bad request')) &&
          e.value?.toLowerCase().includes('firebaseinstallations')
        )) {
          console.log('[Sentry] Filtering Firebase installation error based on exception values');
          return null;
        }
        
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

  // Google Cloud (Error Reporting + Logging) - preferred when deployed to GCP
  if (isGoogleCloudEnabled()) {
    errorReportingService = new GoogleCloudErrorReporting();
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
