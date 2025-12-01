import { eq, and, desc, sql } from 'drizzle-orm';
import { posts, postLikes } from '../db/schema.js';
import { getDb } from '../db/index.js';


export interface PostFilters {
  type?: 'community' | 'brand';
  authorId?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedPosts {
  data: typeof posts.$inferSelect[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Get paginated list of posts with optional filters
 */
export async function getPosts(filters: PostFilters = {}): Promise<PaginatedPosts | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const { 
    type, 
    authorId, 
    limit = 50, 
    offset = 0,
  } = filters;

  const conditions = [];
  
  if (type) {
    conditions.push(eq(posts.type, type));
  }
  if (authorId) {
    conditions.push(eq(posts.authorId, authorId));
  }

  // Build query
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(posts)
    .where(whereClause);
  
  const total = Number(countResult[0]?.count || 0);

  // Get paginated data
  const query = db
    .select()
    .from(posts)
    .where(whereClause)
    .orderBy(desc(posts.createdAt))
    .limit(limit)
    .offset(offset);

  const data = await query;

  return {
    data,
    total,
    limit,
    offset,
  };
}

/**
 * Get a single post by ID
 */
export async function getPostById(id: string): Promise<typeof posts.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [post] = await db
    .select()
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);

  return post || null;
}

/**
 * Create a new post
 */
export async function createPost(postData: {
  authorId: string;
  content: string;
  imageUrl?: string;
  type?: 'community' | 'brand';
}): Promise<typeof posts.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [newPost] = await db
    .insert(posts)
    .values({
      authorId: postData.authorId,
      content: postData.content,
      imageUrl: postData.imageUrl || null,
      type: postData.type || 'community',
    })
    .returning();

  return newPost || null;
}

/**
 * Update a post by ID
 */
export async function updatePost(
  id: string,
  updates: {
    content?: string;
    imageUrl?: string;
  }
): Promise<typeof posts.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const updateData: any = {
    ...updates,
    updatedAt: sql`NOW()`,
  };

  const [updatedPost] = await db
    .update(posts)
    .set(updateData)
    .where(eq(posts.id, id))
    .returning();

  return updatedPost || null;
}

/**
 * Delete a post by ID
 */
export async function deletePost(id: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  const result = await db
    .delete(posts)
    .where(eq(posts.id, id));

  return result.rowCount ? result.rowCount > 0 : false;
}

/**
 * Toggle like on a post
 * Returns true if liked, false if unliked
 */
export async function likePost(postId: string, userId: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  // Check if already liked
  const [existingLike] = await db
    .select()
    .from(postLikes)
    .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
    .limit(1);

  if (existingLike) {
    // Unlike
    await db
      .delete(postLikes)
      .where(eq(postLikes.id, existingLike.id));
    
    // Decrement likes count
    await db
      .update(posts)
      .set({ likesCount: sql`${posts.likesCount} - 1` })
      .where(eq(posts.id, postId));
      
    return false;
  } else {
    // Like
    await db
      .insert(postLikes)
      .values({
        postId,
        userId,
      });
    
    // Increment likes count
    await db
      .update(posts)
      .set({ likesCount: sql`${posts.likesCount} + 1` })
      .where(eq(posts.id, postId));
      
    return true;
  }
}

/**
 * Get all posts liked by a user (returns set of post IDs)
 */
export async function getUserLikedPosts(userId: string): Promise<Set<string>> {
  const db = getDb();
  if (!db) {
    return new Set();
  }

  const likedPosts = await db
    .select({ postId: postLikes.postId })
    .from(postLikes)
    .where(eq(postLikes.userId, userId));

  return new Set(likedPosts.map(lp => lp.postId));
}


