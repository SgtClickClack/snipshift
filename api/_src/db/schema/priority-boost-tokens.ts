/**
 * Priority Boost Tokens Schema
 * 
 * Stores priority boost tokens granted to workers who remain active on waitlists
 * for last-minute shifts. Tokens provide a +10% score boost in the recommendation
 * engine for 48 hours.
 */

import { pgTable, uuid, timestamp, index, boolean } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { shifts } from './shifts.js';

/**
 * Priority Boost Tokens table
 * Stores tokens granted to workers who are Rank 1 on a waitlist 2 hours before shift starts
 */
export const priorityBoostTokens = pgTable('priority_boost_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  workerId: uuid('worker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  shiftId: uuid('shift_id').notNull().references(() => shifts.id, { onDelete: 'cascade' }),
  grantedAt: timestamp('granted_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(), // 48 hours after grantedAt
  isActive: boolean('is_active').notNull().default(true), // False if expired or replaced
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  workerIdIdx: index('priority_boost_tokens_worker_id_idx').on(table.workerId),
  shiftIdIdx: index('priority_boost_tokens_shift_id_idx').on(table.shiftId),
  workerActiveIdx: index('priority_boost_tokens_worker_active_idx').on(table.workerId, table.isActive),
  expiresAtIdx: index('priority_boost_tokens_expires_at_idx').on(table.expiresAt),
}));
