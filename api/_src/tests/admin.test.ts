import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import app from '../index';

// Mock Auth Middleware
vi.mock('../middleware/auth.js', () => ({
  authenticateUser: vi.fn((req, res, next) => {
    const role = req.headers['x-role'] || 'professional';
    req.user = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: role,
      uid: 'firebase-uid-123',
    };
    next();
  }),
  requireAdmin: vi.fn((req, res, next) => {
    if (req.user?.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  }),
  AuthenticatedRequest: {},
}));

// Mock Repositories
vi.mock('../repositories/users.repository.js', () => ({
  getUserCount: vi.fn(),
  getAllUsers: vi.fn(),
  deleteUser: vi.fn(),
  getUserById: vi.fn(),
}));

vi.mock('../repositories/jobs.repository.js', () => ({
  getJobCount: vi.fn(),
  getActiveJobCount: vi.fn(),
  getJobs: vi.fn(),
  getJobById: vi.fn(),
  updateJob: vi.fn(),
}));

vi.mock('../repositories/payments.repository.js', () => ({
  getTotalRevenue: vi.fn(),
  getMRR: vi.fn(),
}));

vi.mock('../repositories/reports.repository.js', () => ({
  getAllReports: vi.fn(),
  updateReportStatus: vi.fn(),
}));

vi.mock('../services/email.service.js', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(true),
  sendApplicationStatusEmail: vi.fn().mockResolvedValue(true),
  sendNewMessageEmail: vi.fn().mockResolvedValue(true),
  sendJobAlertEmail: vi.fn().mockResolvedValue(true),
}));

// Mock DB Connection
vi.mock('../db/connection.js', () => ({
  getDatabase: vi.fn(() => ({})),
}));

// Mock Firebase
vi.mock('../config/firebase.js', () => ({
  auth: {
    verifyIdToken: vi.fn(),
  },
}));

