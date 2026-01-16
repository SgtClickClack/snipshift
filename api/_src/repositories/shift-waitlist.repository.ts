/**
 * Shift Waitlist Repository
 * 
 * Database operations for shift waitlist entries
 */

import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { shiftWaitlist, shifts, users } from '../db/schema.js';
import { count } from 'drizzle-orm';

export interface CreateWaitlistEntryInput {
  shiftId: string;
  workerId: string;
}

export interface WaitlistEntry {
  id: string;
  shiftId: string;
  workerId: string;
  rank: number;
  status: 'active' | 'converted' | 'expired';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get active waitlist count for a shift
 */
export async function getWaitlistCount(shiftId: string): Promise<number> {
  const db = getDb();
  if (!db) {
    return 0;
  }

  try {
    const [result] = await db
      .select({ count: count() })
      .from(shiftWaitlist)
      .where(
        and(
          eq(shiftWaitlist.shiftId, shiftId),
          eq(shiftWaitlist.status, 'active')
        )
      );

    return Number(result?.count || 0);
  } catch (error) {
    console.error('[SHIFT_WAITLIST REPO] Error getting waitlist count:', error);
    return 0;
  }
}

/**
 * Check if worker is already on waitlist
 */
export async function isWorkerOnWaitlist(
  shiftId: string,
  workerId: string
): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  try {
    const [result] = await db
      .select({ count: count() })
      .from(shiftWaitlist)
      .where(
        and(
          eq(shiftWaitlist.shiftId, shiftId),
          eq(shiftWaitlist.workerId, workerId),
          eq(shiftWaitlist.status, 'active')
        )
      );

    return Number(result?.count || 0) > 0;
  } catch (error) {
    console.error('[SHIFT_WAITLIST REPO] Error checking waitlist:', error);
    return false;
  }
}

/**
 * Add worker to waitlist with rank based on reliability score
 * Rank is calculated by ordering workers by reliability score (descending)
 */
export async function addToWaitlist(
  input: CreateWaitlistEntryInput
): Promise<WaitlistEntry | null> {
  const db = getDb();
  if (!db) {
    console.error('[SHIFT_WAITLIST REPO] Database not available');
    return null;
  }

  try {
    // Check if already on waitlist
    const alreadyOnWaitlist = await isWorkerOnWaitlist(input.shiftId, input.workerId);
    if (alreadyOnWaitlist) {
      throw new Error('Worker is already on the waitlist');
    }

    // Check waitlist limit (max 5)
    const currentCount = await getWaitlistCount(input.shiftId);
    if (currentCount >= 5) {
      throw new Error('Waitlist is full (maximum 5 workers)');
    }

    // Get worker's reliability score for ranking
    const [worker] = await db
      .select({
        reliabilityScore: users.reliabilityScore,
      })
      .from(users)
      .where(eq(users.id, input.workerId))
      .limit(1);

    const workerReliability = worker?.reliabilityScore ?? 0;

    // Calculate rank: count workers with higher or equal reliability score
    const [rankResult] = await db
      .select({ count: count() })
      .from(shiftWaitlist)
      .innerJoin(users, eq(shiftWaitlist.workerId, users.id))
      .where(
        and(
          eq(shiftWaitlist.shiftId, input.shiftId),
          eq(shiftWaitlist.status, 'active'),
          sql`COALESCE(${users.reliabilityScore}, 0) >= ${workerReliability}`
        )
      );

    const rank = Number(rankResult?.count || 0) + 1;

    // Insert waitlist entry
    const [newEntry] = await db
      .insert(shiftWaitlist)
      .values({
        shiftId: input.shiftId,
        workerId: input.workerId,
        rank,
        status: 'active',
      })
      .returning();

    // Recalculate ranks for all active entries (in case of ties)
    await recalculateRanks(input.shiftId);

    return newEntry as WaitlistEntry;
  } catch (error: any) {
    console.error('[SHIFT_WAITLIST REPO] Error adding to waitlist:', error);
    throw error;
  }
}

/**
 * Remove worker from waitlist
 */
export async function removeFromWaitlist(
  shiftId: string,
  workerId: string
): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  try {
    await db
      .update(shiftWaitlist)
      .set({
        status: 'expired',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(shiftWaitlist.shiftId, shiftId),
          eq(shiftWaitlist.workerId, workerId),
          eq(shiftWaitlist.status, 'active')
        )
      );

    // Recalculate ranks
    await recalculateRanks(shiftId);

    return true;
  } catch (error) {
    console.error('[SHIFT_WAITLIST REPO] Error removing from waitlist:', error);
    return false;
  }
}

/**
 * Get top N waitlisted workers for a shift, ordered by rank (reliability score)
 */
