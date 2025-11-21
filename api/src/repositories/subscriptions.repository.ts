/**
 * Subscriptions Repository
 * 
 * Encapsulates database queries for subscriptions and subscription plans
 */

import { eq, and } from 'drizzle-orm';
import { subscriptions, subscriptionPlans, payments } from '../db/schema';
import { getDb } from '../db';

/**
 * Get all active subscription plans
 */
export async function getSubscriptionPlans() {
  const db = getDb();
  if (!db) {
    return null;
  }

  // Get all plans (filter by isActive later if needed)
  const allPlans = await db
    .select()
    .from(subscriptionPlans);

  return allPlans;
}

/**
 * Get subscription plan by ID
 */
export async function getSubscriptionPlanById(planId: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [plan] = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.id, planId))
    .limit(1);

  return plan || null;
}

/**
 * Get subscription plan by Stripe Price ID
 */
export async function getSubscriptionPlanByStripePriceId(stripePriceId: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [plan] = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.stripePriceId, stripePriceId))
    .limit(1);

  return plan || null;
}

/**
 * Get user's current active subscription
 */
export async function getCurrentSubscription(userId: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, 'active')
      )
    )
    .limit(1);

  return subscription || null;
}

/**
 * Get subscription by Stripe Subscription ID
 */
export async function getSubscriptionByStripeId(stripeSubscriptionId: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);

  return subscription || null;
}

/**
 * Create a new subscription
 */
export async function createSubscription(data: {
  userId: string;
  planId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: 'active' | 'trialing' | 'incomplete';
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
}) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [newSubscription] = await db
    .insert(subscriptions)
    .values({
      userId: data.userId,
      planId: data.planId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      stripeCustomerId: data.stripeCustomerId,
      status: data.status,
      currentPeriodStart: data.currentPeriodStart || null,
      currentPeriodEnd: data.currentPeriodEnd || null,
    })
    .returning();

  return newSubscription || null;
}

/**
 * Update subscription
 */
export async function updateSubscription(
  subscriptionId: string,
  updates: {
    status?: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    canceledAt?: Date;
  }
) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (updates.status !== undefined) {
    updateData.status = updates.status;
  }
  if (updates.currentPeriodStart !== undefined) {
    updateData.currentPeriodStart = updates.currentPeriodStart;
  }
  if (updates.currentPeriodEnd !== undefined) {
    updateData.currentPeriodEnd = updates.currentPeriodEnd;
  }
  if (updates.cancelAtPeriodEnd !== undefined) {
    updateData.cancelAtPeriodEnd = updates.cancelAtPeriodEnd ? new Date() : null;
  }
  if (updates.canceledAt !== undefined) {
    updateData.canceledAt = updates.canceledAt;
  }

  const [updated] = await db
    .update(subscriptions)
    .set(updateData)
    .where(eq(subscriptions.id, subscriptionId))
    .returning();

  return updated || null;
}

/**
 * Cancel subscription (mark for cancellation at period end)
 */
export async function cancelSubscription(subscriptionId: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [updated] = await db
    .update(subscriptions)
    .set({
      cancelAtPeriodEnd: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscriptionId))
    .returning();

  return updated || null;
}

