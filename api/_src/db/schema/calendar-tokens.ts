import { pgTable, uuid, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * User Calendar Tokens table
 * Stores secure tokens for iCal feed access
 */
export const userCalendarTokens = pgTable('user_calendar_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'), // Optional expiration (null = no expiration)
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('user_calendar_tokens_user_id_idx').on(table.userId),
  tokenIdx: index('user_calendar_tokens_token_idx').on(table.token),
  userIdActiveIdx: index('user_calendar_tokens_user_id_active_idx').on(table.userId, table.isActive),
  expiresAtIdx: index('user_calendar_tokens_expires_at_idx').on(table.expiresAt),
}));
