import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';

// Mock Stripe Library
const mockConstructEvent = vi.fn();
const mockSubscriptionsRetrieve = vi.fn();
const mockSessionsCreate = vi.fn();

// Note: This mock requires Vitest to correctly intercept the 'stripe' module require.
// If running against compiled JS files, ensure node_modules are mocked or use __mocks__.
vi.mock('stripe', () => {
  return {
    __esModule: true,
    default: class MockStripe {
      webhooks = {
        constructEvent: mockConstructEvent,
      };
      subscriptions = {
        retrieve: mockSubscriptionsRetrieve,
        update: vi.fn(),
      };
      checkout = {
        sessions: {
          create: mockSessionsCreate,
        },
      };
    }
  };
});

// Mock Repositories
const mockGetSubscriptionPlanById = vi.fn();
const mockCreateSubscription = vi.fn();
const mockUpdateSubscription = vi.fn();
const mockGetSubscriptionByStripeId = vi.fn();
const mockCreatePayment = vi.fn();
const mockGetCurrentSubscription = vi.fn();

vi.mock('../repositories/subscriptions.repository.js', () => ({
  getSubscriptionPlanById: mockGetSubscriptionPlanById,
  createSubscription: mockCreateSubscription,
  updateSubscription: mockUpdateSubscription,
  getSubscriptionByStripeId: mockGetSubscriptionByStripeId,
  getCurrentSubscription: mockGetCurrentSubscription,
}));

vi.mock('../repositories/payments.repository.js', () => ({
  createPayment: mockCreatePayment,
}));

vi.mock('../config/firebase.js', () => ({
  auth: {},
}));

vi.mock('../db/connection.js', () => ({
  getDatabase: vi.fn(() => ({})),
}));

describe('Webhooks API', () => {
  let app: any;

  beforeEach(async () => {
    vi.resetModules();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'; 

    // Reset mocks
    mockConstructEvent.mockReset();
    mockSubscriptionsRetrieve.mockReset();

    // Re-import app
    const indexModule = await import('../index.js');
    app = indexModule.default;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/webhooks/stripe', () => {
    it('should return 400 if signature verification fails', async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const response = await supertest(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', 'invalid_sig')
        .send({ some: 'data' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Webhook Error: Invalid signature');
    });

    it('should return 400 if missing signature', async () => {
      const response = await supertest(app)
        .post('/api/webhooks/stripe')
        .send({ some: 'data' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing signature');
    });

    it('should handle checkout.session.completed successfully', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            subscription: 'sub_123',
            metadata: {
              userId: 'user_123',
              planId: 'plan_pro',
            },
            amount_total: 2999,
            currency: 'usd',
            payment_intent: 'pi_123',
          },
        },
      };

      mockConstructEvent.mockReturnValue(event);
      
      mockSubscriptionsRetrieve.mockResolvedValue({
        customer: 'cus_123',
        status: 'active',
        current_period_start: 1600000000,
        current_period_end: 1600000000 + 30 * 24 * 60 * 60,
      });

      mockGetSubscriptionPlanById.mockResolvedValue({
        id: 'plan_pro',
        name: 'Pro Plan',
      });

      const response = await supertest(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', 'valid_sig')
        .send(event);

      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);
      
      expect(mockCreateSubscription).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user_123',
        planId: 'plan_pro',
        stripeSubscriptionId: 'sub_123',
        status: 'active',
      }));

      expect(mockCreatePayment).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user_123',
        amount: 29.99,
        stripePaymentIntentId: 'pi_123',
      }));
    });

    it('should acknowledge unhandled event types', async () => {
      const event = {
        type: 'unhandled.event',
        data: { object: {} },
      };

      mockConstructEvent.mockReturnValue(event);

      const response = await supertest(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', 'valid_sig')
        .send(event);

      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);
    });
  });
});
