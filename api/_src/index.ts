/**
 * SnipShift API Server Entry Point
 * 
 * RESTful API server with PostgreSQL database integration via Drizzle ORM
 */

// Import express-async-errors FIRST to catch async errors automatically
import 'express-async-errors';

import express from 'express';
import cors from 'cors';
import { JobSchema, ApplicationSchema, LoginSchema, ApplicationStatusSchema, PurchaseSchema, JobStatusUpdateSchema, ReviewSchema } from './validation/schemas.js';
import { errorHandler, asyncHandler } from './middleware/errorHandler.js';
import { authenticateUser, AuthenticatedRequest } from './middleware/auth.js';
import * as jobsRepo from './repositories/jobs.repository.js';
import * as applicationsRepo from './repositories/applications.repository.js';
import * as usersRepo from './repositories/users.repository.js';
import * as notificationsRepo from './repositories/notifications.repository.js';
import * as reviewsRepo from './repositories/reviews.repository.js';
import * as subscriptionsRepo from './repositories/subscriptions.repository.js';
import * as paymentsRepo from './repositories/payments.repository.js';
import * as conversationsRepo from './repositories/conversations.repository.js';
import * as messagesRepo from './repositories/messages.repository.js';
import * as reportsRepo from './repositories/reports.repository.js';
import { getDatabase } from './db/connection.js';
import { auth } from './config/firebase.js';
import usersRouter from './routes/users.js';
import * as notificationService from './services/notification.service.js';
import * as emailService from './services/email.service.js';
import { stripe } from './lib/stripe.js';
import type Stripe from 'stripe';
import { requireAdmin } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Startup validation - log environment status
(function validateEnvironment() {
  console.log('[STARTUP] Validating environment...');
  
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const hasDatabase = !!databaseUrl;
  console.log(`[STARTUP] DATABASE_URL: ${hasDatabase ? '✓ configured' : '✗ missing'}`);
  
  const hasFirebaseServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT;
  const hasFirebaseIndividualVars = !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
  const hasFirebase = hasFirebaseServiceAccount || hasFirebaseIndividualVars;
  console.log(`[STARTUP] FIREBASE: ${hasFirebase ? '✓ configured' : '✗ missing'}`);
  if (hasFirebaseServiceAccount) {
    console.log('[STARTUP]   Using FIREBASE_SERVICE_ACCOUNT');
  } else if (hasFirebaseIndividualVars) {
    console.log('[STARTUP]   Using individual Firebase env vars');
  }
  
  console.log(`[STARTUP] NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`[STARTUP] VERCEL: ${process.env.VERCEL || 'not set'}`);
  console.log('[STARTUP] Environment validation complete');
})();

// Middleware
app.use(cors());

// Stripe webhook route MUST be defined BEFORE express.json() middleware
// to receive raw body for signature verification
// This route handler is defined later in the file, but the route registration
// needs to happen before JSON parsing middleware

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug endpoint to diagnose Vercel environment
app.get('/api/debug', async (req, res) => {
  try {
    // Check if DATABASE_URL exists (return true/false, DO NOT return the value)
    const databaseUrlExists = !!process.env.DATABASE_URL;
    const postgresUrlExists = !!process.env.POSTGRES_URL;

    // Check if FIREBASE_SERVICE_ACCOUNT exists and is valid JSON
    let firebaseServiceAccountStatus: { exists: boolean; validJson: boolean; error?: string } = {
      exists: false,
      validJson: false,
    };

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      firebaseServiceAccountStatus.exists = true;
      try {
        // Handle potential newline escaping issues (common Vercel gotcha)
        const cleanedJson = process.env.FIREBASE_SERVICE_ACCOUNT.replace(/\\n/g, '\n');
        JSON.parse(cleanedJson);
        firebaseServiceAccountStatus.validJson = true;
      } catch (error: any) {
        firebaseServiceAccountStatus.validJson = false;
        firebaseServiceAccountStatus.error = error.message || 'JSON parse failed';
      }
    }

    // Check Firebase individual env vars
    const firebaseIndividualVars = {
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
    };

    // Test database connection
    const db = getDatabase();
    const dbStatus = db ? 'pool_initialized' : 'not_initialized';
    let dbTestResult = 'not_tested';
    if (db) {
      try {
        await db.query('SELECT 1');
        dbTestResult = 'connected';
      } catch (error: any) {
        dbTestResult = `error: ${error?.message || 'unknown'}`;
      }
    }

    res.status(200).json({
      status: 'debug',
      env: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        DATABASE_URL: databaseUrlExists,
        POSTGRES_URL: postgresUrlExists,
        FIREBASE_SERVICE_ACCOUNT: firebaseServiceAccountStatus,
        FIREBASE_INDIVIDUAL_VARS: firebaseIndividualVars,
      },
      services: {
        database: {
          status: dbStatus,
          test: dbTestResult,
        },
        firebase: {
          initialized: !!auth,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[DEBUG ERROR]', error);
    res.status(500).json({
      status: 'error',
      error: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });
  }
});

// Routes
app.use('/api', usersRouter);

// Fallback in-memory store for when DATABASE_URL is not configured (dev only)
// Mock jobs data for development/testing
let mockJobs = [
  {
    id: 'job-1',
    title: 'Hair Stylist Needed',
    shopName: 'Downtown Salon',
    rate: '$25/hour',
    date: '2024-12-20',
    lat: 40.7128,
    lng: -74.0060,
    location: '123 Main St, New York, NY 10001',
  },
  {
    id: 'job-2',
    title: 'Barber Position Available',
    shopName: 'Classic Cuts',
    rate: '$30/hour',
    date: '2024-12-21',
    lat: 40.7589,
    lng: -73.9851,
    location: '456 Broadway, New York, NY 10013',
  },
  {
    id: 'job-3',
    title: 'Part-time Stylist',
    shopName: 'Beauty Bar',
    rate: '$22/hour',
    date: '2024-12-22',
    lat: 40.7505,
    lng: -73.9934,
    location: '789 5th Ave, New York, NY 10022',
  },
  {
    id: 'job-4',
    title: 'Senior Hair Stylist',
    shopName: 'Elite Hair Studio',
    rate: '$35/hour',
    date: '2024-12-23',
    lat: 40.7282,
    lng: -73.9942,
    location: '321 Greenwich St, New York, NY 10013',
  },
  {
    id: 'job-5',
    title: 'Color Specialist Wanted',
    shopName: 'Color Me Beautiful',
    rate: '$28/hour',
    date: '2024-12-24',
    lat: 40.7614,
    lng: -73.9776,
    location: '654 Park Ave, New York, NY 10021',
  },
];

// Health check endpoint
app.get('/health', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const dbStatus = db ? 'connected' : 'not configured';
  
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    database: dbStatus,
  });
}));

// API login endpoint
app.post('/api/login', asyncHandler(async (req, res) => {
  try {
    // Validate request body
    const validationResult = LoginSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({ message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') });
      return;
    }

    const { email, password } = validationResult.data;

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
  mockJobs.push(fallbackJob);
  res.status(201).json(fallbackJob);
}));

// Handler for fetching jobs
app.get('/api/jobs', asyncHandler(async (req, res) => {
  // Parse query parameters for pagination and filtering
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
  const businessId = req.query.businessId as string | undefined;
  const status = req.query.status as 'open' | 'filled' | 'closed' | undefined;
  const city = req.query.city as string | undefined;
  const date = req.query.date as string | undefined;
  
  // Advanced filters
  const search = req.query.search as string | undefined;
  const minRate = req.query.minRate ? parseFloat(req.query.minRate as string) : undefined;
  const maxRate = req.query.maxRate ? parseFloat(req.query.maxRate as string) : undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const radius = req.query.radius ? parseFloat(req.query.radius as string) : undefined;
  const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
  const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;

  // Try to use database first
  const result = await jobsRepo.getJobs({
    businessId,
    status,
    limit,
    offset,
    city,
    date,
    search,
    minRate,
    maxRate,
    startDate,
    endDate,
    radius,
    lat,
    lng,
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

  // Fallback to mock data when database is not available
  res.status(200).json(mockJobs);
}));

// Handler for fetching a single job by ID
app.get('/api/jobs/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

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
      status: job.status,
      businessId: job.businessId,
      businessName: businessOwner?.name || job.shopName || 'Business Owner',
    });
    return;
  }

  // Fallback to in-memory storage if database is not available
  const fallbackJob = mockJobs.find(j => j.id === id);
  if (fallbackJob) {
    res.status(200).json(fallbackJob);
  } else {
    res.status(404).json({ message: 'Job not found' });
  }
}));

// Handler for updating a job
app.put('/api/jobs/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Validate request body
  const validationResult = JobSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') });
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
    });
    return;
  }

  // Fallback to in-memory storage if database is not available
  let found = false;
  mockJobs = mockJobs.map(job => {
    if (job.id === id) {
      found = true;
      return {
        ...job,
        title: jobData.title,
        payRate,
        description: jobData.description,
        date: jobData.date,
        startTime: jobData.startTime,
        endTime: jobData.endTime,
      };
    }
    return job;
  });

  if (found) {
    res.status(200).json(mockJobs.find(j => j.id === id));
  } else {
    res.status(404).json({ message: 'Job not found' });
  }
}));

// Handler for deleting a job
app.delete('/api/jobs/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Try to use database first
  const deleted = await jobsRepo.deleteJob(id);
  if (deleted) {
    res.status(204).send(); // 204 No Content is standard for DELETE
    return;
  }

  // Fallback to in-memory storage if database is not available
  const initialLength = mockJobs.length;
  mockJobs = mockJobs.filter(job => job.id !== id);

  if (mockJobs.length < initialLength) {
    res.status(204).send();
  } else {
    res.status(404).json({ message: 'Job not found' });
  }
}));

// Handler for applying to a job
app.post('/api/jobs/:id/apply', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id: jobId } = req.params;
  
  // Validate request body
  const validationResult = ApplicationSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') });
    return;
  }

  const { name, email, coverLetter } = validationResult.data;
  const userId = req.user?.id; // Get userId if authenticated

  // Check if job exists (database or fallback)
  const job = await jobsRepo.getJobById(jobId);
  const fallbackJob = mockJobs.find(j => j.id === jobId);
  
  if (!job && !fallbackJob) {
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
app.get('/api/applications', asyncHandler(async (req, res) => {
  // Parse query parameters for filtering and pagination
  const userId = req.query.userId as string | undefined;
  const status = req.query.status as 'pending' | 'accepted' | 'rejected' | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

  // If userId is provided, get applications with job details (JOIN to avoid N+1)
  if (userId) {
    const applications = await applicationsRepo.getApplicationsForUser(userId, { status });
    if (applications) {
      // Transform to match frontend expectations
      const transformed = applications.map((app) => ({
        id: app.id,
        jobId: app.jobId,
        jobTitle: app.job.title,
        jobPayRate: app.job.payRate,
        jobLocation: '', // Not in schema yet, can be added later
        jobDescription: app.job.description,
        status: app.status,
        appliedDate: app.appliedAt.toISOString(),
        respondedDate: app.respondedAt ? app.respondedAt.toISOString() : null,
        respondedAt: app.respondedAt ? app.respondedAt.toISOString() : null,
      }));
      res.status(200).json(transformed);
      return;
    }
  }

  // Otherwise, get paginated applications
  const result = await applicationsRepo.getApplications({
    userId,
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
      const locationParts = [app.job.address, app.job.city, app.job.state].filter(Boolean);
      const location = locationParts.length > 0 ? locationParts.join(', ') : undefined;

      return {
        id: app.id,
        jobId: app.jobId,
        jobTitle: app.job.title,
        shopName: app.job.shopName || undefined,
        jobPayRate: app.job.payRate,
        jobLocation: location,
        jobDescription: app.job.description,
        jobDate: app.job.date,
        jobStatus: app.job.status,
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
  // For mock data, return a realistic list of applications
  const mockApplications = [
    {
      id: 'app-1',
      jobId: 'job-1',
      jobTitle: 'Hair Stylist Needed',
      shopName: 'Downtown Salon',
      jobPayRate: '$25/hour',
      jobLocation: '123 Main St, New York, NY 10001',
      jobDescription: 'Looking for an experienced hair stylist',
      jobDate: '2024-12-20',
      status: 'pending',
      appliedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      respondedDate: null,
      respondedAt: null,
    },
    {
      id: 'app-2',
      jobId: 'job-2',
      jobTitle: 'Barber Position Available',
      shopName: 'Classic Cuts',
      jobPayRate: '$30/hour',
      jobLocation: '456 Broadway, New York, NY 10013',
      jobDescription: 'Barber position with flexible hours',
      jobDate: '2024-12-21',
      status: 'accepted',
      appliedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      respondedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      respondedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'app-3',
      jobId: 'job-3',
      jobTitle: 'Part-time Stylist',
      shopName: 'Beauty Bar',
      jobPayRate: '$22/hour',
      jobLocation: '789 5th Ave, New York, NY 10022',
      jobDescription: 'Part-time position available',
      jobDate: '2024-12-22',
      status: 'rejected',
      appliedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      respondedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      respondedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  res.status(200).json(mockApplications);
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
  const { id: jobId } = req.params;
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
  const { id } = req.params;
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

  // Get the job to verify ownership
  const job = await jobsRepo.getJobById(application.jobId);
  if (!job) {
    res.status(404).json({ message: 'Job not found' });
    return;
  }

  // Strict ownership check - ensure current user owns the job
  if (job.businessId !== userId) {
    res.status(403).json({ message: 'Forbidden: You do not own this job' });
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
      
      // Send in-app notification
      await notificationService.notifyApplicationStatusChange(
        candidateUserId,
        candidateEmail,
        job.title,
        status,
        job.id
      );
      
      // Send email notification
      if (candidateEmail && (status === 'accepted' || status === 'rejected')) {
        await emailService.sendApplicationStatusEmail(
          candidateEmail,
          candidateName,
          job.title,
          job.shopName || undefined,
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
  const { id: jobId } = req.params;
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
  const { userId } = req.params;

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

  // In production, this would:
  // 1. Create a Stripe Checkout Session with the planId
  // 2. Return the session ID and checkout URL
  // Example:
  // const session = await stripe.checkout.sessions.create({
  //   payment_method_types: ['card'],
  //   line_items: [{ price: planId, quantity: 1 }],
  //   mode: 'payment',
  //   success_url: `${process.env.FRONTEND_URL}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
  //   cancel_url: `${process.env.FRONTEND_URL}/credits/cancel`,
  // });
  // return { sessionId: session.id, checkoutUrl: session.url };

  res.status(200).json({
    sessionId: mockSessionId,
    checkoutUrl: mockCheckoutUrl,
  });
}));

