/**
 * Jobs Repository
 * 
 * Encapsulates database queries for jobs with pagination and filtering
 */

import { eq, and, desc, sql, count } from 'drizzle-orm';
import { jobs } from '../db/schema';
import { getDb } from '../db';

export interface JobFilters {
  businessId?: string;
  status?: 'open' | 'filled' | 'closed';
  limit?: number;
  offset?: number;
  city?: string;
  date?: string;
}

export interface PaginatedJobs {
  data: typeof jobs.$inferSelect[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Get paginated list of jobs with optional filters
 */
export async function getJobs(filters: JobFilters = {}): Promise<PaginatedJobs | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const { businessId, status, limit = 50, offset = 0, city, date } = filters;

  const conditions = [];
  if (businessId) {
    conditions.push(eq(jobs.businessId, businessId));
  }
  if (status) {
    conditions.push(eq(jobs.status, status));
  }
  if (city) {
    conditions.push(eq(jobs.city, city));
  }
  if (date) {
    conditions.push(eq(jobs.date, date));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, totalResult] = await Promise.all([
    db
      .select()
      .from(jobs)
      .where(whereClause)
      .orderBy(desc(jobs.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(jobs)
      .where(whereClause),
  ]);

  return {
    data,
    total: totalResult[0]?.count || 0,
    limit,
    offset,
  };
}

/**
 * Get a single job by ID
 */
export async function getJobById(id: string): Promise<typeof jobs.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const result = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return result[0] || null;
}

/**
 * Create a new job
 */
export async function createJob(
  jobData: {
    businessId: string;
    title: string;
    payRate: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    shopName?: string;
    address?: string;
    city?: string;
    state?: string;
    lat?: string;
    lng?: string;
  }
): Promise<typeof jobs.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [newJob] = await db
    .insert(jobs)
    .values({
      businessId: jobData.businessId,
      title: jobData.title,
      payRate: jobData.payRate,
      description: jobData.description,
      date: jobData.date,
      startTime: jobData.startTime,
      endTime: jobData.endTime,
      status: 'open',
      shopName: jobData.shopName,
      address: jobData.address,
      city: jobData.city,
      state: jobData.state,
      lat: jobData.lat,
      lng: jobData.lng,
    })
    .returning();

  return newJob || null;
}

/**
 * Update a job by ID
 */
export async function updateJob(
  id: string,
  updates: {
    title?: string;
    payRate?: string;
    description?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    status?: 'open' | 'filled' | 'closed';
  }
): Promise<typeof jobs.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [updatedJob] = await db
    .update(jobs)
    .set({
      ...updates,
      updatedAt: sql`NOW()`,
    })
    .where(eq(jobs.id, id))
    .returning();

  return updatedJob || null;
}

/**
 * Delete a job by ID
 * Applications will be cascade deleted due to foreign key constraint
 */
export async function deleteJob(id: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  const result = await db.delete(jobs).where(eq(jobs.id, id)).returning();
  return result.length > 0;
}

/**
 * Get jobs with application counts (avoids N+1 queries)
 */
export async function getJobsWithApplicationCounts(
  filters: JobFilters = {}
): Promise<Array<typeof jobs.$inferSelect & { applicationCount: number }> | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const { businessId, status, limit = 50, offset = 0 } = filters;

  const conditions = [];
  if (businessId) {
    conditions.push(eq(jobs.businessId, businessId));
  }
  if (status) {
    conditions.push(eq(jobs.status, status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // This would require a more complex query with joins
  // For now, return jobs without counts - can be optimized later
  const jobList = await getJobs(filters);
  if (!jobList) {
    return null;
  }

  // TODO: Add proper JOIN query to get application counts in a single query
  return jobList.data.map((job) => ({ ...job, applicationCount: 0 }));
}

/**
 * Get total job count
 */
export async function getJobCount(): Promise<number> {
  const db = getDb();
  if (!db) {
    return 0;
  }

  const [result] = await db
    .select({ count: count() })
    .from(jobs);

  return result?.count || 0;
}

/**
 * Get active job count (status = 'open')
 */
export async function getActiveJobCount(): Promise<number> {
  const db = getDb();
  if (!db) {
    return 0;
  }

  const [result] = await db
    .select({ count: count() })
    .from(jobs)
    .where(eq(jobs.status, 'open'));

  return result?.count || 0;
}

