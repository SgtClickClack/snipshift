import { pgTable, uuid, integer, timestamp, index, boolean, date, varchar, text } from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * Profiles table
 * Stores user profile metadata that is separate from auth/account fields.
 */
export const profiles = pgTable('profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  // RSA compliance fields (HospoGo)
  rsaVerified: boolean('rsa_verified').notNull().default(false),
  rsaExpiry: date('rsa_expiry'),
  rsaStateOfIssue: varchar('rsa_state_of_issue', { length: 10 }),
  rsaCertUrl: text('rsa_cert_url'),
  // Identity verification (Government ID)
  idDocumentUrl: text('id_document_url'),
  idVerifiedStatus: varchar('id_verified_status', { length: 20 }),
  reliabilityStrikes: integer('reliability_strikes').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  reliabilityStrikesIdx: index('profiles_reliability_strikes_idx').on(table.reliabilityStrikes),
}));

