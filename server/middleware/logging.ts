import morgan from 'morgan';
import { Request, Response, NextFunction } from 'express';
import { morganStream } from '../utils/logger';

// Custom token for user ID
morgan.token('userId', (req: Request) => {
  return (req.session as any)?.user?.id || 'anonymous';
});

// Custom token for response time in milliseconds
morgan.token('responseTime', (req: Request, res: Response) => {
  if (!(req as any)._startTime) return '';
  const responseTime = Date.now() - (req as any)._startTime;
  return `${responseTime}ms`;
});

// Custom format for API requests
const apiFormat = (tokens: any, req: Request, res: Response) => {
  return `${tokens.method(req, res)} ${tokens.url(req, res)} ${tokens.status(req, res)} ${tokens.responseTime(req, res)} ${tokens.userId(req, res)} - ${tokens.res(req, res, 'content-length')} bytes`;
};

// Custom format for general requests
const generalFormat = (tokens: any, req: Request, res: Response) => {
  return `${tokens.remoteAddr(req, res)} - ${tokens.remoteUser(req, res)} [${tokens.date(req, res, 'clf')}] "${tokens.method(req, res)} ${tokens.url(req, res)} HTTP/${tokens.httpVersion(req, res)}" ${tokens.status(req, res)} ${tokens.res(req, res, 'content-length')} "${tokens.referrer(req, res)}" "${tokens.userAgent(req, res)}"`;
};

// Create Morgan middleware for API routes
export const apiLogger = morgan(apiFormat, {
  stream: morganStream,
  skip: (req, res) => {
    // Skip logging for health checks and static assets
    return req.url === '/health' || (req.url ? req.url.startsWith('/static/') : false);
  },
});

// Create Morgan middleware for general requests
export const generalLogger = morgan(generalFormat, {
  stream: morganStream,
  skip: (req, res) => {
    // Skip logging for health checks and static assets
    return req.url === '/health' || (req.url ? req.url.startsWith('/static/') : false);
  },
});

// Middleware to add start time for response time calculation
export const addStartTime = (req: Request, res: Response, next: NextFunction) => {
  (req as any)._startTime = Date.now();
  next();
};
