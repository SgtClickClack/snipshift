import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { errorReporting } from '../services/error-reporting.service.js';
import { getCorrelationId } from './correlation-id.js';

/**
 * Centralized error handling middleware
 * Logs full error details server-side but returns generic messages to clients
 */

/**
 * Helper function to extract PostgreSQL error details from Drizzle errors
 * Drizzle often wraps database errors, so we need to check multiple levels
 */
function extractDatabaseErrorDetails(error: any): {
  message: string;
  code?: string;
  detail?: string;
  hint?: string;
  constraint?: string;
  table?: string;
  column?: string;
  position?: string;
  internalQuery?: string;
  internalPosition?: string;
  where?: string;
  schema?: string;
  dataType?: string;
} {
  const details: any = {
    message: error?.message || 'Unknown error',
  };

  // Check top-level error properties (PostgreSQL errors)
  if (error?.code) details.code = error.code;
  if (error?.detail) details.detail = error.detail;
  if (error?.hint) details.hint = error.hint;
  if (error?.constraint) details.constraint = error.constraint;
  if (error?.table) details.table = error.table;
  if (error?.column) details.column = error.column;
  if (error?.position) details.position = error.position;
  if (error?.internalQuery) details.internalQuery = error.internalQuery;
  if (error?.internalPosition) details.internalPosition = error.internalPosition;
  if (error?.where) details.where = error.where;
  if (error?.schema) details.schema = error.schema;
  if (error?.dataType) details.dataType = error.dataType;

  // Check nested cause (common in Drizzle errors)
  if (error?.cause) {
    const cause = error.cause;
    if (cause?.code && !details.code) details.code = cause.code;
    if (cause?.detail && !details.detail) details.detail = cause.detail;
    if (cause?.hint && !details.hint) details.hint = cause.hint;
    if (cause?.constraint && !details.constraint) details.constraint = cause.constraint;
    if (cause?.table && !details.table) details.table = cause.table;
    if (cause?.column && !details.column) details.column = cause.column;
    if (cause?.message && cause.message !== error.message) {
      details.nestedMessage = cause.message;
    }
    // Check for deeply nested cause (cause.cause)
    if (cause?.cause) {
      const nestedCause = cause.cause;
      if (nestedCause?.code && !details.code) details.code = nestedCause.code;
      if (nestedCause?.detail && !details.detail) details.detail = nestedCause.detail;
      if (nestedCause?.hint && !details.hint) details.hint = nestedCause.hint;
      if (nestedCause?.constraint && !details.constraint) details.constraint = nestedCause.constraint;
      if (nestedCause?.table && !details.table) details.table = nestedCause.table;
      if (nestedCause?.column && !details.column) details.column = nestedCause.column;
    }
  }
  
  // Check for originalError (another common Drizzle pattern)
  if (error?.originalError) {
    const original = error.originalError;
    if (original?.code && !details.code) details.code = original.code;
    if (original?.detail && !details.detail) details.detail = original.detail;
    if (original?.hint && !details.hint) details.hint = original.hint;
    if (original?.constraint && !details.constraint) details.constraint = original.constraint;
    if (original?.table && !details.table) details.table = original.table;
    if (original?.column && !details.column) details.column = original.column;
  }

  return details;
}

/**
 * Express error middleware that:
 * - Logs full error details server-side (with stack traces)
 * - Returns generic error messages to clients (no stack traces in production)
 * - Handles Zod validation errors gracefully
 * - Extracts and logs detailed database error information
 */
