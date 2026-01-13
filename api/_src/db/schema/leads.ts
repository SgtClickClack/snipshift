/**
 * Enterprise Leads Schema
 * 
 * Stores enterprise lead submissions from the ContactSalesForm
 */

import { pgTable, uuid, varchar, text, timestamp, pgEnum, integer } from 'drizzle-orm/pg-core';

/**
 * Lead inquiry type enum
 */
export const leadInquiryTypeEnum = pgEnum('lead_inquiry_type', [
  'enterprise_plan',
  'custom_solution',
  'partnership',
  'general'
]);

/**
 * Lead status enum
 */
export const leadStatusEnum = pgEnum('lead_status', [
  'new',
  'contacted',
  'qualified',
  'proposal_sent',
  'closed_won',
  'closed_lost'
]);

/**
 * Enterprise Leads table
 * Stores lead submissions from the ContactSalesForm
 */
export const leads = pgTable('leads', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  contactName: varchar('contact_name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  numberOfLocations: integer('number_of_locations'),
  inquiryType: leadInquiryTypeEnum('inquiry_type').notNull().default('general'),
  message: text('message'),
  status: leadStatusEnum('status').notNull().default('new'),
  source: varchar('source', { length: 100 }), // e.g., 'contact_form', 'landing_page'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
