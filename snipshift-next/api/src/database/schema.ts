import { pgTable, text, varchar, timestamp, decimal, boolean, jsonb, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['client', 'hub', 'professional', 'brand', 'trainer']);
export const jobStatusEnum = pgEnum('job_status', ['open', 'filled', 'cancelled', 'completed']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'completed', 'failed', 'refunded']);
export const contentTypeEnum = pgEnum('content_type', ['video', 'article', 'workshop', 'course']);
export const messageTypeEnum = pgEnum('message_type', ['text', 'system']);

// Users table
export const users = pgTable('users', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').notNull().unique(),
  password: text('password'),
  displayName: text('display_name'),
  profileImage: text('profile_image'),
  roles: jsonb('roles').$type<string[]>().notNull().default([]),
  currentRole: userRoleEnum('current_role'),
  isVerified: boolean('is_verified').notNull().default(false),
  googleId: text('google_id'),
  provider: text('provider').notNull().default('email'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// User profiles tables
export const hubProfiles = pgTable('hub_profiles', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  businessName: text('business_name').notNull(),
  businessType: text('business_type').notNull(),
  address: jsonb('address').$type<{
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  }>().notNull(),
  operatingHours: jsonb('operating_hours').$type<Record<string, { open: string; close: string }>>(),
  description: text('description'),
  website: text('website'),
  logoUrl: text('logo_url'),
  // Onboarding fields
  phone: text('phone'),
  chairCapacity: text('chair_capacity'),
  vibeTags: jsonb('vibe_tags').$type<string[]>().default([]),
  abn: text('abn'),
  businessInsurance: text('business_insurance'),
  shopPhotos: jsonb('shop_photos').$type<string[]>().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const professionalProfiles = pgTable('professional_profiles', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  isVerified: boolean('is_verified').notNull().default(false),
  certifications: jsonb('certifications').$type<Array<{
    type: string;
    issuer: string;
    date: Date;
    documentUrl?: string;
  }>>().default([]),
  skills: jsonb('skills').$type<string[]>().notNull().default([]),
  experience: text('experience'),
  homeLocation: jsonb('home_location').$type<{
    city: string;
    state: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  }>(),
  isRoamingNomad: boolean('is_roaming_nomad').notNull().default(false),
  preferredRegions: jsonb('preferred_regions').$type<string[]>().default([]),
  rating: decimal('rating', { precision: 3, scale: 2 }),
  reviewCount: integer('review_count').notNull().default(0),
  // Onboarding fields
  abn: text('abn'),
  instagramLink: text('instagram_link'),
  insuranceDocument: text('insurance_document'),
  qualificationDocument: text('qualification_document'),
  stripeConnected: boolean('stripe_connected').default(false),
  phone: text('phone'),
  fullName: text('full_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const brandProfiles = pgTable('brand_profiles', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyName: text('company_name').notNull(),
  website: text('website'),
  description: text('description'),
  productCategories: jsonb('product_categories').$type<string[]>().default([]),
  logoUrl: text('logo_url'),
  socialPostsCount: integer('social_posts_count').notNull().default(0),
  // Onboarding fields
  contactName: text('contact_name'),
  phone: text('phone'),
  location: jsonb('location').$type<{
    city: string;
    state: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  }>(),
  businessType: text('business_type'),
  socialMediaLinks: jsonb('social_media_links').$type<{
    instagram?: string;
    facebook?: string;
    youtube?: string;
  }>().default({}),
  partnershipGoals: jsonb('partnership_goals').$type<string[]>().default([]),
  targetAudience: jsonb('target_audience').$type<string[]>().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const trainerProfiles = pgTable('trainer_profiles', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  qualifications: jsonb('qualifications').$type<string[]>().default([]),
  specializations: jsonb('specializations').$type<string[]>().default([]),
  yearsExperience: integer('years_experience'),
  trainingLocation: text('training_location'),
  credentials: jsonb('credentials').$type<string[]>().default([]),
  rating: decimal('rating', { precision: 3, scale: 2 }),
  reviewCount: integer('review_count').notNull().default(0),
  totalStudents: integer('total_students').notNull().default(0),
  // Onboarding fields
  companyName: text('company_name'),
  contactName: text('contact_name'),
  phone: text('phone'),
  location: jsonb('location').$type<{
    city: string;
    state: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  }>(),
  businessType: text('business_type'),
  socialMediaLinks: jsonb('social_media_links').$type<{
    instagram?: string;
    facebook?: string;
    youtube?: string;
  }>().default({}),
  partnershipGoals: jsonb('partnership_goals').$type<string[]>().default([]),
  targetAudience: jsonb('target_audience').$type<string[]>().default([]),
  productCategories: jsonb('product_categories').$type<string[]>().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Jobs table
export const jobs = pgTable('jobs', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  hubId: varchar('hub_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  skillsRequired: jsonb('skills_required').$type<string[]>().notNull().default([]),
  payRate: decimal('pay_rate', { precision: 10, scale: 2 }).notNull(),
  payType: text('pay_type').notNull(),
  location: jsonb('location').$type<{
    city: string;
    state: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  }>().notNull(),
  date: timestamp('date', { withTimezone: true }).notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  status: jobStatusEnum('status').notNull().default('open'),
  selectedProfessionalId: varchar('selected_professional_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Applications table
export const applications = pgTable('applications', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  professionalId: varchar('professional_id').notNull().references(() => users.id),
  status: text('status').notNull().default('pending'),
  message: text('message'),
  appliedAt: timestamp('applied_at', { withTimezone: true }).notNull().defaultNow(),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
});

// Social posts table
export const socialPosts = pgTable('social_posts', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar('author_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  linkUrl: text('link_url'),
  postType: text('post_type').notNull(),
  eventDate: timestamp('event_date', { withTimezone: true }),
  discountCode: text('discount_code'),
  discountPercentage: decimal('discount_percentage', { precision: 5, scale: 2 }),
  validUntil: timestamp('valid_until', { withTimezone: true }),
  likes: integer('likes').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Comments table
export const comments = pgTable('comments', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar('post_id').notNull().references(() => socialPosts.id, { onDelete: 'cascade' }),
  authorId: varchar('author_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Training content table
export const trainingContent = pgTable('training_content', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar('trainer_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  contentType: contentTypeEnum('content_type').notNull(),
  videoUrl: text('video_url'),
  thumbnailUrl: text('thumbnail_url'),
  price: decimal('price', { precision: 10, scale: 2 }),
  duration: text('duration').notNull(),
  level: text('level').notNull(),
  category: text('category').notNull(),
  tags: jsonb('tags').$type<string[]>().default([]),
  isPaid: boolean('is_paid').notNull().default(false),
  purchaseCount: integer('purchase_count').notNull().default(0),
  rating: decimal('rating', { precision: 3, scale: 2 }),
  reviewCount: integer('review_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Purchases table
export const purchases = pgTable('purchases', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id').notNull().references(() => users.id),
  contentId: varchar('content_id').notNull().references(() => trainingContent.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('pending'),
  purchasedAt: timestamp('purchased_at', { withTimezone: true }).notNull().defaultNow(),
  accessGranted: boolean('access_granted').notNull().default(false),
});

// Chat system
export const chats = pgTable('chats', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  participants: jsonb('participants').$type<string[]>().notNull(),
  participantNames: jsonb('participant_names').$type<Record<string, string>>().notNull(),
  participantRoles: jsonb('participant_roles').$type<Record<string, string>>().notNull(),
  lastMessage: text('last_message'),
  lastMessageSenderId: varchar('last_message_sender_id').references(() => users.id),
  lastMessageTimestamp: timestamp('last_message_timestamp', { withTimezone: true }),
  unreadCount: jsonb('unread_count').$type<Record<string, number>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable('messages', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  senderId: varchar('sender_id').notNull().references(() => users.id),
  receiverId: varchar('receiver_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  messageType: messageTypeEnum('message_type').notNull().default('text'),
  isRead: boolean('is_read').notNull().default(false),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  hubProfile: many(hubProfiles),
  professionalProfile: many(professionalProfiles),
  brandProfile: many(brandProfiles),
  trainerProfile: many(trainerProfiles),
  jobs: many(jobs),
  applications: many(applications),
  socialPosts: many(socialPosts),
  comments: many(comments),
  trainingContent: many(trainingContent),
  purchases: many(purchases),
  sentMessages: many(messages, { relationName: 'sender' }),
  receivedMessages: many(messages, { relationName: 'receiver' }),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  hub: one(users, { fields: [jobs.hubId], references: [users.id] }),
  selectedProfessional: one(users, { fields: [jobs.selectedProfessionalId], references: [users.id] }),
  applications: many(applications),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  job: one(jobs, { fields: [applications.jobId], references: [jobs.id] }),
  professional: one(users, { fields: [applications.professionalId], references: [users.id] }),
}));

export const socialPostsRelations = relations(socialPosts, ({ one, many }) => ({
  author: one(users, { fields: [socialPosts.authorId], references: [users.id] }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(socialPosts, { fields: [comments.postId], references: [socialPosts.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}));

export const trainingContentRelations = relations(trainingContent, ({ one, many }) => ({
  trainer: one(users, { fields: [trainingContent.trainerId], references: [users.id] }),
  purchases: many(purchases),
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
  user: one(users, { fields: [purchases.userId], references: [users.id] }),
  content: one(trainingContent, { fields: [purchases.contentId], references: [trainingContent.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, { fields: [messages.chatId], references: [chats.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id], relationName: 'sender' }),
  receiver: one(users, { fields: [messages.receiverId], references: [users.id], relationName: 'receiver' }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type SocialPost = typeof socialPosts.$inferSelect;
export type NewSocialPost = typeof socialPosts.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type TrainingContent = typeof trainingContent.$inferSelect;
export type NewTrainingContent = typeof trainingContent.$inferInsert;
export type Purchase = typeof purchases.$inferSelect;
export type NewPurchase = typeof purchases.$inferInsert;
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
