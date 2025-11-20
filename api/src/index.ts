/**
 * SnipShift API Server Entry Point
 * 
 * RESTful API server with PostgreSQL database integration via Drizzle ORM
 */

import express from 'express';
import cors from 'cors';
import { JobSchema, ApplicationSchema, LoginSchema, ApplicationStatusSchema, PurchaseSchema } from './validation/schemas';
import { errorHandler, asyncHandler } from './middleware/errorHandler';
import { authenticateUser, AuthenticatedRequest } from './middleware/auth';
import * as jobsRepo from './repositories/jobs.repository';
import * as applicationsRepo from './repositories/applications.repository';
import * as usersRepo from './repositories/users.repository';
import { getDatabase } from './db/connection';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Fallback in-memory store for when DATABASE_URL is not configured (dev only)
let mockJobs: any[] = [];

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

// Get current user profile
app.get('/api/me', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  
  // Map DB user to frontend User shape
  res.status(200).json({
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    roles: [req.user.role], // Adapt single role to array for frontend compatibility
    currentRole: req.user.role,
    uid: req.user.uid
  });
}));

// API login endpoint
app.post('/api/login', asyncHandler(async (req, res) => {
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
}));

// GraphQL endpoint placeholder
app.post('/graphql', (req, res) => {
  res.status(200).json({ 
    message: 'GraphQL endpoint - implementation needed'
  });
});

// Handler for creating a job
app.post('/api/jobs', asyncHandler(async (req, res) => {
  // Validate request body
  const validationResult = JobSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') });
    return;
  }

  const jobData = validationResult.data;
  const payRate = typeof jobData.payRate === 'string' ? jobData.payRate : jobData.payRate.toString();

  // Get or create mock business user (temporary until auth is implemented)
  const businessUser = await usersRepo.getOrCreateMockBusinessUser();
  if (!businessUser) {
    // Fallback to in-memory storage if database is not available
    const fallbackJob = {
      id: `job-${Math.floor(Math.random() * 10000)}`,
      title: jobData.title,
      payRate,
      description: jobData.description!,
      date: jobData.date!,
      startTime: jobData.startTime!,
      endTime: jobData.endTime!,
    };
    mockJobs.push(fallbackJob);
    res.status(201).json(fallbackJob);
    return;
  }

  // Try to use database first
  const newJob = await jobsRepo.createJob({
    businessId: businessUser.id,
    title: jobData.title,
    payRate,
    description: jobData.description!,
    date: jobData.date!,
    startTime: jobData.startTime!,
    endTime: jobData.endTime!,
  });

  if (newJob) {
    // Transform database result to match frontend expectations
    res.status(201).json({
      id: newJob.id,
      title: newJob.title,
      payRate: newJob.payRate,
      description: newJob.description,
      date: newJob.date,
      startTime: newJob.startTime,
      endTime: newJob.endTime,
    });
    return;
  }

  // Fallback to in-memory storage if database is not available
  const fallbackJob = {
    id: `job-${Math.floor(Math.random() * 10000)}`,
    title: jobData.title,
    payRate,
    description: jobData.description,
    date: jobData.date,
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

  // Try to use database first
  const result = await jobsRepo.getJobs({
    businessId,
    status,
    limit,
    offset,
  });

  if (result) {
    // Transform database results to match frontend expectations
    const transformedJobs = result.data.map((job) => ({
      id: job.id,
      title: job.title,
      payRate: job.payRate,
      description: job.description,
      date: job.date,
      startTime: job.startTime,
      endTime: job.endTime,
    }));

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

  // Fallback to in-memory storage if database is not available
  res.status(200).json(mockJobs);
}));

// Handler for fetching a single job by ID
app.get('/api/jobs/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Try to use database first
  const job = await jobsRepo.getJobById(id);
  if (job) {
    res.status(200).json({
      id: job.id,
      title: job.title,
      payRate: job.payRate,
      description: job.description,
      date: job.date,
      startTime: job.startTime,
      endTime: job.endTime,
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
    res.status(200).json({
      id: updatedJob.id,
      title: updatedJob.title,
      payRate: updatedJob.payRate,
      description: updatedJob.description,
      date: updatedJob.date,
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
app.post('/api/jobs/:id/apply', asyncHandler(async (req, res) => {
  const { id: jobId } = req.params;
  
  // Validate request body
  const validationResult = ApplicationSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ message: 'Validation error: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') });
    return;
  }

  const { name, email, coverLetter } = validationResult.data;

  // Check if job exists (database or fallback)
  const job = await jobsRepo.getJobById(jobId);
  const fallbackJob = mockJobs.find(j => j.id === jobId);
  
  if (!job && !fallbackJob) {
    res.status(404).json({ message: 'Job not found' });
    return;
  }

  // Check for duplicate application (by email since we don't have user auth yet)
  const hasApplied = await applicationsRepo.hasUserAppliedToJob(jobId, undefined, email);
  if (hasApplied) {
    res.status(409).json({ message: 'You have already applied to this job' });
    return;
  }

  // Create application in database
  const newApplication = await applicationsRepo.createApplication({
    jobId,
    name,
    email,
    coverLetter,
  });

  if (newApplication) {
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

// Handler for fetching applications for a specific job (for business dashboard)
app.get('/api/jobs/:id/applications', asyncHandler(async (req, res) => {
  const { id: jobId } = req.params;

  // Check if job exists
  const job = await jobsRepo.getJobById(jobId);
  if (!job) {
    res.status(404).json({ message: 'Job not found' });
    return;
  }

  // Get applications with job details (JOIN to avoid N+1)
  const applications = await applicationsRepo.getApplicationsForJob(jobId);
  
  if (applications) {
    // Transform to match frontend expectations (ApplicationManagementPage)
    const transformed = applications.map((app) => ({
      id: app.id,
      name: app.name,
      email: app.email,
      coverLetter: app.coverLetter,
      status: app.status || 'pending',
    }));
    res.status(200).json(transformed);
    return;
  }

  // Fallback: return empty array if database is not available
  res.status(200).json([]);
}));

// Handler for updating application status
app.put('/api/applications/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate request body
  const validationResult = ApplicationStatusSchema.safeParse(req.body.status);
  if (!validationResult.success) {
    res.status(400).json({ message: 'Validation error: Status must be one of: pending, accepted, rejected' });
    return;
  }

  const status = validationResult.data;

  // Update application status
  const updatedApplication = await applicationsRepo.updateApplicationStatus(id, status);
  
  if (updatedApplication) {
    res.status(200).json({
      id: updatedApplication.id,
      status: updatedApplication.status,
      respondedAt: updatedApplication.respondedAt ? updatedApplication.respondedAt.toISOString() : null,
    });
    return;
  }

  res.status(404).json({ message: 'Application not found' });
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

// Apply error handling middleware (must be last)
app.use(errorHandler);

// Export for Vercel serverless functions
export default app;
