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

    // Global error handlers to prevent silent crashes
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      // Don't exit in development
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      // Don't exit in development
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    });

    const app = express();
    // Remove framework fingerprints
    app.disable('x-powered-by');

    // Trust proxy for accurate IP detection (always needed in Replit)
    app.set('trust proxy', 1);

    // Security middleware
    // Enable CSP in production; relax in development for Vite/HMR
    const helmetOptions: Parameters<typeof helmet>[0] =
      process.env.NODE_ENV === 'production'
        ? {
            contentSecurityPolicy: {
              useDefaults: true,
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:'],
                connectSrc: ["'self'", '*'],
                frameAncestors: ["'none'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: null,
              },
            },
            crossOriginEmbedderPolicy: false,
          }
        : { contentSecurityPolicy: false };
    app.use(helmet(helmetOptions));
    // Enforce HSTS in production (behind HTTPS proxy)
    if (process.env.NODE_ENV === 'production') {
      app.use(helmet.hsts({ maxAge: 15552000, includeSubDomains: true, preload: false }));
    }

    app.use(compression());
    app.use(securityHeaders);
    app.use(sanitizeInput);

    // CRITICAL: Stripe webhook needs raw body - exclude from JSON parsing
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/stripe/webhook')) {
        next(); // Skip JSON parsing for webhook (handles query params/variations)
      } else {
        // Set conservative body limits to prevent abuse
        express.json({ limit: '1mb' })(req, res, next);
      }
    });
    app.use(express.urlencoded({ extended: false, limit: '1mb' }));

    // Enforce SESSION_SECRET presence with safe defaults
    if (!process.env.SESSION_SECRET) {
      if (process.env.NODE_ENV === 'production') {
        console.error('FATAL ERROR: SESSION_SECRET environment variable is not set.');
        process.exit(1);
      } else {
        console.warn('WARNING: SESSION_SECRET not set. Using insecure default "dev-secret-change-me" for development.');
        process.env.SESSION_SECRET = 'dev-secret-change-me';
      }
    }

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
      secret: process.env.SESSION_SECRET,
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
      // CSRF header required by default; allow explicit disable for CI/E2E
      const disableCsrf = process.env.DISABLE_CSRF === '1' || process.env.DISABLE_CSRF === 'true';
      if (!disableCsrf && process.env.E2E_TEST !== '1' && process.env.CI !== 'true') {
        app.use('/api', requireCsrfHeader);
      }

      await registerFirebaseRoutes(app);
      
      // Create HTTP server after routes are registered
      const { createServer } = await import("http");
      const server = createServer(app);

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

      const disableVite = process.env.DISABLE_VITE === '1' || process.env.DISABLE_VITE === 'true';
      if (isDevelopment && !disableVite) {
        console.log("Setting up Vite development server...");

        // Fix path mismatch: server/vite.ts adds /client prefix but Vite expects files without it
        // due to root: "./client" in vite.config.ts
        app.use((req, res, next) => {
          if (req.url.startsWith('/client/src/')) {
            req.url = req.url.replace('/client/src/', '/src/');
          } else if (req.url.startsWith('/client/public/')) {
            req.url = req.url.replace('/client/public/', '/public/');
          }
          next();
        });

        try {
          await setupVite(app, server);
        } catch (error) {
          console.error("Vite setup failed. Falling back to static files.", error);
          console.log("Serving static files as fallback...");
          serveStatic(app);
        }
      } else {
        console.log("Serving static files...");
        serveStatic(app);
      }

    // Validate and sanitize the port
    let parsedPort = Number(process.env.PORT || 5000);
    if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
      console.warn(`Invalid PORT value "${process.env.PORT}". Falling back to 5000.`);
      parsedPort = 5000;
    }
    const port = parsedPort;
    
    console.log(`Starting server on port ${port} (PORT env: ${process.env.PORT})`);

      // Return a promise that only resolves when server errors occur
      return new Promise<void>((resolve, reject) => {
        server.listen({
          port,
          host: "0.0.0.0", // Replit needs 0.0.0.0 for external access
        }, () => {
          const mode = isDevelopment ? 'development' : 'production';
          log(`Server is ready! Visit: http://localhost:${port}`);
          log(`Startup mode: ${mode} (${isDevelopment ? 'vite-middleware or static fallback' : 'static'})`);
        });

        server.on('error', (error: any) => {
          console.error('Server error:', error);
          reject(error);
        });
      });
    })().catch((error) => {
      console.error('Fatal error during server startup:', error);
      process.exit(1);
    });