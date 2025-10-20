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

// Request size limiter middleware
export function requestSizeLimiter(req: Request, res: Response, next: NextFunction) {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  const maxSize = 10 * 1024 * 1024; // 10MB limit
  
  if (contentLength > maxSize) {
    return res.status(413).json({
      error: 'Request entity too large',
      message: 'Request size exceeds maximum allowed limit'
    });
  }
  
  next();
}

// Enhanced CSRF protection
export function requireCsrfHeader(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  const isSafe = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
  
  if (isSafe) return next();

  const header = req.headers['x-snipshift-csrf'];
  if (!header) {
    return res.status(403).json({ 
      error: 'Missing CSRF header',
      message: 'This request requires a CSRF token for security'
    });
  }
  
  // Basic CSRF token validation (in production, use proper token generation/validation)
  if (typeof header !== 'string' || header.length < 10) {
    return res.status(403).json({ 
      error: 'Invalid CSRF header',
      message: 'CSRF token format is invalid'
    });
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

// Enhanced input sanitization middleware
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // Enhanced XSS protection with more comprehensive sanitization
  function sanitizeObject(obj: any, depth = 0): any {
    // Prevent deep recursion attacks
    if (depth > 10) {
      console.warn('Input sanitization: Maximum depth reached, truncating object');
      return '[Object truncated - too deep]';
    }

    if (typeof obj === 'string') {
      // Remove script tags and other dangerous HTML
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
        .replace(/<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi, '')
        .replace(/<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item, depth + 1));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        // Prevent prototype pollution
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          continue;
        }
        sanitized[key] = sanitizeObject(obj[key], depth + 1);
      }
      return sanitized;
    }
    
    return obj;
  }
  
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
}

// Enhanced security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking - Allow Google OAuth frames
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (formerly Feature Policy)
  res.setHeader('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );
  
  // HSTS (HTTP Strict Transport Security) - only in production with HTTPS
  if (process.env.NODE_ENV === 'production' && req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Enhanced Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://apis.google.com https://maps.googleapis.com https://accounts.google.com https://replit.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://www.gstatic.com https://apis.google.com https://maps.googleapis.com https://accounts.google.com wss: ws:",
    "frame-src 'self' https://accounts.google.com",
    "child-src 'self' https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'"
  ];
  
  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
  
  // Additional security headers
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  
  next();
}