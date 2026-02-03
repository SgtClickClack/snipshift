/**
 * Shift Templates Schema
 *
 * Stores capacity requirements per venue/day - defines how many workers
 * are needed for each time slot (e.g., "Morning Bar" 8am-12pm needs 3 staff).
 */

import { pgTable, uuid, varchar, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { venues } from './venues.js';

/**
 * Shift Templates table
 * Defines required staff count per venue, day of week, and time slot
 */
export const shiftTemplates = pgTable(
  'shift_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    dayOfWeek: integer('day_of_week').notNull(), // 0=Sun, 1=Mon, ..., 6=Sat
    startTime: varchar('start_time', { length: 5 }).notNull(), // HH:mm
    endTime: varchar('end_time', { length: 5 }).notNull(), // HH:mm
    requiredStaffCount: integer('required_staff_count').notNull(),
    label: varchar('label', { length: 128 }).notNull(), // e.g. "Morning Bar", "Floor Shift"
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    venueIdIdx: index('shift_templates_venue_id_idx').on(table.venueId),
    venueDayIdx: index('shift_templates_venue_day_idx').on(table.venueId, table.dayOfWeek),
  })
);
