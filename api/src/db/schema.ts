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
export const jobStatusEnum = pgEnum('job_status', ['open', 'filled', 'closed', 'completed']);

/**
 * Application status enum
 */
export const applicationStatusEnum = pgEnum('application_status', ['pending', 'accepted', 'rejected']);

/**
 * Notification type enum
 */
export const notificationTypeEnum = pgEnum('notification_type', [
  'application_received',
  'application_status_change',
  'job_posted',
  'job_updated',
  'job_completed',
  'message_received',
]);

/**
 * Subscription status enum
 */
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'canceled',
  'past_due',
  'trialing',
  'incomplete',
]);

/**
 * Payment status enum
 */
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'succeeded',
  'failed',
  'refunded',
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
  bio: text('bio'),
  phone: varchar('phone', { length: 50 }),
  location: varchar('location', { length: 255 }),
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }),
  reviewCount: decimal('review_count', { precision: 10, scale: 0 }).default('0'),
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
  description: text('description').notNull(),
  date: date('date').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  status: jobStatusEnum('status').notNull().default('open'),
  shopName: varchar('shop_name', { length: 255 }),
  address: varchar('address', { length: 512 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 50 }),
  lat: decimal('lat', { precision: 10, scale: 7 }),
  lng: decimal('lng', { precision: 10, scale: 7 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  businessIdDateIdx: index('jobs_business_id_date_idx').on(table.businessId, table.date),
  statusDateIdx: index('jobs_status_date_idx').on(table.status, table.date),
  businessIdIdx: index('jobs_business_id_idx').on(table.businessId),
  cityIdx: index('jobs_city_idx').on(table.city),
  latLngIdx: index('jobs_lat_lng_idx').on(table.lat, table.lng),
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
  reviewsGiven: many(reviews, { relationName: 'reviewer' }),
  reviewsReceived: many(reviews, { relationName: 'reviewee' }),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  business: one(users, {
    fields: [jobs.businessId],
    references: [users.id],
  }),
  applications: many(applications),
  reviews: many(reviews),
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

/**
 * Notifications table
 * Stores user notifications for various events
 */
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  link: varchar('link', { length: 512 }),
  isRead: timestamp('is_read').default(null), // NULL means unread, timestamp means read
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('notifications_user_id_idx').on(table.userId),
  userIdCreatedAtIdx: index('notifications_user_id_created_at_idx').on(table.userId, table.createdAt),
  isReadIdx: index('notifications_is_read_idx').on(table.isRead),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

/**
 * Reviews table
 * Stores reviews/ratings between users for completed jobs
 */
export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  reviewerId: uuid('reviewer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  revieweeId: uuid('reviewee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  rating: decimal('rating', { precision: 1, scale: 0 }).notNull(), // 1-5 integer stored as decimal
  comment: text('comment'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  reviewerIdIdx: index('reviews_reviewer_id_idx').on(table.reviewerId),
  revieweeIdIdx: index('reviews_reviewee_id_idx').on(table.revieweeId),
  jobIdIdx: index('reviews_job_id_idx').on(table.jobId),
  jobReviewerUnique: unique('reviews_job_reviewer_unique').on(table.jobId, table.reviewerId),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
    relationName: 'reviewer',
  }),
  reviewee: one(users, {
    fields: [reviews.revieweeId],
    references: [users.id],
    relationName: 'reviewee',
  }),
  job: one(jobs, {
    fields: [reviews.jobId],
    references: [jobs.id],
  }),
}));

/**
 * Subscription Plans table
 * Stores available subscription plans
 */
export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  interval: varchar('interval', { length: 50 }).notNull(), // 'month', 'year'
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  features: text('features'), // JSON string of features array
  isActive: timestamp('is_active').default(null), // NULL means inactive, timestamp means active
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  stripePriceIdIdx: index('subscription_plans_stripe_price_id_idx').on(table.stripePriceId),
}));

/**
 * Subscriptions table
 * Stores user subscriptions
 */
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id').notNull().references(() => subscriptionPlans.id, { onDelete: 'restrict' }),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }).unique(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: timestamp('cancel_at_period_end').default(null), // NULL means false, timestamp means true
  canceledAt: timestamp('canceled_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('subscriptions_user_id_idx').on(table.userId),
  stripeSubscriptionIdIdx: index('subscriptions_stripe_subscription_id_idx').on(table.stripeSubscriptionId),
  stripeCustomerIdIdx: index('subscriptions_stripe_customer_id_idx').on(table.stripeCustomerId),
  userIdStatusIdx: index('subscriptions_user_id_status_idx').on(table.userId, table.status),
}));

/**
 * Payments table
 * Stores payment history
 */
export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('usd'),
  status: paymentStatusEnum('status').notNull().default('pending'),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }).unique(),
  stripeChargeId: varchar('stripe_charge_id', { length: 255 }),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('payments_user_id_idx').on(table.userId),
  subscriptionIdIdx: index('payments_subscription_id_idx').on(table.subscriptionId),
  stripePaymentIntentIdIdx: index('payments_stripe_payment_intent_id_idx').on(table.stripePaymentIntentId),
  userIdCreatedAtIdx: index('payments_user_id_created_at_idx').on(table.userId, table.createdAt),
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [subscriptions.planId],
    references: [subscriptionPlans.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  subscription: one(subscriptions, {
    fields: [payments.subscriptionId],
    references: [subscriptions.id],
  }),
}));

/**
 * Conversations table
 * Stores conversation threads between users (typically employer and candidate)
 */
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  participant1Id: uuid('participant1_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  participant2Id: uuid('participant2_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lastMessageAt: timestamp('last_message_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  participant1Idx: index('conversations_participant1_id_idx').on(table.participant1Id),
  participant2Idx: index('conversations_participant2_id_idx').on(table.participant2Id),
  jobIdIdx: index('conversations_job_id_idx').on(table.jobId),
  lastMessageAtIdx: index('conversations_last_message_at_idx').on(table.lastMessageAt),
  // Ensure unique conversation between two users for a job (or without job)
  participantsJobUnique: unique('conversations_participants_job_unique').on(
    table.participant1Id,
    table.participant2Id,
    table.jobId
  ),
}));

/**
 * Messages table
 * Stores individual messages within conversations
 */
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  isRead: timestamp('is_read').default(null), // NULL means unread, timestamp means read
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  conversationIdIdx: index('messages_conversation_id_idx').on(table.conversationId),
  senderIdIdx: index('messages_sender_id_idx').on(table.senderId),
  conversationCreatedAtIdx: index('messages_conversation_created_at_idx').on(table.conversationId, table.createdAt),
  isReadIdx: index('messages_is_read_idx').on(table.isRead),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  job: one(jobs, {
    fields: [conversations.jobId],
    references: [jobs.id],
  }),
  participant1: one(users, {
    fields: [conversations.participant1Id],
    references: [users.id],
    relationName: 'participant1',
  }),
  participant2: one(users, {
    fields: [conversations.participant2Id],
    references: [users.id],
    relationName: 'participant2',
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

