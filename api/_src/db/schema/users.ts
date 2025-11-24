import { pgTable, uuid, varchar, text, decimal, boolean, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';

/**
 * User roles enum
 */
export const userRoleEnum = pgEnum('user_role', ['professional', 'business', 'admin', 'trainer']);

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
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }),
  reviewCount: decimal('review_count', { precision: 10, scale: 0 }).default('0'),
  isOnboarded: boolean('is_onboarded').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
}));

