import { pgTable, uuid, varchar, text, decimal, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * Shift status enum
 */
export const shiftStatusEnum = pgEnum('shift_status', ['open', 'filled', 'completed']);

/**
 * Shifts table
 * Stores shift postings created by employers (business users)
 */
export const shifts = pgTable('shifts', {
  id: uuid('id').defaultRandom().primaryKey(),
  employerId: uuid('employer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }).notNull(),
  status: shiftStatusEnum('status').notNull().default('open'),
  location: varchar('location', { length: 512 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  employerIdIdx: index('shifts_employer_id_idx').on(table.employerId),
  statusIdx: index('shifts_status_idx').on(table.status),
  startTimeIdx: index('shifts_start_time_idx').on(table.startTime),
  statusStartTimeIdx: index('shifts_status_start_time_idx').on(table.status, table.startTime),
}));

