/**
 * Shifts Repository
 * 
 * Encapsulates database queries for shifts with pagination and filtering
 */

import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { shifts } from '../db/schema.js';
import { getDb } from '../db/index.js';


export interface ShiftFilters {
  employerId?: string;
  assigneeId?: string;
  status?: 'draft' | 'pending' | 'invited' | 'open' | 'filled' | 'completed' | 'confirmed' | 'cancelled';
  startTimeAfter?: Date | string;
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
    assigneeId,
    status, 
    startTimeAfter,
    limit = 50, 
    offset = 0,
  } = filters;

  const conditions = [];
  
  if (employerId) {
    conditions.push(eq(shifts.employerId, employerId));
  }
  if (assigneeId) {
    conditions.push(eq(shifts.assigneeId, assigneeId));
  }
  if (status) {
    conditions.push(eq(shifts.status, status));
  }
  if (startTimeAfter) {
    const afterDate = typeof startTimeAfter === 'string' ? new Date(startTimeAfter) : startTimeAfter;
    conditions.push(gte(shifts.startTime, afterDate));
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
  status?: 'draft' | 'pending' | 'invited' | 'open' | 'filled' | 'completed' | 'confirmed' | 'cancelled';
  assigneeId?: string;
  location?: string;
  isRecurring?: boolean;
  parentShiftId?: string;
}): Promise<typeof shifts.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    console.error('[createShift] Database not available');
    return null;
  }

  try {
    const [newShift] = await db
      .insert(shifts)
      .values({
        employerId: shiftData.employerId,
        title: shiftData.title,
        description: shiftData.description,
        startTime: typeof shiftData.startTime === 'string' ? new Date(shiftData.startTime) : shiftData.startTime,
        endTime: typeof shiftData.endTime === 'string' ? new Date(shiftData.endTime) : shiftData.endTime,
        hourlyRate: shiftData.hourlyRate,
        status: shiftData.status || 'draft',
        assigneeId: shiftData.assigneeId || null,
        location: shiftData.location || null,
        isRecurring: shiftData.isRecurring || false,
        parentShiftId: shiftData.parentShiftId || null,
      })
      .returning();

    return newShift || null;
  } catch (error: any) {
    console.error('[createShift] Database error:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      constraint: error?.constraint,
      data: shiftData,
    });
    throw error; // Re-throw to be caught by error handler
  }
}

/**
 * Create multiple recurring shifts in a transaction
 * @param parentShiftData - Data for the parent shift (first in series)
 * @param recurringShiftsData - Array of shift data for recurring instances
 * @returns Array of created shifts (parent first, then children)
 */
export async function createRecurringShifts(
  parentShiftData: {
    employerId: string;
    title: string;
    description: string;
    startTime: Date | string;
    endTime: Date | string;
    hourlyRate: string;
    status?: 'draft' | 'pending' | 'invited' | 'open' | 'filled' | 'completed' | 'confirmed' | 'cancelled';
    location?: string;
  },
  recurringShiftsData: Array<{
    startTime: Date | string;
    endTime: Date | string;
  }>
): Promise<typeof shifts.$inferSelect[]> {
  const db = getDb();
  if (!db) {
    console.error('[createRecurringShifts] Database not available');
    throw new Error('Database not available');
  }

  try {
    return await db.transaction(async (tx) => {
      // Create parent shift first
      const [parentShift] = await tx
        .insert(shifts)
        .values({
          employerId: parentShiftData.employerId,
          title: parentShiftData.title,
          description: parentShiftData.description,
          startTime: typeof parentShiftData.startTime === 'string' ? new Date(parentShiftData.startTime) : parentShiftData.startTime,
          endTime: typeof parentShiftData.endTime === 'string' ? new Date(parentShiftData.endTime) : parentShiftData.endTime,
          hourlyRate: parentShiftData.hourlyRate,
          status: parentShiftData.status || 'draft',
          location: parentShiftData.location || null,
          isRecurring: true,
          parentShiftId: null, // Parent has no parent
        })
        .returning();

      if (!parentShift) {
        throw new Error('Failed to create parent shift');
      }

      // Create child shifts
      const childShifts = await Promise.all(
        recurringShiftsData.map((childData) =>
          tx
            .insert(shifts)
            .values({
              employerId: parentShiftData.employerId,
              title: parentShiftData.title,
              description: parentShiftData.description,
              startTime: typeof childData.startTime === 'string' ? new Date(childData.startTime) : childData.startTime,
              endTime: typeof childData.endTime === 'string' ? new Date(childData.endTime) : childData.endTime,
              hourlyRate: parentShiftData.hourlyRate,
              status: parentShiftData.status || 'draft',
              location: parentShiftData.location || null,
              isRecurring: true,
              parentShiftId: parentShift.id,
            })
            .returning()
        )
      );

      // Flatten the results (each insert returns an array with one element)
      const allChildShifts = childShifts.map(([shift]) => shift).filter(Boolean);

      return [parentShift, ...allChildShifts];
    });
  } catch (error: any) {
    console.error('[createRecurringShifts] Database error:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      constraint: error?.constraint,
    });
    throw error;
  }
}

/**
 * Create multiple shifts in a batch (transaction)
 * @param shiftsData - Array of shift data to create
 * @returns Array of created shifts
 */
