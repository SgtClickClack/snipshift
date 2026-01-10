/**
 * Shifts Repository
 * 
 * Encapsulates database queries for shifts with pagination and filtering
 */

import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { shifts } from '../db/schema/shifts.js';
import { users } from '../db/schema/users.js';
import { getDb } from '../db/index.js';

function isMissingColumnError(err: any, column: string): boolean {
  const code = err?.code ?? err?.cause?.code ?? err?.originalError?.code ?? err?.error?.code;
  if (String(code) !== '42703') return false;
  const msg = `${err?.message ?? ''} ${err?.cause?.message ?? ''} ${err?.originalError?.message ?? ''}`.toLowerCase();
  return msg.includes(`column "${column.toLowerCase()}"`) && msg.includes('does not exist');
}

function shouldFallbackToLegacyShiftSchema(err: any): boolean {
  // We’ve observed production DBs that are missing the newer `lat`/`lng` columns on `shifts`.
  // Drizzle inserts/selects reference all schema columns and will 500 on these environments.
  return (
    isMissingColumnError(err, 'lat') ||
    isMissingColumnError(err, 'lng') ||
    isMissingColumnError(err, 'role') ||
    isMissingColumnError(err, 'uniform_requirements') ||
    isMissingColumnError(err, 'rsa_required') ||
    isMissingColumnError(err, 'expected_pax')
  );
}

function hydrateLegacyShiftRow(row: any): typeof shifts.$inferSelect {
  return {
    ...row,
    assigneeId: row?.assigneeId ?? null,
    role: row?.role ?? null,
    attendanceStatus: 'pending',
    paymentStatus: 'UNPAID',
    paymentIntentId: null,
    stripeChargeId: null,
    applicationFeeAmount: null,
    transferAmount: null,
    lat: null,
    lng: null,
    isRecurring: false,
    autoAccept: false,
    parentShiftId: null,
    uniformRequirements: row?.uniformRequirements ?? null,
    rsaRequired: row?.rsaRequired ?? false,
    expectedPax: row?.expectedPax ?? null,
  } as any;
}


export interface ShiftFilters {
  employerId?: string;
  assigneeId?: string;
  status?: 'draft' | 'pending' | 'invited' | 'open' | 'filled' | 'completed' | 'confirmed' | 'cancelled' | 'pending_completion';
  startTimeAfter?: Date | string;
  limit?: number;
  offset?: number;
}

export type ShiftWithShop = typeof shifts.$inferSelect & {
  shopName: string | null;
  shopAvatarUrl: string | null;
};

export interface PaginatedShifts {
  data: ShiftWithShop[];
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

  try {
    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(shifts)
      .where(whereClause);
    
    const total = Number(countResult[0]?.count || 0);

    // Get paginated data with employer (shop) information
    const data = await db
      .select({
        // Shift fields
        id: shifts.id,
        employerId: shifts.employerId,
        assigneeId: shifts.assigneeId,
        role: shifts.role,
        title: shifts.title,
        description: shifts.description,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        hourlyRate: shifts.hourlyRate,
        uniformRequirements: shifts.uniformRequirements,
        rsaRequired: shifts.rsaRequired,
        expectedPax: shifts.expectedPax,
        status: shifts.status,
        attendanceStatus: shifts.attendanceStatus,
        paymentStatus: shifts.paymentStatus,
        paymentIntentId: shifts.paymentIntentId,
        stripeChargeId: shifts.stripeChargeId,
        applicationFeeAmount: shifts.applicationFeeAmount,
        transferAmount: shifts.transferAmount,
        location: shifts.location,
        isRecurring: shifts.isRecurring,
        autoAccept: shifts.autoAccept,
        parentShiftId: shifts.parentShiftId,
        createdAt: shifts.createdAt,
        updatedAt: shifts.updatedAt,
        // Employer (shop) fields
        shopName: users.name,
        shopAvatarUrl: users.avatarUrl,
        // Location coordinates
        lat: shifts.lat,
        lng: shifts.lng,
      })
      .from(shifts)
      .leftJoin(users, eq(shifts.employerId, users.id))
      .where(whereClause)
      .orderBy(desc(shifts.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data,
      total,
      limit,
      offset,
    };
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
      nestedMessage: error?.cause?.message,
      nestedCode: error?.cause?.code,
      nestedDetail: error?.cause?.detail,
    };

    console.error('[getShifts] Database query error:', {
      filters,
      error: errorDetails,
      stack: error?.stack,
    });

    // Re-throw to be caught by error handler middleware
    throw error;
  }
}

