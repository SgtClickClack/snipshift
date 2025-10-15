import { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';

// Rate limiting for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 50 : 5, // Higher limit for development
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // trustProxy: true, // Always trust proxy for Replit deployment
  skip: (req) => process.env.NODE_ENV === 'development' && req.ip === '::1' || process.env.E2E_TEST === '1' || process.env.NODE_ENV === 'test',
});

// Rate limiting for API endpoints
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' || process.env.E2E_TEST === '1' ? 10000 : 100, // Much higher limit for development and E2E tests
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // trustProxy: true, // Always trust proxy for Replit deployment
  skip: (req) => process.env.NODE_ENV === 'development' && req.ip === '::1' || process.env.E2E_TEST === '1' || process.env.NODE_ENV === 'test',
});

// Minimal CSRF protection via custom header on state-changing requests
export function requireCsrfHeader(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  const isSafe = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
  if (isSafe) return next();

  const header = req.headers['x-snipshift-csrf'];
  if (!header) {
    return res.status(403).json({ error: 'Missing CSRF header' });
  }
  next();
}

// Role-based access control middleware
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).session?.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: `This endpoint requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }
    
    next();
  };
}

// Input sanitization middleware
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // Basic XSS protection - strip HTML tags from string inputs
  function sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<[^>]+>/g, '')
                .trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
      return sanitized;
    }
    
    return obj;
  }
  
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  next();
}

// Security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking - Allow Google OAuth frames
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy - Enhanced for Google OAuth
  res.setHeader('Content-Security-Policy', 
    "default-src 'self' https://www.gstatic.com; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://apis.google.com https://maps.googleapis.com https://accounts.google.com https://replit.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://www.gstatic.com https://apis.google.com https://maps.googleapis.com https://accounts.google.com; " +
    "frame-src 'self' https://accounts.google.com; " +
    "child-src 'self' https://accounts.google.com;"
  );
  
  next();
}