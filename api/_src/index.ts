/**
 * HospoGo API Server Entry Point
 * 
 * RESTful API server with PostgreSQL database integration via Drizzle ORM
 */

// CRITICAL: Load environment variables FIRST before any other imports
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env file from current directory (api/.env)
dotenv.config();
// Also try loading from parent directory (root .env) if not found
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
}

// Pipe console.log to Google Cloud Logging when GOOGLE_CLOUD_PROJECT is set
import { initConsoleToGoogleCloud } from './lib/console-to-google-cloud.js';
initConsoleToGoogleCloud();

// Import express-async-errors FIRST to catch async errors automatically
import 'express-async-errors';

import express from 'express';
import cors from 'cors';
import { JobSchema, ApplicationSchema, LoginSchema, ApplicationStatusSchema, PurchaseSchema, JobStatusUpdateSchema, ReviewSchema } from './validation/schemas.js';
import { errorHandler, asyncHandler } from './middleware/errorHandler.js';
import { authenticateUser, AuthenticatedRequest } from './middleware/auth.js';
import { correlationIdMiddleware } from './middleware/correlation-id.js';
import * as jobsRepo from './repositories/jobs.repository.js';
import * as applicationsRepo from './repositories/applications.repository.js';
import * as usersRepo from './repositories/users.repository.js';
import * as notificationsRepo from './repositories/notifications.repository.js';
import { normalizeParam } from './utils/request-params.js';
import * as reviewsRepo from './repositories/reviews.repository.js';
import * as subscriptionsRepo from './repositories/subscriptions.repository.js';
import * as paymentsRepo from './repositories/payments.repository.js';
import * as conversationsRepo from './repositories/conversations.repository.js';
import * as messagesRepo from './repositories/messages.repository.js';
import * as reportsRepo from './repositories/reports.repository.js';
import * as shiftsRepo from './repositories/shifts.repository.js';
import { sql } from 'drizzle-orm';
import { getDatabase } from './db/connection.js';
import { getDb } from './db/index.js';
import { auth } from './config/firebase.js';
import usersRouter from './routes/users.js';
import chatsRouter from './routes/chats.js';
import webhooksRouter from './routes/webhooks.js';
import adminRouter from './routes/admin.js';
import adminHealthRouter from './routes/admin/health.js';
import notificationsRouter from './routes/notifications.js';
import shiftsRouter from './routes/shifts.js';
import shiftTemplatesRouter from './routes/shift-templates.js';
import applicationsRouter from './routes/applications.js';
import communityRouter from './routes/community.js';
import trainingRouter from './routes/training.js';
import analyticsRouter from './routes/analytics.js';
import professionalRouter from './routes/professional.js';
import socialPostsRouter from './routes/social-posts.js';
import stripeConnectRouter from './routes/stripe-connect.js';
import stripeRouter from './routes/stripe.js';
import paymentsRouter from './routes/payments.js';
import leadsRouter from './routes/leads.js';
import appealsRouter from './routes/appeals.js';
import waitlistRouter from './routes/waitlist.js';
import onboardingRouter from './routes/onboarding.js';
import reportsRouter from './routes/reports.js';
import pusherRouter from './routes/pusher.js';
import venuesRouter from './routes/venues.js';
import marketplaceRouter from './routes/marketplace.js';
import workerRouter from './routes/worker.js';
import reviewsRouter from './routes/reviews.js';
import pushTokensRouter from './routes/push-tokens.js';
import cronHealthCheckRouter from './routes/cron/health-check.js';
import cronWeeklyReportRouter from './routes/cron/weekly-report.js';
import cronFinancialReconcileRouter from './routes/cron/financial-reconcile.js';
import settlementsRouter from './routes/settlements.js';
import xeroRouter from './routes/integrations/xero.js';
import investorsRouter from './routes/investors.js';
import supportRouter from './routes/support.js';
import * as notificationService from './services/notification.service.js';
import * as emailService from './services/email.service.js';
import { initializePusher } from './services/pusher.service.js';
import { triggerConversationEvent } from './services/pusher.service.js';
import * as pushNotificationService from './services/push-notification.service.js';
import { stripe } from './lib/stripe.js';
import type Stripe from 'stripe';

type LegacyJobRole = 'barber' | 'hairdresser' | 'stylist' | 'other';

/**
 * Normalize HospoGo-era role values into the legacy job role enum stored in the `jobs` table.
 *
 * The DB `job_role` enum (and repository types) are currently legacy-only. We keep the API
 * validation backwards-compatible but coerce hospitality roles to `other` for storage.
 */
