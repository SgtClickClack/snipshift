/**
 * Applications Repository
 * 
 * Encapsulates database queries for applications with pagination and filtering
 */

import { eq, and, desc, sql, count, or, isNotNull, inArray } from 'drizzle-orm';
import { applications, jobs, shifts, users } from '../db/schema.js';
import { getDb } from '../db/index.js';

export interface ApplicationFilters {
  jobId?: string;
  shiftId?: string;
  userId?: string;
  status?: 'pending' | 'accepted' | 'rejected';
  limit?: number;
  offset?: number;
}

export interface PaginatedApplications {
  data: typeof applications.$inferSelect[];
  total: number;
  limit: number;
  offset: number;
}

const PG_UNDEFINED_COLUMN = '42703';
const PG_UNDEFINED_TABLE = '42P01';

function shouldFallbackToJobsOnly(error: any): boolean {
  const code = error?.code ?? error?.cause?.code;
  if (code !== PG_UNDEFINED_COLUMN && code !== PG_UNDEFINED_TABLE) return false;

  const message = String(error?.message ?? error?.cause?.message ?? '');
  const column = String(error?.column ?? error?.cause?.column ?? '');
  const table = String(error?.table ?? error?.cause?.table ?? '');

  // Heuristic: if the failure is related to shift support (missing column/table),
  // retry without referencing shifts/applications.shift_id to keep dashboards alive.
  return (
    message.toLowerCase().includes('shift') ||
    column.toLowerCase().includes('shift') ||
    table.toLowerCase().includes('shift')
  );
}

/**
 * Get paginated list of applications with optional filters
 */
