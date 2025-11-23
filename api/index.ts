/**
 * Vercel Serverless Function Entry Point
 * 
 * This file wraps the Express app for Vercel's serverless function environment.
 * Vercel will automatically route /api/* requests to this function.
 */

// CRITICAL: Force Node.js runtime (not Edge)
// This prevents Vercel from using Edge runtime which doesn't support Node.js APIs
export const config = {
  runtime: 'nodejs', // Forces Node.js runtime, not Edge
};

// Wrap in try-catch to catch any module-level initialization errors
let app: any;
try {
  app = require('./src/index').default;
} catch (error: any) {
  console.error('🔥 CRITICAL: Failed to load Express app:', error?.message || error);
  console.error('🔥 Stack:', error?.stack);
  
  // Create a minimal error handler app
  const express = require('express');
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

// Export the Express app as the default handler for Vercel
export default app;

