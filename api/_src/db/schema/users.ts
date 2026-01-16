import { pgTable, uuid, varchar, text, decimal, boolean, timestamp, pgEnum, index, date, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * User roles enum
 */
export const userRoleEnum = pgEnum('user_role', ['professional', 'business', 'admin', 'trainer', 'hub']);

/**
 * Pro verification status enum (HospoGo)
 * - pending_review: New account awaiting first successful shift completion
 * - verified: Has completed at least one shift successfully
 * - at_risk: Rating has dropped below 4.0 (warned about suspension)
 * - suspended: Account suspended due to policy violations
 */
export const proVerificationStatusEnum = pgEnum('pro_verification_status', [
  'pending_review',
  'verified',
  'at_risk',
  'suspended',
]);

/**
 * Hospitality role enum (HospoGo pivot)
 */
export const hospitalityRoleEnum = pgEnum('hospitality_role', [
  'Bartender',
  'Waitstaff',
  'Barista',
  'Kitchen Hand',
  'Manager',
]);

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
  // HospoGo compliance + preferences
  rsaVerified: boolean('rsa_verified').notNull().default(false),
  rsaNotRequired: boolean('rsa_not_required').notNull().default(false), // User indicated they don't need RSA (e.g., kitchen staff, non-alcohol venues)
  rsaNumber: varchar('rsa_number', { length: 100 }),
  rsaExpiry: date('rsa_expiry'),
  rsaStateOfIssue: varchar('rsa_state_of_issue', { length: 10 }),
  // New canonical column (added 2026-01-10)
  rsaCertUrl: text('rsa_cert_url'),
  // Legacy column kept for backwards compatibility in existing DBs
  rsaCertificateUrl: text('rsa_certificate_url'),
  hospitalityRole: hospitalityRoleEnum('hospitality_role'),
  hourlyRatePreference: decimal('hourly_rate_preference', { precision: 10, scale: 2 }),
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }),
  reviewCount: decimal('review_count', { precision: 10, scale: 0 }).default('0'),
  // Pro verification fields (HospoGo)
  verificationStatus: proVerificationStatusEnum('verification_status').notNull().default('pending_review'),
  completedShiftCount: integer('completed_shift_count').notNull().default(0),
  noShowCount: integer('no_show_count').notNull().default(0),
  lastNoShowAt: timestamp('last_no_show_at'),
  consecutiveFiveStarCount: integer('consecutive_five_star_count').notNull().default(0),
  topRatedBadge: boolean('top_rated_badge').notNull().default(false),
  ratingWarningAt: timestamp('rating_warning_at'), // When 4.0 warning was sent
  // Strike/Reputation system
  strikes: integer('strikes').notNull().default(0), // Current strike count
  lastStrikeDate: timestamp('last_strike_date'), // When the last strike was applied
  shiftsSinceLastStrike: integer('shifts_since_last_strike').notNull().default(0), // Completed shifts since last strike
  recoveryProgress: integer('recovery_progress').notNull().default(0), // Shifts with 4.5+ rating toward strike removal (0-5)
  suspendedUntil: timestamp('suspended_until'), // 48h suspension period after no-show
  isOnboarded: boolean('is_onboarded').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  stripeAccountId: varchar('stripe_account_id', { length: 255 }),
  stripeOnboardingComplete: boolean('stripe_onboarding_complete').notNull().default(false),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  totalEarnedCents: integer('total_earned_cents').notNull().default(0), // Total earnings in cents
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  roleIdx: index('users_role_idx').on(table.role),
  stripeAccountIdIdx: index('users_stripe_account_id_idx').on(table.stripeAccountId),
  stripeCustomerIdIdx: index('users_stripe_customer_id_idx').on(table.stripeCustomerId),
  verificationStatusIdx: index('users_verification_status_idx').on(table.verificationStatus),
  topRatedBadgeIdx: index('users_top_rated_badge_idx').on(table.topRatedBadge),
  averageRatingIdx: index('users_average_rating_idx').on(table.averageRating),
}));

