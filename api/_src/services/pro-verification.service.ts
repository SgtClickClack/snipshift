/**
 * Pro Verification Service
 * 
 * Handles automated verification logic for HospoGo professionals:
 * - RSA verification for alcohol service shifts
 * - Verification status management (pending_review -> verified)
 * - No-show tracking
 * - Top Rated badge assignment (5+ consecutive 5-star reviews)
 * - Rating warning notifications (when rating drops below 4.0)
 */

import { eq, and, sql, gte, desc } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { users, shifts, shiftReviews } from '../db/schema.js';
import * as notificationService from './notification.service.js';

// Constants for pro verification logic
const RATING_WARNING_THRESHOLD = 4.0;
const TOP_RATED_CONSECUTIVE_FIVE_STAR_THRESHOLD = 5;
const NO_SHOW_LOOKBACK_DAYS = 30;

/**
 * Check if a professional can work an alcohol service shift
 * Requires RSA certificate upload (rsaCertificateUrl or rsaCertUrl must be set)
 * 
 * @param userId - The professional's user ID
 * @returns Object with eligibility status and reason
 */
export async function canWorkAlcoholServiceShift(userId: string): Promise<{
  eligible: boolean;
  reason?: string;
  rsaVerified: boolean;
  rsaCertificateUploaded: boolean;
}> {
  const db = getDb();
  if (!db) {
    return { eligible: false, reason: 'Database not available', rsaVerified: false, rsaCertificateUploaded: false };
  }

  const [user] = await db
    .select({
      rsaVerified: users.rsaVerified,
      rsaCertUrl: users.rsaCertUrl,
      rsaCertificateUrl: users.rsaCertificateUrl,
      rsaExpiry: users.rsaExpiry,
      verificationStatus: users.verificationStatus,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    return { eligible: false, reason: 'User not found', rsaVerified: false, rsaCertificateUploaded: false };
  }

  // Check if account is suspended
  if ((user as any).verificationStatus === 'suspended') {
    return { 
      eligible: false, 
      reason: 'Account is suspended', 
      rsaVerified: user.rsaVerified ?? false, 
      rsaCertificateUploaded: false 
    };
  }

  // Check if account is active
  if (user.isActive === false) {
    return { 
      eligible: false, 
      reason: 'Account is not active', 
      rsaVerified: user.rsaVerified ?? false, 
      rsaCertificateUploaded: false 
    };
  }

  // Check for RSA certificate upload
  const rsaCertificateUrl = user.rsaCertUrl || user.rsaCertificateUrl;
  const rsaCertificateUploaded = !!rsaCertificateUrl;

  if (!rsaCertificateUploaded) {
    return { 
      eligible: false, 
      reason: 'RSA certificate photo must be uploaded to work Alcohol Service shifts', 
      rsaVerified: user.rsaVerified ?? false, 
      rsaCertificateUploaded: false 
    };
  }

  // Check RSA expiry if set
  if (user.rsaExpiry) {
    const expiryDate = new Date(user.rsaExpiry);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (expiryDate <= today) {
      return { 
        eligible: false, 
        reason: 'RSA certificate has expired. Please upload a valid certificate.', 
        rsaVerified: user.rsaVerified ?? false, 
        rsaCertificateUploaded: true 
      };
    }
  }

  return { 
    eligible: true, 
    rsaVerified: user.rsaVerified ?? false, 
    rsaCertificateUploaded: true 
  };
}

/**
 * Get verification status for a professional
 * Returns detailed verification info including eligibility for different shift types
 */
export async function getProVerificationStatus(userId: string): Promise<{
  verificationStatus: string;
  completedShiftCount: number;
  noShowCount: number;
  noShowsLast30Days: number;
  topRatedBadge: boolean;
  averageRating: number | null;
  reviewCount: number;
  consecutiveFiveStarCount: number;
  canWorkAlcoholShifts: boolean;
  rsaCertificateUploaded: boolean;
} | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [user] = await db
    .select({
      verificationStatus: users.verificationStatus,
      completedShiftCount: users.completedShiftCount,
      noShowCount: users.noShowCount,
      lastNoShowAt: users.lastNoShowAt,
      topRatedBadge: users.topRatedBadge,
      averageRating: users.averageRating,
      reviewCount: users.reviewCount,
      consecutiveFiveStarCount: users.consecutiveFiveStarCount,
      rsaCertUrl: users.rsaCertUrl,
      rsaCertificateUrl: users.rsaCertificateUrl,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    return null;
  }

  // Calculate no-shows in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - NO_SHOW_LOOKBACK_DAYS);

  const [noShowResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(shifts)
    .where(and(
      eq(shifts.assigneeId, userId),
      eq(shifts.attendanceStatus, 'no_show'),
      gte(shifts.updatedAt, thirtyDaysAgo)
    ));

  const noShowsLast30Days = Number(noShowResult?.count || 0);
  const rsaCertificateUploaded = !!(user.rsaCertUrl || user.rsaCertificateUrl);

  return {
    verificationStatus: (user as any).verificationStatus || 'pending_review',
    completedShiftCount: (user as any).completedShiftCount || 0,
    noShowCount: (user as any).noShowCount || 0,
    noShowsLast30Days,
    topRatedBadge: (user as any).topRatedBadge || false,
    averageRating: user.averageRating ? parseFloat(user.averageRating) : null,
    reviewCount: user.reviewCount ? parseInt(user.reviewCount, 10) : 0,
    consecutiveFiveStarCount: (user as any).consecutiveFiveStarCount || 0,
    canWorkAlcoholShifts: rsaCertificateUploaded,
    rsaCertificateUploaded,
  };
}

/**
 * Update verification status after a shift is completed
 * - Marks account as 'verified' after first successful shift completion
 * - Increments completed shift count
 */
export async function onShiftCompleted(userId: string, shiftId: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  const [user] = await db
    .select({
      verificationStatus: users.verificationStatus,
      completedShiftCount: users.completedShiftCount,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) return;

  const updates: any = {
    completedShiftCount: ((user as any).completedShiftCount || 0) + 1,
    updatedAt: new Date(),
  };

  // If this is the first completed shift, upgrade to 'verified' status
  if ((user as any).verificationStatus === 'pending_review') {
    updates.verificationStatus = 'verified';
    
    // Send congratulations notification
    await notificationService.createNotification({
      userId,
      type: 'application_status_change',
      title: 'Account Verified! 🎉',
      message: 'Congratulations! Your account is now verified after completing your first shift.',
      link: '/professional-dashboard',
    });
  }

  await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId));
}

/**
 * Record a no-show incident for a professional
 * Increments no-show count and records timestamp
 */
export async function onNoShow(userId: string, shiftId: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  const [user] = await db
    .select({
      noShowCount: users.noShowCount,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) return;

  await db
    .update(users)
    .set({
      noShowCount: ((user as any).noShowCount || 0) + 1,
      lastNoShowAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Send warning notification about no-show
  await notificationService.createNotification({
    userId,
    type: 'application_status_change',
    title: 'No-Show Recorded ⚠️',
    message: 'A no-show has been recorded for a recent shift. Multiple no-shows may affect your visibility to venues.',
    link: '/professional-dashboard',
  });
}

/**
 * Update pro status after receiving a new review
 * - Tracks consecutive 5-star reviews
 * - Awards/removes Top Rated badge
 * - Sends warning if rating drops below 4.0
 */
export async function onReviewReceived(
  userId: string, 
  rating: number, 
  shiftId: string
): Promise<void> {
  const db = getDb();
  if (!db) return;

  const [user] = await db
    .select({
      consecutiveFiveStarCount: users.consecutiveFiveStarCount,
      topRatedBadge: users.topRatedBadge,
      averageRating: users.averageRating,
      verificationStatus: users.verificationStatus,
      ratingWarningAt: users.ratingWarningAt,
      name: users.name,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) return;

  const updates: any = { updatedAt: new Date() };

  // Track consecutive 5-star reviews
  if (rating === 5) {
    const newConsecutiveCount = ((user as any).consecutiveFiveStarCount || 0) + 1;
    updates.consecutiveFiveStarCount = newConsecutiveCount;

    // Award Top Rated badge if threshold reached
    if (newConsecutiveCount >= TOP_RATED_CONSECUTIVE_FIVE_STAR_THRESHOLD && !(user as any).topRatedBadge) {
      updates.topRatedBadge = true;
      
      // Send badge award notification
      await notificationService.createNotification({
        userId,
        type: 'application_status_change',
        title: 'Top Rated Badge Earned! ⭐',
        message: `Congratulations ${user.name}! You've earned the Top Rated badge for ${newConsecutiveCount} consecutive 5-star reviews.`,
        link: '/professional-dashboard',
      });
    }
  } else {
    // Reset consecutive count on non-5-star review
    updates.consecutiveFiveStarCount = 0;
    
    // Note: We don't remove the badge on a single non-5-star review
    // The badge is a recognition of past achievement
  }

  // Check for rating warning threshold
  const currentAvgRating = user.averageRating ? parseFloat(user.averageRating) : null;
  
  if (currentAvgRating !== null && currentAvgRating < RATING_WARNING_THRESHOLD) {
    // Check if we've already sent a warning recently (within 7 days)
    const lastWarning = (user as any).ratingWarningAt ? new Date((user as any).ratingWarningAt) : null;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    if (!lastWarning || lastWarning < sevenDaysAgo) {
      // Update verification status to at_risk
      if ((user as any).verificationStatus === 'verified') {
        updates.verificationStatus = 'at_risk';
      }
      updates.ratingWarningAt = new Date();

      // Send warning notification
      await notificationService.createNotification({
        userId,
        type: 'application_status_change',
        title: 'Rating Alert ⚠️',
        message: `Your average rating has dropped below ${RATING_WARNING_THRESHOLD.toFixed(1)}. Please focus on delivering excellent service to maintain your account standing.`,
        link: '/professional-dashboard',
      });
    }
  } else if (currentAvgRating !== null && currentAvgRating >= RATING_WARNING_THRESHOLD) {
    // If rating is back above threshold and was at_risk, restore to verified
    if ((user as any).verificationStatus === 'at_risk') {
      updates.verificationStatus = 'verified';
      
      await notificationService.createNotification({
        userId,
        type: 'application_status_change',
        title: 'Rating Restored! ✅',
        message: 'Great work! Your rating is back above the threshold and your account is in good standing.',
        link: '/professional-dashboard',
      });
    }
  }

  await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId));
}

/**
 * Check if a professional meets the requirements for a shift
 * Used when applying to or being assigned to a shift
 */
export async function canProWorkShift(
  userId: string, 
  shiftId: string
): Promise<{
  eligible: boolean;
  reasons: string[];
}> {
  const db = getDb();
  if (!db) {
    return { eligible: false, reasons: ['Database not available'] };
  }

  const reasons: string[] = [];

  // Get user data
  const [user] = await db
    .select({
      verificationStatus: users.verificationStatus,
      isActive: users.isActive,
      rsaCertUrl: users.rsaCertUrl,
      rsaCertificateUrl: users.rsaCertificateUrl,
      rsaExpiry: users.rsaExpiry,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    return { eligible: false, reasons: ['User not found'] };
  }

  // Check if account is suspended
  if ((user as any).verificationStatus === 'suspended') {
    reasons.push('Account is suspended');
  }

  // Check if account is active
  if (user.isActive === false) {
    reasons.push('Account is not active');
  }

  // Get shift data
  const [shift] = await db
    .select({
      rsaRequired: shifts.rsaRequired,
      title: shifts.title,
    })
    .from(shifts)
    .where(eq(shifts.id, shiftId));

  if (!shift) {
    return { eligible: false, reasons: ['Shift not found'] };
  }

  // Check RSA requirement for alcohol service shifts
  if (shift.rsaRequired) {
    const rsaCertificateUrl = user.rsaCertUrl || user.rsaCertificateUrl;
    
    if (!rsaCertificateUrl) {
      reasons.push('RSA certificate photo required for Alcohol Service shifts');
    } else if (user.rsaExpiry) {
      const expiryDate = new Date(user.rsaExpiry);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (expiryDate <= today) {
        reasons.push('RSA certificate has expired');
      }
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

/**
 * Search for professionals with prioritization based on rating and reliability
 * Prioritizes:
 * 1. Pros with 4.8+ rating AND zero no-shows in last 30 days
 * 2. Pros with Top Rated badge
 * 3. All other verified pros
 */
export async function searchProsWithPrioritization(params: {
  search?: string;
  rsaRequired?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{
  data: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    averageRating: number | null;
    reviewCount: number;
    location: string | null;
    verificationStatus: string;
    topRatedBadge: boolean;
    completedShiftCount: number;
    noShowsLast30Days: number;
    priorityScore: number;
  }>;
  total: number;
}> {
  const db = getDb();
  if (!db) {
    return { data: [], total: 0 };
  }

  const { search, rsaRequired, limit = 50, offset = 0 } = params;
  const searchTerm = (search ?? '').trim();

  // Calculate the date 30 days ago for no-show check
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - NO_SHOW_LOOKBACK_DAYS);

  // Build search conditions
  let whereConditions = sql`
    (${users.role} = 'professional' OR 'professional' = ANY(${users.roles}))
    AND (${users.isActive} IS NULL OR ${users.isActive} = true)
    AND ${users.verificationStatus} != 'suspended'
  `;

  if (searchTerm) {
    whereConditions = sql`${whereConditions} AND (
      ${users.name} ILIKE ${'%' + searchTerm + '%'} 
      OR ${users.email} ILIKE ${'%' + searchTerm + '%'}
    )`;
  }

  if (rsaRequired) {
    whereConditions = sql`${whereConditions} AND (
      ${users.rsaCertUrl} IS NOT NULL OR ${users.rsaCertificateUrl} IS NOT NULL
    )`;
  }

  // Calculate priority score:
  // - 100 points: 4.8+ rating AND zero no-shows in 30 days
  // - 50 points: Top Rated badge
  // - 10 points: Verified status
  const priorityScoreSql = sql<number>`
    CASE 
      WHEN ${users.averageRating}::numeric >= 4.8 
           AND NOT EXISTS (
             SELECT 1 FROM shifts 
             WHERE shifts.assignee_id = ${users.id}
               AND shifts.attendance_status = 'no_show'
               AND shifts.updated_at >= ${thirtyDaysAgo}
           )
      THEN 100
      ELSE 0
    END
    + CASE WHEN ${users.topRatedBadge} = true THEN 50 ELSE 0 END
    + CASE WHEN ${users.verificationStatus} = 'verified' THEN 10 ELSE 0 END
  `;

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(users)
    .where(whereConditions);

  const total = Number(countResult?.count || 0);

  // Get prioritized results
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      averageRating: users.averageRating,
      reviewCount: users.reviewCount,
      location: users.location,
      verificationStatus: users.verificationStatus,
      topRatedBadge: users.topRatedBadge,
      completedShiftCount: users.completedShiftCount,
      priorityScore: priorityScoreSql,
    })
    .from(users)
    .where(whereConditions)
    .orderBy(desc(priorityScoreSql), desc(users.averageRating))
    .limit(limit)
    .offset(offset);

  // Calculate no-shows in last 30 days for each result
  const resultsWithNoShows = await Promise.all(
    rows.map(async (row) => {
      const [noShowResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(shifts)
        .where(and(
          eq(shifts.assigneeId, row.id),
          eq(shifts.attendanceStatus, 'no_show'),
          gte(shifts.updatedAt, thirtyDaysAgo)
        ));

      return {
        id: row.id,
        name: row.name,
        email: row.email,
        avatarUrl: row.avatarUrl ?? null,
        averageRating: row.averageRating ? parseFloat(row.averageRating) : null,
        reviewCount: row.reviewCount ? parseInt(row.reviewCount, 10) : 0,
        location: row.location ?? null,
        verificationStatus: (row as any).verificationStatus || 'pending_review',
        topRatedBadge: (row as any).topRatedBadge || false,
        completedShiftCount: (row as any).completedShiftCount || 0,
        noShowsLast30Days: Number(noShowResult?.count || 0),
        priorityScore: Number(row.priorityScore || 0),
      };
    })
  );

  return {
    data: resultsWithNoShows,
    total,
  };
}

/**
 * Batch update top-rated badges based on review history
 * This can be run periodically to ensure consistency
 */
export async function syncTopRatedBadges(): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  // Find professionals with 5+ consecutive 5-star reviews who don't have the badge
  const query = sql`
    UPDATE users
    SET top_rated_badge = true, updated_at = NOW()
    WHERE role = 'professional'
      AND top_rated_badge = false
      AND consecutive_five_star_count >= ${TOP_RATED_CONSECUTIVE_FIVE_STAR_THRESHOLD}
  `;

  const result = await db.execute(query);
  return (result as any)?.rowCount ?? 0;
}

/**
 * Check and update verification status for professionals with low ratings
 * This can be run periodically as a maintenance task
 */
export async function syncVerificationStatusForLowRatings(): Promise<{
  usersWarned: number;
  usersRestored: number;
}> {
  const db = getDb();
  if (!db) return { usersWarned: 0, usersRestored: 0 };

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Find verified users with low ratings who haven't been warned recently
  const atRiskQuery = sql`
    UPDATE users
    SET 
      verification_status = 'at_risk',
      rating_warning_at = NOW(),
      updated_at = NOW()
    WHERE role = 'professional'
      AND verification_status = 'verified'
      AND average_rating IS NOT NULL
      AND average_rating::numeric < ${RATING_WARNING_THRESHOLD}
      AND (rating_warning_at IS NULL OR rating_warning_at < ${sevenDaysAgo})
  `;

  const atRiskResult = await db.execute(atRiskQuery);
  const usersWarned = (atRiskResult as any)?.rowCount ?? 0;

  // Find at_risk users who have improved their ratings
  const restoredQuery = sql`
    UPDATE users
    SET 
      verification_status = 'verified',
      updated_at = NOW()
    WHERE role = 'professional'
      AND verification_status = 'at_risk'
      AND average_rating IS NOT NULL
      AND average_rating::numeric >= ${RATING_WARNING_THRESHOLD}
  `;

  const restoredResult = await db.execute(restoredQuery);
  const usersRestored = (restoredResult as any)?.rowCount ?? 0;

  return { usersWarned, usersRestored };
}
