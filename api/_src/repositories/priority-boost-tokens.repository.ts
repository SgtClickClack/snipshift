/**
 * Priority Boost Tokens Repository
 * 
 * Database operations for priority boost tokens
 */

import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { priorityBoostTokens, users, shifts } from '../db/schema.js';

export interface PriorityBoostToken {
  id: string;
  workerId: string;
  shiftId: string;
  grantedAt: Date;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePriorityBoostTokenInput {
  workerId: string;
  shiftId: string;
}

/**
 * Grant a priority boost token to a worker
 * Ensures only one active token per worker at a time
 * Tokens expire after 48 hours
 */
export async function grantPriorityBoostToken(
  input: CreatePriorityBoostTokenInput
): Promise<PriorityBoostToken | null> {
  const db = getDb();
  if (!db) {
    console.error('[PRIORITY_BOOST_TOKENS REPO] Database not available');
    return null;
  }

  try {
    // Check if worker already has an active token
    const existingActiveToken = await getActiveTokenForWorker(input.workerId);
    if (existingActiveToken) {
      // Deactivate the existing token
      await db
        .update(priorityBoostTokens)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(priorityBoostTokens.id, existingActiveToken.id));
    }

    // Calculate expiration time (48 hours from now)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours

    // Create new token
    const [newToken] = await db
      .insert(priorityBoostTokens)
      .values({
        workerId: input.workerId,
        shiftId: input.shiftId,
        grantedAt: now,
        expiresAt,
        isActive: true,
      })
      .returning();

    return newToken as PriorityBoostToken;
  } catch (error) {
    console.error('[PRIORITY_BOOST_TOKENS REPO] Error granting token:', error);
    return null;
  }
}

/**
 * Get active token for a worker
 */
export async function getActiveTokenForWorker(
  workerId: string
): Promise<PriorityBoostToken | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  try {
    const now = new Date();
    const [token] = await db
      .select()
      .from(priorityBoostTokens)
      .where(
        and(
          eq(priorityBoostTokens.workerId, workerId),
          eq(priorityBoostTokens.isActive, true),
          gte(priorityBoostTokens.expiresAt, now) // Not expired
        )
      )
      .orderBy(desc(priorityBoostTokens.grantedAt))
      .limit(1);

    return token as PriorityBoostToken | null;
  } catch (error) {
    console.error('[PRIORITY_BOOST_TOKENS REPO] Error getting active token:', error);
    return null;
  }
}

/**
 * Check if worker has an active priority boost token
 */
export async function hasActivePriorityBoost(workerId: string): Promise<boolean> {
  const token = await getActiveTokenForWorker(workerId);
  return token !== null;
}

/**
 * Get priority boost multiplier for a worker (1.0 = no boost, 1.1 = +10% boost)
 */
export async function getPriorityBoostMultiplier(workerId: string): Promise<number> {
  const hasBoost = await hasActivePriorityBoost(workerId);
  return hasBoost ? 1.1 : 1.0; // +10% boost
}

/**
 * Expire all tokens that have passed their expiration time
 * This should be run periodically (e.g., via cron job)
 */
export async function expireOldTokens(): Promise<number> {
  const db = getDb();
  if (!db) {
    return 0;
  }

  try {
    const now = new Date();
    const result = await db
      .update(priorityBoostTokens)
      .set({
        isActive: false,
        updatedAt: now,
      })
      .where(
        and(
          eq(priorityBoostTokens.isActive, true),
          lte(priorityBoostTokens.expiresAt, now)
        )
      )
      .returning();

    return result.length;
  } catch (error) {
    console.error('[PRIORITY_BOOST_TOKENS REPO] Error expiring tokens:', error);
    return 0;
  }
}

/**
 * Get token history for a worker (for display in profile)
 */
export async function getTokenHistoryForWorker(
  workerId: string,
  limit: number = 10
): Promise<PriorityBoostToken[]> {
  const db = getDb();
  if (!db) {
    return [];
  }

  try {
    const tokens = await db
      .select()
      .from(priorityBoostTokens)
      .where(eq(priorityBoostTokens.workerId, workerId))
      .orderBy(desc(priorityBoostTokens.grantedAt))
      .limit(limit);

    return tokens as PriorityBoostToken[];
  } catch (error) {
    console.error('[PRIORITY_BOOST_TOKENS REPO] Error getting token history:', error);
    return [];
  }
}

/**
 * Get active token with shift details for a worker
 */
export async function getActiveTokenWithDetails(
  workerId: string
): Promise<{
  token: PriorityBoostToken;
  shift: {
    id: string;
    title: string;
    startTime: Date;
  };
} | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  try {
    const now = new Date();
    const [result] = await db
      .select({
        token: priorityBoostTokens,
        shift: {
          id: shifts.id,
          title: shifts.title,
          startTime: shifts.startTime,
        },
      })
      .from(priorityBoostTokens)
      .innerJoin(shifts, eq(priorityBoostTokens.shiftId, shifts.id))
      .where(
        and(
          eq(priorityBoostTokens.workerId, workerId),
          eq(priorityBoostTokens.isActive, true),
          gte(priorityBoostTokens.expiresAt, now)
        )
      )
      .orderBy(desc(priorityBoostTokens.grantedAt))
      .limit(1);

    if (!result) {
      return null;
    }

    return {
      token: result.token as PriorityBoostToken,
      shift: result.shift,
    };
  } catch (error) {
    console.error('[PRIORITY_BOOST_TOKENS REPO] Error getting token with details:', error);
    return null;
  }
}
