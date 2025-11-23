/**
 * Vercel Serverless Function Entry Point
 * 
 * This file wraps the Express app for Vercel's serverless function environment.
 * Vercel will automatically route /api/* requests to this function.
 */

import express from 'express';
// Import the Express app - Vercel will resolve the path correctly
import appModule from './src/index';

// CRITICAL: Force Node.js runtime (not Edge)
// This prevents Vercel from using Edge runtime which doesn't support Node.js APIs
export const config = {
  runtime: 'nodejs', // Explicitly forces Node.js, overriding Vercel defaults
  maxDuration: 30,   // Prevents timeouts (matches vercel.json setting)
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

// Export the Express app as the default handler for Vercel
export default app;

