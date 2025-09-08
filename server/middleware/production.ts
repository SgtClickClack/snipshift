import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function setupProductionMiddleware(app: express.Application) {
  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // HTTPS redirect (if not already handled by reverse proxy)
    // Skip redirect in CI/E2E and when running on localhost to avoid HTTPS handshake errors
    const isProduction = process.env.NODE_ENV === 'production';
    const isCi = process.env.CI === 'true' || process.env.CI === '1';
    const isE2e = process.env.E2E_TEST === '1' || process.env.VITE_E2E === '1';
    const hostHeader = req.header('host') || '';
    const isLocalHost = hostHeader.startsWith('localhost') || hostHeader.startsWith('127.0.0.1') || hostHeader.startsWith('[::1]') || hostHeader.startsWith('::1');
    const shouldRedirectToHttps = isProduction && !isCi && !isE2e && !isLocalHost && req.header('x-forwarded-proto') !== 'https';

    if (shouldRedirectToHttps) {
      res.redirect(`https://${hostHeader}${req.url}`);
      return;
    }
    next();
  });

  // Compression is handled by express compression middleware in server/index.ts

  // Cache static assets
  app.use((req, res, next) => {
    if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (req.url.match(/\.(html|json)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
    next();
  });

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    const clientBuildPath = path.join(__dirname, 'public');
    app.use(express.static(clientBuildPath));
    
    // Handle client-side routing - serve index.html for all non-API routes
    app.get('*', (req, res, next) => {
      if (req.url.startsWith('/api/')) {
        return next();
      }
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
  }
}

export function setupHealthCheck(app: express.Application) {
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: '1.0.0'
    });
  });

  // Readiness check
  app.get('/ready', (req, res) => {
    // Add any database or external service checks here
    res.status(200).json({
      status: 'ready',
      checks: {
        database: 'ok', // In real app, check actual database connection
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
        }
      }
    });
  });
}