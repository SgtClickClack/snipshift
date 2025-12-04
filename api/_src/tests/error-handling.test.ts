import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import * as jobsRepo from '../repositories/jobs.repository.js';

describe('Global Error Handling', () => {
  // Reset mocks after each test
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('404 Not Found', () => {
    it('should return 404 and JSON error for non-existent routes', async () => {
      const res = await request(app).get('/api/does-not-exist-path-' + Date.now());
      
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/not found/i);
    });
  });

  describe('500 Internal Server Error', () => {
    it('should return 500 and JSON error when an exception is thrown', async () => {
      // Mock a repository method to throw an error
      // We'll use a public endpoint that calls this repo: GET /api/jobs/:id
      const errorMsg = 'Test Boom';
      vi.spyOn(jobsRepo, 'getJobById').mockRejectedValue(new Error(errorMsg));

      const res = await request(app).get('/api/jobs/job-error-test');

      expect(res.status).toBe(500);
      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.body).toHaveProperty('error', errorMsg);
      // Stack trace depends on NODE_ENV, default is usually test or dev
    });
  });

  describe('Production Leak Check', () => {
    it('should hide stack trace in production', async () => {
      // Mock NODE_ENV to production
      vi.stubEnv('NODE_ENV', 'production');
      
      const errorMsg = 'Production Boom';
      vi.spyOn(jobsRepo, 'getJobById').mockRejectedValue(new Error(errorMsg));

      const res = await request(app).get('/api/jobs/job-prod-test');

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', errorMsg);
      expect(res.body).not.toHaveProperty('stack');
    });

    it('should show stack trace in development', async () => {
      // Mock NODE_ENV to development
      vi.stubEnv('NODE_ENV', 'development');
      
      const errorMsg = 'Dev Boom';
      vi.spyOn(jobsRepo, 'getJobById').mockRejectedValue(new Error(errorMsg));

      const res = await request(app).get('/api/jobs/job-dev-test');

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', errorMsg);
      expect(res.body).toHaveProperty('stack');
    });
  });

  describe('Async Error Handling', () => {
    it('should catch async errors automatically', async () => {
      // This test effectively checks if express-async-errors or similar is working
      // because the repository mock returns a rejected promise (async error).
      // If async handling wasn't working, the test might timeout or crash the server
      // instead of returning 500.
      
      const errorMsg = 'Async Boom';
      vi.spyOn(jobsRepo, 'getJobById').mockRejectedValue(new Error(errorMsg));

      const res = await request(app).get('/api/jobs/job-async-test');

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', errorMsg);
    });
  });
});

