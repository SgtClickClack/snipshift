import { pgTable, uuid, varchar, integer, timestamp, index, unique, pgEnum } from 'drizzle-orm/pg-core';
import { shifts } from './shifts.js';
import { payouts } from './payouts.js';
import { users } from './users.js';

/**
 * Immutable financial ledger entry types.
 *
 * This is intentionally append-only: new types can be added over time, but
 * existing rows should never be mutated/deleted.
 */
export const ledgerEntryTypeEnum = pgEnum('ledger_entry_type', [
  'SHIFT_PAYOUT_COMPLETED',
  'SHIFT_PAYOUT_FAILED',
  'RECONCILIATION_PAYOUT_COMPLETED',
  'RECONCILIATION_PAYOUT_FAILED',
]);

export const financialLedgerEntries = pgTable(
  'financial_ledger_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    entryType: ledgerEntryTypeEnum('entry_type').notNull(),

    shiftId: uuid('shift_id').references(() => shifts.id, { onDelete: 'set null' }),
    payoutId: uuid('payout_id').references(() => payouts.id, { onDelete: 'set null' }),

    // Actor/parties
    workerId: uuid('worker_id').references(() => users.id, { onDelete: 'set null' }),
    venueId: uuid('venue_id').references(() => users.id, { onDelete: 'set null' }),

    amountCents: integer('amount_cents').notNull(),
    currency: varchar('currency', { length: 8 }).notNull().default('aud'),

    stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
    stripeChargeId: varchar('stripe_charge_id', { length: 255 }),
    stripeTransferId: varchar('stripe_transfer_id', { length: 255 }),
    stripeEventId: varchar('stripe_event_id', { length: 255 }),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    shiftIdIdx: index('financial_ledger_entries_shift_id_idx').on(table.shiftId),
    payoutIdIdx: index('financial_ledger_entries_payout_id_idx').on(table.payoutId),
    workerIdIdx: index('financial_ledger_entries_worker_id_idx').on(table.workerId),
    venueIdIdx: index('financial_ledger_entries_venue_id_idx').on(table.venueId),
    createdAtIdx: index('financial_ledger_entries_created_at_idx').on(table.createdAt),
    stripePaymentIntentIdIdx: index('financial_ledger_entries_pi_idx').on(table.stripePaymentIntentId),
    stripeChargeIdIdx: index('financial_ledger_entries_charge_idx').on(table.stripeChargeId),
    // Uniqueness is enforced in SQL as a partial unique index (only when stripeEventId is not null).
    // This placeholder keeps drizzle schema aligned if we later choose to enforce it here too.
    stripeEventUnique: unique('financial_ledger_entries_stripe_event_id_unique').on(table.stripeEventId),
    payoutEntryTypeUnique: unique('financial_ledger_entries_payout_entry_type_unique').on(
      table.payoutId,
      table.entryType
    ),
  })
);