function toLegacyJobRole(role: unknown): LegacyJobRole {
  if (!role) return 'barber'; // DB default enum value

  switch (role) {
    case 'barber': // DB enum values (legacy)
    case 'hairdresser':
    case 'stylist':
    case 'other':
      return role as LegacyJobRole;
    default:
      return 'other';
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// Startup validation - log environment status
(function validateEnvironment() {
  console.log('[STARTUP] Validating environment...');
  
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const hasDatabase = !!databaseUrl;
  console.log(`[STARTUP] DATABASE_URL: ${hasDatabase ? '✓ configured' : '✗ missing'}`);
  if (process.env.NODE_ENV === 'test' && databaseUrl) {
    const portMatch = databaseUrl.match(/:(\d+)\//);
    console.log(`[STARTUP] Test mode DB port: ${portMatch ? portMatch[1] : 'unknown'} (5433=test DB)`);
  }
  
  const hasFirebaseServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT;
  const hasFirebaseIndividualVars = !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
  const hasFirebase = hasFirebaseServiceAccount || hasFirebaseIndividualVars;
  console.log(`[STARTUP] FIREBASE: ${hasFirebase ? '✓ configured' : '✗ missing'}`);
  if (hasFirebaseServiceAccount) {
    console.log('[STARTUP]   Using FIREBASE_SERVICE_ACCOUNT');
  } else if (hasFirebaseIndividualVars) {
    console.log('[STARTUP]   Using individual Firebase env vars');
  }
  
  // CRITICAL: Log error immediately if FIREBASE_SERVICE_ACCOUNT is missing
  // This ensures the error is visible in Vercel logs on server start
  if (!hasFirebase) {
    process.stderr.write('[STARTUP ERROR] ⚠️  CRITICAL: Firebase Admin SDK credentials are missing!\n');
    process.stderr.write('[STARTUP ERROR] Authentication will fail. Set one of:\n');
    process.stderr.write('[STARTUP ERROR]   - FIREBASE_SERVICE_ACCOUNT (JSON string)\n');
    process.stderr.write('[STARTUP ERROR]   - OR FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY\n');
    console.error('[STARTUP ERROR] ⚠️  CRITICAL: Firebase Admin SDK credentials are missing!');
    console.error('[STARTUP ERROR] Authentication will fail. Set one of:');
    console.error('[STARTUP ERROR]   - FIREBASE_SERVICE_ACCOUNT (JSON string)');
    console.error('[STARTUP ERROR]   - OR FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY');
  }
  
  console.log(`[STARTUP] NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`[STARTUP] VERCEL: ${process.env.VERCEL || 'not set'}`);
  console.log('[STARTUP] Environment validation complete');
})();

// Middleware
// CORS configuration - allow requests from production domain and localhost
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, Postman, or same-origin requests)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // List of allowed origins
    const allowedOrigins = [
      'https://hospogo.com',
      'https://www.hospogo.com',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ];
    
    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
      if (isProduction) {
        // SECURITY: Reject unauthorized origins in production
        console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      } else {
        // Allow in development for convenience
        console.warn(`[CORS] Dev-mode allowing unauthorized origin: ${origin}`);
        callback(null, true);
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-HospoGo-CSRF'],
};

app.use(cors(corsOptions));

// Stripe webhook route MUST be defined BEFORE express.json() middleware
// to receive raw body for signature verification
app.use('/api/webhooks', webhooksRouter);

// SECURITY: Limit payload size to prevent DoS via large request bodies
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Correlation ID middleware - MUST be before request logging
app.use(correlationIdMiddleware);

// Request logging middleware - log ALL incoming API requests AFTER body parsing
app.use((req, res, next) => {
  // Only log API routes to avoid noise
  if (req.path.startsWith('/api/')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
      correlationId: req.correlationId,
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      hasAuth: !!req.headers.authorization,
      authHeaderPrefix: req.headers.authorization ? req.headers.authorization.substring(0, 30) + '...' : undefined,
      contentType: req.headers['content-type'],
    });
  }
  next();
});

// Initialize Pusher service
initializePusher();

// Routes
app.use('/api', usersRouter);
app.use('/api/chats', chatsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin/health', adminHealthRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/shifts', shiftsRouter);
app.use('/api/shift-templates', shiftTemplatesRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/community', communityRouter);
app.use('/api/training', trainingRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/professional', professionalRouter);
app.use('/api/social-posts', socialPostsRouter);
app.use('/api/stripe-connect', stripeConnectRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/appeals', appealsRouter);
app.use('/api/waitlist', waitlistRouter);
app.use('/api/onboarding', onboardingRouter);
app.use('/api/admin/reports', reportsRouter);
app.use('/api/pusher', pusherRouter);
app.use('/api/venues', venuesRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/worker', workerRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/push-tokens', pushTokensRouter);
app.use('/api/cron', cronHealthCheckRouter);
app.use('/api/cron', cronWeeklyReportRouter);
app.use('/api/cron', cronFinancialReconcileRouter);
app.use('/api/settlements', settlementsRouter);
app.use('/api/integrations/xero', xeroRouter);
app.use('/api/investors', investorsRouter);
app.use('/api/support', supportRouter);

// Aliases for backward compatibility
app.use('/api/training-content', trainingRouter); // Alias for /api/training/content if needed, or just route logic
app.post('/api/purchase-content', authenticateUser, (req, res, next) => {
  // Forward to new endpoint structure
  req.url = '/purchase';
  // Use trainingRouter to handle it
  return trainingRouter(req, res, next);
});


// E2E test setup: ensure user and venue exist for mock-test-token (NODE_ENV=test only)
if (process.env.NODE_ENV === 'test') {
  app.post('/api/test/setup-venue', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;
    const email = req.user?.email ?? 'test-owner@example.com';
    const name = req.user?.name ?? 'Test Owner';
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const venuesRepo = await import('./repositories/venues.repository.js');
    const usersRepo = await import('./repositories/users.repository.js');
    // Ensure user exists (venue FK requires it)
    const existingUser = await usersRepo.getUserById(userId);
    if (!existingUser) {
      const db = getDb();
      if (db) {
        await (db as any).execute(sql`
          INSERT INTO users (id, email, name, role, roles, is_onboarded, created_at, updated_at)
          VALUES (${userId}, ${email}, ${name}, 'business', ARRAY['business']::text[], true, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
        `);
      } else {
        await usersRepo.createUser({ email, name, role: 'business' });
      }
    }
    const existing = await venuesRepo.getVenueByUserId(userId);
    if (existing) {
      res.status(200).json({ ok: true, venueId: existing.id, existing: true });
      return;
    }
    const defaultAddress = { street: '123 Test St', suburb: 'Brisbane City', postcode: '4000', city: 'Brisbane', state: 'QLD', country: 'AU' };
    const defaultHours = {
      monday: { open: '09:00', close: '17:00' }, tuesday: { open: '09:00', close: '17:00' },
      wednesday: { open: '09:00', close: '17:00' }, thursday: { open: '09:00', close: '17:00' },
      friday: { open: '09:00', close: '17:00' }, saturday: { open: '09:00', close: '17:00' },
      sunday: { closed: true },
    };
    const venue = await venuesRepo.createVenue({
      userId,
      venueName: 'E2E Auto-Fill Venue',
      address: defaultAddress,
      operatingHours: defaultHours,
    });
    if (!venue) {
      res.status(500).json({ message: 'Failed to create venue' });
      return;
    }
    res.status(200).json({ ok: true, venueId: venue.id });
  }));

  app.post('/api/test/setup-professional', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
    // Accept user from body (E2E setup sends E2E_PROFESSIONAL) or fall back to token user
    const body = (req.body || {}) as { id?: string; email?: string; name?: string };
    const userId = body.id || req.user?.id;
    const email = body.email ?? req.user?.email ?? 'e2e-professional@hospogo.com';
    const name = body.name ?? req.user?.name ?? 'E2E Test Professional';
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const usersRepo = await import('./repositories/users.repository.js');
    const existingUser = await usersRepo.getUserById(userId);
    if (existingUser) {
      res.status(200).json({ ok: true, userId, existing: true });
      return;
    }
    const db = getDb();
    if (db) {
      await (db as any).execute(sql`
        INSERT INTO users (id, email, name, role, roles, is_onboarded, created_at, updated_at)
        VALUES (${userId}, ${email}, ${name}, 'professional', ARRAY['professional']::text[], true, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `);
    } else {
      await usersRepo.createUser({ email, name, role: 'professional' });
    }
    res.status(200).json({ ok: true, userId });
  }));
}

// Health check endpoint (legacy)
app.get('/health', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const dbStatus = db ? 'connected' : 'not configured';
  
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    database: dbStatus,
  });
}));

// API Health check endpoint (accessible via /api/health)
app.get('/api/health', asyncHandler(async (req, res) => {
  const { performHealthChecks } = await import('./services/health-check.service.js');
  const healthCheck = await performHealthChecks();
  
  // Return appropriate status code based on health
  const statusCode = healthCheck.status === 'unhealthy' ? 503 : 
                     healthCheck.status === 'degraded' ? 200 : 200;
  
  res.status(statusCode).json(healthCheck);
}));

// API login endpoint
app.post('/api/login', asyncHandler(async (req, res) => {
  try {
    // Check if this is an OAuth flow (Firebase token in header)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // OAuth flow: Verify Firebase token
      const token = authHeader.split('Bearer ')[1];
      try {
        if (!auth) {
          res.status(500).json({ message: 'Firebase auth service is not initialized' });
          return;
        }

        const decodedToken = await auth.verifyIdToken(token);
        const { uid, email } = decodedToken;

        if (!email) {
          res.status(401).json({ message: 'Unauthorized: No email in token' });
          return;
        }

        // Find or create user in database
        let user = await usersRepo.getUserByEmail(email);
        
        if (!user) {
          // Create user from OAuth token
          const displayName = decodedToken.name || decodedToken.display_name || email.split('@')[0];
          user = await usersRepo.createUser({
            email,
            name: displayName,
            role: 'professional',
          });

          if (!user) {
            res.status(500).json({ message: 'Failed to create user' });
            return;
          }

          // Send welcome email (non-blocking)
          emailService.sendWelcomeEmail(email, displayName).catch(error => {
            console.error('Failed to send welcome email:', error);
          });
        }

        res.status(200).json({
          id: user.id,
          email: user.email,
          name: user.name,
          token: token, // Return the Firebase token for client to use
        });
        return;
      } catch (tokenError: any) {
        console.error('[LOGIN ERROR] Token verification failed:', tokenError?.message);
        res.status(401).json({ 
          message: 'Unauthorized: Invalid token',
          error: tokenError?.message || 'Token verification failed'
        });
        return;
      }
    }

    // Traditional email/password flow
    // Validate request body
    const validationResult = LoginSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({ message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') });
      return;
    }

    const { email, password } = validationResult.data;

    // Password is required for email/password login
    if (!password) {
      res.status(400).json({ message: 'Password is required for email/password authentication' });
      return;
    }

    // Mock credentials (temporary until proper auth is implemented)
    if (email === 'business@example.com' && password === 'password123') {
      // Try to get or create the mock business user in database
      const dbUser = await usersRepo.getOrCreateMockBusinessUser();
      
      const mockUser = {
        id: dbUser?.id || 'user-1',
        email: 'business@example.com',
        name: dbUser?.name || 'Test Business',
        // In a real app, this would be a JWT
        token: 'mock-auth-token-12345',
      };
      res.status(200).json(mockUser);
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error: any) {
    console.error('[LOGIN ERROR]', error);
    console.error('[LOGIN ERROR] Stack:', error?.stack);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
}));

// GraphQL endpoint placeholder
app.post('/graphql', (req, res) => {
  res.status(200).json({ 
    message: 'GraphQL endpoint - implementation needed'
  });
});

// Handler for creating a job
// [DEPRECATED] This endpoint is deprecated in favor of /api/shifts. 
// The Hub Dashboard now posts to the Shifts API.
// This route is maintained for legacy client compatibility only.
app.post('/api/jobs', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Validate request body
  const validationResult = JobSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') });
    return;
  }

  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const jobData = validationResult.data;
  const payRate = typeof jobData.payRate === 'string' ? jobData.payRate : jobData.payRate.toString();

  // Parse location string if provided (format: "address, city, state" or just "city, state")
  let address = jobData.address;
  let city = jobData.city;
  let state = jobData.state;
  let locationString = jobData.location;

  if (jobData.location && !address) {
    // Try to parse location string
    const parts = jobData.location.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      // Assume last part is state, second to last is city, rest is address
      state = parts[parts.length - 1];
      city = parts[parts.length - 2];
      if (parts.length > 2) {
        address = parts.slice(0, -2).join(', ');
      }
    } else if (parts.length === 1) {
      // Just city name
      city = parts[0];
    }
    locationString = jobData.location;
  } else if (address || city || state) {
    // Construct location string from parts
    const locationParts = [address, city, state].filter(Boolean);
    locationString = locationParts.join(', ');
  }

  // Default coordinates if not provided (use New York as default)
  let lat = jobData.lat ? (typeof jobData.lat === 'string' ? parseFloat(jobData.lat) : jobData.lat) : undefined;
  let lng = jobData.lng ? (typeof jobData.lng === 'string' ? parseFloat(jobData.lng) : jobData.lng) : undefined;

  // If city is provided but no coordinates, use default city coordinates
  if (!lat || !lng) {
    if (city) {
      // Simple city mapping (can be expanded later)
      const cityCoords: Record<string, { lat: number; lng: number }> = {
        'New York': { lat: 40.7128, lng: -74.0060 },
        'Los Angeles': { lat: 34.0522, lng: -118.2437 },
        'Chicago': { lat: 41.8781, lng: -87.6298 },
        'Houston': { lat: 29.7604, lng: -95.3698 },
        'Phoenix': { lat: 33.4484, lng: -112.0740 },
      };
      const coords = cityCoords[city];
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      } else {
        // Default to New York
        lat = 40.7128;
        lng = -74.0060;
      }
    } else {
      // Default to New York
      lat = 40.7128;
      lng = -74.0060;
    }
  }

  // Try to use database first
  const newJob = await jobsRepo.createJob({
    businessId: userId,
    title: jobData.title,
    payRate,
    description: jobData.description!,
    date: jobData.date!,
    startTime: jobData.startTime!,
    endTime: jobData.endTime!,
    role: toLegacyJobRole(jobData.role),
    shopName: jobData.shopName,
    address,
    city,
    state,
    lat: lat?.toString(),
    lng: lng?.toString(),
  });

  if (newJob) {
    // Transform database result to match frontend expectations
    const locationParts = [newJob.address, newJob.city, newJob.state].filter(Boolean);
    const location = locationParts.length > 0 ? locationParts.join(', ') : undefined;
    
    res.status(201).json({
      id: newJob.id,
      title: newJob.title,
      shopName: newJob.shopName,
      rate: newJob.payRate,
      payRate: newJob.payRate,
      description: newJob.description,
      date: newJob.date,
      lat: newJob.lat ? parseFloat(newJob.lat) : undefined,
      lng: newJob.lng ? parseFloat(newJob.lng) : undefined,
      location,
      startTime: newJob.startTime,
      endTime: newJob.endTime,
      role: newJob.role,
      hubId: newJob.businessId,
      businessId: newJob.businessId,
    });
    return;
  }

  // Fallback to in-memory storage if database is not available
  const fallbackJob = {
    id: `job-${Math.floor(Math.random() * 10000)}`,
    title: jobData.title,
    shopName: jobData.shopName || 'TBD',
    rate: payRate,
    payRate,
    description: jobData.description,
    date: jobData.date,
    lat: lat || 0,
    lng: lng || 0,
    location: locationString || 'Location TBD',
    startTime: jobData.startTime,
    endTime: jobData.endTime,
  };
  // Database is required for creating jobs
  res.status(503).json({ message: 'Database not available. Cannot create job.' });
}));

/**
 * Geocode a city name to coordinates using OpenStreetMap Nominatim
 * Returns coordinates or null if geocoding fails
 */
async function geocodeCity(cityName: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // Use OpenStreetMap Nominatim API (free, no API key required)
    const encodedCity = encodeURIComponent(cityName);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedCity}&format=json&limit=1&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'HospoGo/1.0' // Required by Nominatim
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data: unknown = await response.json();
    if (
      Array.isArray(data) &&
      data.length > 0 &&
      typeof (data[0] as { lat?: unknown }).lat === 'string' &&
      typeof (data[0] as { lon?: unknown }).lon === 'string'
    ) {
      const first = data[0] as { lat: string; lon: string };
      return {
        lat: parseFloat(first.lat),
        lng: parseFloat(first.lon),
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Handler for fetching jobs
app.get('/api/jobs', asyncHandler(async (req, res) => {
  // Parse query parameters for pagination and filtering
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
  const businessId = req.query.businessId as string | undefined;
  const status = req.query.status as 'open' | 'filled' | 'closed' | undefined;
  let city = req.query.city as string | undefined;
  const date = req.query.date as string | undefined;
  
  // Advanced filters
  const search = req.query.search as string | undefined;
  const role = req.query.role as 'barber' | 'hairdresser' | 'stylist' | 'other' | undefined; // DB enum values
  const minRate = req.query.minRate ? parseFloat(req.query.minRate as string) : undefined;
  const maxRate = req.query.maxRate ? parseFloat(req.query.maxRate as string) : undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  let radius = req.query.radius ? parseFloat(req.query.radius as string) : undefined;
  let lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
  let lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;

  // If city is provided but lat/lng are not, geocode the city name
  if (city && !lat && !lng) {
    const coords = await geocodeCity(city);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
      // Default to 50km radius if not specified
      if (!radius) {
        radius = 50;
      }
      // Clear city filter since we're using radius-based search
      city = undefined;
    }
    // If geocoding fails, we'll still use exact city name matching (city remains set)
  }

  // Try to use database first
  const result = await jobsRepo.getJobs({
    businessId,
    status,
    limit,
    offset,
    city, // Use city only if geocoding failed or wasn't attempted
    date,
    role,
    search,
    minRate,
    maxRate,
    startDate,
    endDate,
    radius,
    lat,
    lng,
    excludeExpired: true, // Always exclude expired jobs by default
  });

  if (result) {
    // Transform database results to match frontend expectations
    const transformedJobs = result.data.map((job) => {
      // Construct location string from address components
      const locationParts = [job.address, job.city, job.state].filter(Boolean);
      const location = locationParts.length > 0 ? locationParts.join(', ') : undefined;

      return {
        id: job.id,
        title: job.title,
        shopName: job.shopName,
        rate: job.payRate,
        date: job.date,
        lat: job.lat ? parseFloat(job.lat) : undefined,
        lng: job.lng ? parseFloat(job.lng) : undefined,
        location,
        // Include additional fields for compatibility
        payRate: job.payRate,
        description: job.description,
        startTime: job.startTime,
        endTime: job.endTime,
        role: job.role,
        hubId: job.businessId,
        businessId: job.businessId,
      };
    });

    // Include pagination metadata if pagination was requested
    if (limit !== undefined || offset !== undefined) {
      res.status(200).json({
        data: transformedJobs,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      });
    } else {
      res.status(200).json(transformedJobs);
    }
    return;
  }

  // Fallback: return empty array if database is not available
  res.status(200).json([]);
}));

// Handler for fetching a single job by ID
app.get('/api/jobs/:id', asyncHandler(async (req, res) => {
  const id = normalizeParam(req.params.id);

  // Try to use database first
  const job = await jobsRepo.getJobById(id);
  if (job) {
    // Transform database result to match frontend expectations
    const locationParts = [job.address, job.city, job.state].filter(Boolean);
    const location = locationParts.length > 0 ? locationParts.join(', ') : undefined;
    
    // Get business owner info
    const businessOwner = await usersRepo.getUserById(job.businessId);
    
    res.status(200).json({
      id: job.id,
      title: job.title,
      shopName: job.shopName,
      rate: job.payRate,
      payRate: job.payRate,
      description: job.description,
      date: job.date,
      lat: job.lat ? parseFloat(job.lat) : undefined,
      lng: job.lng ? parseFloat(job.lng) : undefined,
      location,
      startTime: job.startTime,
      endTime: job.endTime,
      role: job.role,
      status: job.status,
      businessId: job.businessId,
      hubId: job.businessId,
      businessName: businessOwner?.name || job.shopName || 'Business Owner',
    });
    return;
  }

  // Fallback: return 404 if database is not available
  res.status(404).json({ message: 'Job not found' });
}));

// Handler for updating a job
app.put('/api/jobs/:id', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = normalizeParam(req.params.id);
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  
  // Validate request body
  const validationResult = JobSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') });
    return;
  }

  // Get job to verify ownership
  // Try to use database first
  const existingJob = await jobsRepo.getJobById(id);
  
  if (existingJob) {
    if (existingJob.businessId !== userId) {
      res.status(403).json({ message: 'Forbidden: You do not own this job' });
      return;
    }
  } else {
    // If not in DB, job doesn't exist
    res.status(404).json({ message: 'Job not found' });
    return;
  }

  const jobData = validationResult.data;
  const payRate = typeof jobData.payRate === 'string' ? jobData.payRate : jobData.payRate.toString();

  // Try to use database first
  const updatedJob = await jobsRepo.updateJob(id, {
    title: jobData.title,
    payRate,
    description: jobData.description!,
    date: jobData.date!,
    startTime: jobData.startTime!,
    endTime: jobData.endTime!,
    role: toLegacyJobRole(jobData.role),
  });

  if (updatedJob) {
    // Transform database result to match frontend expectations
    const locationParts = [updatedJob.address, updatedJob.city, updatedJob.state].filter(Boolean);
    const location = locationParts.length > 0 ? locationParts.join(', ') : undefined;
    
    res.status(200).json({
      id: updatedJob.id,
      title: updatedJob.title,
      shopName: updatedJob.shopName,
      rate: updatedJob.payRate,
      payRate: updatedJob.payRate,
      description: updatedJob.description,
      date: updatedJob.date,
      lat: updatedJob.lat ? parseFloat(updatedJob.lat) : undefined,
      lng: updatedJob.lng ? parseFloat(updatedJob.lng) : undefined,
      location,
      startTime: updatedJob.startTime,
      endTime: updatedJob.endTime,
      role: updatedJob.role,
    });
    return;
  }

  // Fallback: return 404 if database is not available
  res.status(404).json({ message: 'Job not found' });
}));

// Handler for deleting a job
app.delete('/api/jobs/:id', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = normalizeParam(req.params.id);
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Get job to verify ownership
  const existingJob = await jobsRepo.getJobById(id);
  
  if (existingJob) {
    if (existingJob.businessId !== userId) {
      res.status(403).json({ message: 'Forbidden: You do not own this job' });
      return;
    }
  } else {
    // If not in DB, job doesn't exist
    res.status(404).json({ message: 'Job not found' });
    return;
  }

  // Try to use database first
  const deleted = await jobsRepo.deleteJob(id);
  if (deleted) {
    res.status(204).send(); // 204 No Content is standard for DELETE
    return;
  }

  // Fallback: return 404 if database is not available
  res.status(404).json({ message: 'Job not found' });
}));

// Handler for applying to a job
app.post('/api/jobs/:id/apply', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const jobId = normalizeParam(req.params.id);
  
  // Validate request body
  const validationResult = ApplicationSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') });
    return;
  }

  const { name, email, coverLetter } = validationResult.data;
  const userId = req.user?.id; // Get userId if authenticated

  // Check if job exists
  const job = await jobsRepo.getJobById(jobId);
  
  if (!job) {
    res.status(404).json({ message: 'Job not found' });
    return;
  }

  // Check for duplicate application (by userId if authenticated, otherwise by email)
  const hasApplied = await applicationsRepo.hasUserAppliedToJob(jobId, userId, email);
  if (hasApplied) {
    res.status(409).json({ message: 'You have already applied to this job' });
    return;
  }

  // Create application in database
  const newApplication = await applicationsRepo.createApplication({
    jobId,
    userId,
    name,
    email,
    coverLetter,
  });

  if (newApplication) {
    // Notify job owner about new application
    if (job) {
      // Get job owner ID from job
      const jobOwnerId = job.businessId;
      if (jobOwnerId) {
        await notificationService.notifyApplicationReceived(
          jobOwnerId,
          name,
          job.title,
          jobId
        );
      }
    }

    res.status(201).json({ 
      message: 'Application submitted successfully!',
      id: newApplication.id,
    });
    return;
  }

  // Fallback response if database is not available
  res.status(201).json({ message: 'Application submitted successfully!' });
}));

// Handler for fetching applications (for professional dashboard)
// SECURITY: Requires authentication and enforces ownership - users can only view their own applications
app.get('/api/applications', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const currentUserId = req.user?.id;
  
  if (!currentUserId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Parse query parameters for filtering and pagination
  const userId = req.query.userId as string | undefined;
  const status = req.query.status as 'pending' | 'accepted' | 'rejected' | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

  // SECURITY: If userId is provided, enforce ownership - users can only query their own applications
  if (userId && userId !== currentUserId) {
    res.status(403).json({ message: 'Forbidden: You can only view your own applications' });
    return;
  }

  // Use current user's ID if no userId provided (default to authenticated user)
  const targetUserId = userId || currentUserId;

  // If userId is provided (or using current user), get applications with job details (JOIN to avoid N+1)
  if (targetUserId) {
    const applications = await applicationsRepo.getApplicationsForUser(targetUserId, { status });
    if (applications) {
      // Transform to match frontend expectations
      const transformed = applications.map((app) => ({
        id: app.id,
        jobId: app.jobId,
        jobTitle: app.job?.title || app.shift?.title || 'Unknown Position',
        jobPayRate: app.job?.payRate || (app.shift && 'hourlyRate' in app.shift ? (app.shift as any).hourlyRate : 'N/A'),
        jobLocation: '', // Not in schema yet, can be added later
        jobDescription: app.job?.description || (app.shift && 'description' in app.shift ? (app.shift as any).description : '') || '',
        status: app.status,
        appliedDate: app.appliedAt.toISOString(),
        respondedDate: app.respondedAt ? app.respondedAt.toISOString() : null,
        respondedAt: app.respondedAt ? app.respondedAt.toISOString() : null,
      }));
      res.status(200).json(transformed);
      return;
    }
  }

  // Otherwise, get paginated applications (default to current user)
  const result = await applicationsRepo.getApplications({
    userId: targetUserId,
    status,
    limit,
    offset,
  });

  if (result) {
    const transformed = result.data.map((app) => ({
      id: app.id,
      jobId: app.jobId,
      status: app.status,
      appliedDate: app.appliedAt.toISOString(),
      respondedDate: app.respondedAt ? app.respondedAt.toISOString() : null,
      respondedAt: app.respondedAt ? app.respondedAt.toISOString() : null,
    }));

    if (limit !== undefined || offset !== undefined) {
      res.status(200).json({
        data: transformed,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      });
    } else {
      res.status(200).json(transformed);
    }
    return;
  }

  // Fallback: return empty array if database is not available
  res.status(200).json([]);
}));

// Handler for fetching current user info (alias for /api/me)
app.get('/api/user', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const user = await usersRepo.getUserById(userId);

  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  res.status(200).json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roles: user.roles,
    bio: user.bio,
    phone: user.phone,
    location: user.location,
    avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl,
    averageRating: user.averageRating,
    reviewCount: user.reviewCount,
    isOnboarded: user.isOnboarded,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
}));

// Handler for fetching current user's applications
app.get('/api/me/applications', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Get applications with job details (JOIN to avoid N+1)
  const applications = await applicationsRepo.getApplicationsForUser(userId);

  if (applications) {
    // Transform to match frontend expectations
    const transformed = applications.map((app) => {
      const jobOrShift = app.job || app.shift;
      
      // Handle potential missing job/shift if data integrity issue
      if (!jobOrShift) {
        return {
          id: app.id,
          jobId: app.jobId || app.shiftId,
          jobTitle: 'Unknown Position',
          jobPayRate: 'N/A',
          jobLocation: undefined,
          jobDescription: 'Position details unavailable',
          jobDate: new Date().toISOString(),
          jobStatus: 'closed',
          status: app.status,
          appliedDate: app.appliedAt.toISOString(),
          respondedDate: app.respondedAt ? app.respondedAt.toISOString() : null,
          respondedAt: app.respondedAt ? app.respondedAt.toISOString() : null,
        };
      }

      // Determine location string
      let location: string | undefined = undefined;
      if (jobOrShift && 'address' in jobOrShift) {
        // It's a job
        const j = jobOrShift as any;
        const locationParts = [j.address, j.city, j.state].filter(Boolean);
        location = locationParts.length > 0 ? locationParts.join(', ') : undefined;
      } else {
        // It's a shift (shifts don't have address fields in schema yet? check schema)
        // Schema check: shifts table has no address/city/state?
        // Let's check schema content...
        // For now, assume undefined or handle if shift has location
      }

      // Helper to safely access properties
      const getProp = (obj: any, prop: string) => obj ? obj[prop] : undefined;
      const getTitle = (obj: any) => getProp(obj, 'title') || 'Unknown Position';
      const getShopName = (obj: any) => getProp(obj, 'shopName');
      const getPayRate = (obj: any) => getProp(obj, 'payRate') || getProp(obj, 'hourlyRate') || 'N/A';
      const getDescription = (obj: any) => getProp(obj, 'description') || '';
      const getDate = (obj: any) => getProp(obj, 'date') || (getProp(obj, 'startTime') ? new Date(getProp(obj, 'startTime')).toISOString() : new Date().toISOString());
      const getStatus = (obj: any) => getProp(obj, 'status') || 'open';

      return {
        id: app.id,
        jobId: app.jobId || app.shiftId,
        jobTitle: getTitle(jobOrShift),
        shopName: getShopName(jobOrShift),
        jobPayRate: getPayRate(jobOrShift),
        jobLocation: location,
        jobDescription: getDescription(jobOrShift),
        jobDate: getDate(jobOrShift),
        jobStatus: getStatus(jobOrShift),
        status: app.status,
        appliedDate: app.appliedAt.toISOString(),
        respondedDate: app.respondedAt ? app.respondedAt.toISOString() : null,
        respondedAt: app.respondedAt ? app.respondedAt.toISOString() : null,
      };
    });

    res.status(200).json(transformed);
    return;
  }

  // Fallback: return empty array if database is not available
  res.status(200).json([]);
}));

// Handler for fetching current user's jobs
app.get('/api/me/jobs', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Get jobs created by current user
  const result = await jobsRepo.getJobs({ businessId: userId });

  if (result) {
    // Get application counts for each job
    const jobsWithCounts = await Promise.all(
      result.data.map(async (job) => {
        try {
          const applications = await applicationsRepo.getApplicationsForJob(job.id);
          const applicationCount = applications?.length || 0;
          
          const locationParts = [job.address, job.city, job.state].filter(Boolean);
          const location = locationParts.length > 0 ? locationParts.join(', ') : undefined;

          return {
            id: job.id,
            title: job.title,
            shopName: job.shopName,
            payRate: job.payRate,
            date: job.date,
            location,
            startTime: job.startTime,
            endTime: job.endTime,
            status: job.status,
            applicationCount,
            createdAt: job.createdAt.toISOString(),
          };
        } catch (err) {
          console.error(`[API ERROR] Failed to process job ${job.id} for /me/jobs listing`, err);
          // Return job with basic info and 0 application count on error
          return {
            id: job.id,
            title: job.title,
            shopName: job.shopName,
            payRate: job.payRate,
            date: job.date,
            location: [job.address, job.city, job.state].filter(Boolean).join(', '),
            startTime: job.startTime,
            endTime: job.endTime,
            status: job.status,
            applicationCount: 0,
            createdAt: job.createdAt.toISOString(),
          };
        }
      })
    );

    res.status(200).json(jobsWithCounts);
    return;
  }

  // Fallback: return empty array if database is not available
  res.status(200).json([]);
}));

// Handler for fetching applications for a specific job (for business dashboard)
app.get('/api/jobs/:id/applications', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const jobId = normalizeParam(req.params.id);
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Check if job exists and belongs to current user
  const job = await jobsRepo.getJobById(jobId);
  if (!job) {
    res.status(404).json({ message: 'Job not found' });
    return;
  }

  // Strict ownership check
  if (job.businessId !== userId) {
    res.status(403).json({ message: 'Forbidden: You do not own this job' });
    return;
  }

  // Get applications with job details (JOIN to avoid N+1)
  const applications = await applicationsRepo.getApplicationsForJob(jobId);
  
  if (applications) {
    // Transform to match frontend expectations
    const transformed = applications.map((app) => ({
      id: app.id,
      name: app.name,
      email: app.email,
      coverLetter: app.coverLetter,
      status: app.status || 'pending',
      appliedAt: app.appliedAt.toISOString(),
      respondedAt: app.respondedAt ? app.respondedAt.toISOString() : null,
      userId: app.userId || undefined,
    }));
    res.status(200).json(transformed);
    return;
  }

  // Fallback: return empty array if database is not available
  res.status(200).json([]);
}));

// Handler for updating application status
app.put('/api/applications/:id/status', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = normalizeParam(req.params.id);
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate request body
  const validationResult = ApplicationStatusSchema.safeParse(req.body.status);
  if (!validationResult.success) {
    res.status(400).json({ message: 'Validation error: Status must be one of: pending, accepted, rejected' });
    return;
  }

  const status = validationResult.data;

  // Get application to check ownership
  const application = await applicationsRepo.getApplicationById(id);
  if (!application) {
    res.status(404).json({ message: 'Application not found' });
    return;
  }

  // Get the job or shift to verify ownership
  let job: any = null;
  let shift: any = null;

  if (application.jobId) {
    job = await jobsRepo.getJobById(application.jobId);
    if (!job) {
      res.status(404).json({ message: 'Job not found' });
      return;
    }

    // Strict ownership check - ensure current user owns the job
    if (job.businessId !== userId) {
      res.status(403).json({ message: 'Forbidden: You do not own this job' });
      return;
    }
  } else if (application.shiftId) {
    // Verify shift ownership
    shift = await shiftsRepo.getShiftById(application.shiftId);
    if (!shift) {
      res.status(404).json({ message: 'Shift not found' });
      return;
    }
    
    if (shift.employerId !== userId) {
      res.status(403).json({ message: 'Forbidden: You do not own this shift' });
      return;
    }
  } else {
    // Should not happen for valid application
    res.status(400).json({ message: 'Application is not linked to a valid job or shift' });
    return;
  }

  // Update application status
  const updatedApplication = await applicationsRepo.updateApplicationStatus(id, status);
  
  if (updatedApplication) {
    // Notify candidate about status change
    if (status === 'accepted' || status === 'rejected') {
      const candidateUserId = application.userId || null;
      const candidateEmail = application.email;
      
      // Get candidate user info for email
      let candidateName = 'there';
      if (candidateUserId) {
        const candidateUser = await usersRepo.getUserById(candidateUserId);
        if (candidateUser) {
          candidateName = candidateUser.name;
        }
      }
      
      // Notify in-app notification
      const positionTitle = job ? job.title : (shift ? shift.title : 'Position');
      const positionId = job ? job.id : (shift ? shift.id : '');
      
      await notificationService.notifyApplicationStatusChange(
        candidateUserId,
        candidateEmail,
        positionTitle,
        status,
        positionId
      );
      
      // Send email notification
      if (candidateEmail && (status === 'accepted' || status === 'rejected')) {
        await emailService.sendApplicationStatusEmail(
          candidateEmail,
          candidateName,
          positionTitle,
          job ? job.shopName : (shift ? (shift as any).shopName : undefined),
          status,
          application.appliedAt.toISOString()
        );
      }
    }

    res.status(200).json({
      id: updatedApplication.id,
      status: updatedApplication.status,
      respondedAt: updatedApplication.respondedAt ? updatedApplication.respondedAt.toISOString() : null,
    });
    return;
  }

  res.status(404).json({ message: 'Application not found' });
}));

// Handler for updating job status
app.patch('/api/jobs/:id/status', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const jobId = normalizeParam(req.params.id);
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate request body
  const validationResult = JobStatusUpdateSchema.safeParse(req.body.status);
  if (!validationResult.success) {
    res.status(400).json({ message: 'Validation error: Status must be one of: open, filled, closed, completed' });
    return;
  }

  const newStatus = validationResult.data;

  // Get job to verify ownership
  const job = await jobsRepo.getJobById(jobId);
  if (!job) {
    res.status(404).json({ message: 'Job not found' });
    return;
  }

  // Strict ownership check - ensure current user owns the job
  if (job.businessId !== userId) {
    res.status(403).json({ message: 'Forbidden: You do not own this job' });
    return;
  }

  // Validate status transition - can only mark 'open' or 'filled' as 'completed'
  if (newStatus === 'completed' && job.status !== 'open' && job.status !== 'filled') {
    res.status(400).json({ message: 'Only open or filled jobs can be marked as completed' });
    return;
  }

  // Update job status
  const updatedJob = await jobsRepo.updateJob(jobId, { status: newStatus });
  
  if (updatedJob) {
    // If status changed to completed, notify both parties
    if (newStatus === 'completed') {
      // Find the accepted application to get the professional's userId
      const applications = await applicationsRepo.getApplicationsForJob(jobId);
      const acceptedApplication = applications?.find(app => app.status === 'accepted');
      const professionalId = acceptedApplication?.userId || null;

      await notificationService.notifyJobCompleted(
        jobId,
        userId,
        professionalId,
        job.title
      );
    }

    res.status(200).json({
      id: updatedJob.id,
      status: updatedJob.status,
    });
    return;
  }

  res.status(404).json({ message: 'Job not found' });
}));

// Handler for creating a review
app.post('/api/reviews', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate request body
  const validationResult = ReviewSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ 
      message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') 
    });
    return;
  }

  const reviewData = validationResult.data;

  // Verify job exists and is completed
  const job = await jobsRepo.getJobById(reviewData.jobId);
  if (!job) {
    res.status(404).json({ message: 'Job not found' });
    return;
  }

  if (job.status !== 'completed') {
    res.status(400).json({ message: 'Reviews can only be created for completed jobs' });
    return;
  }

  // Verify reviewer is either the employer or the professional who worked on this job
  const isEmployer = job.businessId === userId;
  const applications = await applicationsRepo.getApplicationsForJob(reviewData.jobId);
  const acceptedApplication = applications?.find(app => app.status === 'accepted' && app.userId === userId);
  const isProfessional = !!acceptedApplication;

  if (!isEmployer && !isProfessional) {
    res.status(403).json({ message: 'You can only review jobs you are involved in' });
    return;
  }

  // Verify reviewee is the other party (not self-review)
  if (reviewData.revieweeId === userId) {
    res.status(400).json({ message: 'You cannot review yourself' });
    return;
  }

  // Verify reviewee is either the employer or the professional
  const isRevieweeEmployer = job.businessId === reviewData.revieweeId;
  const isRevieweeProfessional = applications?.some(app => 
    app.status === 'accepted' && app.userId === reviewData.revieweeId
  );

  if (!isRevieweeEmployer && !isRevieweeProfessional) {
    res.status(400).json({ message: 'Invalid reviewee for this job' });
    return;
  }

  // Check for duplicate review
  const hasReviewed = await reviewsRepo.hasUserReviewedJob(reviewData.jobId, userId);
  if (hasReviewed) {
    res.status(409).json({ message: 'You have already reviewed this job' });
    return;
  }

  // Create review
  const newReview = await reviewsRepo.createReview({
    reviewerId: userId,
    revieweeId: reviewData.revieweeId,
    jobId: reviewData.jobId,
    rating: reviewData.rating,
    comment: reviewData.comment,
  });

  if (newReview) {
    // Recalculate and update reviewee's rating
    await reviewsRepo.updateUserRating(reviewData.revieweeId);

    res.status(201).json({
      id: newReview.id,
      reviewerId: newReview.reviewerId,
      revieweeId: newReview.revieweeId,
      jobId: newReview.jobId,
      rating: parseInt(newReview.rating),
      comment: newReview.comment,
      createdAt: newReview.createdAt.toISOString(),
    });
    return;
  }

  res.status(500).json({ message: 'Failed to create review' });
}));

// Handler for fetching reviews for a user
app.get('/api/reviews/:userId', asyncHandler(async (req, res) => {
  const userId = normalizeParam(req.params.userId);

  const reviews = await reviewsRepo.getReviewsForUser(userId);

  if (reviews) {
    const transformed = reviews.map((review) => ({
      id: review.id,
      reviewerId: review.reviewerId,
      revieweeId: review.revieweeId,
      jobId: review.jobId,
      rating: parseInt(review.rating),
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      reviewer: {
        id: review.reviewer.id,
        name: review.reviewer.name,
        email: review.reviewer.email,
      },
      job: {
        id: review.job.id,
        title: review.job.title,
      },
    }));

    res.status(200).json(transformed);
    return;
  }

  res.status(200).json([]);
}));

// Handler for fetching user's available job posting credits
app.get('/api/credits', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // TODO: Fetch credits from database when credits table/field is implemented
  // For now, return a mock value (default: 5 credits)
  // In the future, this would query: SELECT credits FROM user_credits WHERE user_id = userId
  const mockCredits = 5;

  res.status(200).json({
    credits: mockCredits,
  });
}));

// Handler for initiating credit purchase checkout
app.post('/api/credits/purchase', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate request body
  const validationResult = PurchaseSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ 
      message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') 
    });
    return;
  }

  const { planId } = validationResult.data;

  // TODO: Integrate with Stripe Checkout API
  // For now, mock the Stripe integration
  console.log(`[PURCHASE] Initiating purchase for plan: ${planId}, user: ${userId}`);

  // Generate mock Stripe Checkout Session ID
  const mockSessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  const mockCheckoutUrl = `https://checkout.stripe.com/pay/${mockSessionId}`;

  res.status(200).json({
    sessionId: mockSessionId,
    checkoutUrl: mockCheckoutUrl,
  });
}));

// ============================================================================
// Subscription & Payment API Endpoints
// ============================================================================

// Handler for fetching subscription plans
app.get('/api/subscriptions/plans', asyncHandler(async (req, res) => {
  const plans = await subscriptionsRepo.getSubscriptionPlans();

  if (!plans) {
    // Fallback to mock data if database is not available
    const mockPlans = [
      {
        id: 'plan_basic',
        name: 'Basic',
        description: 'Perfect for getting started',
        price: 9.99,
        interval: 'month',
        features: ['10 job postings per month', 'Basic analytics', 'Email support'],
      },
      {
        id: 'plan_pro',
        name: 'Professional',
        description: 'For growing businesses',
        price: 29.99,
        interval: 'month',
        features: ['Unlimited job postings', 'Advanced analytics', 'Priority support', 'Featured listings'],
      },
      {
        id: 'plan_enterprise',
        name: 'Enterprise',
        description: 'For large organizations',
        price: 99.99,
        interval: 'month',
        features: ['Unlimited everything', 'Dedicated account manager', 'Custom integrations', 'API access'],
      },
    ];
    res.status(200).json(mockPlans);
    return;
  }

  // Transform database plans to match frontend expectations
  const transformedPlans = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description || '',
    price: parseFloat(plan.price),
    interval: plan.interval as 'month' | 'year',
    features: plan.features ? JSON.parse(plan.features) : [],
    stripePriceId: plan.stripePriceId,
  }));

  res.status(200).json(transformedPlans);
}));

// Handler for fetching user's current subscription
app.get('/api/subscriptions/current', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const subscription = await subscriptionsRepo.getCurrentSubscription(userId);

  if (!subscription) {
    res.status(200).json(null);
    return;
  }

  // Transform to match frontend expectations
  res.status(200).json({
    id: subscription.id,
    planId: subscription.planId,
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd !== null,
  });
}));

