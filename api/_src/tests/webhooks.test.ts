import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import app from '../index';

// Mock dependencies
vi.mock('../repositories/subscriptions.repository.js', () => ({
  getSubscriptionPlanById: vi.fn(),
  createSubscription: vi.fn(),
  getSubscriptionByStripeId: vi.fn(),
  updateSubscription: vi.fn(),
}));

vi.mock('../repositories/payments.repository.js', () => ({
  createPayment: vi.fn(),
}));

vi.mock('../lib/stripe.js', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  },
}));

// Ensure we mock auth to pass through
vi.mock('../middleware/auth.js', () => ({
  authenticateUser: vi.fn((req, res, next) => next()),
  requireAdmin: vi.fn((req, res, next) => next()),
}));

// Mock DB Connection
vi.mock('../db/connection.js', () => ({
  getDatabase: vi.fn(() => ({})),
}));

// Mock Firebase
vi.mock('../config/firebase.js', () => ({
  auth: {},
}));

describe('Stripe Webhooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock env vars
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
  });

  describe('Security & Validation', () => {
    it('should return 400 if signature verification fails', async () => {
      const stripeLib = await import('../lib/stripe.js');
      vi.mocked(stripeLib.stripe!.webhooks.constructEvent).mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const response = await supertest(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', 'invalid_sig')
        .send({ type: 'any' }); // Raw body is handled by supertest send if passing object/string

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Webhook Error');
    });

    it('should return 400 if signature or secret is missing', async () => {
        // Temporarily unset secret
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        delete process.env.STRIPE_WEBHOOK_SECRET;

        const response = await supertest(app)
            .post('/api/webhooks/stripe')
            .set('Stripe-Signature', 'sig')
            .send({});
        
        expect(response.status).toBe(400);
        
        // Restore
        process.env.STRIPE_WEBHOOK_SECRET = secret;
    });
  });

  describe('Event Handling', () => {
    it('should handle checkout.session.completed successfully', async () => {
      const stripeLib = await import('../lib/stripe.js');
      const subscriptionsRepo = await import('../repositories/subscriptions.repository.js');
      const paymentsRepo = await import('../repositories/payments.repository.js');

      // Mock Event
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'sess_123',
            metadata: { userId: 'user_1', planId: 'plan_1' },
            subscription: 'sub_stripe_123',
            amount_total: 2000,
            currency: 'usd',
            payment_intent: 'pi_123',
          },
        },
      };

      vi.mocked(stripeLib.stripe!.webhooks.constructEvent).mockReturnValue(mockEvent as any);

      // Mock Stripe subscription retrieval
      vi.mocked(stripeLib.stripe!.subscriptions.retrieve).mockResolvedValue({
        id: 'sub_stripe_123',
        customer: 'cus_123',
        status: 'active',
        current_period_start: 1000000000,
        current_period_end: 1000000000 + 86400 * 30,
      } as any);

      // Mock Repo calls
      vi.mocked(subscriptionsRepo.getSubscriptionPlanById).mockResolvedValue({
        id: 'plan_1',
        name: 'Pro Plan',
        price: 20,
      } as any);

      vi.mocked(subscriptionsRepo.createSubscription).mockResolvedValue({ id: 'sub_db_1' } as any);
      vi.mocked(paymentsRepo.createPayment).mockResolvedValue({ id: 'pay_1' } as any);

      const response = await supertest(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', 'valid_sig')
        .send(mockEvent);

      expect(response.status).toBe(200);
      expect(subscriptionsRepo.createSubscription).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user_1',
        planId: 'plan_1',
        stripeSubscriptionId: 'sub_stripe_123',
        status: 'active'
      }));
      expect(paymentsRepo.createPayment).toHaveBeenCalled();
    });

    it('should handle invoice.payment_succeeded (Subscription Renewal)', async () => {
      const stripeLib = await import('../lib/stripe.js');
      const subscriptionsRepo = await import('../repositories/subscriptions.repository.js');
      const paymentsRepo = await import('../repositories/payments.repository.js');

      const mockEvent = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            subscription: 'sub_stripe_123',
            amount_paid: 2000,
            currency: 'usd',
            payment_intent: 'pi_renewal',
            charge: 'ch_123',
          },
        },
      };

      vi.mocked(stripeLib.stripe!.webhooks.constructEvent).mockReturnValue(mockEvent as any);
      
      // Mock Subscription lookup
      vi.mocked(subscriptionsRepo.getSubscriptionByStripeId).mockResolvedValue({
        id: 'sub_db_1',
        userId: 'user_1',
      } as any);

      // Mock Stripe retrieval
      vi.mocked(stripeLib.stripe!.subscriptions.retrieve).mockResolvedValue({
        current_period_start: 2000000000,
        current_period_end: 2000000000 + 86400 * 30,
      } as any);

      const response = await supertest(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', 'valid_sig')
        .send(mockEvent);

      expect(response.status).toBe(200);
      expect(subscriptionsRepo.updateSubscription).toHaveBeenCalledWith('sub_db_1', expect.objectContaining({
        status: 'active',
      }));
      expect(paymentsRepo.createPayment).toHaveBeenCalledWith(expect.objectContaining({
        description: expect.stringContaining('Subscription renewal'),
      }));
    });

    it('should handle customer.subscription.deleted (Cancellation)', async () => {
      const stripeLib = await import('../lib/stripe.js');
      const subscriptionsRepo = await import('../repositories/subscriptions.repository.js');

      const mockEvent = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_stripe_123',
          },
        },
      };

      vi.mocked(stripeLib.stripe!.webhooks.constructEvent).mockReturnValue(mockEvent as any);

      vi.mocked(subscriptionsRepo.getSubscriptionByStripeId).mockResolvedValue({
        id: 'sub_db_1',
      } as any);

      const response = await supertest(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', 'valid_sig')
        .send(mockEvent);

      expect(response.status).toBe(200);
      expect(subscriptionsRepo.updateSubscription).toHaveBeenCalledWith('sub_db_1', expect.objectContaining({
        status: 'canceled',
      }));
    });

    it('should handle unhandled event types gracefully', async () => {
      const stripeLib = await import('../lib/stripe.js');
      vi.mocked(stripeLib.stripe!.webhooks.constructEvent).mockReturnValue({
        type: 'payment_intent.created',
      } as any);

      const response = await supertest(app)
        .post('/api/webhooks/stripe')
        .set('Stripe-Signature', 'valid_sig')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);
    });

    it('should handle errors gracefully (return 500)', async () => {
        const stripeLib = await import('../lib/stripe.js');
        // Force an error inside the switch or logic
        vi.mocked(stripeLib.stripe!.webhooks.constructEvent).mockReturnValue({
             type: 'checkout.session.completed',
             data: { object: {} } // Missing metadata -> but here we want to crash
        } as any);

        // Mock to throw
        vi.spyOn(console, 'error').mockImplementation(() => {}); // Silence logs
        const subscriptionsRepo = await import('../repositories/subscriptions.repository.js');
        vi.mocked(subscriptionsRepo.getSubscriptionPlanById).mockRejectedValue(new Error('DB Error'));

        // Construct event needs to return something that enters the block
         vi.mocked(stripeLib.stripe!.webhooks.constructEvent).mockReturnValue({
            type: 'checkout.session.completed',
            data: { object: { 
                metadata: { userId: 'u1', planId: 'p1' }, 
                subscription: 'sub_1' 
            } }
        } as any);
        vi.mocked(stripeLib.stripe!.subscriptions.retrieve).mockResolvedValue({} as any);

        const response = await supertest(app)
            .post('/api/webhooks/stripe')
            .set('Stripe-Signature', 'valid_sig')
            .send({});
        
        expect(response.status).toBe(500);
    });
  });
});

