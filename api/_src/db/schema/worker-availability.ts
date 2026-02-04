/**
 * Worker Availability Schema
 * 
 * Stores availability preferences for professional workers.
 * Each row represents a day's availability with morning/lunch/dinner slots.
 * 
 * Used by:
 * - Smart Fill service to filter invitees
 * - Professional dashboard availability picker
 */

import { pgTable, uuid, date, boolean, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const workerAvailability = pgTable('worker_availability', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // The worker whose availability this is
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // The date for this availability entry (YYYY-MM-DD)
  date: date('date').notNull(),
  
  // Time slot availability flags
  morning: boolean('morning').notNull().default(false),   // 06:00 - 11:00
  lunch: boolean('lunch').notNull().default(false),       // 11:00 - 15:00
  dinner: boolean('dinner').notNull().default(false),     // 15:00 - 23:00
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Unique constraint: one availability record per user per day
  userDateUnique: unique('worker_availability_user_date_unique').on(table.userId, table.date),
  
  // Index for efficient queries by user
  userIdIdx: index('worker_availability_user_id_idx').on(table.userId),
  
  // Index for efficient queries by date range
  dateIdx: index('worker_availability_date_idx').on(table.date),
  
  // Composite index for finding available workers on a specific date/slot
  availabilityQueryIdx: index('worker_availability_query_idx').on(
    table.date, 
    table.morning, 
    table.lunch, 
    table.dinner
  ),
}));
