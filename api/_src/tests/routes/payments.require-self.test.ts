import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';
import type { Express } from 'express';

// Mock Auth Middleware
vi.mock('../../middleware/auth.js', () => ({
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
  AuthenticatedRequest: {},
}));

// Mock Stripe Connect + User repo so we don’t hit external systems
vi.mock('../../services/stripe-connect.service.js', () => ({
  getAccountBalance: vi.fn(async () => ({
    available: [{ amount: 0, currency: 'aud' }],
    pending: [{ amount: 0, currency: 'aud' }],
  })),
}));

vi.mock('../../repositories/users.repository.js', () => ({
  getUserById: vi.fn(async () => ({ id: 'user-123', stripeAccountId: 'acct_123' })),
}));

describe('Payments routes - requireSelfParam authZ', () => {
  let app: Express;

  beforeAll(async () => {
    const paymentsRouter = await import('../../routes/payments.js');
    app = express();
    app.use(express.json());
    app.use('/api/payments', paymentsRouter.default);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 when requesting another user’s balance', async () => {
    const res = await supertest(app)
      .get('/api/payments/balance/user-999')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(403);
  });

  it('allows requesting own balance', async () => {
    const res = await supertest(app)
      .get('/api/payments/balance/user-123')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
  });
});

