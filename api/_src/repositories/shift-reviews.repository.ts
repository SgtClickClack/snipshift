/**
 * Shift Reviews Repository
 * 
 * Encapsulates database queries for shift reviews
 */

import { eq, and, sql } from 'drizzle-orm';
import { shiftReviews, users, shifts } from '../db/schema.js';
import { getDb } from '../db/index.js';

/**
 * Create a new shift review
 */
export async function createShiftReview(
  data: {
    shiftId: string;
    reviewerId: string;
    revieweeId: string;
    type: 'SHOP_REVIEWING_BARBER' | 'BARBER_REVIEWING_SHOP';
    rating: number; // 1-5
    comment?: string;
  }
): Promise<typeof shiftReviews.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  // Validate rating is between 1 and 5
  if (data.rating < 1 || data.rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  const [newReview] = await db
    .insert(shiftReviews)
    .values({
      shiftId: data.shiftId,
      reviewerId: data.reviewerId,
      revieweeId: data.revieweeId,
      type: data.type,
      rating: data.rating.toString(),
      comment: data.comment || null,
      isAnonymous: true, // Start as anonymous (double-blind)
    })
    .returning();

  return newReview || null;
}

/**
 * Get all reviews for a user (with reviewer details)
 * Respects anonymity: only shows reviewer details if review is not anonymous
 */
export async function getShiftReviewsForUser(
  userId: string,
  options?: { includeAnonymous?: boolean }
): Promise<Array<{
  id: string;
  shiftId: string;
  reviewerId: string;
  revieweeId: string;
  type: string;
  rating: string;
  comment: string | null;
  isAnonymous: boolean;
  revealedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  reviewer: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  shift: {
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
      id: shiftReviews.id,
      shiftId: shiftReviews.shiftId,
      reviewerId: shiftReviews.reviewerId,
      revieweeId: shiftReviews.revieweeId,
      type: shiftReviews.type,
      rating: shiftReviews.rating,
      comment: shiftReviews.comment,
      isAnonymous: shiftReviews.isAnonymous,
      revealedAt: shiftReviews.revealedAt,
      createdAt: shiftReviews.createdAt,
      updatedAt: shiftReviews.updatedAt,
      reviewer: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
      shift: {
        id: shifts.id,
        title: shifts.title,
      },
    })
    .from(shiftReviews)
    .leftJoin(users, eq(shiftReviews.reviewerId, users.id))
    .innerJoin(shifts, eq(shiftReviews.shiftId, shifts.id))
    .where(eq(shiftReviews.revieweeId, userId))
    .orderBy(sql`${shiftReviews.createdAt} DESC`);

  // Filter out anonymous reviews if requested, or mask reviewer info for anonymous reviews
  return result.map((row) => {
    if (row.isAnonymous && !options?.includeAnonymous) {
      // Mask reviewer info for anonymous reviews
      return {
        ...row,
        reviewer: null, // Don't reveal reviewer identity
      };
    }
    return row;
  });
}

/**
 * Check if a user has already reviewed a shift with a specific type
 */
export async function hasUserReviewedShift(
  shiftId: string, 
  reviewerId: string, 
  type: 'SHOP_REVIEWING_BARBER' | 'BARBER_REVIEWING_SHOP'
): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  const result = await db
    .select()
    .from(shiftReviews)
    .where(and(
      eq(shiftReviews.shiftId, shiftId),
      eq(shiftReviews.reviewerId, reviewerId),
      eq(shiftReviews.type, type)
    ))
    .limit(1);

  return result.length > 0;
}

/**
 * Get reviews for a specific shift
 */
export async function getReviewsForShift(shiftId: string): Promise<Array<typeof shiftReviews.$inferSelect>> {
  const db = getDb();
  if (!db) {
    return [];
  }

  const result = await db
    .select()
    .from(shiftReviews)
    .where(eq(shiftReviews.shiftId, shiftId));

  return result;
}

/**
 * Check if both parties have reviewed a shift
 */
export async function haveBothPartiesReviewed(shiftId: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  // Get shift to determine parties
  const { shifts } = await import('../db/schema.js');
  const [shift] = await db
    .select()
    .from(shifts)
    .where(eq(shifts.id, shiftId))
    .limit(1);

  if (!shift || !shift.assigneeId || !shift.employerId) {
    return false;
  }

  // Check if shop has reviewed barber
  const shopReview = await db
    .select()
    .from(shiftReviews)
    .where(
      and(
        eq(shiftReviews.shiftId, shiftId),
        eq(shiftReviews.reviewerId, shift.employerId),
        eq(shiftReviews.type, 'SHOP_REVIEWING_BARBER')
      )
    )
    .limit(1);

  // Check if barber has reviewed shop
  const barberReview = await db
    .select()
    .from(shiftReviews)
    .where(
      and(
        eq(shiftReviews.shiftId, shiftId),
        eq(shiftReviews.reviewerId, shift.assigneeId),
        eq(shiftReviews.type, 'BARBER_REVIEWING_SHOP')
      )
    )
    .limit(1);

  return shopReview.length > 0 && barberReview.length > 0;
}

/**
 * Reveal anonymous reviews for a shift (lift anonymity)
 */
export async function revealReviewsForShift(shiftId: string): Promise<void> {
  const db = getDb();
  if (!db) {
    return;
  }

  const now = new Date();
  await db
    .update(shiftReviews)
    .set({
      isAnonymous: false,
      revealedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(shiftReviews.shiftId, shiftId),
        eq(shiftReviews.isAnonymous, true)
      )
    );
}

/**
 * Recalculate and update user's average rating and review count
 * This includes both job reviews and shift reviews
 */
export async function updateUserRating(userId: string): Promise<{ averageRating: number; reviewCount: number } | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  // Calculate average rating and count from shift reviews
  const shiftReviewsResult = await db
    .select({
      averageRating: sql<number>`COALESCE(AVG(${shiftReviews.rating}::numeric), 0)`,
      reviewCount: sql<number>`COUNT(*)`,
    })
    .from(shiftReviews)
    .where(eq(shiftReviews.revieweeId, userId));

  // Get job reviews (from existing reviews table)
  const { reviews } = await import('../db/schema.js');
  const jobReviewsResult = await db
    .select({
      averageRating: sql<number>`COALESCE(AVG(${reviews.rating}::numeric), 0)`,
      reviewCount: sql<number>`COUNT(*)`,
    })
    .from(reviews)
    .where(eq(reviews.revieweeId, userId));

  // Combine both review types
  const shiftAvg = shiftReviewsResult[0] ? parseFloat(shiftReviewsResult[0].averageRating.toString()) : 0;
  const shiftCount = shiftReviewsResult[0] ? parseInt(shiftReviewsResult[0].reviewCount.toString(), 10) : 0;
  
  const jobAvg = jobReviewsResult[0] ? parseFloat(jobReviewsResult[0].averageRating.toString()) : 0;
  const jobCount = jobReviewsResult[0] ? parseInt(jobReviewsResult[0].reviewCount.toString(), 10) : 0;

  // Calculate weighted average
  const totalCount = shiftCount + jobCount;
  let averageRating = 0;
  
  if (totalCount > 0) {
    const shiftTotal = shiftAvg * shiftCount;
    const jobTotal = jobAvg * jobCount;
    averageRating = (shiftTotal + jobTotal) / totalCount;
  }

  // Update user record
  const { users } = await import('../db/schema.js');
  await db
    .update(users)
    .set({
      averageRating: averageRating > 0 ? averageRating.toFixed(2) : null,
      reviewCount: totalCount.toString(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return {
    averageRating,
    reviewCount: totalCount,
  };
}