/**
 * Get a single shift by ID with shop information
 */
export async function getShiftById(id: string): Promise<ShiftWithShop | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [shift] = await db
    .select({
      // Shift fields
      id: shifts.id,
      employerId: shifts.employerId,
      assigneeId: shifts.assigneeId,
      role: shifts.role,
      title: shifts.title,
      description: shifts.description,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      hourlyRate: shifts.hourlyRate,
      uniformRequirements: shifts.uniformRequirements,
      rsaRequired: shifts.rsaRequired,
      expectedPax: shifts.expectedPax,
      status: shifts.status,
      attendanceStatus: shifts.attendanceStatus,
      paymentStatus: shifts.paymentStatus,
      paymentIntentId: shifts.paymentIntentId,
      stripeChargeId: shifts.stripeChargeId,
      applicationFeeAmount: shifts.applicationFeeAmount,
      transferAmount: shifts.transferAmount,
      location: shifts.location,
      lat: shifts.lat,
      lng: shifts.lng,
      isRecurring: shifts.isRecurring,
      autoAccept: shifts.autoAccept,
      parentShiftId: shifts.parentShiftId,
      createdAt: shifts.createdAt,
      updatedAt: shifts.updatedAt,
      // Employer (shop) fields
      shopName: users.name,
      shopAvatarUrl: users.avatarUrl,
    })
    .from(shifts)
    .leftJoin(users, eq(shifts.employerId, users.id))
    .where(eq(shifts.id, id))
    .limit(1);

  return shift || null;
}

/**
 * Create a new shift
 */