// Handler for fetching notifications
app.get('/api/notifications', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const notifications = await notificationsRepo.getNotificationsForUser(userId, limit);

  // Transform to match frontend expectations
  const transformed = notifications.map((notif) => ({
    id: notif.id,
    type: notif.type,
    title: notif.title,
    message: notif.message,
    link: notif.link,
    isRead: notif.isRead !== null,
    createdAt: notif.createdAt.toISOString(),
  }));

  res.status(200).json(transformed);
}));

// Handler for getting unread notification count (lightweight)
app.get('/api/notifications/unread-count', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const count = await notificationsRepo.getUnreadCount(userId);
  res.status(200).json({ count });
}));

// Handler for marking a notification as read
app.patch('/api/notifications/:id/read', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const updated = await notificationsRepo.markNotificationAsRead(id, userId);

  if (updated) {
    res.status(200).json({
      id: updated.id,
      isRead: updated.isRead !== null,
    });
    return;
  }

  res.status(404).json({ message: 'Notification not found' });
}));

// Handler for marking all notifications as read
app.patch('/api/notifications/read-all', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const count = await notificationsRepo.markAllNotificationsAsRead(userId);
  res.status(200).json({ count });
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
  const frontendUrl = process.env.FRONTEND_URL || process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:5173';

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

// Handler for Stripe webhooks
// This route must use raw body parser, so it's defined separately
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
  if (!stripe) {
    console.error('Stripe is not configured');
    res.status(500).json({ error: 'Stripe is not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error('Missing Stripe signature or webhook secret');
    res.status(400).json({ error: 'Missing signature or webhook secret' });
    return;
  }

  let event;

  try {
    // Verify webhook signature using raw body
    event = stripe.webhooks.constructEvent(
      req.body,
      sig as string,
      webhookSecret
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
    return;
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        
        // Get metadata
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;

        if (!userId || !planId) {
          console.error('Missing userId or planId in checkout session metadata');
          break;
        }

        // Retrieve the subscription from Stripe
        const stripeSubscriptionId = session.subscription;
        if (!stripeSubscriptionId) {
          console.error('No subscription ID in checkout session');
          break;
        }

        const stripeSubscriptionResult = await stripe!.subscriptions.retrieve(stripeSubscriptionId);
        const stripeSubscription = stripeSubscriptionResult as any;
        const stripeCustomerId = stripeSubscription.customer as string;

        // Get plan from database
        const plan = await subscriptionsRepo.getSubscriptionPlanById(planId);
        if (!plan) {
          console.error(`Plan ${planId} not found in database`);
          break;
        }

        // Create subscription in database
        await subscriptionsRepo.createSubscription({
          userId,
          planId,
          stripeSubscriptionId,
          stripeCustomerId,
          status: stripeSubscription.status === 'active' ? 'active' : 
                  stripeSubscription.status === 'trialing' ? 'trialing' : 'incomplete',
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        });

        // Create payment record
        const amount = session.amount_total ? session.amount_total / 100 : 0; // Convert from cents
        await paymentsRepo.createPayment({
          userId,
          amount,
          currency: session.currency || 'usd',
          status: 'succeeded',
          stripePaymentIntentId: session.payment_intent,
          description: `Subscription: ${plan.name}`,
        });

        console.log(`✅ Subscription created for user ${userId}, plan ${planId}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        const stripeSubscriptionId = invoice.subscription;

        if (!stripeSubscriptionId) {
          break;
        }

        // Get subscription from database
        const subscription = await subscriptionsRepo.getSubscriptionByStripeId(stripeSubscriptionId);
        if (!subscription) {
          console.error(`Subscription ${stripeSubscriptionId} not found in database`);
          break;
        }

        // Retrieve subscription from Stripe to get updated period
        const stripeSubscriptionResult = await stripe!.subscriptions.retrieve(stripeSubscriptionId);
        const stripeSubscription = stripeSubscriptionResult as any;

        // Update subscription period
        await subscriptionsRepo.updateSubscription(subscription.id, {
          status: 'active',
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        });

        // Create payment record
        const amount = invoice.amount_paid / 100; // Convert from cents
        await paymentsRepo.createPayment({
          userId: subscription.userId,
          subscriptionId: subscription.id,
          amount,
          currency: invoice.currency,
          status: 'succeeded',
          stripePaymentIntentId: invoice.payment_intent,
          stripeChargeId: invoice.charge,
          description: `Subscription renewal: ${invoice.description || 'Monthly subscription'}`,
        });

        console.log(`✅ Subscription renewed for subscription ${subscription.id}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSubscription = event.data.object as any;
        const stripeSubscriptionId = stripeSubscription.id;

        // Get subscription from database
        const subscription = await subscriptionsRepo.getSubscriptionByStripeId(stripeSubscriptionId);
        if (!subscription) {
          console.error(`Subscription ${stripeSubscriptionId} not found in database`);
          break;
        }

        // Mark subscription as canceled
        await subscriptionsRepo.updateSubscription(subscription.id, {
          status: 'canceled',
          canceledAt: new Date(),
        });

        console.log(`✅ Subscription canceled: ${subscription.id}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const stripeSubscriptionId = invoice.subscription;

        if (!stripeSubscriptionId) {
          break;
        }

        // Get subscription from database
        const subscription = await subscriptionsRepo.getSubscriptionByStripeId(stripeSubscriptionId);
        if (!subscription) {
          break;
        }

        // Update subscription status to past_due
        await subscriptionsRepo.updateSubscription(subscription.id, {
          status: 'past_due',
        });

        console.log(`⚠️  Payment failed for subscription ${subscription.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Error processing webhook' });
  }
}));

// ============================================================================
// Messaging API Endpoints
// ============================================================================

// Handler for fetching user's conversations
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
  const { id } = req.params;

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

  const { participant2Id, jobId } = req.body;

  if (!participant2Id) {
    res.status(400).json({ message: 'participant2Id is required' });
    return;
  }

  if (participant2Id === userId) {
    res.status(400).json({ message: 'Cannot create conversation with yourself' });
    return;
  }

  // Check if conversation already exists
  const existing = await conversationsRepo.findConversation(userId, participant2Id, jobId);
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
    participant2Id,
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
  const { id } = req.params;

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

// ============================================================================
// Admin API Endpoints
// ============================================================================

// Handler for admin stats
app.get('/api/admin/stats', authenticateUser, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const [totalUsers, totalJobs, activeJobs, totalRevenue, mrr] = await Promise.all([
    usersRepo.getUserCount(),
    jobsRepo.getJobCount(),
    jobsRepo.getActiveJobCount(),
    paymentsRepo.getTotalRevenue(),
    paymentsRepo.getMRR(),
  ]);

  res.status(200).json({
    totalUsers,
    totalJobs,
    activeJobs,
    totalRevenue,
    mrr, // Monthly Recurring Revenue
  });
}));

// Handler for listing all users (admin only)
app.get('/api/admin/users', authenticateUser, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

  const result = await usersRepo.getAllUsers(limit, offset);

  if (!result) {
    res.status(200).json({ data: [], total: 0, limit, offset });
    return;
  }

  // Transform to match frontend expectations
  const transformed = result.data.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    averageRating: user.averageRating ? parseFloat(user.averageRating) : null,
    reviewCount: user.reviewCount ? parseInt(user.reviewCount) : 0,
  }));

  res.status(200).json({
    data: transformed,
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  });
}));

