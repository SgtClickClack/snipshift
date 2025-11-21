/**
 * Reviews Repository
 * 
 * Encapsulates database queries for reviews
 */

import { eq, and, sql } from 'drizzle-orm';
import { reviews, users, jobs } from '../db/schema';
import { getDb } from '../db';

/**
 * Create a new review
 */
export async function createReview(
  data: {
    reviewerId: string;
    revieweeId: string;
    jobId: string;
    rating: number; // 1-5
    comment?: string;
  }
): Promise<typeof reviews.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  // Validate rating is between 1 and 5
  if (data.rating < 1 || data.rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  const [newReview] = await db
    .insert(reviews)
    .values({
      reviewerId: data.reviewerId,
      revieweeId: data.revieweeId,
      jobId: data.jobId,
      rating: data.rating.toString(),
      comment: data.comment || null,
    })
    .returning();

  return newReview || null;
}

/**
 * Get all reviews for a user (with reviewer details)
 */
export async function getReviewsForUser(userId: string): Promise<Array<{
  id: string;
  reviewerId: string;
  revieweeId: string;
  jobId: string;
  rating: string;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
  reviewer: {
    id: string;
    name: string;
    email: string;
  };
  job: {
    id: string;
    title: string;
  };
}> | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const result = await db
    .select({
      id: reviews.id,
      reviewerId: reviews.reviewerId,
      revieweeId: reviews.revieweeId,
      jobId: reviews.jobId,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      updatedAt: reviews.updatedAt,
      reviewer: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
      job: {
        id: jobs.id,
        title: jobs.title,
      },
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.reviewerId, users.id))
    .innerJoin(jobs, eq(reviews.jobId, jobs.id))
    .where(eq(reviews.revieweeId, userId))
    .orderBy(sql`${reviews.createdAt} DESC`);

  return result;
}

/**
 * Check if a user has already reviewed a job
 */
export async function hasUserReviewedJob(jobId: string, reviewerId: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  const result = await db
    .select()
    .from(reviews)
    .where(and(
      eq(reviews.jobId, jobId),
      eq(reviews.reviewerId, reviewerId)
    ))
    .limit(1);

  return result.length > 0;
}

/**
 * Recalculate and update user's average rating and review count
 */
export async function updateUserRating(userId: string): Promise<{ averageRating: number; reviewCount: number } | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  // Calculate average rating and count
  const result = await db
    .select({
      averageRating: sql<number>`COALESCE(AVG(${reviews.rating}::numeric), 0)`,
      reviewCount: sql<number>`COUNT(*)`,
    })
    .from(reviews)
    .where(eq(reviews.revieweeId, userId));

  if (result.length === 0) {
    return null;
  }

  const avgRating = parseFloat(result[0].averageRating.toString());
  const count = parseInt(result[0].reviewCount.toString(), 10);

  // Update user record
  await db
    .update(users)
    .set({
      averageRating: avgRating > 0 ? avgRating.toFixed(2) : null,
      reviewCount: count.toString(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return {
    averageRating: avgRating,
    reviewCount: count,
  };
}