// Handler for creating checkout session
app.post('/api/subscriptions/checkout', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  if (!stripe) {
    res.status(500).json({ message: 'Stripe is not configured' });
    return;
  }

  const { planId } = req.body;

  if (!planId) {
    res.status(400).json({ message: 'planId is required' });
    return;
  }

  // Get the plan from database
  const plan = await subscriptionsRepo.getSubscriptionPlanById(planId);
  if (!plan) {
    res.status(404).json({ message: 'Subscription plan not found' });
    return;
  }

  // Check if user already has an active subscription
  const existingSubscription = await subscriptionsRepo.getCurrentSubscription(userId);
  if (existingSubscription) {
    res.status(400).json({ message: 'You already have an active subscription' });
    return;
  }

  // Get user details for Stripe customer
  const user = await usersRepo.getUserById(userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  // Get Stripe Price ID from plan or use planId as fallback
  const stripePriceId = plan.stripePriceId || planId;

  // Determine frontend URL
  const frontendUrl = process.env.FRONTEND_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');

  try {
    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      customer_email: user.email,
      success_url: `${frontendUrl}/wallet?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/wallet?canceled=true`,
      metadata: {
        userId: userId,
        planId: planId,
      },
      subscription_data: {
        metadata: {
          userId: userId,
          planId: planId,
        },
      },
    });

    res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ 
      message: 'Failed to create checkout session',
      error: error.message 
    });
  }
}));

