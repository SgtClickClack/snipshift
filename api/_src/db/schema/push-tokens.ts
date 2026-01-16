import { pgTable, uuid, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * User Push Tokens table
 * Stores FCM device tokens for push notifications
 */
export const userPushTokens = pgTable('user_push_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  deviceId: text('device_id'), // Optional device identifier for tracking
  platform: text('platform'), // 'web', 'ios', 'android'
  isActive: boolean('is_active').notNull().default(true),
  lastUsedAt: timestamp('last_used_at').defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('user_push_tokens_user_id_idx').on(table.userId),
  tokenIdx: index('user_push_tokens_token_idx').on(table.token),
  userIdActiveIdx: index('user_push_tokens_user_id_active_idx').on(table.userId, table.isActive),
}));
