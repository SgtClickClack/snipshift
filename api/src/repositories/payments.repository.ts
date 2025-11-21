/**
 * Payments Repository
 * 
 * Encapsulates database queries for payment history
 */

import { eq, desc, sql, sum, and, gte } from 'drizzle-orm';
import { payments } from '../db/schema';
import { getDb } from '../db';

/**
 * Create a new payment record
 */
export async function createPayment(data: {
  userId: string;
  subscriptionId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  description?: string;
}) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [newPayment] = await db
    .insert(payments)
    .values({
      userId: data.userId,
      subscriptionId: data.subscriptionId || null,
      amount: data.amount.toString(),
      currency: data.currency,
      status: data.status,
      stripePaymentIntentId: data.stripePaymentIntentId || null,
      stripeChargeId: data.stripeChargeId || null,
      description: data.description || null,
    })
    .returning();

  return newPayment || null;
}

/**
 * Get payment by Stripe Payment Intent ID
 */
export async function getPaymentByStripePaymentIntentId(stripePaymentIntentId: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.stripePaymentIntentId, stripePaymentIntentId))
    .limit(1);

  return payment || null;
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(
  paymentId: string,
  status: 'pending' | 'succeeded' | 'failed' | 'refunded'
) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [updated] = await db
    .update(payments)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, paymentId))
    .returning();

  return updated || null;
}

/**
 * Get payment history for a user
 */
export async function getPaymentHistory(userId: string, limit: number = 50) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const paymentHistory = await db
    .select()
    .from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.createdAt))
    .limit(limit);

  return paymentHistory;
}

/**
 * Get total revenue (MRR - Monthly Recurring Revenue)
 * Calculates sum of all successful payments
 */
export async function getTotalRevenue(): Promise<number> {
  const db = getDb();
  if (!db) {
    return 0;
  }

  const [result] = await db
    .select({ total: sql<number>`COALESCE(SUM(${payments.amount}::numeric), 0)` })
    .from(payments)
    .where(eq(payments.status, 'succeeded'));

  return parseFloat(result?.total?.toString() || '0') || 0;
}

/**
 * Get Monthly Recurring Revenue (MRR)
 * Sum of successful subscription payments in the current month
 */
export async function getMRR(): Promise<number> {
  const db = getDb();
  if (!db) {
    return 0;
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [result] = await db
    .select({ total: sql<number>`COALESCE(SUM(${payments.amount}::numeric), 0)` })
    .from(payments)
    .where(
      and(
        eq(payments.status, 'succeeded'),
        gte(payments.createdAt, startOfMonth)
      )
    );

  return parseFloat(result?.total?.toString() || '0') || 0;
}

