import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * Xero OAuth state table - ephemeral storage for CSRF protection
 */
export const xeroOauthState = pgTable('xero_oauth_state', {
  state: varchar('state', { length: 64 }).primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
}, (table) => ({
  expiresAtIdx: index('xero_oauth_state_expires_at_idx').on(table.expiresAt),
}));

/**
 * Xero Integrations table
 * Stores encrypted OAuth tokens for Xero connections.
 * Isolated from users table - integration data can be wiped without affecting login.
 */
export const xeroIntegrations = pgTable('xero_integrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  xeroTenantId: varchar('xero_tenant_id', { length: 255 }).notNull(),
  xeroTenantName: varchar('xero_tenant_name', { length: 255 }),
  accessTokenEnc: text('access_token_enc').notNull(),
  refreshTokenEnc: text('refresh_token_enc').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  scope: text('scope'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('xero_integrations_user_id_idx').on(table.userId),
  xeroTenantIdIdx: index('xero_integrations_xero_tenant_id_idx').on(table.xeroTenantId),
}));
