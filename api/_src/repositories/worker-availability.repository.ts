/**
 * Worker Availability Repository
 * 
 * Handles database operations for worker availability preferences.
 */

import { getDb } from '../db/index.js';
import { workerAvailability } from '../db/schema.js';
import { eq, and, gte, lte, inArray, sql } from 'drizzle-orm';

export interface DayAvailability {
  date: string; // YYYY-MM-DD format
  morning: boolean;
  lunch: boolean;
  dinner: boolean;
}

export interface WorkerAvailabilityRecord {
  id: string;
  userId: string;
  date: string;
  morning: boolean;
  lunch: boolean;
  dinner: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get availability for a worker within a date range
 */
export async function getWorkerAvailability(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<WorkerAvailabilityRecord[]> {
  const db = getDb();
  if (!db) return [];

  try {
    let query = db
      .select()
      .from(workerAvailability)
      .where(eq(workerAvailability.userId, userId));

    // Apply date range filters if provided
    if (startDate && endDate) {
      query = db
        .select()
        .from(workerAvailability)
        .where(
          and(
            eq(workerAvailability.userId, userId),
            gte(workerAvailability.date, startDate),
            lte(workerAvailability.date, endDate)
          )
        );
    } else if (startDate) {
      query = db
        .select()
        .from(workerAvailability)
        .where(
          and(
            eq(workerAvailability.userId, userId),
            gte(workerAvailability.date, startDate)
          )
        );
    }

    const results = await query.orderBy(workerAvailability.date);
    
    return results.map((r) => ({
      id: r.id,
      userId: r.userId,
      date: r.date,
      morning: r.morning,
      lunch: r.lunch,
      dinner: r.dinner,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  } catch (error) {
    console.error('[getWorkerAvailability] Error:', error);
    return [];
  }
}

/**
 * Bulk upsert availability for a worker
 * Creates new records or updates existing ones for the specified dates
 */
export async function upsertWorkerAvailability(
  userId: string,
  availability: DayAvailability[]
): Promise<WorkerAvailabilityRecord[]> {
  const db = getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  if (!availability || availability.length === 0) {
    return [];
  }

  try {
    const now = new Date();
    
    // Prepare records for upsert
    const records = availability.map((a) => ({
      userId,
      date: a.date,
      morning: a.morning,
      lunch: a.lunch,
      dinner: a.dinner,
      updatedAt: now,
    }));

    // Use ON CONFLICT to upsert
    const results = await db
      .insert(workerAvailability)
      .values(records)
      .onConflictDoUpdate({
        target: [workerAvailability.userId, workerAvailability.date],
        set: {
          morning: sql`EXCLUDED.morning`,
          lunch: sql`EXCLUDED.lunch`,
          dinner: sql`EXCLUDED.dinner`,
          updatedAt: sql`EXCLUDED.updated_at`,
        },
      })
      .returning();

    return results.map((r) => ({
      id: r.id,
      userId: r.userId,
      date: r.date,
      morning: r.morning,
      lunch: r.lunch,
      dinner: r.dinner,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  } catch (error) {
    console.error('[upsertWorkerAvailability] Error:', error);
    throw error;
  }
}

/**
 * Find workers who are available for a specific date and time slot
 * Used by Smart Fill service to filter invitees
 */
export async function findAvailableWorkers(
  date: string,
  slot: 'morning' | 'lunch' | 'dinner',
  workerIds?: string[]
): Promise<string[]> {
  const db = getDb();
  if (!db) return [];

  try {
    // Build the slot condition dynamically
    const slotColumn = 
      slot === 'morning' ? workerAvailability.morning :
      slot === 'lunch' ? workerAvailability.lunch :
      workerAvailability.dinner;

    let conditions = and(
      eq(workerAvailability.date, date),
      eq(slotColumn, true)
    );

    // If specific worker IDs provided, filter to those
    if (workerIds && workerIds.length > 0) {
      conditions = and(
        conditions,
        inArray(workerAvailability.userId, workerIds)
      );
    }

    const results = await db
      .select({ userId: workerAvailability.userId })
      .from(workerAvailability)
      .where(conditions);

    return results.map((r) => r.userId);
  } catch (error) {
    console.error('[findAvailableWorkers] Error:', error);
    return [];
  }
}

/**
 * Delete availability records for a worker (optional cleanup)
 */
export async function deleteWorkerAvailability(
  userId: string,
  beforeDate?: string
): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  try {
    let conditions = eq(workerAvailability.userId, userId);
    
    if (beforeDate) {
      conditions = and(
        conditions,
        lte(workerAvailability.date, beforeDate)
      );
    }

    const result = await db
      .delete(workerAvailability)
      .where(conditions)
      .returning({ id: workerAvailability.id });

    return result.length;
  } catch (error) {
    console.error('[deleteWorkerAvailability] Error:', error);
    return 0;
  }
}

/**
 * Check if a specific worker is available for a date/slot
 */
export async function isWorkerAvailable(
  userId: string,
  date: string,
  slot: 'morning' | 'lunch' | 'dinner'
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  try {
    const slotColumn = 
      slot === 'morning' ? workerAvailability.morning :
      slot === 'lunch' ? workerAvailability.lunch :
      workerAvailability.dinner;

    const [result] = await db
      .select({ available: slotColumn })
      .from(workerAvailability)
      .where(
        and(
          eq(workerAvailability.userId, userId),
          eq(workerAvailability.date, date)
        )
      )
      .limit(1);

    return result?.available ?? false;
  } catch (error) {
    console.error('[isWorkerAvailable] Error:', error);
    return false;
  }
}
