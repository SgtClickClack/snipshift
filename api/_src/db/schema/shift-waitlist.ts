/**
 * Shift Waitlist Schema
 * 
 * Stores waitlist entries for filled shifts. When a shift becomes available
 * (no-show or substitution), waitlisted workers are notified.
 */

import { pgTable, uuid, integer, timestamp, index, unique, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { shifts } from './shifts.js';

/**
 * Waitlist status enum
 */
export const waitlistStatusEnum = pgEnum('waitlist_status', [
  'active',      // Worker is on the waitlist
  'converted',   // Worker was assigned the shift
  'expired',     // Shift passed or was cancelled
]);

/**
 * Shift Waitlist table
 * Stores workers who want to be notified if a filled shift becomes available
 */
export const shiftWaitlist = pgTable('shift_waitlist', {
  id: uuid('id').defaultRandom().primaryKey(),
  shiftId: uuid('shift_id').notNull().references(() => shifts.id, { onDelete: 'cascade' }),
  workerId: uuid('worker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rank: integer('rank').notNull(), // Position in waitlist (1 = highest priority)
  status: waitlistStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  shiftIdIdx: index('shift_waitlist_shift_id_idx').on(table.shiftId),
  workerIdIdx: index('shift_waitlist_worker_id_idx').on(table.workerId),
  statusIdx: index('shift_waitlist_status_idx').on(table.status),
  shiftStatusIdx: index('shift_waitlist_shift_status_idx').on(table.shiftId, table.status),
  // Unique constraint to prevent duplicate waitlist entries
  shiftWorkerUnique: unique('shift_waitlist_shift_worker_unique').on(table.shiftId, table.workerId),
}));