// Handler for creating subscription with trial (for onboarding flow)
// This is used when payment method has already been collected via SetupIntent
app.post('/api/subscriptions/create-with-trial', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  if (!stripe) {
    res.status(500).json({ message: 'Stripe is not configured' });
    return;
  }

  const { planId, trialDays = 14 } = req.body;

  if (!planId) {
    res.status(400).json({ message: 'planId is required' });
    return;
  }

  // Get the plan from database
  const plan = await subscriptionsRepo.getSubscriptionPlanById(planId);
  if (!plan) {
    res.status(404).json({ message: 'Subscription plan not found' });
    return;
  }

  // Check if user already has an active subscription
  const existingSubscription = await subscriptionsRepo.getCurrentSubscription(userId);
  if (existingSubscription) {
    res.status(400).json({ message: 'You already have an active subscription' });
    return;
  }

  // Get user details
  const user = await usersRepo.getUserById(userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  // Get or create Stripe customer
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId },
    });
    customerId = customer.id;
    // Update user with Stripe customer ID
    await usersRepo.updateUser(userId, { stripeCustomerId: customerId });
  }

  // Get the customer's default payment method
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
  const defaultPaymentMethod = customer.invoice_settings?.default_payment_method as string | null;

  if (!defaultPaymentMethod) {
    res.status(400).json({ message: 'No payment method found. Please add a payment method first.' });
    return;
  }

  // Get Stripe Price ID from plan
  const stripePriceId = plan.stripePriceId;
  if (!stripePriceId || stripePriceId.startsWith('price_HOLDER_')) {
    res.status(400).json({ message: 'Subscription plan is not properly configured with Stripe' });
    return;
  }

  try {
    // Create Stripe subscription with trial
    const stripeSubscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: stripePriceId }],
      default_payment_method: defaultPaymentMethod,
      trial_period_days: trialDays,
      metadata: {
        userId,
        planId,
      },
    });

    // Get period dates from the first subscription item (Stripe SDK v20+ moved these to SubscriptionItem)
    const firstItem = stripeSubscription.items.data[0];
    const currentPeriodStart = firstItem?.current_period_start 
      ? new Date(firstItem.current_period_start * 1000) 
      : new Date();
    const currentPeriodEnd = firstItem?.current_period_end 
      ? new Date(firstItem.current_period_end * 1000) 
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Create subscription record in database
    const subscription = await subscriptionsRepo.createSubscription({
      userId,
      planId,
      status: stripeSubscription.status === 'trialing' ? 'trialing' : 'active',
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: customerId,
      currentPeriodStart,
      currentPeriodEnd,
    });

    if (!subscription) {
      res.status(500).json({ message: 'Failed to create subscription record in database' });
      return;
    }

    res.status(201).json({
      message: 'Subscription created successfully',
      subscription: {
        id: subscription.id,
        status: subscription.status,
        trialEnd: stripeSubscription.trial_end 
          ? new Date(stripeSubscription.trial_end * 1000).toISOString() 
          : null,
        currentPeriodEnd: currentPeriodEnd.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Stripe subscription error:', error);
    res.status(500).json({ 
      message: 'Failed to create subscription',
      error: error.message 
    });
  }
}));

