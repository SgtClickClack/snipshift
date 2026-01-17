import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import app from '../index.js';

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
  authenticateUserOptional: vi.fn((req, _res, next) => {
    if (req.headers.authorization?.includes('valid-token')) {
      req.user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'professional',
        uid: 'firebase-uid-123',
      };
    }
    next();
  }),
  requireAdmin: vi.fn((req, res, next) => next()),
  requireSuperAdmin: vi.fn((req, res, next) => next()),
  AuthenticatedRequest: {},
}));

// Mock Repositories
vi.mock('../repositories/jobs.repository.js', () => ({
  getJobById: vi.fn(),
  getJobs: vi.fn(),
}));

vi.mock('../repositories/applications.repository.js', () => ({
  hasUserAppliedToJob: vi.fn(),
  createApplication: vi.fn(),
  getApplicationsForUser: vi.fn(),
}));

vi.mock('../repositories/users.repository.js', () => ({
  getUserById: vi.fn().mockResolvedValue({ id: 'user-123', name: 'Test User' }),
}));

vi.mock('../services/notification.service.js', () => ({
  notifyApplicationReceived: vi.fn(),
}));

// Mock DB Connection
vi.mock('../db/connection.js', () => ({
  getDatabase: vi.fn(() => ({})),
}));

describe('Applications API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/jobs/:id/apply', () => {
    it('should apply for a job successfully', async () => {
      const jobId = 'job-123';
      const mockJob = {
        id: jobId,
        title: 'Test Job',
        businessId: 'biz-1',
      };

      const mockApplication = {
        id: 'app-123',
        jobId: jobId,
        userId: 'user-123',
        status: 'pending',
        appliedAt: new Date(),
      };

      const mockJobsRepo = await import('../repositories/jobs.repository.js');
      vi.mocked(mockJobsRepo.getJobById).mockResolvedValue(mockJob as any);

      const mockAppsRepo = await import('../repositories/applications.repository.js');
      vi.mocked(mockAppsRepo.hasUserAppliedToJob).mockResolvedValue(false);
      vi.mocked(mockAppsRepo.createApplication).mockResolvedValue(mockApplication as any);

      const response = await supertest(app)
        .post(`/api/jobs/${jobId}/apply`)
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          coverLetter: 'I am interested in this job.',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('app-123');
      expect(mockAppsRepo.createApplication).toHaveBeenCalled();
    });

    it('should return 404 if job not found', async () => {
      const jobId = 'job-999';
      const mockJobsRepo = await import('../repositories/jobs.repository.js');
      vi.mocked(mockJobsRepo.getJobById).mockResolvedValue(null);

      const response = await supertest(app)
        .post(`/api/jobs/${jobId}/apply`)
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          coverLetter: 'I am interested.',
        });

      expect(response.status).toBe(404);
    });

    it('should return 409 if already applied', async () => {
      const jobId = 'job-123';
      const mockJob = { id: jobId, title: 'Test Job' };

      const mockJobsRepo = await import('../repositories/jobs.repository.js');
      vi.mocked(mockJobsRepo.getJobById).mockResolvedValue(mockJob as any);

      const mockAppsRepo = await import('../repositories/applications.repository.js');
      vi.mocked(mockAppsRepo.hasUserAppliedToJob).mockResolvedValue(true);

      const response = await supertest(app)
        .post(`/api/jobs/${jobId}/apply`)
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          coverLetter: 'I am interested.',
        });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/me/applications', () => {
    it('should list my applications', async () => {
      const mockApplications = [
        {
          id: 'app-1',
          jobId: 'job-1',
          job: {
            title: 'Job 1',
            payRate: '50',
            description: 'Desc',
            date: '2024-01-01',
            status: 'open',
            address: '123 St',
            city: 'City',
            state: 'State'
          },
          status: 'pending',
          appliedAt: new Date(),
        }
      ];

      const mockAppsRepo = await import('../repositories/applications.repository.js');
      vi.mocked(mockAppsRepo.getApplicationsForUser).mockResolvedValue(mockApplications as any);

      const response = await supertest(app)
        .get('/api/me/applications')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].id).toBe('app-1');
      expect(response.body[0].jobTitle).toBe('Job 1');
    });
  });
});

