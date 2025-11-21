/**
 * Vercel Serverless Function Entry Point
 * 
 * This file wraps the Express app for Vercel's serverless function environment.
 * Vercel will automatically route /api/* requests to this function.
 */

import app from './src/index';

// Export the Express app as the default handler for Vercel
export default app;

