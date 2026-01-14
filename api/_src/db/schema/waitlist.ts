/**
 * Waitlist Schema
 * 
 * Stores waitlist signups for Brisbane launch
 */

import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

/**
 * Waitlist role enum
 */
export const waitlistRoleEnum = pgEnum('waitlist_role', [
  'venue',
  'staff'
]);

/**
 * Waitlist approval status enum
 */
export const waitlistApprovalStatusEnum = pgEnum('waitlist_approval_status', [
  'pending',
  'approved',
  'rejected'
]);

/**
 * Waitlist table
 * Stores waitlist signups from the Waitlist page
 */
export const waitlist = pgTable('waitlist', {
  id: uuid('id').defaultRandom().primaryKey(),
  role: waitlistRoleEnum('role').notNull(),
  name: varchar('name', { length: 255 }).notNull(), // Venue Name or Full Name
  contact: varchar('contact', { length: 255 }).notNull(), // Email or Mobile
  location: varchar('location', { length: 255 }).notNull().default('Brisbane, AU'), // ISO Standardized location
  approvalStatus: waitlistApprovalStatusEnum('approval_status').notNull().default('pending'), // Approval status for venue onboarding
  approvedAt: timestamp('approved_at'), // ISO 8601 UTC timestamp when approved/rejected
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
