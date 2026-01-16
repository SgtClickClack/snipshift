/**
 * Shift Applications Repository
 * 
 * Database operations for shift applications
 */

import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { shiftApplications, shifts, users } from '../db/schema.js';
import { count } from 'drizzle-orm';

export interface CreateShiftApplicationInput {
  shiftId: string;
  workerId: string;
  venueId: string;
  message?: string;
}

export interface ShiftApplication {
  id: string;
  shiftId: string;
  workerId: string;
  venueId: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a new shift application
 */
export async function createShiftApplication(
  input: CreateShiftApplicationInput
): Promise<ShiftApplication | null> {
  const db = getDb();
  if (!db) {
    console.error('[SHIFT_APPLICATIONS REPO] Database not available');
    return null;
  }

  try {
    const [newApplication] = await db
      .insert(shiftApplications)
      .values({
        shiftId: input.shiftId,
        workerId: input.workerId,
        venueId: input.venueId,
        message: input.message || null,
        status: 'pending',
      })
      .returning();

    return newApplication as ShiftApplication;
  } catch (error) {
    console.error('[SHIFT_APPLICATIONS REPO] Error creating shift application:', error);
    return null;
  }
}

/**
 * Check if a worker has already applied to a shift
 */
export async function hasWorkerApplied(
  shiftId: string,
  workerId: string
): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  try {
    const result = await db
      .select({ count: count() })
      .from(shiftApplications)
      .where(
        and(
          eq(shiftApplications.shiftId, shiftId),
          eq(shiftApplications.workerId, workerId)
        )
      )
      .limit(1);

    return (result[0]?.count || 0) > 0;
  } catch (error) {
    console.error('[SHIFT_APPLICATIONS REPO] Error checking application:', error);
    return false;
  }
}

/**
 * Get shift application by ID
 */
export async function getShiftApplicationById(
  id: string
): Promise<ShiftApplication | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  try {
    const [application] = await db
      .select()
      .from(shiftApplications)
      .where(eq(shiftApplications.id, id))
      .limit(1);

    return application as ShiftApplication | null;
  } catch (error) {
    console.error('[SHIFT_APPLICATIONS REPO] Error getting application:', error);
    return null;
  }
}

/**
 * Get all applications for a shift
 */
export async function getApplicationsForShift(
  shiftId: string
): Promise<ShiftApplication[]> {
  const db = getDb();
  if (!db) {
    return [];
  }

  try {
    const applications = await db
      .select()
      .from(shiftApplications)
      .where(eq(shiftApplications.shiftId, shiftId))
      .orderBy(shiftApplications.createdAt);

    return applications as ShiftApplication[];
  } catch (error) {
    console.error('[SHIFT_APPLICATIONS REPO] Error getting applications for shift:', error);
    return [];
  }
}

/**
 * Get all applications by a worker
 */
export async function getApplicationsByWorker(
  workerId: string
): Promise<ShiftApplication[]> {
  const db = getDb();
  if (!db) {
    return [];
  }

  try {
    const applications = await db
      .select()
      .from(shiftApplications)
      .where(eq(shiftApplications.workerId, workerId))
      .orderBy(shiftApplications.createdAt);

    return applications as ShiftApplication[];
  } catch (error) {
    console.error('[SHIFT_APPLICATIONS REPO] Error getting applications by worker:', error);
    return [];
  }
}

/**
 * Get all applications for a venue with worker and shift details
 */
export async function getApplicationsForVenue(
  venueId: string,
  filters?: { status?: 'pending' | 'accepted' | 'rejected' }
): Promise<Array<ShiftApplication & {
  worker: typeof users.$inferSelect | null;
  shift: typeof shifts.$inferSelect | null;
}>> {
  const db = getDb();
  if (!db) {
    return [];
  }

  try {
    const conditions = [eq(shiftApplications.venueId, venueId)];
    if (filters?.status) {
      conditions.push(eq(shiftApplications.status, filters.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db
      .select({
        application: shiftApplications,
        worker: users,
        shift: shifts,
      })
      .from(shiftApplications)
      .leftJoin(users, eq(shiftApplications.workerId, users.id))
      .leftJoin(shifts, eq(shiftApplications.shiftId, shifts.id))
      .where(whereClause)
      .orderBy(desc(shiftApplications.createdAt));

    return result.map((row) => ({
      ...row.application,
      worker: row.worker,
      shift: row.shift,
    })) as Array<ShiftApplication & {
      worker: typeof users.$inferSelect | null;
      shift: typeof shifts.$inferSelect | null;
    }>;
  } catch (error) {
    console.error('[SHIFT_APPLICATIONS REPO] Error getting applications for venue:', error);
    return [];
  }
}

/**
 * Update application status
 */
export async function updateApplicationStatus(
  id: string,
  status: 'pending' | 'accepted' | 'rejected'
): Promise<ShiftApplication | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  try {
    const [updatedApplication] = await db
      .update(shiftApplications)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(shiftApplications.id, id))
      .returning();

    return updatedApplication as ShiftApplication | null;
  } catch (error) {
    console.error('[SHIFT_APPLICATIONS REPO] Error updating application status:', error);
    return null;
  }
}