// Handler for banning/deleting a user (admin only)
app.delete('/api/admin/users/:id', authenticateUser, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  // Prevent self-deletion
  if (req.user?.id === id) {
    res.status(400).json({ message: 'Cannot delete your own account' });
    return;
  }

  const deleted = await usersRepo.deleteUser(id);
  if (deleted) {
    res.status(204).send();
  } else {
    res.status(404).json({ message: 'User not found' });
  }
}));

// Handler for listing all jobs (admin only)
app.get('/api/admin/jobs', authenticateUser, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
  const status = req.query.status as 'open' | 'filled' | 'closed' | 'completed' | undefined;

  const result = await jobsRepo.getJobs({
    limit,
    offset,
    status,
  });

  if (!result) {
    res.status(200).json({ data: [], total: 0, limit, offset });
    return;
  }

  // Transform to match frontend expectations
  const transformed = result.data.map((job) => {
    const locationParts = [job.address, job.city, job.state].filter(Boolean);
    const location = locationParts.length > 0 ? locationParts.join(', ') : undefined;

    return {
      id: job.id,
      title: job.title,
      shopName: job.shopName,
      payRate: job.payRate,
      status: job.status,
      date: job.date,
      location,
      businessId: job.businessId,
      createdAt: job.createdAt.toISOString(),
    };
  });

  res.status(200).json({
    data: transformed,
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  });
}));