// Handler for canceling subscription
app.post('/api/subscriptions/cancel', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  if (!stripe) {
    res.status(500).json({ message: 'Stripe is not configured' });
    return;
  }

  // Get user's current subscription
  const subscription = await subscriptionsRepo.getCurrentSubscription(userId);
  if (!subscription) {
    res.status(404).json({ message: 'No active subscription found' });
    return;
  }

  if (!subscription.stripeSubscriptionId) {
    res.status(400).json({ message: 'Subscription does not have a Stripe ID' });
    return;
  }

  try {
    // Cancel subscription in Stripe (at period end)
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update database
    await subscriptionsRepo.cancelSubscription(subscription.id);

    res.status(200).json({ message: 'Subscription will be canceled at the end of the billing period' });
  } catch (error: any) {
    console.error('Stripe cancellation error:', error);
    res.status(500).json({ 
      message: 'Failed to cancel subscription',
      error: error.message 
    });
  }
}));

// Handler for fetching payment history
app.get('/api/payments/history', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const payments = await paymentsRepo.getPaymentHistory(userId, limit);

  if (!payments) {
    res.status(200).json([]);
    return;
  }

  // Transform to match frontend expectations
  const transformed = payments.map((payment) => ({
    id: payment.id,
    amount: parseFloat(payment.amount),
    currency: payment.currency,
    status: payment.status,
    description: payment.description || undefined,
    createdAt: payment.createdAt.toISOString(),
  }));

  res.status(200).json(transformed);
}));

