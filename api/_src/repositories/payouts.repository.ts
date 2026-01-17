/**
 * Payouts Repository
 * 
 * Database operations for payouts
 */

import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { payouts, shifts, users } from '../db/schema.js';

export interface CreatePayoutInput {
  shiftId: string;
  workerId: string;
  venueId: string;
  amountCents: number;
  hourlyRate: string | number;
  hoursWorked: number;
  stripeTransferId?: string;
  stripeChargeId?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface Payout {
  id: string;
  shiftId: string;
  workerId: string;
  venueId: string;
  amountCents: number;
  hourlyRate: string;
  hoursWorked: string;
  stripeTransferId: string | null;
  stripeChargeId: string | null;
  status: string;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type DbLike = any;

function getDbOr(dbOverride?: DbLike): DbLike | null {
  if (dbOverride) return dbOverride;
  return getDb();
}

/**
 * Create a new payout record
 */
export async function createPayout(
  input: CreatePayoutInput,
  dbOverride?: DbLike
): Promise<Payout | null> {
  const db = getDbOr(dbOverride);
  if (!db) {
    console.error('[PAYOUTS REPO] Database not available');
    return null;
  }

  try {
    const [newPayout] = await db
      .insert(payouts)
      .values({
        shiftId: input.shiftId,
        workerId: input.workerId,
        venueId: input.venueId,
        amountCents: input.amountCents,
        hourlyRate: input.hourlyRate.toString(),
        hoursWorked: input.hoursWorked.toString(),
        stripeTransferId: input.stripeTransferId || null,
        stripeChargeId: input.stripeChargeId || null,
        status: input.status || 'pending',
      })
      .returning();

    return newPayout as Payout;
  } catch (error) {
    console.error('[PAYOUTS REPO] Error creating payout:', error);
    return null;
  }
}

/**
 * Get payout by shift ID
 */
export async function getPayoutByShiftId(
  shiftId: string,
  dbOverride?: DbLike
): Promise<Payout | null> {
  const db = getDbOr(dbOverride);
  if (!db) {
    return null;
  }

  try {
    const [payout] = await db
      .select()
      .from(payouts)
      .where(eq(payouts.shiftId, shiftId))
      .limit(1);

    return payout as Payout | null;
  } catch (error) {
    console.error('[PAYOUTS REPO] Error getting payout by shift ID:', error);
    return null;
  }
}

/**
 * Get payouts for a worker with shift and venue details
 */
export async function getPayoutsForWorker(
  workerId: string,
  filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: 'pending' | 'processing' | 'completed' | 'failed';
  }
): Promise<Array<Payout & {
  shift: typeof shifts.$inferSelect | null;
  venue: typeof users.$inferSelect | null;
}>> {
  const db = getDbOr();
  if (!db) {
    return [];
  }

  try {
    const conditions = [eq(payouts.workerId, workerId)];
    
    if (filters?.startDate) {
      conditions.push(gte(payouts.createdAt, filters.startDate));
    }
    
    if (filters?.endDate) {
      conditions.push(lte(payouts.createdAt, filters.endDate));
    }
    
    if (filters?.status) {
      conditions.push(eq(payouts.status, filters.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db
      .select({
        payout: payouts,
        shift: shifts,
        venue: users,
      })
      .from(payouts)
      .leftJoin(shifts, eq(payouts.shiftId, shifts.id))
      .leftJoin(users, eq(payouts.venueId, users.id))
      .where(whereClause)
      .orderBy(desc(payouts.createdAt));

    return (result as Array<{
      payout: typeof payouts.$inferSelect;
      shift: typeof shifts.$inferSelect | null;
      venue: typeof users.$inferSelect | null;
    }>).map((row) => ({
      ...row.payout,
      shift: row.shift,
      venue: row.venue,
    })) as Array<Payout & {
      shift: typeof shifts.$inferSelect | null;
      venue: typeof users.$inferSelect | null;
    }>;
  } catch (error) {
    console.error('[PAYOUTS REPO] Error getting payouts for worker:', error);
    return [];
  }
}

/**
 * Get payouts for a venue with shift details
 */
export async function getPayoutsForVenue(
  venueId: string,
  filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: 'pending' | 'processing' | 'completed' | 'failed';
  }
): Promise<Array<Payout & {
  shift: typeof shifts.$inferSelect | null;
}>> {
  const db = getDbOr();
  if (!db) {
    return [];
  }

  try {
    const conditions = [eq(payouts.venueId, venueId)];
    
    if (filters?.startDate) {
      conditions.push(gte(payouts.createdAt, filters.startDate));
    }
    
    if (filters?.endDate) {
      conditions.push(lte(payouts.createdAt, filters.endDate));
    }
    
    if (filters?.status) {
      conditions.push(eq(payouts.status, filters.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db
      .select({
        payout: payouts,
        shift: shifts,
      })
      .from(payouts)
      .leftJoin(shifts, eq(payouts.shiftId, shifts.id))
      .where(whereClause)
      .orderBy(desc(payouts.createdAt));

    return (result as Array<{
      payout: typeof payouts.$inferSelect;
      shift: typeof shifts.$inferSelect | null;
    }>).map((row) => ({
      ...row.payout,
      shift: row.shift,
    })) as Array<Payout & {
      shift: typeof shifts.$inferSelect | null;
    }>;
  } catch (error) {
    console.error('[PAYOUTS REPO] Error getting payouts for venue:', error);
    return [];
  }
}

/**
 * Update payout status
 */
export async function updatePayoutStatus(
  id: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  opts?: { stripeTransferId?: string; stripeChargeId?: string },
  dbOverride?: DbLike
): Promise<Payout | null> {
  const db = getDbOr(dbOverride);
  if (!db) {
    return null;
  }

  try {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'completed') {
      updateData.processedAt = new Date();
    }

    if (opts?.stripeTransferId) {
      updateData.stripeTransferId = opts.stripeTransferId;
    }

    if (opts?.stripeChargeId) {
      updateData.stripeChargeId = opts.stripeChargeId;
    }

    const [updatedPayout] = await db
      .update(payouts)
      .set(updateData)
      .where(eq(payouts.id, id))
      .returning();

    return updatedPayout as Payout | null;
  } catch (error) {
    console.error('[PAYOUTS REPO] Error updating payout status:', error);
    return null;
  }
}
