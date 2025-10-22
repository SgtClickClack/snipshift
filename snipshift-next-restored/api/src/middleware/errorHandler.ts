import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export const errorHandler = async (err: any, req: Request, res: Response, next: NextFunction) => {
  // Log the error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  // Don't send error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // GraphQL errors are handled by Apollo Server
  try {
    const { GraphQLError } = await import('graphql');
    if (err instanceof GraphQLError) {
      return next(err);
    }
  } catch (importError) {
    // If GraphQL import fails, continue with other error handling
    logger.warn('Failed to import GraphQLError:', importError);
  }

  // Handle different error types
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Not Found';
  }

  // Send error response
  res.status(statusCode).json({
    error: {
      message,
      ...(isDevelopment && { stack: err.stack }),
    },
  });
};