export async function createBatchShifts(
  shiftsData: Array<{
    employerId: string;
    title: string;
    description: string;
    startTime: Date | string;
    endTime: Date | string;
    hourlyRate: string;
    status?: 'draft' | 'pending' | 'invited' | 'open' | 'filled' | 'completed' | 'confirmed' | 'cancelled';
    location?: string;
    assigneeId?: string;
  }>
): Promise<typeof shifts.$inferSelect[]> {
  const db = getDb();
  if (!db) {
    console.error('[createBatchShifts] Database not available');
    throw new Error('Database not available');
  }

  if (shiftsData.length === 0) {
    return [];
  }

  try {
    return await db.transaction(async (tx) => {
      const createdShifts = await Promise.all(
        shiftsData.map((shiftData) =>
          tx
            .insert(shifts)
            .values({
              employerId: shiftData.employerId,
              title: shiftData.title,
              description: shiftData.description,
              startTime: typeof shiftData.startTime === 'string' ? new Date(shiftData.startTime) : shiftData.startTime,
              endTime: typeof shiftData.endTime === 'string' ? new Date(shiftData.endTime) : shiftData.endTime,
              hourlyRate: shiftData.hourlyRate,
              status: shiftData.status || 'draft',
              location: shiftData.location || null,
              assigneeId: shiftData.assigneeId || null,
              isRecurring: false,
              parentShiftId: null,
            })
            .returning()
        )
      );

      // Flatten the results (each insert returns an array with one element)
      return createdShifts.map(([shift]) => shift).filter(Boolean);
    });
  } catch (error: any) {
    console.error('[createBatchShifts] Database error:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      constraint: error?.constraint,
      count: shiftsData.length,
    });
    throw error;
  }
}

/**
 * Get shifts by employer within a date range
 */
export async function getShiftsByEmployerInRange(
  employerId: string,
  startDate: Date,
  endDate: Date
): Promise<typeof shifts.$inferSelect[]> {
  const db = getDb();
  if (!db) {
    return [];
  }

  try {
    const result = await db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.employerId, employerId),
          gte(shifts.startTime, startDate),
          lte(shifts.startTime, endDate)
        )
      );

    return result;
  } catch (error: any) {
    console.error('[getShiftsByEmployerInRange] Database error:', {
      message: error?.message,
      code: error?.code,
    });
    return [];
  }
}

/**
 * Update a shift by ID
 */
export async function updateShift(
  id: string,
  updates: {
    status?: 'draft' | 'pending' | 'invited' | 'open' | 'filled' | 'completed' | 'confirmed' | 'cancelled' | 'pending_completion';
    attendanceStatus?: 'pending' | 'completed' | 'no_show';
    paymentStatus?: 'UNPAID' | 'AUTHORIZED' | 'PAID' | 'REFUNDED' | 'PAYMENT_FAILED';
    paymentIntentId?: string | null;
    stripeChargeId?: string | null;
    applicationFeeAmount?: number | null;
    transferAmount?: number | null;
    title?: string;
    description?: string;
    startTime?: Date | string;
    endTime?: Date | string;
    hourlyRate?: string;
    assigneeId?: string | null;
    location?: string;
    isRecurring?: boolean;
    parentShiftId?: string;
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
export async function getShiftsByEmployer(employerId: string, status?: 'draft' | 'pending' | 'invited' | 'open' | 'filled' | 'completed' | 'confirmed' | 'cancelled'): Promise<typeof shifts.$inferSelect[]> {
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

/**
 * Get shifts assigned to a specific professional (assignee)
 */
export async function getShiftsByAssignee(assigneeId: string, status?: 'draft' | 'pending' | 'invited' | 'open' | 'filled' | 'completed' | 'confirmed' | 'cancelled'): Promise<typeof shifts.$inferSelect[]> {
  const db = getDb();
  if (!db) {
    return [];
  }

  try {
    const conditions = [eq(shifts.assigneeId, assigneeId)];
    if (status) {
      conditions.push(eq(shifts.status, status));
    }

    const result = await db
      .select()
      .from(shifts)
      .where(and(...conditions))
      .orderBy(desc(shifts.createdAt));

    return result;
  } catch (error: any) {
    // Extract detailed error information
    const errorDetails = {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      hint: error?.hint,
      constraint: error?.constraint,
      table: error?.table,
      column: error?.column,
      cause: error?.cause,
      // Check for nested errors (common in Drizzle)
      nestedMessage: error?.cause?.message,
      nestedCode: error?.cause?.code,
      nestedDetail: error?.cause?.detail,
    };

    console.error('[getShiftsByAssignee] Database query error:', {
      assigneeId,
      status,
      error: errorDetails,
      stack: error?.stack,
    });

    // Re-throw to be caught by error handler middleware
    throw error;
  }
}

/**
 * Get total commission earned (sum of application_fee_amount from completed shifts)
 */
export async function getTotalCommission(): Promise<number> {
  const db = getDb();
  if (!db) {
    return 0;
  }

  const [result] = await db
    .select({ total: sql<number>`COALESCE(SUM(${shifts.applicationFeeAmount}), 0)` })
    .from(shifts)
    .where(eq(shifts.status, 'completed'));

  // applicationFeeAmount is in cents, convert to dollars
  return (Number(result?.total || 0) / 100) || 0;
}

/**
 * Get commission earned this month
 */
export async function getCommissionThisMonth(): Promise<number> {
  const db = getDb();
  if (!db) {
    return 0;
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [result] = await db
    .select({ total: sql<number>`COALESCE(SUM(${shifts.applicationFeeAmount}), 0)` })
    .from(shifts)
    .where(
      and(
        eq(shifts.status, 'completed'),
        gte(shifts.updatedAt, startOfMonth)
      )
    );

  // applicationFeeAmount is in cents, convert to dollars
  return (Number(result?.total || 0) / 100) || 0;
}

/**
 * Get count of completed shifts
 */
export async function getCompletedShiftsCount(): Promise<number> {
  const db = getDb();
  if (!db) {
    return 0;
  }

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(shifts)
    .where(eq(shifts.status, 'completed'));

  return Number(result?.count || 0);
}