export async function getTopWaitlistedWorkers(
  shiftId: string,
  limit: number = 3
): Promise<Array<{
  id: string;
  workerId: string;
  rank: number;
  worker: {
    id: string;
    name: string | null;
    email: string | null;
    reliabilityScore: number | null;
  };
}>> {
  const db = getDb();
  if (!db) {
    return [];
  }

  try {
    const entries = await db
      .select({
        id: shiftWaitlist.id,
        workerId: shiftWaitlist.workerId,
        rank: shiftWaitlist.rank,
        worker: {
          id: users.id,
          name: users.name,
          email: users.email,
          reliabilityScore: users.reliabilityScore,
        },
      })
      .from(shiftWaitlist)
      .innerJoin(users, eq(shiftWaitlist.workerId, users.id))
      .where(
        and(
          eq(shiftWaitlist.shiftId, shiftId),
          eq(shiftWaitlist.status, 'active')
        )
      )
      .orderBy(
        asc(shiftWaitlist.rank), // Lower rank = higher priority
        desc(users.reliabilityScore) // Tie-breaker: higher reliability score
      )
      .limit(limit);

    return entries;
  } catch (error) {
    console.error('[SHIFT_WAITLIST REPO] Error getting top waitlisted workers:', error);
    return [];
  }
}

/**
 * Mark waitlist entry as converted (worker was assigned)
 */
export async function markAsConverted(
  shiftId: string,
  workerId: string
): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  try {
    await db
      .update(shiftWaitlist)
      .set({
        status: 'converted',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(shiftWaitlist.shiftId, shiftId),
          eq(shiftWaitlist.workerId, workerId)
        )
      );

    // Mark all other active entries as expired
    await db
      .update(shiftWaitlist)
      .set({
        status: 'expired',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(shiftWaitlist.shiftId, shiftId),
          eq(shiftWaitlist.status, 'active'),
          sql`${shiftWaitlist.workerId} != ${workerId}`
        )
      );

    return true;
  } catch (error) {
    console.error('[SHIFT_WAITLIST REPO] Error marking as converted:', error);
    return false;
  }
}

/**
 * Get all waitlisted shifts for a worker
 */
export async function getWaitlistedShiftsForWorker(
  workerId: string
): Promise<Array<{
  id: string;
  shiftId: string;
  rank: number;
  shift: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    location: string | null;
    hourlyRate: string;
    status: string;
  };
}>> {
  const db = getDb();
  if (!db) {
    return [];
  }

  try {
    const entries = await db
      .select({
        id: shiftWaitlist.id,
        shiftId: shiftWaitlist.shiftId,
        rank: shiftWaitlist.rank,
        shift: {
          id: shifts.id,
          title: shifts.title,
          startTime: shifts.startTime,
          endTime: shifts.endTime,
          location: shifts.location,
          hourlyRate: shifts.hourlyRate,
          status: shifts.status,
        },
      })
      .from(shiftWaitlist)
      .innerJoin(shifts, eq(shiftWaitlist.shiftId, shifts.id))
      .where(
        and(
          eq(shiftWaitlist.workerId, workerId),
          eq(shiftWaitlist.status, 'active')
        )
      )
      .orderBy(asc(shiftWaitlist.rank));

    return entries;
  } catch (error) {
    console.error('[SHIFT_WAITLIST REPO] Error getting waitlisted shifts:', error);
    return [];
  }
}

/**
 * Recalculate ranks for all active waitlist entries for a shift
 * Ranks are based on reliability score (higher score = lower rank = higher priority)
 */
async function recalculateRanks(shiftId: string): Promise<void> {
  const db = getDb();
  if (!db) {
    return;
  }

  try {
    // Get all active entries with their reliability scores, ordered by score descending
    const entries = await db
      .select({
        id: shiftWaitlist.id,
        reliabilityScore: users.reliabilityScore,
      })
      .from(shiftWaitlist)
      .innerJoin(users, eq(shiftWaitlist.workerId, users.id))
      .where(
        and(
          eq(shiftWaitlist.shiftId, shiftId),
          eq(shiftWaitlist.status, 'active')
        )
      )
      .orderBy(
        desc(users.reliabilityScore), // Higher reliability = higher priority
        asc(shiftWaitlist.createdAt) // Tie-breaker: earlier join time
      );

    // Update ranks
    for (let i = 0; i < entries.length; i++) {
      await db
        .update(shiftWaitlist)
        .set({
          rank: i + 1,
          updatedAt: new Date(),
        })
        .where(eq(shiftWaitlist.id, entries[i].id));
    }
  } catch (error) {
    console.error('[SHIFT_WAITLIST REPO] Error recalculating ranks:', error);
  }
}
