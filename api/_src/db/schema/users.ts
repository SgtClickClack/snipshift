import { pgTable, uuid, varchar, text, decimal, boolean, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * User roles enum
 */
export const userRoleEnum = pgEnum('user_role', ['professional', 'business', 'admin', 'trainer', 'hub']);

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
  roles: text('roles').array().notNull().default(sql`ARRAY['professional']::text[]`),
  bio: text('bio'),
  phone: varchar('phone', { length: 50 }),
  location: varchar('location', { length: 255 }),
  avatarUrl: text('avatar_url'),
  bannerUrl: text('banner_url'),
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }),
  reviewCount: decimal('review_count', { precision: 10, scale: 0 }).default('0'),
  isOnboarded: boolean('is_onboarded').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  stripeAccountId: varchar('stripe_account_id', { length: 255 }),
  stripeOnboardingComplete: boolean('stripe_onboarding_complete').notNull().default(false),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  roleIdx: index('users_role_idx').on(table.role),
  stripeAccountIdIdx: index('users_stripe_account_id_idx').on(table.stripeAccountId),
  stripeCustomerIdIdx: index('users_stripe_customer_id_idx').on(table.stripeCustomerId),
}));

