/**
 * Shift Acceptance Contracts Schema
 *
 * Ledger of binding agreements formed when a shift is accepted.
 * Action-as-signature: accepting a shift constitutes acceptance of the MSA.
 */

import { pgTable, uuid, varchar, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { shifts } from './shifts.js';
import { users } from './users.js';

/**
 * Shift acceptance contracts table
 * One row per shift acceptance (one-to-one with shift assignment)
 */
export const contracts = pgTable(
  'contracts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    shiftId: uuid('shift_id')
      .notNull()
      .references(() => shifts.id, { onDelete: 'cascade' }),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    professionalId: uuid('professional_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** SHA-256 hash of shiftId + venueId + professionalId + timestamp for audit trail */
    contractHash: varchar('contract_hash', { length: 64 }).notNull(),
    /** Human-readable log: "User X accepted the terms of the MSA for Shift Y" */
    acceptanceLog: varchar('acceptance_log', { length: 512 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    shiftIdIdx: index('contracts_shift_id_idx').on(table.shiftId),
    venueIdIdx: index('contracts_venue_id_idx').on(table.venueId),
    professionalIdIdx: index('contracts_professional_id_idx').on(table.professionalId),
    createdAtIdx: index('contracts_created_at_idx').on(table.createdAt),
    /** One contract per shift (single assignee) */
    shiftIdUnique: unique('contracts_shift_id_unique').on(table.shiftId),
  })
);
