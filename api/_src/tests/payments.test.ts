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

// Mock Firebase
vi.mock('../config/firebase.js', () => ({
  auth: {
    verifyIdToken: vi.fn(),
  },
}));

// Mock Stripe
vi.mock('../lib/stripe.js', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
}));

// Mock Repositories
vi.mock('../repositories/subscriptions.repository.js', () => ({
  getSubscriptionPlanById: vi.fn(),
  getCurrentSubscription: vi.fn(),
}));

vi.mock('../repositories/users.repository.js', () => ({
  getUserById: vi.fn().mockResolvedValue({ id: 'user-123', email: 'test@example.com', name: 'Test User' }),
}));

// Mock DB Connection
vi.mock('../db/connection.js', () => ({
  getDatabase: vi.fn(() => ({})),
}));

describe('Payments API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/subscriptions/checkout', () => {
    it('should create a checkout session successfully', async () => {
      const planId = 'plan_pro';
      const mockPlan = {
        id: planId,
        name: 'Pro Plan',
        stripePriceId: 'price_123',
      };

      const mockSession = {
        id: 'sess_123',
        url: 'https://checkout.stripe.com/pay/sess_123',
      };

      const mockSubsRepo = await import('../repositories/subscriptions.repository.js');
      vi.mocked(mockSubsRepo.getSubscriptionPlanById).mockResolvedValue(mockPlan as any);
      vi.mocked(mockSubsRepo.getCurrentSubscription).mockResolvedValue(null);

      const mockStripe = await import('../lib/stripe.js');
      vi.mocked(mockStripe.stripe!.checkout.sessions.create).mockResolvedValue(mockSession as any);

      const response = await supertest(app)
        .post('/api/subscriptions/checkout')
        .set('Authorization', 'Bearer valid-token')
        .send({
          planId: planId,
        });

      expect(response.status).toBe(200);
      expect(response.body.sessionId).toBe('sess_123');
      expect(response.body.url).toBe('https://checkout.stripe.com/pay/sess_123');
      expect(mockStripe.stripe!.checkout.sessions.create).toHaveBeenCalled();
    });

    it('should return 404 if plan not found', async () => {
      const mockSubsRepo = await import('../repositories/subscriptions.repository.js');
      vi.mocked(mockSubsRepo.getSubscriptionPlanById).mockResolvedValue(null);

      const response = await supertest(app)
        .post('/api/subscriptions/checkout')
        .set('Authorization', 'Bearer valid-token')
        .send({
          planId: 'invalid_plan',
        });

      expect(response.status).toBe(404);
    });

    it('should return 400 if user already has a subscription', async () => {
      const mockSubsRepo = await import('../repositories/subscriptions.repository.js');
      vi.mocked(mockSubsRepo.getSubscriptionPlanById).mockResolvedValue({ id: 'plan_1' } as any);
      vi.mocked(mockSubsRepo.getCurrentSubscription).mockResolvedValue({ id: 'sub_1' } as any);

      const response = await supertest(app)
        .post('/api/subscriptions/checkout')
        .set('Authorization', 'Bearer valid-token')
        .send({
          planId: 'plan_1',
        });

      expect(response.status).toBe(400);
    });
  });
});

