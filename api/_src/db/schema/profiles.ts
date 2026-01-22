import { pgTable, uuid, integer, timestamp, index, boolean, date, varchar, text } from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * Profiles table
 * Stores user profile metadata that is separate from auth/account fields.
 * 
 * PRIVACY & SECURITY NOTES:
 * - Fields marked with [PII] contain Personally Identifiable Information
 * - Fields marked with [SENSITIVE] require encryption at rest
 * - Fields marked with [ENCRYPT] should be encrypted in future implementations
 * 
 * COMPLIANCE NOTES (Enterprise/Endeavour):
 * - productivityReady flag is the single source of truth for work eligibility
 * - Requires both VEVO verification AND ID verification to be TRUE
 * - Enterprise clients (Endeavour, etc.) should gate shift assignment on this flag
 */
export const profiles = pgTable('profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  // RSA compliance fields (HospoGo)
  rsaVerified: boolean('rsa_verified').notNull().default(false),
  rsaExpiry: date('rsa_expiry'), // [PII] Combined with RSA number, can identify user
  rsaStateOfIssue: varchar('rsa_state_of_issue', { length: 10 }), // [PII] [SENSITIVE] Location data combined with RSA number
  rsaCertUrl: text('rsa_cert_url'), // [PII] [SENSITIVE] RSA certificate URL - may contain PII
  // Identity verification (Government ID)
  idDocumentUrl: text('id_document_url'), // [PII] [SENSITIVE] [ENCRYPT] HIGHLY SENSITIVE - Government ID document - requires encryption
  idVerifiedStatus: varchar('id_verified_status', { length: 20 }),
  
  // VEVO (Visa Entitlement Verification Online) - Australian work rights verification
  // Required for enterprise clients (e.g., Endeavour Group) to ensure compliance
  vevoVerified: boolean('vevo_verified').notNull().default(false),
  vevoVerifiedAt: timestamp('vevo_verified_at'), // When VEVO check was completed
  vevoExpiryDate: date('vevo_expiry_date'), // Work rights expiry date (for visa holders)
  vevoReferenceNumber: varchar('vevo_reference_number', { length: 50 }), // [PII] [SENSITIVE] VEVO reference for audit trail
  vevoCheckType: varchar('vevo_check_type', { length: 30 }), // 'citizen', 'permanent_resident', 'work_visa', 'student_visa'
  
  // Productivity Ready Flag - Enterprise compliance gate
  // TRUE only when: idVerifiedStatus === 'APPROVED' AND vevoVerified === true
  // This is the single flag enterprise clients check before allowing work
  productivityReady: boolean('productivity_ready').notNull().default(false),
  productivityReadyAt: timestamp('productivity_ready_at'), // When user became productivity ready
  
  reliabilityStrikes: integer('reliability_strikes').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  reliabilityStrikesIdx: index('profiles_reliability_strikes_idx').on(table.reliabilityStrikes),
  vevoVerifiedIdx: index('profiles_vevo_verified_idx').on(table.vevoVerified),
  productivityReadyIdx: index('profiles_productivity_ready_idx').on(table.productivityReady),
}));