// ============================================================================
// Messaging API Endpoints
// ============================================================================

// Handler for fetching user's conversations
// Handler for getting unread message count
// MUST be defined BEFORE /api/conversations/:id to avoid route conflict
app.get('/api/conversations/unread-count', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const unreadCount = await messagesRepo.getUnreadCount(userId);
    res.status(200).json({ unreadCount });
  } catch (error: any) {
    console.error('[GET /api/conversations/unread-count] Error:', error);
    console.error('[GET /api/conversations/unread-count] Stack:', error?.stack);
    res.status(500).json({ 
      message: 'Failed to fetch unread count',
      error: error?.message || 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
}));

app.get('/api/conversations', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const conversations = await conversationsRepo.getConversationsForUser(userId);

  if (!conversations) {
    res.status(200).json([]);
    return;
  }

  // Transform to match frontend expectations
  const transformed = conversations.map((conv) => ({
    id: conv.id,
    jobId: conv.jobId,
    otherParticipant: conv.otherParticipant,
    latestMessage: conv.latestMessage ? {
      id: conv.latestMessage.id,
      content: conv.latestMessage.content,
      senderId: conv.latestMessage.senderId,
      createdAt: conv.latestMessage.createdAt.toISOString(),
    } : null,
    job: conv.job,
    lastMessageAt: conv.lastMessageAt?.toISOString(),
    createdAt: conv.createdAt.toISOString(),
  }));

  res.status(200).json(transformed);
}));