describe('Admin Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Security Checks (Red Path)', () => {
    it('should return 403 for non-admin accessing stats', async () => {
      const response = await supertest(app)
        .get('/api/admin/stats')
        .set('x-role', 'professional'); // Simulate regular user
      expect(response.status).toBe(403);
    });

    it('should return 403 for non-admin accessing users list', async () => {
      const response = await supertest(app)
        .get('/api/admin/users')
        .set('x-role', 'business'); // Simulate business user
      expect(response.status).toBe(403);
    });

    it('should return 403 for non-admin attempting to delete user', async () => {
      const response = await supertest(app)
        .delete('/api/admin/users/some-id')
        .set('x-role', 'professional');
      expect(response.status).toBe(403);
    });

    it('should return 403 for non-admin accessing jobs', async () => {
      const response = await supertest(app)
        .get('/api/admin/jobs')
        .set('x-role', 'professional');
      expect(response.status).toBe(403);
    });

    it('should return 403 for non-admin updating job status', async () => {
      const response = await supertest(app)
        .patch('/api/admin/jobs/job-id/status')
        .send({ status: 'filled' })
        .set('x-role', 'professional');
      expect(response.status).toBe(403);
    });

    it('should return 403 for non-admin accessing reports', async () => {
      const response = await supertest(app)
        .get('/api/admin/reports')
        .set('x-role', 'professional');
      expect(response.status).toBe(403);
    });

    it('should return 403 for non-admin updating report status', async () => {
      const response = await supertest(app)
        .patch('/api/admin/reports/report-id/status')
        .send({ status: 'resolved' })
        .set('x-role', 'professional');
      expect(response.status).toBe(403);
    });

    it('should return 403 for non-admin sending test email', async () => {
      const response = await supertest(app)
        .post('/api/admin/test-email')
        .send({ type: 'welcome', email: 'test@test.com' })
        .set('x-role', 'professional');
      expect(response.status).toBe(403);
    });
  });

  describe('Functionality (Green Path)', () => {
    it('should return stats for admin', async () => {
      const usersRepo = await import('../repositories/users.repository.js');
      const jobsRepo = await import('../repositories/jobs.repository.js');
      const paymentsRepo = await import('../repositories/payments.repository.js');

      vi.mocked(usersRepo.getUserCount).mockResolvedValue(150);
      vi.mocked(jobsRepo.getJobCount).mockResolvedValue(50);
      vi.mocked(jobsRepo.getActiveJobCount).mockResolvedValue(20);
      vi.mocked(paymentsRepo.getTotalRevenue).mockResolvedValue(5000);
      vi.mocked(paymentsRepo.getMRR).mockResolvedValue(1000);

      const response = await supertest(app)
        .get('/api/admin/stats')
        .set('x-role', 'admin');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        totalUsers: 150,
        totalJobs: 50,
        activeJobs: 20,
        totalRevenue: 5000,
        mrr: 1000,
      });
    });

    it('should list users for admin', async () => {
      const usersRepo = await import('../repositories/users.repository.js');
      const mockUsers = [
        {
          id: 'u1',
          email: 'u1@test.com',
          name: 'User 1',
          role: 'professional',
          createdAt: new Date('2025-01-01'),
          averageRating: '4.5',
          reviewCount: '10',
        },
      ];

      vi.mocked(usersRepo.getAllUsers).mockResolvedValue({
        data: mockUsers as any[],
        total: 1,
        limit: 100,
        offset: 0,
      });

      const response = await supertest(app)
        .get('/api/admin/users')
        .set('x-role', 'admin');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].email).toBe('u1@test.com');
    });

    it('should delete a user', async () => {
      const usersRepo = await import('../repositories/users.repository.js');
      vi.mocked(usersRepo.deleteUser).mockResolvedValue(true);

      const response = await supertest(app)
        .delete('/api/admin/users/target-id')
        .set('x-role', 'admin');
      
      expect(response.status).toBe(204);
      expect(usersRepo.deleteUser).toHaveBeenCalledWith('target-id');
    });

    it('should prevent self-deletion', async () => {
      // user id is hardcoded as 'user-123' in the mock middleware
      const response = await supertest(app)
        .delete('/api/admin/users/user-123')
        .set('x-role', 'admin');
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Cannot delete your own account');
    });

    it('should return 404 when deleting non-existent user', async () => {
      const usersRepo = await import('../repositories/users.repository.js');
      vi.mocked(usersRepo.deleteUser).mockResolvedValue(false);

      const response = await supertest(app)
        .delete('/api/admin/users/non-existent')
        .set('x-role', 'admin');
      
      expect(response.status).toBe(404);
    });

    it('should list jobs for admin', async () => {
      const jobsRepo = await import('../repositories/jobs.repository.js');
      const mockJobs = [
        {
          id: 'j1',
          title: 'Job 1',
          shopName: 'Shop 1',
          payRate: '50',
          status: 'open',
          date: '2025-01-01',
          city: 'New York',
          state: 'NY',
          businessId: 'b1',
          createdAt: new Date(),
        }
      ];

      vi.mocked(jobsRepo.getJobs).mockResolvedValue({
        data: mockJobs as any[],
        total: 1,
        limit: 100,
        offset: 0,
      });

      const response = await supertest(app)
        .get('/api/admin/jobs')
        .set('x-role', 'admin');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Job 1');
    });

    it('should update job status', async () => {
      const jobsRepo = await import('../repositories/jobs.repository.js');
      const mockJob = {
        id: 'j1',
        title: 'Job 1',
        status: 'closed',
        updatedAt: new Date(),
      };

      vi.mocked(jobsRepo.updateJob).mockResolvedValue(mockJob as any);

      const response = await supertest(app)
        .patch('/api/admin/jobs/j1/status')
        .send({ status: 'closed' })
        .set('x-role', 'admin');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('closed');
      expect(jobsRepo.updateJob).toHaveBeenCalledWith('j1', { status: 'closed' });
    });

    it('should return 400 for invalid job status', async () => {
      const response = await supertest(app)
        .patch('/api/admin/jobs/j1/status')
        .send({ status: 'invalid_status' })
        .set('x-role', 'admin');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Status must be one of');
    });

    it('should list reports with resolved user details', async () => {
      const reportsRepo = await import('../repositories/reports.repository.js');
      const usersRepo = await import('../repositories/users.repository.js');

      vi.mocked(reportsRepo.getAllReports).mockResolvedValue({
        data: [{
          id: 'r1',
          reporterId: 'u1',
          reportedId: 'u2',
          reason: 'spam',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        }] as any,
        total: 1,
        limit: 100,
        offset: 0
      });

      vi.mocked(usersRepo.getUserById).mockImplementation(async (id) => {
        if (id === 'u1') return { id: 'u1', name: 'Reporter', email: 'r@test.com' } as any;
        if (id === 'u2') return { id: 'u2', name: 'Reported', email: 'rd@test.com' } as any;
        return null;
      });

      const response = await supertest(app)
        .get('/api/admin/reports')
        .set('x-role', 'admin');

      expect(response.status).toBe(200);
      expect(response.body.data[0].reporter.name).toBe('Reporter');
    });

    it('should update report status', async () => {
      const reportsRepo = await import('../repositories/reports.repository.js');
      const mockReport = {
        id: 'r1',
        status: 'resolved',
        updatedAt: new Date(),
      };

      vi.mocked(reportsRepo.updateReportStatus).mockResolvedValue(mockReport as any);

      const response = await supertest(app)
        .patch('/api/admin/reports/r1/status')
        .send({ status: 'resolved' })
        .set('x-role', 'admin');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('resolved');
      expect(reportsRepo.updateReportStatus).toHaveBeenCalledWith('r1', 'resolved');
    });

    it('should return 400 for invalid report status', async () => {
      const response = await supertest(app)
        .patch('/api/admin/reports/r1/status')
        .send({ status: 'invalid_status' })
        .set('x-role', 'admin');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Status must be one of');
    });
  });
});
