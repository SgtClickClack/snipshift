/**
 * Payouts Repository
 * 
 * Database operations for payouts with atomic settlement support.
 * 
 * Settlement ID Format: STL-{YYYYMMDD}-{random6}
 * - Used for D365/Workday reconciliation exports
 * - Unique identifier for cross-system tracking
 */

import { eq, and, gte, lte, desc, or, like } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { payouts, shifts, users, generateSettlementId } from '../db/schema.js';

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
  settlementType?: 'immediate' | 'batch';
}

export interface Payout {
  id: string;
  settlementId: string;
  shiftId: string;
  workerId: string;
  venueId: string;
  amountCents: number;
  hourlyRate: string;
  hoursWorked: string;
  stripeTransferId: string | null;
  stripeChargeId: string | null;
  status: string;
  settlementType: string;
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
 * Create a new payout record with unique Settlement ID
 * 
 * Settlement ID is generated automatically for D365/Workday reconciliation.
 * Default settlement type is 'immediate' (bypasses batch processing).
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
    // Generate unique settlement ID for this payout
    const settlementId = generateSettlementId();
    
    const [newPayout] = await db
      .insert(payouts)
      .values({
        settlementId,
        shiftId: input.shiftId,
        workerId: input.workerId,
        venueId: input.venueId,
        amountCents: input.amountCents,
        hourlyRate: input.hourlyRate.toString(),
        hoursWorked: input.hoursWorked.toString(),
        stripeTransferId: input.stripeTransferId || null,
        stripeChargeId: input.stripeChargeId || null,
        status: input.status || 'pending',
        settlementType: input.settlementType || 'immediate',
      })
      .returning();

    console.log(`[PAYOUTS REPO] Created payout with settlementId: ${settlementId}`);
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

/**
 * Get payout by Settlement ID
 * Used for D365/Workday reconciliation lookups
 */
export async function getPayoutBySettlementId(
  settlementId: string,
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
      .where(eq(payouts.settlementId, settlementId))
      .limit(1);

    return payout as Payout | null;
  } catch (error) {
    console.error('[PAYOUTS REPO] Error getting payout by settlement ID:', error);
    return null;
  }
}

/**
 * Export payouts for D365/Workday reconciliation
 * 
 * Returns settlement data in a format suitable for enterprise ERP systems.
 * Supports filtering by date range and status.
 */
export interface SettlementExportRecord {
  settlementId: string;
  payoutId: string;
  shiftId: string;
  workerId: string;
  venueId: string;
  amountCents: number;
  currency: string;
  status: string;
  settlementType: string;
  stripeChargeId: string | null;
  stripeTransferId: string | null;
  processedAt: Date | null;
  createdAt: Date;
  // Shift details for reconciliation
  shiftTitle: string | null;
  shiftStartTime: Date | null;
  shiftEndTime: Date | null;
  hourlyRate: string;
  hoursWorked: string;
}

export async function exportSettlementsForReconciliation(
  filters: {
    startDate?: Date;
    endDate?: Date;
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    venueId?: string;
    settlementType?: 'immediate' | 'batch';
  }
): Promise<SettlementExportRecord[]> {
  const db = getDbOr();
  if (!db) {
    return [];
  }

  try {
    const conditions = [];
    
    if (filters.startDate) {
      conditions.push(gte(payouts.createdAt, filters.startDate));
    }
    
    if (filters.endDate) {
      conditions.push(lte(payouts.createdAt, filters.endDate));
    }
    
    if (filters.status) {
      conditions.push(eq(payouts.status, filters.status));
    }

    if (filters.venueId) {
      conditions.push(eq(payouts.venueId, filters.venueId));
    }

    if (filters.settlementType) {
      conditions.push(eq(payouts.settlementType, filters.settlementType));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db
      .select({
        settlementId: payouts.settlementId,
        payoutId: payouts.id,
        shiftId: payouts.shiftId,
        workerId: payouts.workerId,
        venueId: payouts.venueId,
        amountCents: payouts.amountCents,
        status: payouts.status,
        settlementType: payouts.settlementType,
        stripeChargeId: payouts.stripeChargeId,
        stripeTransferId: payouts.stripeTransferId,
        processedAt: payouts.processedAt,
        createdAt: payouts.createdAt,
        hourlyRate: payouts.hourlyRate,
        hoursWorked: payouts.hoursWorked,
        shiftTitle: shifts.title,
        shiftStartTime: shifts.startTime,
        shiftEndTime: shifts.endTime,
      })
      .from(payouts)
      .leftJoin(shifts, eq(payouts.shiftId, shifts.id))
      .where(whereClause)
      .orderBy(desc(payouts.createdAt));

    return result.map((row: any) => ({
      ...row,
      currency: 'aud',
    })) as SettlementExportRecord[];
  } catch (error) {
    console.error('[PAYOUTS REPO] Error exporting settlements:', error);
    return [];
  }
}
