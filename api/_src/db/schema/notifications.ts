import { pgTable, uuid, text, boolean, timestamp, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * Notification type enum
 */
export const notificationTypeEnum = pgEnum('notification_type', [
  'job_alert',
  'application_update',
  'chat_message',
  'system',
]);

/**
 * Notifications table
 * Stores user notifications for various events
 */
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: jsonb('data'),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('notifications_user_id_idx').on(table.userId),
  // Keeping index for performance on common queries
}));

