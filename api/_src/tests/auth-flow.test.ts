import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
// Import without extension to prefer TS source if configured, or let resolver handle it
import app from '../index.js'; 

// Mock Middleware to bypass Firebase/DB Auth checks for protected routes
vi.mock('../middleware/auth.js', () => ({
  authenticateUser: vi.fn((req, res, next) => {
    // Check for specific token or just allow
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

// Mock Repositories - Use factory to avoid hoisting issues with variables
vi.mock('../repositories/users.repository.js', () => ({
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
  getUserById: vi.fn(),
  getOrCreateMockBusinessUser: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('../repositories/conversations.repository.js', () => ({
  getConversationsForUser: vi.fn(),
}));

vi.mock('../services/email.service.js', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock('../config/firebase.js', () => ({
  auth: {
    verifyIdToken: vi.fn(),
  },
}));

// Mock DB Connection to prevent connection attempts
vi.mock('../db/connection.js', () => ({
  getDatabase: vi.fn(() => ({})),
}));

describe('Auth Flow & Critical Paths', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 OK', async () => {
      const response = await supertest(app).get('/health');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/register', () => {
    it('should register a new user successfully', async () => {
      const randomEmail = `test-${Date.now()}@example.com`;
      const mockUser = {
        id: 'user-123',
        email: randomEmail,
        name: 'Test User',
        role: 'professional',
      };

      // Setup mocks
      const usersRepo = await import('../repositories/users.repository.js');
      vi.mocked(usersRepo.getUserByEmail).mockResolvedValue(null); // No existing user
      vi.mocked(usersRepo.createUser).mockResolvedValue(mockUser as any);
      vi.mocked(usersRepo.getUserById).mockResolvedValue(mockUser as any);

      const response = await supertest(app)
        .post('/api/register')
        .send({
          email: randomEmail,
          name: 'Test User',
          password: 'password123', 
        });

      expect(response.status).toBe(201);
      if (response.status === 201) {
          expect(response.body.email).toBe(randomEmail);
      }
    });

    it('should return 503 with a stable code when DB compute quota is exceeded', async () => {
      const randomEmail = `test-${Date.now()}@example.com`;
      const quotaError = new Error(
        'Your account or project has exceeded the compute time quota. Upgrade your plan to increase limits.'
      );

      const usersRepo = await import('../repositories/users.repository.js');
      vi.mocked(usersRepo.getUserByEmail).mockResolvedValue(null);
      vi.mocked(usersRepo.createUser).mockRejectedValue(quotaError);

      // Sanity check: ensure our matcher recognizes the quota error in this test runtime.
      const dbErrors = await import('../utils/dbErrors.js');
      expect(dbErrors.isDatabaseComputeQuotaExceededError(quotaError)).toBe(true);

      const response = await supertest(app)
        .post('/api/register')
        .send({
          email: randomEmail,
          name: 'Test User',
          password: 'password123',
        });

      expect(response.status).toBe(503);
      expect(response.body.code).toBe('DB_QUOTA_EXCEEDED');
    });

    it('should return existing profile (200) if user already exists', async () => {
      const existingUser = {
        id: 'user-123',
        email: 'existing@example.com',
        name: 'Existing User',
        role: 'professional',
      };

      const usersRepo = await import('../repositories/users.repository.js');
      vi.mocked(usersRepo.getUserByEmail).mockResolvedValue(existingUser as any);
      vi.mocked(usersRepo.getUserById).mockResolvedValue(existingUser as any);

      const response = await supertest(app)
        .post('/api/register')
        .send({
          email: 'existing@example.com',
          name: 'Existing User',
        });

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('existing@example.com');
    });
  });

  describe('POST /api/login', () => {
    it('should login successfully with mock credentials', async () => {
       const usersRepo = await import('../repositories/users.repository.js');
       vi.mocked(usersRepo.getOrCreateMockBusinessUser).mockResolvedValue({
         id: 'biz-1',
         name: 'Test Business',
         email: 'business@example.com'
       } as any);

       const response = await supertest(app)
         .post('/api/login')
         .send({
           email: 'business@example.com',
           password: 'password123',
         });

       expect(response.status).toBe(200);
       expect(response.body.email).toBe('business@example.com');
    });

    it('should reject invalid credentials', async () => {
       const response = await supertest(app)
         .post('/api/login')
         .send({
           email: 'wrong@example.com',
           password: 'wrong',
         });

       expect(response.status).toBe(401);
    });
  });

  describe('GET /api/chats/user/:id', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await supertest(app)
        .get('/api/chats/user/user-123');
      
      expect(response.status).toBe(401);
    });

    it('should return user chats when authenticated', async () => {
       const userId = 'user-123';
       const mockUser = {
         id: userId,
         email: 'test@example.com',
         name: 'Test User',
         role: 'professional',
       };

       // We don't need firebase mock if we mock the middleware, but keeping it safe
       const firebaseConf = await import('../config/firebase.js');
       if (firebaseConf.auth) {
         vi.mocked(firebaseConf.auth.verifyIdToken).mockResolvedValue({
           uid: 'firebase-uid-123',
           email: 'test@example.com',
         } as any);
       }

       const usersRepo = await import('../repositories/users.repository.js');
       vi.mocked(usersRepo.getUserByEmail).mockResolvedValue(mockUser as any);

       // Mock conversations
       const conversationsRepo = await import('../repositories/conversations.repository.js');
       vi.mocked(conversationsRepo.getConversationsForUser).mockResolvedValue([]);

       const response = await supertest(app)
         .get(`/api/chats/user/${userId}`)
         .set('Authorization', 'Bearer valid-token');

       expect(response.status).toBe(200);
       expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