// Handler for fetching a specific conversation with full message history
app.get('/api/conversations/:id', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const id = normalizeParam(req.params.id);

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Verify user has access to this conversation
  const conversation = await conversationsRepo.getConversationById(id, userId);
  if (!conversation) {
    res.status(404).json({ message: 'Conversation not found' });
    return;
  }

  // Get messages
  const messageList = await messagesRepo.getMessagesForConversation(id, userId);
  if (!messageList) {
    res.status(200).json({ conversation, messages: [] });
    return;
  }

  // Get other participant info
  const otherParticipantId = conversation.participant1Id === userId
    ? conversation.participant2Id
    : conversation.participant1Id;

  const otherParticipant = await usersRepo.getUserById(otherParticipantId);

  // Get job info if exists
  let jobInfo = null;
  if (conversation.jobId) {
    jobInfo = await jobsRepo.getJobById(conversation.jobId);
  }

  // Transform messages
  const transformedMessages = messageList.map((msg) => ({
    id: msg.id,
    conversationId: msg.conversationId,
    senderId: msg.senderId,
    content: msg.content,
    isRead: msg.isRead !== null,
    createdAt: msg.createdAt.toISOString(),
    sender: msg.sender,
  }));

  res.status(200).json({
    conversation: {
      id: conversation.id,
      jobId: conversation.jobId,
      participant1Id: conversation.participant1Id,
      participant2Id: conversation.participant2Id,
      lastMessageAt: conversation.lastMessageAt?.toISOString(),
      createdAt: conversation.createdAt.toISOString(),
    },
    otherParticipant: otherParticipant ? {
      id: otherParticipant.id,
      name: otherParticipant.name,
      email: otherParticipant.email,
      } : null,
    job: jobInfo ? {
      id: jobInfo.id,
      title: jobInfo.title,
    } : null,
    messages: transformedMessages,
  });
}));

