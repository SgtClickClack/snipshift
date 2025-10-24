// Standardized error response utility
import { Response } from 'express';
import { errorLogger } from './logger';

export interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: Record<string, unknown>;
}

export class AppError extends Error implements ApiError {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'AppError';
  }
}

export function sendErrorResponse(
  res: Response,
  error: Error | AppError,
  defaultMessage: string = 'An unexpected error occurred'
): void {
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;
  const errorCode = isAppError ? error.code : 'INTERNAL_ERROR';
  const message = error.message || defaultMessage;
  const details = isAppError ? error.details : undefined;

  const errorResponse: ErrorResponse = {
    error: errorCode,
    message,
    code: errorCode,
    details,
    timestamp: new Date().toISOString()
  };

  // Log the error
  errorLogger.unexpectedError(error, {
    statusCode,
    errorCode,
    details,
    url: res.req.url,
    method: res.req.method,
    userAgent: res.req.get('User-Agent')
  });

  res.status(statusCode).json(errorResponse);
}

export function handleAsyncError(
  fn: (req: any, res: Response, next: any) => Promise<any>
) {
  return (req: any, res: Response, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function createErrorHandler() {
  return (error: Error, req: any, res: Response, next: any) => {
    if (res.headersSent) {
      return next(error);
    }
    sendErrorResponse(res, error);
  };
}
