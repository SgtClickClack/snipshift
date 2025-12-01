/**
 * Shifts Repository
 * 
 * Encapsulates database queries for shifts with pagination and filtering
 */

import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { shifts } from '../db/schema.js';
import { getDb } from '../db/index.js';


export interface ShiftFilters {
  employerId?: string;
  status?: 'open' | 'filled' | 'completed';
  limit?: number;
  offset?: number;
}

export interface PaginatedShifts {
  data: typeof shifts.$inferSelect[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Get paginated list of shifts with optional filters
 */
export async function getShifts(filters: ShiftFilters = {}): Promise<PaginatedShifts | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const { 
    employerId, 
    status, 
    limit = 50, 
    offset = 0,
  } = filters;

  const conditions = [];
  
  if (employerId) {
    conditions.push(eq(shifts.employerId, employerId));
  }
  if (status) {
    conditions.push(eq(shifts.status, status));
  }

  // Build query
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(shifts)
    .where(whereClause);
  
  const total = Number(countResult[0]?.count || 0);

  // Get paginated data
  let query = db
    .select()
    .from(shifts)
    .where(whereClause)
    .orderBy(desc(shifts.createdAt))
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
 * Get a single shift by ID
 */
export async function getShiftById(id: string): Promise<typeof shifts.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [shift] = await db
    .select()
    .from(shifts)
    .where(eq(shifts.id, id))
    .limit(1);

  return shift || null;
}

/**
 * Create a new shift
 */
export async function createShift(shiftData: {
  employerId: string;
  title: string;
  description: string;
  startTime: Date | string;
  endTime: Date | string;
  hourlyRate: string;
  status?: 'open' | 'filled' | 'completed';
  location?: string;
}): Promise<typeof shifts.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [newShift] = await db
    .insert(shifts)
    .values({
      employerId: shiftData.employerId,
      title: shiftData.title,
      description: shiftData.description,
      startTime: typeof shiftData.startTime === 'string' ? new Date(shiftData.startTime) : shiftData.startTime,
      endTime: typeof shiftData.endTime === 'string' ? new Date(shiftData.endTime) : shiftData.endTime,
      hourlyRate: shiftData.hourlyRate,
      status: shiftData.status || 'open',
      location: shiftData.location || null,
    })
    .returning();

  return newShift || null;
}

/**
 * Update a shift by ID
 */
export async function updateShift(
  id: string,
  updates: {
    title?: string;
    description?: string;
    startTime?: Date | string;
    endTime?: Date | string;
    hourlyRate?: string;
    status?: 'open' | 'filled' | 'completed';
    location?: string;
  }
): Promise<typeof shifts.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const updateData: any = {
    ...updates,
    updatedAt: sql`NOW()`,
  };

  // Convert string dates to Date objects if needed
  if (updates.startTime && typeof updates.startTime === 'string') {
    updateData.startTime = new Date(updates.startTime);
  }
  if (updates.endTime && typeof updates.endTime === 'string') {
    updateData.endTime = new Date(updates.endTime);
  }

  const [updatedShift] = await db
    .update(shifts)
    .set(updateData)
    .where(eq(shifts.id, id))
    .returning();

  return updatedShift || null;
}

/**
 * Delete a shift by ID
 */
export async function deleteShift(id: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  const result = await db
    .delete(shifts)
    .where(eq(shifts.id, id));

  return result.rowCount ? result.rowCount > 0 : false;
}

/**
 * Get shifts created by a specific employer
 */
export async function getShiftsByEmployer(employerId: string, status?: 'open' | 'filled' | 'completed'): Promise<typeof shifts.$inferSelect[]> {
  const db = getDb();
  if (!db) {
    return [];
  }

  const conditions = [eq(shifts.employerId, employerId)];
  if (status) {
    conditions.push(eq(shifts.status, status));
  }

  const result = await db
    .select()
    .from(shifts)
    .where(and(...conditions))
    .orderBy(desc(shifts.createdAt));

  return result;
}

