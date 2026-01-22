/**
 * Financial Ledger Repository (append-only)
 *
 * This is the foundation for a $100M-grade marketplace guardrail:
 * - immutable ledger of financial state transitions
 * - idempotency via Stripe event IDs
 * - supports reconciliation workflows
 * - Settlement IDs for D365/Workday export
 */

import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { financialLedgerEntries } from '../db/schema.js';

type DbLike = any;

function getDbOr(dbOverride?: DbLike): DbLike | null {
  if (dbOverride) return dbOverride;
  return getDb();
}

export type LedgerEntryType =
  | 'SHIFT_PAYOUT_COMPLETED'
  | 'SHIFT_PAYOUT_FAILED'
  | 'RECONCILIATION_PAYOUT_COMPLETED'
  | 'RECONCILIATION_PAYOUT_FAILED'
  | 'IMMEDIATE_SETTLEMENT_COMPLETED'
  | 'IMMEDIATE_SETTLEMENT_FAILED';

export interface CreateLedgerEntryInput {
  entryType: LedgerEntryType;
  amountCents: number;
  currency?: string;
  
  // Settlement ID for D365/Workday reconciliation
  settlementId?: string | null;

  shiftId?: string | null;
  payoutId?: string | null;
  workerId?: string | null;
  venueId?: string | null;

  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  stripeTransferId?: string | null;
  stripeEventId?: string | null;
}

export async function createLedgerEntry(
  input: CreateLedgerEntryInput,
  dbOverride?: DbLike
) {
  const db = getDbOr(dbOverride);
  if (!db) return null;

  try {
    const [row] = await db
      .insert(financialLedgerEntries)
      .values({
        entryType: input.entryType,
        amountCents: input.amountCents,
        currency: input.currency ?? 'aud',
        settlementId: input.settlementId ?? null,
        shiftId: input.shiftId ?? null,
        payoutId: input.payoutId ?? null,
        workerId: input.workerId ?? null,
        venueId: input.venueId ?? null,
        stripePaymentIntentId: input.stripePaymentIntentId ?? null,
        stripeChargeId: input.stripeChargeId ?? null,
        stripeTransferId: input.stripeTransferId ?? null,
        stripeEventId: input.stripeEventId ?? null,
      })
      .returning();

    if (input.settlementId) {
      console.log(`[LEDGER REPO] Created ledger entry with settlementId: ${input.settlementId}`);
    }
    return row ?? null;
  } catch (error) {
    console.error('[LEDGER REPO] Error creating ledger entry:', error);
    return null;
  }
}

export async function getLedgerEntryByStripeEventId(
  stripeEventId: string,
  dbOverride?: DbLike
) {
  const db = getDbOr(dbOverride);
  if (!db) return null;

  try {
    const [row] = await db
      .select()
      .from(financialLedgerEntries)
      .where(eq(financialLedgerEntries.stripeEventId, stripeEventId))
      .limit(1);
    return row ?? null;
  } catch (error) {
    console.error('[LEDGER REPO] Error fetching ledger entry by Stripe event id:', error);
    return null;
  }
}

/**
 * Get ledger entries by Settlement ID
 * Used for D365/Workday reconciliation and audit trails
 */
export async function getLedgerEntriesBySettlementId(
  settlementId: string,
  dbOverride?: DbLike
) {
  const db = getDbOr(dbOverride);
  if (!db) return [];

  try {
    const rows = await db
      .select()
      .from(financialLedgerEntries)
      .where(eq(financialLedgerEntries.settlementId, settlementId))
      .orderBy(desc(financialLedgerEntries.createdAt));
    return rows;
  } catch (error) {
    console.error('[LEDGER REPO] Error fetching ledger entries by settlement id:', error);
    return [];
  }
}

/**
 * Export ledger entries for reconciliation
 * Returns entries within a date range for ERP system imports
 */
export async function exportLedgerEntriesForReconciliation(
  filters: {
    startDate?: Date;
    endDate?: Date;
    entryType?: LedgerEntryType;
  }
) {
  const db = getDbOr();
  if (!db) return [];

  try {
    const conditions = [];
    
    if (filters.startDate) {
      conditions.push(gte(financialLedgerEntries.createdAt, filters.startDate));
    }
    
    if (filters.endDate) {
      conditions.push(lte(financialLedgerEntries.createdAt, filters.endDate));
    }
    
    if (filters.entryType) {
      conditions.push(eq(financialLedgerEntries.entryType, filters.entryType));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(financialLedgerEntries)
      .where(whereClause)
      .orderBy(desc(financialLedgerEntries.createdAt));
    
    return rows;
  } catch (error) {
    console.error('[LEDGER REPO] Error exporting ledger entries:', error);
    return [];
  }
}

