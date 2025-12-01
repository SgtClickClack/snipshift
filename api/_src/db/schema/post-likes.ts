import { pgTable, uuid, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { posts } from './posts.js';

/**
 * Post Likes table
 * Stores user likes on community/brand posts
 */
export const postLikes = pgTable('post_likes', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  postIdIdx: index('post_likes_post_id_idx').on(table.postId),
  userIdIdx: index('post_likes_user_id_idx').on(table.userId),
  postUserUnique: unique('post_likes_post_user_unique').on(table.postId, table.userId),
}));