export async function getApplications(
  filters: ApplicationFilters = {}
): Promise<PaginatedApplications | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const { jobId, shiftId, userId, status, limit = 50, offset = 0 } = filters;

  const conditions = [];
  if (jobId) {
    conditions.push(eq(applications.jobId, jobId));
  }
  if (shiftId) {
    conditions.push(eq(applications.shiftId, shiftId));
  }
  if (userId) {
    conditions.push(eq(applications.userId, userId));
  }
  if (status) {
    conditions.push(eq(applications.status, status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  try {
    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(applications)
        .where(whereClause)
        .orderBy(desc(applications.appliedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(applications)
        .where(whereClause),
    ]);

    return {
      data,
      total: totalResult[0]?.count || 0,
      limit,
      offset,
    };
  } catch (error: any) {
    if (!shouldFallbackToJobsOnly(error)) {
      throw error;
    }

    console.warn('[getApplications] Falling back to jobs-only query (shift columns/table missing).', {
      filters,
      code: error?.code ?? error?.cause?.code,
      message: error?.message ?? error?.cause?.message,
    });

    // Fallback: don't reference shift_id column (older DBs might not have it).
    // If filtering by shiftId was requested, return empty since we can't query it.
    if (shiftId) {
      return { data: [], total: 0, limit, offset };
    }

    const fallbackConditions = [];
    if (jobId) {
      fallbackConditions.push(sql`job_id = ${jobId}`);
    }
    if (userId) {
      fallbackConditions.push(sql`user_id = ${userId}`);
    }
    if (status) {
      fallbackConditions.push(sql`status = ${status}`);
    }

    const fallbackWhere = fallbackConditions.length > 0 
      ? sql`WHERE ${sql.join(fallbackConditions, sql` AND `)}`
      : sql``;

    const [dataRaw, countRaw] = await Promise.all([
      (db as any).execute(sql`
        SELECT
          id,
          job_id AS "jobId",
          NULL AS "shiftId",
          user_id AS "userId",
          name,
          email,
          cover_letter AS "coverLetter",
          status,
          applied_at AS "appliedAt",
          responded_at AS "respondedAt"
        FROM applications
        ${fallbackWhere}
        ORDER BY applied_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `),
      (db as any).execute(sql`
        SELECT COUNT(*) as count FROM applications ${fallbackWhere}
      `),
    ]);

    const rows = (dataRaw as any)?.rows ?? dataRaw ?? [];
    const countRows = (countRaw as any)?.rows ?? countRaw ?? [];

    return {
      data: rows.map((r: any) => ({
        ...r,
        shiftId: null,
      })),
      total: Number(countRows[0]?.count ?? 0),
      limit,
      offset,
    };
  }
}

/**
 * Get applications for a job with job details (JOIN to avoid N+1)
 */
export async function getApplicationsForJob(
  jobId: string
): Promise<Array<typeof applications.$inferSelect & { job: typeof jobs.$inferSelect }> | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  // Use JOIN to get job details in a single query
  const result = await db
    .select({
      application: applications,
      job: jobs,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(eq(applications.jobId, jobId))
    .orderBy(desc(applications.appliedAt));

  return result.map((row) => ({
    ...row.application,
    job: row.job,
  })) as any;
}

/**
 * Get applications for a shift with shift details
 */
export async function getApplicationsForShift(
  shiftId: string
): Promise<Array<typeof applications.$inferSelect & { 
  shift: typeof shifts.$inferSelect;
  user: typeof users.$inferSelect | null;
}> | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const result = await db
    .select({
      application: applications,
      shift: shifts,
      user: users,
    })
    .from(applications)
    .innerJoin(shifts, eq(applications.shiftId, shifts.id))
    .leftJoin(users, eq(applications.userId, users.id))
    .where(eq(applications.shiftId, shiftId))
    .orderBy(desc(applications.appliedAt));

  return result.map((row) => ({
    ...row.application,
    shift: row.shift,
    user: row.user,
  })) as any;
}

/**
 * Get applications for a user with job/shift details (JOIN to avoid N+1)
 */
export async function getApplicationsForUser(
  userId: string,
  filters: { status?: 'pending' | 'accepted' | 'rejected' } = {}
): Promise<Array<typeof applications.$inferSelect & { job: typeof jobs.$inferSelect | null, shift: typeof shifts.$inferSelect | null }> | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const conditions = [eq(applications.userId, userId)];
  if (filters.status) {
    conditions.push(eq(applications.status, filters.status));
  }

  const whereClause = and(...conditions);

  // Use leftJoin to get job OR shift details
  try {
    const result = await db
      .select({
        application: applications,
        job: jobs,
        shift: shifts,
      })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(shifts, eq(applications.shiftId, shifts.id))
      .where(whereClause)
      .orderBy(desc(applications.appliedAt));

    return result.map((row) => ({
      ...row.application,
      job: row.job,
      shift: row.shift,
    })) as any;
  } catch (error: any) {
    if (!shouldFallbackToJobsOnly(error)) {
      throw error;
    }

    console.warn('[getApplicationsForUser] Falling back to jobs-only query (shift columns/table missing).', {
      userId,
      status: filters.status,
      code: error?.code ?? error?.cause?.code,
      message: error?.message ?? error?.cause?.message,
      column: error?.column ?? error?.cause?.column,
      table: error?.table ?? error?.cause?.table,
    });

    // Fallback: do not reference shifts nor applications.shift_id (older DBs might not have shift support yet).
    const jobOnlyResult = await db
      .select({
        application: {
          id: applications.id,
          jobId: applications.jobId,
          shiftId: sql<string | null>`NULL`.as('shift_id'),
          userId: applications.userId,
          name: applications.name,
          email: applications.email,
          coverLetter: applications.coverLetter,
          status: applications.status,
          appliedAt: applications.appliedAt,
          respondedAt: applications.respondedAt,
        },
        job: {
          id: jobs.id,
          businessId: jobs.businessId,
          title: jobs.title,
          payRate: jobs.payRate,
          date: jobs.date,
          startTime: jobs.startTime,
          endTime: jobs.endTime,
          shopName: jobs.shopName,
          address: jobs.address,
          city: jobs.city,
          state: jobs.state,
        },
      })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .where(whereClause)
      .orderBy(desc(applications.appliedAt));

    return jobOnlyResult.map((row: any) => {
      const job = row.job?.id ? row.job : null;
      return {
        ...row.application,
        job,
        shift: null,
      };
    }) as any;
  }
}

/**
 * Get applications for a business (employer) across all their jobs and shifts
 */
export async function getApplicationsForBusiness(
  businessId: string,
  filters: { status?: 'pending' | 'accepted' | 'rejected' } = {}
): Promise<Array<typeof applications.$inferSelect & { 
  job: typeof jobs.$inferSelect | null, 
  shift: typeof shifts.$inferSelect | null,
  user: typeof users.$inferSelect | null 
}> | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  try {
    const conditions = [
      or(
        eq(jobs.businessId, businessId),
        eq(shifts.employerId, businessId)
      )
    ];

    if (filters.status) {
      conditions.push(eq(applications.status, filters.status));
    }

    const whereClause = and(...conditions);

    const result = await db
      .select({
        application: applications,
        job: jobs,
        shift: shifts,
        // We might want user details too if we are showing applicants
        user: users
      })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(shifts, eq(applications.shiftId, shifts.id))
      .leftJoin(users, eq(applications.userId, users.id))
      .where(whereClause)
      .orderBy(desc(applications.appliedAt));

    return result.map((row) => ({
      ...row.application,
      job: row.job,
      shift: row.shift,
      user: row.user
    })) as any;
  } catch (error: any) {
    if (shouldFallbackToJobsOnly(error)) {
      console.warn('[getApplicationsForBusiness] Falling back to jobs-only query (shift columns/table missing).', {
        businessId,
        status: filters.status,
        code: error?.code ?? error?.cause?.code,
        message: error?.message ?? error?.cause?.message,
        column: error?.column ?? error?.cause?.column,
        table: error?.table ?? error?.cause?.table,
      });

      const conditions = [eq(jobs.businessId, businessId)];
      if (filters.status) {
        conditions.push(eq(applications.status, filters.status));
      }
      const whereClause = and(...conditions);

      const jobOnlyResult = await db
        .select({
          application: {
            id: applications.id,
            jobId: applications.jobId,
            shiftId: sql<string | null>`NULL`.as('shift_id'),
            userId: applications.userId,
            name: applications.name,
            email: applications.email,
            coverLetter: applications.coverLetter,
            status: applications.status,
            appliedAt: applications.appliedAt,
            respondedAt: applications.respondedAt,
          },
          job: {
            id: jobs.id,
            businessId: jobs.businessId,
            title: jobs.title,
            payRate: jobs.payRate,
            date: jobs.date,
            startTime: jobs.startTime,
            endTime: jobs.endTime,
            shopName: jobs.shopName,
            address: jobs.address,
            city: jobs.city,
            state: jobs.state,
          },
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(applications)
        .innerJoin(jobs, eq(applications.jobId, jobs.id))
        .leftJoin(users, eq(applications.userId, users.id))
        .where(whereClause)
        .orderBy(desc(applications.appliedAt));

      return jobOnlyResult.map((row: any) => {
        const job = row.job?.id ? row.job : null;
        const user = row.user?.id ? row.user : null;
        return {
          ...row.application,
          job,
          shift: null,
          user,
        };
      }) as any;
    }

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

    console.error('[getApplicationsForBusiness] Database query error:', {
      businessId,
      filters,
      error: errorDetails,
      stack: error?.stack,
    });

    // Re-throw to be caught by error handler middleware
    throw error;
  }
}

/**
 * Get a single application by ID
 */
export async function getApplicationById(
  id: string
): Promise<typeof applications.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const result = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
  return result[0] || null;
}

/**
 * Create a new application
 */
export async function createApplication(
  applicationData: {
    jobId?: string;
    shiftId?: string;
    userId?: string;
    name: string;
    email: string;
    coverLetter: string;
  }
): Promise<typeof applications.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  if (!applicationData.jobId && !applicationData.shiftId) {
    return null; // Must provide either jobId or shiftId
  }

  const [newApplication] = await db
    .insert(applications)
    .values({
      jobId: applicationData.jobId || null,
      shiftId: applicationData.shiftId || null,
      userId: applicationData.userId || null,
      name: applicationData.name,
      email: applicationData.email,
      coverLetter: applicationData.coverLetter,
      status: 'pending',
    })
    .returning();

  return newApplication || null;
}

