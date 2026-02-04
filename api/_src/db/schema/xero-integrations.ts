import { pgTable, uuid, varchar, text, timestamp, index, jsonb } from 'drizzle-orm/pg-core';
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

/**
 * Xero Audit Log table
 * Tracks all write operations to Xero for compliance and debugging.
 * Records: connections, disconnections, mapping changes, and timesheet syncs.
 */
export type XeroAuditOperation = 
  | 'CONNECT'
  | 'DISCONNECT'
  | 'TOKEN_REFRESH'
  | 'MAP_EMPLOYEE'
  | 'UNMAP_EMPLOYEE'
  | 'SYNC_TIMESHEET'
  | 'SYNC_TIMESHEET_FAILED';

export const xeroAuditLog = pgTable('xero_audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  operation: varchar('operation', { length: 50 }).notNull().$type<XeroAuditOperation>(),
  xeroTenantId: varchar('xero_tenant_id', { length: 255 }),
  // Flexible JSON payload for operation-specific data
  payload: jsonb('payload'),
  // Result of the operation (success/failure details)
  result: jsonb('result'),
  // IP address of the request (for security auditing)
  ipAddress: varchar('ip_address', { length: 45 }),
  // User agent string
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('xero_audit_log_user_id_idx').on(table.userId),
  operationIdx: index('xero_audit_log_operation_idx').on(table.operation),
  createdAtIdx: index('xero_audit_log_created_at_idx').on(table.createdAt),
  tenantIdx: index('xero_audit_log_tenant_idx').on(table.xeroTenantId),
}));