export const errorHandler = (
  err: Error | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Extract database error details if this is a database-related error
  const isDatabaseError = 
    err.message?.toLowerCase().includes('query') ||
    err.message?.toLowerCase().includes('database') ||
    err.message?.toLowerCase().includes('sql') ||
    err.message?.toLowerCase().includes('relation') ||
    err.message?.toLowerCase().includes('column') ||
    (err as any)?.code?.startsWith('42') || // PostgreSQL error codes start with 42
    (err as any)?.code?.startsWith('23') || // PostgreSQL constraint violation codes start with 23
    (err as any)?.cause?.code?.startsWith('42') ||
    (err as any)?.cause?.code?.startsWith('23');

  const errorLog: any = {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    body: req.body,
    query: req.query,
  };

  // Add detailed database error information if this is a database error
  if (isDatabaseError) {
    const dbDetails = extractDatabaseErrorDetails(err);
    errorLog.databaseError = dbDetails;
    
    // Log the full error object structure for debugging
    const errorAny = err as any;
    errorLog.rawError = {
      code: errorAny?.code,
      detail: errorAny?.detail,
      hint: errorAny?.hint,
      constraint: errorAny?.constraint,
      table: errorAny?.table,
      column: errorAny?.column,
      position: errorAny?.position,
      internalQuery: errorAny?.internalQuery,
      internalPosition: errorAny?.internalPosition,
      where: errorAny?.where,
      schema: errorAny?.schema,
      dataType: errorAny?.dataType,
      // Check all possible nested error locations
      cause: errorAny?.cause,
      originalError: errorAny?.originalError,
      error: errorAny?.error,
      // Log the entire error object keys to see what's available
      availableKeys: Object.keys(errorAny || {}),
      // Deep dive into cause if it exists
      causeDetails: errorAny?.cause ? {
        message: errorAny.cause.message,
        code: errorAny.cause.code,
        detail: errorAny.cause.detail,
        hint: errorAny.cause.hint,
        constraint: errorAny.cause.constraint,
        table: errorAny.cause.table,
        column: errorAny.cause.column,
        availableKeys: Object.keys(errorAny.cause || {}),
        // Check for nested cause
        nestedCause: errorAny.cause.cause,
      } : undefined,
    };
  }

  // Get correlation ID from request
  const correlationId = getCorrelationId(req);
  
  // Log full error details server-side with critical prefix for Vercel logs visibility
  console.error('🔥 CRITICAL SERVER CRASH [errorHandler]:', {
    ...errorLog,
    correlationId,
  });

  // Report to error tracking service
  const severity = res.statusCode >= 500 ? 'error' : 'warning';
  await errorReporting.captureError(
    err.message || 'Unhandled error',
    err,
    {
      correlationId,
      path: req.path,
      method: req.method,
      metadata: {
        statusCode: res.statusCode,
        ...(isDatabaseError && { databaseError: errorLog.databaseError }),
      },
      tags: {
        errorType: err instanceof ZodError ? 'validation' : 'runtime',
        statusCode: res.statusCode.toString(),
      },
    }
  );

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const validationErrors = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    res.status(400).json({
      error: `Validation error: ${validationErrors}`,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return;
  }

  // Handle known error types
  if (err.message.includes('not found')) {
    res.status(404).json({
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return;
  }

  if (err.message.includes('unauthorized') || err.message.includes('Invalid credentials')) {
    res.status(401).json({
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return;
  }

  // Generic error response (masks internal errors)
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  
  // In production, mask database errors to not expose SQL queries or schema details
  // In development, include detailed information for debugging
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  let errorMessage = err.message || 'An error occurred processing your request';
  
  // Sanitize error messages in production to not expose SQL queries
  if (isProduction && isDatabaseError) {
    // Check if the message contains SQL query indicators
    if (
      errorMessage.toLowerCase().includes('failed query:') ||
      errorMessage.toLowerCase().includes('select ') ||
      errorMessage.toLowerCase().includes('insert ') ||
      errorMessage.toLowerCase().includes('update ') ||
      errorMessage.toLowerCase().includes('delete ') ||
      errorMessage.includes('FROM ') ||
      errorMessage.includes('WHERE ')
    ) {
      errorMessage = 'A database error occurred. Please try again later.';
    }
  }
  
  const response: any = {
    error: errorMessage,
  };
  
  if (!isProduction) {
    response.stack = err.stack;
    // Include detailed database error information in development
    if (isDatabaseError) {
      const dbDetails = extractDatabaseErrorDetails(err);
      response.databaseError = dbDetails;
      response.rawError = {
        code: (err as any)?.code,
        detail: (err as any)?.detail,
        hint: (err as any)?.hint,
        constraint: (err as any)?.constraint,
        table: (err as any)?.table,
        column: (err as any)?.column,
        cause: (err as any)?.cause ? {
          message: (err as any).cause.message,
          code: (err as any).cause.code,
          detail: (err as any).cause.detail,
          hint: (err as any).cause.hint,
          constraint: (err as any).cause.constraint,
          table: (err as any).cause.table,
          column: (err as any).cause.column,
        } : undefined,
        originalError: (err as any)?.originalError ? {
          message: (err as any).originalError.message,
          code: (err as any).originalError.code,
          detail: (err as any).originalError.detail,
        } : undefined,
      };
    }
  }
  
  res.status(statusCode).json(response);
};

/**
 * Async error wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