// Handler for creating a new conversation or getting existing one
app.post('/api/conversations', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Support both targetUserId (new) and participant2Id (legacy) for backward compatibility
  const targetUserId = req.body.targetUserId || req.body.participant2Id;
  const jobId = req.body.jobId;

  if (!targetUserId) {
    res.status(400).json({ message: 'targetUserId is required' });
    return;
  }

  if (targetUserId === userId) {
    res.status(400).json({ message: 'Cannot create conversation with yourself' });
    return;
  }

  // Check if conversation already exists
  const existing = await conversationsRepo.findConversation(userId, targetUserId, jobId);
  if (existing) {
    res.status(200).json({
      id: existing.id,
      existing: true,
    });
    return;
  }

  // Create new conversation
  const newConversation = await conversationsRepo.createConversation({
    participant1Id: userId,
    participant2Id: targetUserId,
    jobId: jobId || undefined,
  });

  if (!newConversation) {
    res.status(500).json({ message: 'Failed to create conversation' });
    return;
  }

  res.status(201).json({
    id: newConversation.id,
    existing: false,
  });
}));

// Handler for sending a message
app.post('/api/messages', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { conversationId, content } = req.body;

  if (!conversationId || !content) {
    res.status(400).json({ message: 'conversationId and content are required' });
    return;
  }

  if (typeof content !== 'string' || content.trim().length === 0) {
    res.status(400).json({ message: 'Content cannot be empty' });
    return;
  }

  // Verify user has access to this conversation
  const conversation = await conversationsRepo.getConversationById(conversationId, userId);
  if (!conversation) {
    res.status(404).json({ message: 'Conversation not found' });
    return;
  }

  // Create message
  const newMessage = await messagesRepo.createMessage({
    conversationId,
    senderId: userId,
    content: content.trim(),
  });

  if (!newMessage) {
    res.status(500).json({ message: 'Failed to create message' });
    return;
  }

  // Update conversation's last message timestamp
  await conversationsRepo.updateConversationLastMessage(conversationId);

  // Get recipient ID
  const recipientId = conversation.participant1Id === userId
    ? conversation.participant2Id
    : conversation.participant1Id;

  // Get sender info for notification
  const sender = await usersRepo.getUserById(userId);
  const recipient = await usersRepo.getUserById(recipientId);

  // Create notification for recipient
  if (recipient) {
    await notificationService.createNotification({
      userId: recipientId,
      type: 'message_received',
      title: 'New Message',
      message: `New message from ${sender?.name || 'Someone'}`,
      link: `/messages?conversation=${conversationId}`,
    });
    
    // Send push notification (only if user is not active in conversation)
    if (sender) {
      pushNotificationService.sendMessagePushNotification(
        recipientId,
        sender.name,
        content.trim(),
        conversationId,
        `/messages?conversation=${conversationId}`
      ).catch((error) => {
        console.error('[Messages] Error sending push notification:', error);
      });
    }
    
    // Send email notification
    if (sender && recipient.email) {
      await emailService.sendNewMessageEmail(
        recipient.email,
        recipient.name,
        sender.name,
        content.trim(),
        conversationId
      );
    }
  }

  // Get job title for notification context
  let jobTitle = null;
  if (conversation.jobId) {
    const job = await jobsRepo.getJobById(conversation.jobId);
    jobTitle = job?.title || null;
  }

  // Trigger Pusher event for real-time message delivery
  try {
    const messagePayload = {
      id: newMessage.id,
      conversationId: newMessage.conversationId,
      senderId: newMessage.senderId,
      content: newMessage.content,
      isRead: false,
      createdAt: newMessage.createdAt.toISOString(),
      sender: sender ? {
        id: sender.id,
        name: sender.name,
        email: sender.email,
      } : undefined,
    };

    await triggerConversationEvent(conversationId, 'new_message', messagePayload);
  } catch (error: any) {
    console.error('[PUSHER] Error triggering message event:', error);
    // Don't fail the request if Pusher fails
  }

  res.status(201).json({
    id: newMessage.id,
    conversationId: newMessage.conversationId,
    senderId: newMessage.senderId,
    content: newMessage.content,
    createdAt: newMessage.createdAt.toISOString(),
  });
}));

// Handler for marking messages as read
app.patch('/api/conversations/:id/read', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const id = normalizeParam(req.params.id);

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Verify user has access
  const conversation = await conversationsRepo.getConversationById(id, userId);
  if (!conversation) {
    res.status(404).json({ message: 'Conversation not found' });
    return;
  }

  // Mark messages as read
  await messagesRepo.markMessagesAsRead(id, userId);

  res.status(200).json({ success: true });
}));


// Report endpoints
// Handler for creating a report
app.post('/api/reports', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { reportedId, jobId, reason, description } = req.body;

  // Validate required fields
  if (!reason || !description) {
    res.status(400).json({ message: 'Reason and description are required' });
    return;
  }

  // Validate reason enum
  const validReasons = ['no_show', 'payment_issue', 'harassment', 'spam', 'other'];
  if (!validReasons.includes(reason)) {
    res.status(400).json({ message: `Reason must be one of: ${validReasons.join(', ')}` });
    return;
  }

  // Ensure at least one of reportedId or jobId is provided
  if (!reportedId && !jobId) {
    res.status(400).json({ message: 'Either reportedId or jobId must be provided' });
    return;
  }

  // Prevent self-reporting
  if (reportedId === userId) {
    res.status(400).json({ message: 'Cannot report yourself' });
    return;
  }

  // Create report
  const newReport = await reportsRepo.createReport({
    reporterId: userId,
    reportedId: reportedId || undefined,
    jobId: jobId || undefined,
    reason,
    description: description.trim(),
  });

  if (!newReport) {
    res.status(500).json({ message: 'Failed to create report' });
    return;
  }

  res.status(201).json({
    id: newReport.id,
    reporterId: newReport.reporterId,
    reportedId: newReport.reportedId,
    jobId: newReport.jobId,
    reason: newReport.reason,
    description: newReport.description,
    status: newReport.status,
    createdAt: newReport.createdAt.toISOString(),
  });
}));


// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'HospoGo API is running',
    version: '1.0.0',
    documentation: '/api/docs' // Placeholder
  });
});

// Favicon handler to prevent 404s
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// 404 Catch-all
app.use((req, res, next) => {
  res.status(404);
  next(new Error(`Endpoint not found: ${req.method} ${req.path}`));
});

// Google Cloud Error Reporting middleware (reports uncaught errors to Error Reporting)
// Lazy-loaded: dynamic import avoids "Cannot access 'ts' before initialization" in Vercel bundle
(async () => {
  try {
    const { getErrorReportingClient } = await import('./lib/google-cloud.js');
    const gcpErrorClient = await getErrorReportingClient();
    if (gcpErrorClient?.express) {
      app.use(gcpErrorClient.express);
    }
  } catch {
    // Silently skip GCP Error Reporting if unavailable
  }
})();

// Apply error handling middleware (must be last)
app.use(errorHandler);

// Export for Vercel serverless functions
export default app;

