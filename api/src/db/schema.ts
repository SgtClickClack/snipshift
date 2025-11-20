/**
 * Drizzle ORM Schema Definition
 * 
 * Defines database tables for users, jobs, and applications
 * with proper constraints, indexes, and foreign keys.
 */

import { pgTable, uuid, varchar, text, decimal, date, time, timestamp, pgEnum, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * User roles enum
 */
export const userRoleEnum = pgEnum('user_role', ['professional', 'business', 'admin', 'trainer']);

/**
 * Job status enum
 */
export const jobStatusEnum = pgEnum('job_status', ['open', 'filled', 'closed']);

/**
 * Application status enum
 */
export const applicationStatusEnum = pgEnum('application_status', ['pending', 'accepted', 'rejected']);

/**
 * Users table
 * Stores user accounts for authentication and authorization
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }), // Nullable for now, will be required when auth is implemented
  name: varchar('name', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('professional'),
  bio: text('bio'),
  phone: varchar('phone', { length: 50 }),
  location: varchar('location', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
}));

/**
 * Jobs table
 * Stores job postings created by business users
 */
export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  payRate: decimal('pay_rate', { precision: 10, scale: 2 }).notNull(),
  description: text('description').notNull(), // Made NOT NULL to align with UI requirements
  date: date('date').notNull(), // Made NOT NULL to align with UI requirements
  startTime: time('start_time').notNull(), // Made NOT NULL to align with UI requirements
  endTime: time('end_time').notNull(), // Made NOT NULL to align with UI requirements
  status: jobStatusEnum('status').notNull().default('open'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  businessIdDateIdx: index('jobs_business_id_date_idx').on(table.businessId, table.date),
  statusDateIdx: index('jobs_status_date_idx').on(table.status, table.date),
  businessIdIdx: index('jobs_business_id_idx').on(table.businessId),
}));

/**
 * Applications table
 * Stores job applications submitted by professionals
 */
export const applications = pgTable('applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // Nullable for now since we don't have user auth yet
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  coverLetter: text('cover_letter').notNull(),
  status: applicationStatusEnum('status').notNull().default('pending'),
  appliedAt: timestamp('applied_at').notNull().defaultNow(),
  respondedAt: timestamp('responded_at'),
}, (table) => ({
  jobIdStatusIdx: index('applications_job_id_status_idx').on(table.jobId, table.status),
  userIdStatusAppliedAtIdx: index('applications_user_id_status_applied_at_idx').on(table.userId, table.status, table.appliedAt),
  jobIdIdx: index('applications_job_id_idx').on(table.jobId),
  userIdIdx: index('applications_user_id_idx').on(table.userId),
  // Unique constraint to prevent duplicate applications
  jobUserUnique: unique('applications_job_user_unique').on(table.jobId, table.userId),
}));

/**
 * Drizzle relations for type-safe joins
 */
export const usersRelations = relations(users, ({ many }) => ({
  jobs: many(jobs),
  applications: many(applications),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  business: one(users, {
    fields: [jobs.businessId],
    references: [users.id],
  }),
  applications: many(applications),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  job: one(jobs, {
    fields: [applications.jobId],
    references: [jobs.id],
  }),
  user: one(users, {
    fields: [applications.userId],
    references: [users.id],
  }),
}));

