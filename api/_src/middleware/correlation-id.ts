/**
 * Correlation ID Middleware
 * 
 * Generates and attaches a correlation ID to each request for tracing
 * across frontend and backend logs
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Extend Express Request to include correlationId
 */
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

/**
 * Middleware to generate and attach correlation ID to requests
 * 
 * Checks for existing correlation ID in headers (X-Correlation-ID or X-Request-ID)
 * If not present, generates a new UUID v4
 */
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check for existing correlation ID in headers
  const existingCorrelationId = 
    req.headers['x-correlation-id'] as string ||
    req.headers['x-request-id'] as string ||
    req.headers['x-trace-id'] as string;

  // Generate new correlation ID if not present
  const correlationId = existingCorrelationId || generateCorrelationId();

  // Attach to request object
  req.correlationId = correlationId;

  // Add to response headers for client tracing
  res.setHeader('X-Correlation-ID', correlationId);

  // Add to response for API responses (if JSON)
  if (req.path.startsWith('/api/')) {
    // Store in res.locals for access in route handlers
    res.locals.correlationId = correlationId;
  }

  next();
}

/**
 * Generate a correlation ID (UUID v4 format)
 */
function generateCorrelationId(): string {
  // Simple UUID v4 generator (crypto.randomUUID if available, otherwise fallback)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get correlation ID from request (helper function)
 */
export function getCorrelationId(req: Request): string | undefined {
  return req.correlationId;
}
