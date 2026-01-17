/**
 * Failed Emails Schema
 * 
 * Dead-letter office for email delivery failures
 * Stores full email payload for manual recovery
 */

import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * Failed Emails table
 * Stores emails that failed to send for manual recovery
 */
export const failedEmails = pgTable('failed_emails', {
  id: uuid('id').defaultRandom().primaryKey(),
  to: varchar('to', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 512 }).notNull(),
  html: text('html').notNull(), // Full email body HTML
  from: varchar('from', { length: 255 }),
  errorMessage: text('error_message'), // Error details from Resend API
  errorCode: varchar('error_code', { length: 100 }), // Error code if available
  retryCount: timestamp('retry_count'), // NULL means not retried, timestamp means retry attempted
  recoveredAt: timestamp('recovered_at'), // NULL means not recovered, timestamp means manually recovered
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  toIdx: index('failed_emails_to_idx').on(table.to),
  createdAtIdx: index('failed_emails_created_at_idx').on(table.createdAt),
  recoveredAtIdx: index('failed_emails_recovered_at_idx').on(table.recoveredAt),
}));