// ============================================================================
// Reports API Endpoints
// ============================================================================

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

// Handler for fetching all reports (admin only)
app.get('/api/admin/reports', authenticateUser, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
  const status = req.query.status as 'pending' | 'resolved' | 'dismissed' | undefined;

  const result = await reportsRepo.getAllReports(limit, offset, status);

  if (!result) {
    res.status(200).json({ data: [], total: 0, limit, offset });
    return;
  }

  // Get reporter and reported user details
  const reportsWithUsers = await Promise.all(
    result.data.map(async (report) => {
      const reporter = await usersRepo.getUserById(report.reporterId);
      const reported = report.reportedId ? await usersRepo.getUserById(report.reportedId) : null;
      const job = report.jobId ? await jobsRepo.getJobById(report.jobId) : null;

      return {
        id: report.id,
        reporterId: report.reporterId,
        reporter: reporter ? {
          id: reporter.id,
          name: reporter.name,
          email: reporter.email,
        } : null,
        reportedId: report.reportedId,
        reported: reported ? {
          id: reported.id,
          name: reported.name,
          email: reported.email,
        } : null,
        jobId: report.jobId,
        job: job ? {
          id: job.id,
          title: job.title,
        } : null,
        reason: report.reason,
        description: report.description,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
        updatedAt: report.updatedAt.toISOString(),
      };
    })
  );

  res.status(200).json({
    data: reportsWithUsers,
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  });
}));

