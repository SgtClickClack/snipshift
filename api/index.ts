/**
 * Vercel Serverless Function Entry Point
 * 
 * This file wraps the Express app for Vercel's serverless function environment.
 * Vercel will automatically route /api/* requests to this function.
 * 
 * PATH ALIGNMENT (v1.1.15): On Vercel, requests may arrive with path stripped
 * (e.g. /bootstrap instead of /api/bootstrap). We normalize req.url so Express
 * routes (mounted at /api) match correctly.
 */

import express from 'express';
// Import the Express app - Vercel will resolve the path correctly
import appModule from './_src/index.js';

// CRITICAL: Force Node.js runtime (not Edge)
// This prevents Vercel from using Edge runtime which doesn't support Node.js APIs
export const config = {
  runtime: 'nodejs', // Explicitly forces Node.js, overriding Vercel defaults
  maxDuration: 60,   // Aligned with vercel.json functions.api/index.ts.maxDuration
};

// Wrap in try-catch to catch any module-level initialization errors
let app: any;

try {
  // Static import for ESM - this works in Vercel serverless functions
  app = appModule;
} catch (error: any) {
  console.error('🔥 CRITICAL: Failed to load Express app:', error?.message || error);
  console.error('🔥 Stack:', error?.stack);
  
  // Create a minimal error handler app using ESM import
  const errorApp = express();
  errorApp.use(express.json());
  
  errorApp.all('*', (req: any, res: any) => {
    console.error('🔥 Request failed due to app initialization error');
    res.status(500).json({
      error: 'Server initialization failed',
      message: error?.message || 'Unknown error',
      details: 'The server failed to initialize. Check server logs for details.',
      path: req.path,
    });
  });
  
  app = errorApp;
}

// DIAGNOSTIC (v1.1.18): Log the raw URL Vercel passes to the function BEFORE any mutation.
// This is the single source of truth for debugging 404s caused by path-stripping.
const rawUrlLogger = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
  if (process.env.VERCEL) {
    console.log(`[VERCEL_ENTRY] RAW req.url=${req.url} req.originalUrl=${req.originalUrl} method=${req.method}`);
  }
  next();
};

// PATH ALIGNMENT (v1.1.18): Normalize req.url so Express routes always see /api/*.
//
// Express routes in _src/index.ts are mounted as app.use('/api', router), so
// req.url MUST start with '/api/' for Express to match and strip the prefix.
//
// Observed Vercel behaviors for a request to /api/bootstrap:
//   1. req.url = '/api/bootstrap'   (prefix preserved — no action needed)
//   2. req.url = '/bootstrap'       (prefix stripped — must prepend /api)
//   3. req.url = '/index'           (resolved to function path — must remap)
//   4. req.url = '/api'             (bare prefix — pass through)
const pathNormalizeMiddleware = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
  // Skip normalization in local dev (VERCEL env is only set on Vercel deployments)
  if (!process.env.VERCEL) return next();

  const originalUrl = req.url || '/';
  const questionIdx = originalUrl.indexOf('?');
  const rawPath = questionIdx >= 0 ? originalUrl.slice(0, questionIdx) : originalUrl;
  const query = questionIdx >= 0 ? originalUrl.slice(questionIdx) : '';

  // Already correctly prefixed — no action needed
  if (rawPath.startsWith('/api')) {
    return next();
  }

  // Paths that should NOT be prefixed (health checks, static assets)
  const skipPaths = ['/', '/favicon.ico', '/health'];
  if (skipPaths.includes(rawPath)) {
    return next();
  }

  // Vercel sometimes resolves to the function file path
  if (rawPath === '/index' || rawPath === '/index.ts') {
    req.url = '/api' + query;
    console.log(`[PATH_NORM] ${rawPath} → /api${query}`);
    return next();
  }

  // Default: Vercel stripped the /api prefix — re-add it
  const normalizedUrl = '/api' + rawPath + query;
  console.log(`[PATH_NORM] ${rawPath} → ${normalizedUrl}`);
  req.url = normalizedUrl;
  next();
};

const wrappedApp = express();
wrappedApp.use(rawUrlLogger);
wrappedApp.use(pathNormalizeMiddleware);
wrappedApp.use(app);

// Export the wrapped Express app as the default handler for Vercel
export default wrappedApp;