/**
 * Check if a user has already applied to a job or shift
 */
export async function hasUserApplied(
  targetId: string, // jobId or shiftId
  type: 'job' | 'shift',
  userId?: string,
  email?: string
): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  const conditions = [];
  if (type === 'job') {
    conditions.push(eq(applications.jobId, targetId));
  } else {
    conditions.push(eq(applications.shiftId, targetId));
  }

  if (userId) {
    conditions.push(eq(applications.userId, userId));
  } else if (email) {
    conditions.push(eq(applications.email, email));
  } else {
    return false; // Need either userId or email to check
  }

  const result = await db
    .select({ count: count() })
    .from(applications)
    .where(and(...conditions))
    .limit(1);

  return (result[0]?.count || 0) > 0;
}

/**
 * Deprecated: Use hasUserApplied instead
 */
export async function hasUserAppliedToJob(
  jobId: string,
  userId?: string,
  email?: string
): Promise<boolean> {
  return hasUserApplied(jobId, 'job', userId, email);
}

/**
 * Update application status
 */
export async function updateApplicationStatus(
  id: string,
  status: 'pending' | 'accepted' | 'rejected'
): Promise<typeof applications.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [updatedApplication] = await db
    .update(applications)
    .set({
      status,
      respondedAt: sql`NOW()`,
    })
    .where(eq(applications.id, id))
    .returning();

  return updatedApplication || null;
}

/**
 * Delete an application (withdrawal)
 */
export async function deleteApplication(id: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  const result = await db.delete(applications).where(eq(applications.id, id)).returning();
  return result.length > 0;
}

