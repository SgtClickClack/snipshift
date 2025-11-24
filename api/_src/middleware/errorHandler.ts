import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * Centralized error handling middleware
 * Logs full error details server-side but returns generic messages to clients
 */

/**
 * Express error middleware that:
 * - Logs full error details server-side (with stack traces)
 * - Returns generic error messages to clients (no stack traces in production)
 * - Handles Zod validation errors gracefully
 */
export const errorHandler = (
  err: Error | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log full error details server-side with critical prefix for Vercel logs visibility
  console.error('🔥 CRITICAL SERVER CRASH [errorHandler]:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    body: req.body,
    query: req.query,
  });

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
  
  res.status(statusCode).json({
    error: err.message || 'An error occurred processing your request',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Async error wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