// Handler for updating report status (admin only)
app.patch('/api/admin/reports/:id/status', authenticateUser, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Validate status
  const validStatuses = ['pending', 'resolved', 'dismissed'];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  // Update report status
  const updatedReport = await reportsRepo.updateReportStatus(id, status);

  if (!updatedReport) {
    res.status(404).json({ message: 'Report not found' });
    return;
  }

  res.status(200).json({
    id: updatedReport.id,
    status: updatedReport.status,
    updatedAt: updatedReport.updatedAt.toISOString(),
  });
}));

// Test email endpoint (Admin only)
app.post('/api/test-email', authenticateUser, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { type, email } = req.body;

  if (!type || !email) {
    res.status(400).json({ message: 'type and email are required' });
    return;
  }

  const validTypes = ['welcome', 'application-status', 'new-message', 'job-alert'];
  if (!validTypes.includes(type)) {
    res.status(400).json({ message: `type must be one of: ${validTypes.join(', ')}` });
    return;
  }

  try {
    let success = false;

    switch (type) {
      case 'welcome':
        success = await emailService.sendWelcomeEmail(email, 'Test User');
        break;
      
      case 'application-status':
        success = await emailService.sendApplicationStatusEmail(
          email,
          'Test User',
          'Hair Stylist Position',
          'Downtown Salon',
          'accepted',
          new Date().toISOString()
        );
        break;
      
      case 'new-message':
        success = await emailService.sendNewMessageEmail(
          email,
          'Test User',
          'John Doe',
          'This is a test message preview...',
          'test-conversation-id'
        );
        break;
      
      case 'job-alert':
        success = await emailService.sendJobAlertEmail(
          email,
          'Test User',
          'Barber Needed',
          'Main Street Barbershop',
          '35',
          'New York, NY',
          new Date().toISOString(),
          'test-job-id'
        );
        break;
    }

    if (success) {
      res.status(200).json({ 
        message: `Test ${type} email sent successfully to ${email}` 
      });
    } else {
      res.status(500).json({ 
        message: `Failed to send test email. Check server logs and ensure RESEND_API_KEY is configured.` 
      });
    }
  } catch (error: any) {
    console.error('Error sending test email:', error);
    res.status(500).json({ 
      message: 'Error sending test email: ' + (error.message || 'Unknown error') 
    });
  }
}));

// 🔥 NUCLEAR ERROR HANDLER - Catches ALL errors including unhandled promise rejections
// This must be BEFORE the standard errorHandler to catch everything
app.use((err: any, req: any, res: any, next: any) => {
  // Log with maximum visibility for Vercel logs
  console.error('🔥 CRITICAL SERVER CRASH:', err);
  console.error('🔥 Stack:', err.stack);
  console.error('🔥 Request Path:', req.path);
  console.error('🔥 Request Method:', req.method);
  console.error('🔥 Request Body:', JSON.stringify(req.body, null, 2));
  console.error('🔥 Request Query:', JSON.stringify(req.query, null, 2));
  console.error('🔥 Request Headers:', JSON.stringify(req.headers, null, 2));
  console.error('🔥 Error Message:', err.message);
  console.error('🔥 Error Name:', err.name);
  console.error('🔥 Timestamp:', new Date().toISOString());
  
  // Send response
  res.status(500).json({ 
    error: 'Server Crash', 
    details: err.message,
    path: req.path,
    method: req.method
  });
});

// Apply error handling middleware (must be last)
app.use(errorHandler);

// Export for Vercel serverless functions
export default app;
