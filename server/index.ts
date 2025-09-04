import express, { type Request, Response, NextFunction } from "express";
import { registerFirebaseRoutes } from "./firebase-routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupProductionMiddleware, setupHealthCheck } from "./middleware/production";
import { apiLimiter, securityHeaders, sanitizeInput, requireCsrfHeader } from "./middleware/security";
import helmet from "helmet";
import compression from "compression";
import session from "express-session";

const app = express();

// Trust proxy for accurate IP detection (always needed in Replit)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({ contentSecurityPolicy: false })); // Allow Vite's inline scripts in dev
app.use(compression());
app.use(securityHeaders);
app.use(sanitizeInput);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session middleware (basic, in-memory for MVP)
app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
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
  app.use('/api', requireCsrfHeader);
  
  const server = await registerFirebaseRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "localhost",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
