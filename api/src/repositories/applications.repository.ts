/**
 * Applications Repository
 * 
 * Encapsulates database queries for applications with pagination and filtering
 */

import { eq, and, desc, sql, count } from 'drizzle-orm';
import { applications, jobs } from '../db/schema.js';
import { getDb } from '../db/index.js';

export interface ApplicationFilters {
  jobId?: string;
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

  const { jobId, userId, status, limit = 50, offset = 0 } = filters;

  const conditions = [];
  if (jobId) {
    conditions.push(eq(applications.jobId, jobId));
  }
  if (userId) {
    conditions.push(eq(applications.userId, userId));
  }
  if (status) {
    conditions.push(eq(applications.status, status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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
 * Get applications for a user with job details (JOIN to avoid N+1)
 */
export async function getApplicationsForUser(
  userId: string,
  filters: { status?: 'pending' | 'accepted' | 'rejected' } = {}
): Promise<Array<typeof applications.$inferSelect & { job: typeof jobs.$inferSelect }> | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const conditions = [eq(applications.userId, userId)];
  if (filters.status) {
    conditions.push(eq(applications.status, filters.status));
  }

  const whereClause = and(...conditions);

  // Use JOIN to get job details in a single query
  const result = await db
    .select({
      application: applications,
      job: jobs,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(whereClause)
    .orderBy(desc(applications.appliedAt));

  return result.map((row) => ({
    ...row.application,
    job: row.job,
  })) as any;
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
    jobId: string;
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

  const [newApplication] = await db
    .insert(applications)
    .values({
      jobId: applicationData.jobId,
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
 * Check if a user has already applied to a job
 */
export async function hasUserAppliedToJob(
  jobId: string,
  userId?: string,
  email?: string
): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  const conditions = [eq(applications.jobId, jobId)];
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

