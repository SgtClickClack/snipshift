import express, { type Request, Response, NextFunction } from "express";
import { registerFirebaseRoutes } from "./firebase-routes";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupProductionMiddleware, setupHealthCheck } from "./middleware/production";
import { apiLimiter, securityHeaders, sanitizeInput, requireCsrfHeader } from "./middleware/security";
import helmet from "helmet";
import compression from "compression";
import session from "express-session";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";

const app = express();

// Trust proxy for accurate IP detection (always needed in Replit)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({ contentSecurityPolicy: false })); // Allow Vite's inline scripts in dev
app.use(compression());
app.use(securityHeaders);
app.use(sanitizeInput);

// CRITICAL: Stripe webhook needs raw body - exclude from JSON parsing
app.use((req, res, next) => {
  if (req.path.startsWith('/api/stripe/webhook')) {
    next(); // Skip JSON parsing for webhook (handles query params/variations)
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({ extended: false }));

// Session middleware
const useMemoryStore = !process.env.DATABASE_URL || process.env.E2E_TEST === '1' || process.env.NODE_ENV === 'test';
const PgSession = connectPg(session);
const MemoryStore = createMemoryStore(session);

app.use(session({
  name: 'sid',
  store: useMemoryStore
    ? new MemoryStore({ checkPeriod: 1000 * 60 * 30 })
    : new PgSession({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
      }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    // In CI/E2E we run over HTTP on localhost; secure cookies would be dropped
    secure: process.env.NODE_ENV === 'production' && process.env.E2E_TEST !== '1' && process.env.CI !== 'true' && process.env.VITE_E2E !== '1',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

// Setup production middleware
if (process.env.NODE_ENV === 'production') {
  setupProductionMiddleware(app);
}

// Setup health check endpoints
setupHealthCheck(app);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Apply rate limiting to API routes
  app.use('/api', apiLimiter);
  // Skip CSRF header requirement in CI/E2E and test runs to allow UI-based POSTs
  if (process.env.E2E_TEST !== '1' && process.env.CI !== 'true') {
    app.use('/api', requireCsrfHeader);
  }
  
  const server = await registerFirebaseRoutes(app);
  
  // CRITICAL: Register Stripe and other routes (including webhook)
  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  // Default to development if NODE_ENV is not set
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "development";
  }
  const isDevelopment = process.env.NODE_ENV === "development" || process.env.NODE_ENV !== "production";
  console.log("Environment:", process.env.NODE_ENV, "isDevelopment:", isDevelopment);
  
  if (isDevelopment) {
    console.log("Setting up Vite development server...");
    await setupVite(app, server);
  } else {
    console.log("Serving static files...");
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
    log(`Server is ready! Visit: http://localhost:${port}`);
  });
})();
