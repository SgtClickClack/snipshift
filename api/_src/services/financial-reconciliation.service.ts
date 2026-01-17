/**
 * Financial reconciliation service
 *
 * Purpose:
 * - Detect and heal inconsistencies between Stripe state and internal payout records
 * - Provide an operational guardrail for high-volume payout flows
 *
 * Design notes:
 * - Only acts on payouts that are not yet completed
 * - Uses idempotent DB updates (conditional transitions) to avoid double increments
 * - Writes immutable ledger entries for auditability
 */

import { and, eq, gte, ne, sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { payouts, shifts, users } from '../db/schema.js';
import * as payoutsRepo from '../repositories/payouts.repository.js';
import * as ledgerRepo from '../repositories/financial-ledger.repository.js';
import * as stripeConnectService from './stripe-connect.service.js';

export interface FinancialReconciliationResult {
  checked: number;
  markedCompleted: number;
  markedFailed: number;
  skipped: number;
}

export async function reconcileRecentPayouts(opts?: {
  daysBack?: number;
  limit?: number;
}): Promise<FinancialReconciliationResult> {
  const db = getDb();
  if (!db) throw new Error('Database not available');

  const daysBack = Math.max(1, Math.min(opts?.daysBack ?? 7, 90));
  const limit = Math.max(1, Math.min(opts?.limit ?? 200, 1000));

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const rows = await db
    .select({
      payout: payouts,
      shift: shifts,
    })
    .from(payouts)
    .innerJoin(shifts, eq(payouts.shiftId, shifts.id))
    .where(and(ne(payouts.status, 'completed'), gte(payouts.createdAt, startDate)))
    .limit(limit);

  const result: FinancialReconciliationResult = {
    checked: rows.length,
    markedCompleted: 0,
    markedFailed: 0,
    skipped: 0,
  };

  for (const row of rows) {
    const payout = row.payout as any;
    const shift = row.shift as any;

    // Only reconcile completed shifts; otherwise we may capture funds too early.
    if (!shift || shift.status !== 'completed') {
      result.skipped += 1;
      continue;
    }

    const paymentIntentId: string | null = shift.paymentIntentId ?? null;
    if (!paymentIntentId) {
      result.skipped += 1;
      continue;
    }

    // Determine Stripe truth
    let stripeChargeId: string | null = null;
    let shouldMarkCompleted = false;
    let shouldMarkFailed = false;

    try {
      const pi: any = await stripeConnectService.getPaymentIntent(paymentIntentId);
      const piStatus: string | undefined = pi?.status;

      if (piStatus === 'succeeded') {
        const latestCharge = pi?.latest_charge;
        stripeChargeId = typeof latestCharge === 'string' ? latestCharge : latestCharge?.id ?? null;
        shouldMarkCompleted = true;
      } else if (piStatus === 'requires_capture') {
        // If internal state still thinks it's authorized, attempt capture.
        if (shift.paymentStatus === 'AUTHORIZED') {
          try {
            stripeChargeId = await stripeConnectService.capturePaymentIntentWithChargeId(paymentIntentId);
            shouldMarkCompleted = !!stripeChargeId;
          } catch {
            shouldMarkFailed = true;
          }
        } else {
          result.skipped += 1;
          continue;
        }
      } else if (piStatus === 'canceled' || piStatus === 'requires_payment_method') {
        shouldMarkFailed = true;
      } else {
        result.skipped += 1;
        continue;
      }
    } catch {
      // Stripe lookup failed; don't mutate internal state.
      result.skipped += 1;
      continue;
    }

    const amountCents = Number(payout.amountCents ?? 0);

    if (shouldMarkCompleted) {
      const updated = await db.transaction(async (tx) => {
        // Only transition if not already completed (idempotency)
        const existing = await payoutsRepo.getPayoutByShiftId(shift.id, tx);
        if (!existing || existing.status === 'completed') return false;

        await payoutsRepo.updatePayoutStatus(
          existing.id,
          'completed',
          stripeChargeId ? { stripeChargeId } : undefined,
          tx
        );

        if (stripeChargeId) {
          await tx
            .update(shifts)
            .set({
              paymentStatus: 'PAID',
              stripeChargeId,
              updatedAt: new Date(),
            })
            .where(eq(shifts.id, shift.id));
        }

        // Atomic earnings increment (only happens on transition to completed)
        if (existing.workerId) {
          await tx
            .update(users)
            .set({
              totalEarnedCents: sql`${users.totalEarnedCents} + ${amountCents}`,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existing.workerId));
        }

        await ledgerRepo.createLedgerEntry(
          {
            entryType: 'RECONCILIATION_PAYOUT_COMPLETED',
            amountCents,
            currency: 'aud',
            shiftId: shift.id,
            payoutId: existing.id,
            workerId: existing.workerId,
            venueId: existing.venueId,
            stripePaymentIntentId: paymentIntentId,
            stripeChargeId,
          },
          tx
        );

        return true;
      });

      if (updated) result.markedCompleted += 1;
      else result.skipped += 1;
      continue;
    }

    if (shouldMarkFailed) {
      const updated = await db.transaction(async (tx) => {
        const existing = await payoutsRepo.getPayoutByShiftId(shift.id, tx);
        if (!existing || existing.status === 'completed') return false;

        await payoutsRepo.updatePayoutStatus(existing.id, 'failed', undefined, tx);
        await tx
          .update(shifts)
          .set({
            paymentStatus: 'PAYMENT_FAILED',
            updatedAt: new Date(),
          })
          .where(eq(shifts.id, shift.id));

        await ledgerRepo.createLedgerEntry(
          {
            entryType: 'RECONCILIATION_PAYOUT_FAILED',
            amountCents,
            currency: 'aud',
            shiftId: shift.id,
            payoutId: existing.id,
            workerId: existing.workerId,
            venueId: existing.venueId,
            stripePaymentIntentId: paymentIntentId,
            stripeChargeId,
          },
          tx
        );

        return true;
      });

      if (updated) result.markedFailed += 1;
      else result.skipped += 1;
      continue;
    }
  }

  return result;
}

