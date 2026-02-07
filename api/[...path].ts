/**
 * Vercel Catch-All API Handler (v1.1.19)
 *
 * Vercel file-based routing maps api/index.ts → /api (exact).
 * This catch-all handles all /api/* sub-paths (e.g. /api/bootstrap,
 * /api/register, /api/me) by delegating to the same Express app.
 *
 * Without this file, requests to /api/bootstrap would 404 at the
 * Vercel routing layer before ever reaching Express.
 */
export { default, config } from './index.js';
