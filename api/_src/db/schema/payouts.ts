import { pgTable, uuid, varchar, decimal, integer, timestamp, index, unique, pgEnum } from 'drizzle-orm/pg-core';
import { shifts } from './shifts.js';
import { users } from './users.js';

export const payoutStatusEnum = pgEnum('payout_status', ['pending', 'processing', 'completed', 'failed']);

/**
 * Settlement ID format: STL-{YYYYMMDD}-{random6}
 * Example: STL-20260121-A3F8K2
 * 
 * This unique identifier enables:
 * - D365/Workday reconciliation exports
 * - Cross-system tracking for enterprise clients (e.g., Endeavour)
 * - Audit trail linking across payment systems
 */
export function generateSettlementId(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `STL-${dateStr}-${randomPart}`;
}

export const payouts = pgTable('payouts', {
  id: uuid('id').defaultRandom().primaryKey(),
  // Settlement ID for D365/Workday reconciliation
  settlementId: varchar('settlement_id', { length: 32 }).notNull().unique(),
  shiftId: uuid('shift_id').notNull().references(() => shifts.id, { onDelete: 'cascade' }),
  workerId: uuid('worker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  venueId: uuid('venue_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amountCents: integer('amount_cents').notNull(), // Payout amount in cents
  hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }).notNull(),
  hoursWorked: decimal('hours_worked', { precision: 10, scale: 2 }).notNull(),
  stripeTransferId: varchar('stripe_transfer_id', { length: 255 }), // Stripe Transfer ID if applicable
  stripeChargeId: varchar('stripe_charge_id', { length: 255 }), // Stripe Charge ID from payment capture
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  // Settlement type: 'immediate' bypasses batch, 'batch' for legacy/bulk processing
  settlementType: varchar('settlement_type', { length: 20 }).notNull().default('immediate'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  workerIdIdx: index('payouts_worker_id_idx').on(table.workerId),
  venueIdIdx: index('payouts_venue_id_idx').on(table.venueId),
  shiftIdIdx: index('payouts_shift_id_idx').on(table.shiftId),
  statusIdx: index('payouts_status_idx').on(table.status),
  createdAtIdx: index('payouts_created_at_idx').on(table.createdAt),
  settlementIdIdx: index('payouts_settlement_id_idx').on(table.settlementId),
  shiftUnique: unique('unique_shift_payout').on(table.shiftId),
}));
