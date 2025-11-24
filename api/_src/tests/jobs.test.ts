import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import app from '../index';

// Mock Middleware
vi.mock('../middleware/auth.js', () => ({
  authenticateUser: vi.fn((req, res, next) => {
    if (req.headers.authorization?.includes('valid-token')) {
      req.user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'professional',
        uid: 'firebase-uid-123',
      };
      next();
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  }),
  requireAdmin: vi.fn((req, res, next) => next()),
  AuthenticatedRequest: {},
}));

// Mock Firebase Admin
vi.mock('firebase-admin', () => ({
  auth: () => ({
    verifyIdToken: vi.fn().mockResolvedValue({ uid: 'test-uid' }),
  }),
  initializeApp: vi.fn(),
  credential: {
    cert: vi.fn(),
  },
}));

// Mock Firebase Config
vi.mock('../config/firebase.js', () => ({
  auth: {
    verifyIdToken: vi.fn(),
  },
}));

// Mock Repositories
vi.mock('../repositories/jobs.repository.js', () => ({
  createJob: vi.fn(),
  getJobs: vi.fn(),
  getJobById: vi.fn(),
  updateJob: vi.fn(),
  deleteJob: vi.fn(),
}));

vi.mock('../repositories/users.repository.js', () => ({
  getUserById: vi.fn().mockResolvedValue({ id: 'user-123', name: 'Test User' }),
}));

// Mock DB Connection
vi.mock('../db/connection.js', () => ({
  getDatabase: vi.fn(() => ({})),
}));

describe('Jobs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/jobs', () => {
    it('should create a job successfully', async () => {
      const newJob = {
        id: 'job-123',
        title: 'Test Job',
        shopName: 'Test Shop',
        payRate: '50',
        description: 'Test Description',
        date: '2024-12-25',
        startTime: '09:00',
        endTime: '17:00',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        lat: '40.7128',
        lng: '-74.0060',
      };

      const mockJobsRepo = await import('../repositories/jobs.repository.js');
      vi.mocked(mockJobsRepo.createJob).mockResolvedValue(newJob as any);

      const response = await supertest(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Test Job',
          shopName: 'Test Shop',
          payRate: '50',
          description: 'Test Description',
          date: '2024-12-25',
          startTime: '09:00',
          endTime: '17:00',
          location: '123 Test St, Test City, TS'
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('job-123');
      expect(mockJobsRepo.createJob).toHaveBeenCalled();
    });

    it('should return 400 for invalid input', async () => {
      const response = await supertest(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: '', // Invalid
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/jobs', () => {
    it('should list jobs', async () => {
      const mockJobsList = {
        data: [
          {
            id: 'job-1',
            title: 'Job 1',
            payRate: '30',
            address: 'A',
            city: 'B',
            state: 'C',
            createdAt: new Date(),
          }
        ],
        total: 1,
        limit: 10,
        offset: 0
      };
      
      const mockJobsRepo = await import('../repositories/jobs.repository.js');
      vi.mocked(mockJobsRepo.getJobs).mockResolvedValue(mockJobsList as any);

      const response = await supertest(app)
        .get('/api/jobs?limit=10')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true); 
      expect(response.body.data[0].title).toBe('Job 1');
    });
  });

  describe('GET /api/jobs/:id', () => {
    it('should return a job by id', async () => {
      const mockJob = {
        id: 'job-123',
        title: 'Test Job',
        businessId: 'biz-1',
        createdAt: new Date(),
        address: 'A', city: 'B', state: 'C', payRate: '50'
      };
      
      const mockJobsRepo = await import('../repositories/jobs.repository.js');
      vi.mocked(mockJobsRepo.getJobById).mockResolvedValue(mockJob as any);

      const response = await supertest(app)
        .get('/api/jobs/job-123');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('job-123');
    });

    it('should return 404 if job not found', async () => {
      const mockJobsRepo = await import('../repositories/jobs.repository.js');
      vi.mocked(mockJobsRepo.getJobById).mockResolvedValue(null);

      const response = await supertest(app)
        .get('/api/jobs/job-999');

      expect(response.status).toBe(404);
    });
  });
});
