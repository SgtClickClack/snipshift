/**
 * Shift Applications Schema
 * 
 * Dedicated table for shift applications with explicit venue_id reference
 */

import { pgTable, uuid, text, varchar, timestamp, index, unique, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { shifts } from './shifts.js';

/**
 * Shift Application Status Enum
 */
export const shiftApplicationStatusEnum = pgEnum('shift_application_status', ['pending', 'accepted', 'rejected']);

/**
 * Shift Applications table
 * Stores shift applications submitted by hospitality workers
 */
export const shiftApplications = pgTable('shift_applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  shiftId: uuid('shift_id').notNull().references(() => shifts.id, { onDelete: 'cascade' }),
  workerId: uuid('worker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  venueId: uuid('venue_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: shiftApplicationStatusEnum('status').notNull().default('pending'),
  message: text('message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  shiftIdIdx: index('shift_applications_shift_id_idx').on(table.shiftId),
  workerIdIdx: index('shift_applications_worker_id_idx').on(table.workerId),
  venueIdIdx: index('shift_applications_venue_id_idx').on(table.venueId),
  statusIdx: index('shift_applications_status_idx').on(table.status),
  shiftStatusIdx: index('shift_applications_shift_status_idx').on(table.shiftId, table.status),
  // Unique constraint to prevent duplicate applications
  shiftWorkerUnique: unique('shift_applications_shift_worker_unique').on(table.shiftId, table.workerId),
}));
