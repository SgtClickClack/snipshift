import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import * as subscriptionsRepo from '../../repositories/subscriptions.repository.js';
import { createTestUser } from '../helpers.js';
import { getDb } from '../../db/index.js';
import { subscriptions, subscriptionPlans, users } from '../../db/schema.js';
import crypto from 'crypto';

describe('Subscriptions Repository (Integration)', () => {
  const db = getDb();

  beforeEach(async () => {
    if (db) {
      await db.delete(subscriptions);
      await db.delete(subscriptionPlans);
      await db.delete(users);
    }
  });

  it('should create a subscription', async () => {
    const user = await createTestUser('business');
    
    // Use valid UUID for plan ID
    const planId = crypto.randomUUID();
    await db!.insert(subscriptionPlans).values({
        id: planId,
        name: 'Test Plan',
        description: 'Test',
        price: '10',
        interval: 'month',
        stripePriceId: 'price_test',
    });

    // Wait for user creation to propagate if necessary, though await should handle it.
    // The foreign key error suggests the user might not be visible yet or transaction issue?
    // In this simple setup, it should be fine. 
    // Let's verify the user exists first.
    const userCheck = await db!.query.users.findFirst({ where: eq(users.id, user!.id) });
    expect(userCheck).toBeDefined();

    const sub = await subscriptionsRepo.createSubscription({
      userId: user!.id,
      planId: planId,
      stripeSubscriptionId: 'sub_stripe_123',
      stripeCustomerId: 'cus_test',
      status: 'active',
    });

    expect(sub).toBeDefined();
    expect(sub?.userId).toBe(user!.id);
    expect(sub?.status).toBe('active');
  });

  it('should update subscription status', async () => {
    const user = await createTestUser('business');
    
    const planId = crypto.randomUUID();
    await db!.insert(subscriptionPlans).values({
        id: planId,
        name: 'Test Plan',
        description: 'Test',
        price: '10',
        interval: 'month',
        stripePriceId: 'price_test',
    });

    const sub = await subscriptionsRepo.createSubscription({
        userId: user!.id,
        planId: planId,
        stripeSubscriptionId: 'sub_stripe_123',
        stripeCustomerId: 'cus_test',
        status: 'active',
    });

    const updated = await subscriptionsRepo.updateSubscription(sub!.id, {
        status: 'canceled',
        canceledAt: new Date(),
    });

    expect(updated?.status).toBe('canceled');
    expect(updated?.canceledAt).toBeDefined();
  });
});