/**
 * Get all pending applications for a specific shift
 */
export async function getPendingApplicationsForShift(shiftId: string): Promise<typeof applications.$inferSelect[]> {
  const db = getDb();
  if (!db) {
    return [];
  }

  const result = await db
    .select()
    .from(applications)
    .where(and(
      eq(applications.shiftId, shiftId),
      eq(applications.status, 'pending')
    ));

  return result;
}

/**
 * Decline all pending applications for a shift except the approved one
 */
export async function declinePendingApplicationsForShift(
  shiftId: string,
  exceptApplicationId: string
): Promise<number> {
  const db = getDb();
  if (!db) {
    return 0;
  }

  const result = await db
    .update(applications)
    .set({
      status: 'rejected',
      respondedAt: sql`NOW()`,
    })
    .where(and(
      eq(applications.shiftId, shiftId),
      eq(applications.status, 'pending'),
      sql`${applications.id} != ${exceptApplicationId}`
    ))
    .returning();

  return result.length;
}

/**
 * Batch fetch application counts for multiple shifts and/or jobs (optimized for N+1 prevention)
 * Returns a Map of (shiftId|jobId) -> count for O(1) lookups
 * 
 * @param shiftIds - Array of shift IDs to get counts for
 * @param jobIds - Array of job IDs to get counts for
 * @returns Map with keys like "shift:${id}" or "job:${id}" and count values
 */
export async function getApplicationCountsBatch(
  shiftIds: string[] = [],
  jobIds: string[] = []
): Promise<Map<string, number>> {
  const db = getDb();
  const countMap = new Map<string, number>();

  if (!db) {
    return countMap;
  }

  if (shiftIds.length === 0 && jobIds.length === 0) {
    return countMap;
  }

  try {
    // Fetch counts for shifts
    if (shiftIds.length > 0) {
      const shiftCounts = await db
        .select({
          shiftId: applications.shiftId,
          count: sql<number>`count(*)`,
        })
        .from(applications)
        .where(
          and(
            inArray(applications.shiftId, shiftIds),
            isNotNull(applications.shiftId)
          )
        )
        .groupBy(applications.shiftId);

      shiftCounts.forEach((row) => {
        if (row.shiftId) {
          countMap.set(`shift:${row.shiftId}`, Number(row.count) || 0);
        }
      });
    }

    // Fetch counts for jobs
    if (jobIds.length > 0) {
      const jobCounts = await db
        .select({
          jobId: applications.jobId,
          count: sql<number>`count(*)`,
        })
        .from(applications)
        .where(
          and(
            inArray(applications.jobId, jobIds),
            isNotNull(applications.jobId)
          )
        )
        .groupBy(applications.jobId);

      jobCounts.forEach((row) => {
        if (row.jobId) {
          countMap.set(`job:${row.jobId}`, Number(row.count) || 0);
        }
      });
    }
  } catch (error: any) {
    // Graceful degradation: if shift_id column doesn't exist, fall back to jobs-only
    if (shouldFallbackToJobsOnly(error) && shiftIds.length > 0) {
      console.warn('[getApplicationCountsBatch] Falling back to jobs-only query:', {
        message: error?.message,
        code: error?.code,
      });

      // Retry with jobs only
      if (jobIds.length > 0) {
        try {
          const jobCounts = await db
            .select({
              jobId: applications.jobId,
              count: sql<number>`count(*)`,
            })
            .from(applications)
            .where(
              and(
                inArray(applications.jobId, jobIds),
                isNotNull(applications.jobId)
              )
            )
            .groupBy(applications.jobId);

          jobCounts.forEach((row) => {
            if (row.jobId) {
              countMap.set(`job:${row.jobId}`, Number(row.count) || 0);
            }
          });
        } catch (fallbackError: any) {
          console.error('[getApplicationCountsBatch] Fallback query also failed:', {
            message: fallbackError?.message,
            code: fallbackError?.code,
          });
        }
      }
    } else {
      console.error('[getApplicationCountsBatch] Database error:', {
        message: error?.message,
        code: error?.code,
        shiftIdsCount: shiftIds.length,
        jobIdsCount: jobIds.length,
      });
    }
  }

  // Ensure all requested IDs have entries (even if count is 0)
  shiftIds.forEach(id => {
    if (!countMap.has(`shift:${id}`)) {
      countMap.set(`shift:${id}`, 0);
    }
  });
  jobIds.forEach(id => {
    if (!countMap.has(`job:${id}`)) {
      countMap.set(`job:${id}`, 0);
    }
  });

  return countMap;
}