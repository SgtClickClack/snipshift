/**
 * Financial Ledger Repository (append-only)
 *
 * This is the foundation for a $100M-grade marketplace guardrail:
 * - immutable ledger of financial state transitions
 * - idempotency via Stripe event IDs
 * - supports reconciliation workflows
 */

import { eq } from 'drizzle-orm';
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
  | 'RECONCILIATION_PAYOUT_FAILED';

export interface CreateLedgerEntryInput {
  entryType: LedgerEntryType;
  amountCents: number;
  currency?: string;

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

