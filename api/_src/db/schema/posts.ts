import { pgTable, uuid, varchar, text, integer, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * Post type enum
 */
export const postTypeEnum = pgEnum('post_type', ['community', 'brand']);

/**
 * Posts table
 * Stores community and brand posts
 */
export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  imageUrl: varchar('image_url', { length: 512 }),
  type: postTypeEnum('type').notNull().default('community'),
  likesCount: integer('likes_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  authorIdIdx: index('posts_author_id_idx').on(table.authorId),
  typeIdx: index('posts_type_idx').on(table.type),
  createdAtIdx: index('posts_created_at_idx').on(table.createdAt),
}));


