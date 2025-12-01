import { pgTable, uuid, varchar, text, decimal, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * Training level enum
 */
export const trainingLevelEnum = pgEnum('training_level', ['beginner', 'intermediate', 'advanced']);

/**
 * Training Modules table
 * Stores training content uploaded by trainers
 */
export const trainingModules = pgTable('training_modules', {
  id: uuid('id').defaultRandom().primaryKey(),
  trainerId: uuid('trainer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  videoUrl: varchar('video_url', { length: 512 }).notNull(),
  thumbnailUrl: varchar('thumbnail_url', { length: 512 }),
  price: decimal('price', { precision: 10, scale: 2 }).notNull().default('0'),
  duration: varchar('duration', { length: 50 }),
  level: trainingLevelEnum('level').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  trainerIdIdx: index('training_modules_trainer_id_idx').on(table.trainerId),
  levelIdx: index('training_modules_level_idx').on(table.level),
  categoryIdx: index('training_modules_category_idx').on(table.category),
  createdAtIdx: index('training_modules_created_at_idx').on(table.createdAt),
}));


