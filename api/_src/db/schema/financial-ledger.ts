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
  'IMMEDIATE_SETTLEMENT_COMPLETED',
  'IMMEDIATE_SETTLEMENT_FAILED',
]);

export const financialLedgerEntries = pgTable(
  'financial_ledger_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    entryType: ledgerEntryTypeEnum('entry_type').notNull(),
    
    // Settlement ID for D365/Workday reconciliation export
    // Links to payouts.settlement_id for cross-system tracking
    settlementId: varchar('settlement_id', { length: 32 }),

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
    settlementIdIdx: index('financial_ledger_entries_settlement_id_idx').on(table.settlementId),
    // Uniqueness is enforced in SQL as a partial unique index (only when stripeEventId is not null).
    // This placeholder keeps drizzle schema aligned if we later choose to enforce it here too.
    stripeEventUnique: unique('financial_ledger_entries_stripe_event_id_unique').on(table.stripeEventId),
    payoutEntryTypeUnique: unique('financial_ledger_entries_payout_entry_type_unique').on(
      table.payoutId,
      table.entryType
    ),
  })
);

/**
 * Ledger Line Items
 * 
 * Stores detailed breakdown of award calculations (Base Pay, Sunday Penalty, Late Night Loading)
 * linked to Settlement IDs for D365/Workday reconciliation.
 */
export const ledgerLineItemTypeEnum = pgEnum('ledger_line_item_type', [
  'BASE_PAY',
  'CASUAL_LOADING',
  'SUNDAY_PENALTY',
  'SATURDAY_PENALTY',
  'LATE_NIGHT_LOADING',
  'NIGHT_LOADING',
]);

export const financialLedgerLineItems = pgTable(
  'financial_ledger_line_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ledgerEntryId: uuid('ledger_entry_id').notNull().references(() => financialLedgerEntries.id, { onDelete: 'cascade' }),
    settlementId: varchar('settlement_id', { length: 32 }), // Denormalized for quick lookups
    
    lineItemType: ledgerLineItemTypeEnum('line_item_type').notNull(),
    description: varchar('description', { length: 255 }).notNull(),
    hours: integer('hours'), // Hours in hundredths (e.g., 250 = 2.5 hours)
    rateCents: integer('rate_cents'), // Rate per hour in cents
    amountCents: integer('amount_cents').notNull(), // Line item amount in cents
    
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    ledgerEntryIdIdx: index('financial_ledger_line_items_ledger_entry_id_idx').on(table.ledgerEntryId),
    settlementIdIdx: index('financial_ledger_line_items_settlement_id_idx').on(table.settlementId),
  })
);

