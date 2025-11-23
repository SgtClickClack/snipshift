import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * Centralized error handling middleware
 * Logs full error details server-side but returns generic messages to clients
 */

interface ErrorResponse {
  message: string;
  status: number;
}

/**
 * Express error middleware that:
 * - Logs full error details server-side (with stack traces)
 * - Returns generic error messages to clients (no stack traces)
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
    const response: ErrorResponse = {
      message: `Validation error: ${validationErrors}`,
      status: 400,
    };
    res.status(400).json(response);
    return;
  }

  // Handle known error types
  if (err.message.includes('not found')) {
    const response: ErrorResponse = {
      message: err.message,
      status: 404,
    };
    res.status(404).json(response);
    return;
  }

  if (err.message.includes('unauthorized') || err.message.includes('Invalid credentials')) {
    const response: ErrorResponse = {
      message: err.message,
      status: 401,
    };
    res.status(401).json(response);
    return;
  }

  // Generic error response (masks internal errors)
  // DEBUG: Exposing error message temporarily for debugging Vercel 500s
  const response: ErrorResponse = {
    message: err.message || 'An error occurred processing your request',
    status: 500,
  };
  res.status(500).json(response);
};

/**
 * Async error wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