export async function createShift(shiftData: {
  employerId: string;
  role?: string;
  title: string;
  description: string;
  startTime: Date | string;
  endTime: Date | string;
  hourlyRate: string;
  uniformRequirements?: string;
  rsaRequired?: boolean;
  expectedPax?: number;
  status?: 'draft' | 'pending' | 'invited' | 'open' | 'filled' | 'completed' | 'confirmed' | 'cancelled' | 'pending_completion';
  assigneeId?: string;
  location?: string;
  lat?: string | number;
  lng?: string | number;
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
        role: shiftData.role || null,
        title: shiftData.title,
        description: shiftData.description,
        startTime: typeof shiftData.startTime === 'string' ? new Date(shiftData.startTime) : shiftData.startTime,
        endTime: typeof shiftData.endTime === 'string' ? new Date(shiftData.endTime) : shiftData.endTime,
        hourlyRate: shiftData.hourlyRate,
        uniformRequirements: shiftData.uniformRequirements || null,
        rsaRequired: shiftData.rsaRequired ?? false,
        expectedPax: shiftData.expectedPax ?? null,
        status: shiftData.status || 'draft',
        assigneeId: shiftData.assigneeId || null,
        location: shiftData.location || null,
        lat: shiftData.lat ? (typeof shiftData.lat === 'string' ? shiftData.lat : shiftData.lat.toString()) : null,
        lng: shiftData.lng ? (typeof shiftData.lng === 'string' ? shiftData.lng : shiftData.lng.toString()) : null,
        isRecurring: shiftData.isRecurring || false,
        parentShiftId: shiftData.parentShiftId || null,
      })
      .returning();

    return newShift || null;
  } catch (error: any) {
    if (shouldFallbackToLegacyShiftSchema(error)) {
      console.warn('[createShift] Falling back to legacy insert (missing lat/lng columns):', {
        message: error?.message,
        code: error?.code ?? error?.cause?.code,
      });

      const start = typeof shiftData.startTime === 'string' ? new Date(shiftData.startTime) : shiftData.startTime;
      const end = typeof shiftData.endTime === 'string' ? new Date(shiftData.endTime) : shiftData.endTime;

      const insertLegacyBestEffort = async (withAssigneeId: boolean) => {
        const role = shiftData.role || null;
        const uniformRequirements = shiftData.uniformRequirements || null;
        const rsaRequired = shiftData.rsaRequired ?? false;
        const expectedPax = shiftData.expectedPax ?? null;

        const tryWithHospoFields = async () => {
          return await (db as any).execute(sql`
            INSERT INTO shifts (
              employer_id,
              ${withAssigneeId ? sql`assignee_id,` : sql``}
              role,
              title,
              description,
              start_time,
              end_time,
              hourly_rate,
              uniform_requirements,
              rsa_required,
              expected_pax,
              status,
              location
            ) VALUES (
              ${shiftData.employerId},
              ${withAssigneeId ? sql`${shiftData.assigneeId},` : sql``}
              ${role},
              ${shiftData.title},
              ${shiftData.description},
              ${start},
              ${end},
              ${shiftData.hourlyRate},
              ${uniformRequirements},
              ${rsaRequired},
              ${expectedPax},
              ${shiftData.status || 'draft'},
              ${shiftData.location || null}
            )
            RETURNING
              id,
              employer_id AS "employerId",
              ${withAssigneeId ? sql`assignee_id AS "assigneeId",` : sql``}
              role,
              title,
              description,
              start_time AS "startTime",
              end_time AS "endTime",
              hourly_rate AS "hourlyRate",
              uniform_requirements AS "uniformRequirements",
              rsa_required AS "rsaRequired",
              expected_pax AS "expectedPax",
              status,
              location,
              created_at AS "createdAt",
              updated_at AS "updatedAt"
          `);
        };

        const tryMinimal = async () => {
          return await (db as any).execute(sql`
            INSERT INTO shifts (
              employer_id,
              ${withAssigneeId ? sql`assignee_id,` : sql``}
              title,
              description,
              start_time,
              end_time,
              hourly_rate,
              status,
              location
            ) VALUES (
              ${shiftData.employerId},
              ${withAssigneeId ? sql`${shiftData.assigneeId},` : sql``}
              ${shiftData.title},
              ${shiftData.description},
              ${start},
              ${end},
              ${shiftData.hourlyRate},
              ${shiftData.status || 'draft'},
              ${shiftData.location || null}
            )
            RETURNING
              id,
              employer_id AS "employerId",
              ${withAssigneeId ? sql`assignee_id AS "assigneeId",` : sql``}
              title,
              description,
              start_time AS "startTime",
              end_time AS "endTime",
              hourly_rate AS "hourlyRate",
              status,
              location,
              created_at AS "createdAt",
              updated_at AS "updatedAt"
          `);
        };

        try {
          return await tryWithHospoFields();
        } catch (e: any) {
          // If any of the Hospo fields don't exist yet, retry with minimal columns.
          if (
            isMissingColumnError(e, 'role') ||
            isMissingColumnError(e, 'uniform_requirements') ||
            isMissingColumnError(e, 'rsa_required') ||
            isMissingColumnError(e, 'expected_pax')
          ) {
            return await tryMinimal();
          }
          throw e;
        }
      };

      let raw: any;
      if (shiftData.assigneeId) {
        try {
          raw = await insertLegacyBestEffort(true);
        } catch (e: any) {
          // If the environment is missing assignee_id too, retry without it.
          if (isMissingColumnError(e, 'assignee_id')) {
            raw = await insertLegacyBestEffort(false);
          } else {
            throw e;
          }
        }
      } else {
        raw = await insertLegacyBestEffort(false);
      }

      const rows = (raw as any)?.rows ?? raw;
      const row = (rows as any[])?.[0];
      return row ? hydrateLegacyShiftRow(row) : null;
    }

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
    status?: 'draft' | 'pending' | 'invited' | 'open' | 'filled' | 'completed' | 'confirmed' | 'cancelled' | 'pending_completion';
    location?: string;
    lat?: string | number;
    lng?: string | number;
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
          lat: parentShiftData.lat ? (typeof parentShiftData.lat === 'string' ? parentShiftData.lat : parentShiftData.lat.toString()) : null,
          lng: parentShiftData.lng ? (typeof parentShiftData.lng === 'string' ? parentShiftData.lng : parentShiftData.lng.toString()) : null,
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
              lat: parentShiftData.lat ? (typeof parentShiftData.lat === 'string' ? parentShiftData.lat : parentShiftData.lat.toString()) : null,
              lng: parentShiftData.lng ? (typeof parentShiftData.lng === 'string' ? parentShiftData.lng : parentShiftData.lng.toString()) : null,
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
    if (shouldFallbackToLegacyShiftSchema(error)) {
      console.warn('[createRecurringShifts] Falling back to legacy insert (missing lat/lng columns):', {
        message: error?.message,
        code: error?.code ?? error?.cause?.code,
      });

      return await db.transaction(async (tx) => {
        const insertOne = async (startTime: Date, endTime: Date) => {
          const raw = await (tx as any).execute(sql`
            INSERT INTO shifts (
              employer_id,
              title,
              description,
              start_time,
              end_time,
              hourly_rate,
              status,
              location
            ) VALUES (
              ${parentShiftData.employerId},
              ${parentShiftData.title},
              ${parentShiftData.description},
              ${startTime},
              ${endTime},
              ${parentShiftData.hourlyRate},
              ${parentShiftData.status || 'draft'},
              ${parentShiftData.location || null}
            )
            RETURNING
              id,
              employer_id AS "employerId",
              title,
              description,
              start_time AS "startTime",
              end_time AS "endTime",
              hourly_rate AS "hourlyRate",
              status,
              location,
              created_at AS "createdAt",
              updated_at AS "updatedAt"
          `);
          const rows = (raw as any)?.rows ?? raw;
          const row = (rows as any[])?.[0];
          return row ? hydrateLegacyShiftRow(row) : null;
        };

        const parentStart = typeof parentShiftData.startTime === 'string' ? new Date(parentShiftData.startTime) : parentShiftData.startTime;
        const parentEnd = typeof parentShiftData.endTime === 'string' ? new Date(parentShiftData.endTime) : parentShiftData.endTime;
        const createdParent = await insertOne(parentStart, parentEnd);
        if (!createdParent) throw new Error('Failed to create parent shift (legacy fallback)');

        const createdChildren: typeof shifts.$inferSelect[] = [];
        for (const child of recurringShiftsData) {
          const childStart = typeof child.startTime === 'string' ? new Date(child.startTime) : child.startTime;
          const childEnd = typeof child.endTime === 'string' ? new Date(child.endTime) : child.endTime;
          const created = await insertOne(childStart, childEnd);
          if (created) createdChildren.push(created);
        }

        return [createdParent, ...createdChildren];
      });
    }

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
    status?: 'draft' | 'pending' | 'invited' | 'open' | 'filled' | 'completed' | 'confirmed' | 'cancelled' | 'pending_completion';
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
    if (shouldFallbackToLegacyShiftSchema(error)) {
      console.warn('[createBatchShifts] Falling back to legacy batch insert (missing lat/lng columns):', {
        message: error?.message,
        code: error?.code ?? error?.cause?.code,
        count: shiftsData.length,
      });

      return await db.transaction(async (tx) => {
        const created: typeof shifts.$inferSelect[] = [];
        for (const shiftData of shiftsData) {
          const startTime = typeof shiftData.startTime === 'string' ? new Date(shiftData.startTime) : shiftData.startTime;
          const endTime = typeof shiftData.endTime === 'string' ? new Date(shiftData.endTime) : shiftData.endTime;

          const insertWithoutAssignee = async () => {
            return await (tx as any).execute(sql`
              INSERT INTO shifts (
                employer_id,
                title,
                description,
                start_time,
                end_time,
                hourly_rate,
                status,
                location
              ) VALUES (
                ${shiftData.employerId},
                ${shiftData.title},
                ${shiftData.description},
                ${startTime},
                ${endTime},
                ${shiftData.hourlyRate},
                ${shiftData.status || 'draft'},
                ${shiftData.location || null}
              )
              RETURNING
                id,
                employer_id AS "employerId",
                title,
                description,
                start_time AS "startTime",
                end_time AS "endTime",
                hourly_rate AS "hourlyRate",
                status,
                location,
                created_at AS "createdAt",
                updated_at AS "updatedAt"
            `);
          };

          let raw: any;
          if (shiftData.assigneeId) {
            try {
              raw = await (tx as any).execute(sql`
                INSERT INTO shifts (
                  employer_id,
                  assignee_id,
                  title,
                  description,
                  start_time,
                  end_time,
                  hourly_rate,
                  status,
                  location
                ) VALUES (
                  ${shiftData.employerId},
                  ${shiftData.assigneeId},
                  ${shiftData.title},
                  ${shiftData.description},
                  ${startTime},
                  ${endTime},
                  ${shiftData.hourlyRate},
                  ${shiftData.status || 'draft'},
                  ${shiftData.location || null}
                )
                RETURNING
                  id,
                  employer_id AS "employerId",
                  assignee_id AS "assigneeId",
                  title,
                  description,
                  start_time AS "startTime",
                  end_time AS "endTime",
                  hourly_rate AS "hourlyRate",
                  status,
                  location,
                  created_at AS "createdAt",
                  updated_at AS "updatedAt"
              `);
            } catch (e: any) {
              if (isMissingColumnError(e, 'assignee_id')) {
                raw = await insertWithoutAssignee();
              } else {
                throw e;
              }
            }
          } else {
            raw = await insertWithoutAssignee();
          }

          const rows = (raw as any)?.rows ?? raw;
          const row = (rows as any[])?.[0];
          if (row) created.push(hydrateLegacyShiftRow(row));
        }

        return created;
      });
    }

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
          lte(shifts.startTime, endDate),
          lte(shifts.endTime, endDate)
        )
      );

    return result;
  } catch (error: any) {
    if (shouldFallbackToLegacyShiftSchema(error)) {
      console.warn('[getShiftsByEmployerInRange] Falling back to legacy range query (missing lat/lng columns):', {
        employerId,
        message: error?.message,
        code: error?.code ?? error?.cause?.code,
      });

      const raw = await (db as any).execute(sql`
        SELECT
          id,
          employer_id AS "employerId",
          title,
          description,
          start_time AS "startTime",
          end_time AS "endTime",
          hourly_rate AS "hourlyRate",
          status,
          location,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM shifts
        WHERE employer_id = ${employerId}
          AND start_time >= ${startDate}
          AND start_time <= ${endDate}
          AND end_time <= ${endDate}
      `);

      const rows = (raw as any)?.rows ?? raw;
      return (rows as any[]).map((r) => hydrateLegacyShiftRow(r));
    }

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
export async function getShiftsByEmployer(employerId: string, status?: 'draft' | 'pending' | 'invited' | 'open' | 'filled' | 'completed' | 'confirmed' | 'cancelled' | 'pending_completion'): Promise<typeof shifts.$inferSelect[]> {
  const db = getDb();
  if (!db) {
    return [];
  }

  try {
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
  } catch (error: any) {
    // Compatibility fallback:
    // Some environments may have an older `shifts` table schema (pre-migrations),
    // where newer columns (e.g. `assignee_id`, `attendance_status`, etc.) don't exist.
    // Drizzle's `.select()` will reference all schema columns and can 500.
    console.error('[getShiftsByEmployer] Falling back to minimal shifts query:', {
      employerId,
      status,
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
    });

    const statusClause = status ? sql` AND status = ${status}` : sql``;
    const raw = await (db as any).execute(sql`
      SELECT
        id,
        employer_id AS "employerId",
        title,
        description,
        start_time AS "startTime",
        end_time AS "endTime",
        hourly_rate AS "hourlyRate",
        status,
        location,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM shifts
      WHERE employer_id = ${employerId}${statusClause}
      ORDER BY created_at DESC
    `);

    const rows = (raw as any)?.rows ?? raw;
    return (rows as any[]).map((r) => ({
      ...r,
      assigneeId: null,
      attendanceStatus: 'pending',
      paymentStatus: 'UNPAID',
      paymentIntentId: null,
      stripeChargeId: null,
      applicationFeeAmount: null,
      transferAmount: null,
      lat: null,
      lng: null,
      isRecurring: false,
      autoAccept: false,
      parentShiftId: null,
    }));
  }
}

/**
 * Get shifts assigned to a specific professional (assignee)
 */
export async function getShiftsByAssignee(assigneeId: string, status?: 'draft' | 'pending' | 'invited' | 'open' | 'filled' | 'completed' | 'confirmed' | 'cancelled' | 'pending_completion'): Promise<typeof shifts.$inferSelect[]> {
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
    // Compatibility fallback:
    // Some environments may have an older `shifts` table schema (pre-migrations),
    // where newer columns (e.g. `attendance_status`, `payment_status`, etc.) don't exist.
    // Drizzle's `.select()` will reference all schema columns and can 500.
    console.error('[getShiftsByAssignee] Falling back to minimal shifts query:', {
      assigneeId,
      status,
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
    });

    try {
      const statusClause = status ? sql` AND status = ${status}` : sql``;
      const raw = await (db as any).execute(sql`
        SELECT
          id,
          employer_id AS "employerId",
          assignee_id AS "assigneeId",
          title,
          description,
          start_time AS "startTime",
          end_time AS "endTime",
          hourly_rate AS "hourlyRate",
          status,
          location,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM shifts
        WHERE assignee_id = ${assigneeId}${statusClause}
        ORDER BY created_at DESC
      `);

      const rows = (raw as any)?.rows ?? raw;
      return rows.map((r: any) => ({
        ...r,
        attendanceStatus: r.attendanceStatus ?? 'pending',
        paymentStatus: r.paymentStatus ?? 'UNPAID',
        paymentIntentId: r.paymentIntentId ?? null,
        stripeChargeId: r.stripeChargeId ?? null,
        applicationFeeAmount: r.applicationFeeAmount ?? null,
        transferAmount: r.transferAmount ?? null,
        lat: r.lat ?? null,
        lng: r.lng ?? null,
        isRecurring: r.isRecurring ?? false,
        autoAccept: r.autoAccept ?? false,
        parentShiftId: r.parentShiftId ?? null,
      }));
    } catch (fallbackError: any) {
      console.error('[getShiftsByAssignee] Fallback query also failed:', {
        assigneeId,
        status,
        message: fallbackError?.message,
        code: fallbackError?.code,
      });
      // Return empty array for graceful degradation
      return [];
    }
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

/**
 * Delete unassigned DRAFT shifts for an employer within a date range
 * Only deletes shifts that have no assignee (empty slots)
 */
export async function deleteDraftShiftsInRange(
  employerId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const db = getDb();
  if (!db) {
    return 0;
  }

  try {
    const result = await db
      .delete(shifts)
      .where(
        and(
          eq(shifts.employerId, employerId),
          eq(shifts.status, 'draft'),
          sql`${shifts.assigneeId} IS NULL`, // Only delete unassigned drafts
          gte(shifts.startTime, startDate),
          lte(shifts.startTime, endDate)
        )
      );

    return result.rowCount ?? 0;
  } catch (error: any) {
    console.error('[deleteDraftShiftsInRange] Database error:', {
      message: error?.message,
      code: error?.code,
      employerId,
      startDate,
      endDate,
    });
    return 0;
  }
}

/**
 * Delete ALL shifts for an employer (use with caution!)
 * This is for clearing the entire schedule
 */
export async function deleteAllShiftsForEmployer(employerId: string): Promise<number> {
  const db = getDb();
  if (!db) {
    return 0;
  }

  try {
    const result = await db
      .delete(shifts)
      .where(eq(shifts.employerId, employerId));

    return result.rowCount ?? 0;
  } catch (error: any) {
    console.error('[deleteAllShiftsForEmployer] Database error:', {
      message: error?.message,
      code: error?.code,
      employerId,
    });
    return 0;
  }
}

