/**
 * Jobs Repository
 * 
 * Encapsulates database queries for jobs with pagination and filtering
 */

import { eq, and, desc, sql, count, gte, lte, or, ilike, getTableColumns } from 'drizzle-orm';
import { jobs, applications } from '../db/schema.js';
import { getDb } from '../db/index.js';

export interface JobFilters {
  businessId?: string;
  status?: 'open' | 'filled' | 'closed' | 'completed';
  limit?: number;
  offset?: number;
  city?: string;
  date?: string;
  // Advanced filters
  search?: string; // Fuzzy match on title/description
  minRate?: number;
  maxRate?: number;
  startDate?: string; // Date range start
  endDate?: string; // Date range end
  radius?: number; // Distance in km
  lat?: number; // User's latitude for distance filtering
  lng?: number; // User's longitude for distance filtering
}

export interface PaginatedJobs {
  data: typeof jobs.$inferSelect[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get paginated list of jobs with optional filters
 */
export async function getJobs(filters: JobFilters = {}): Promise<PaginatedJobs | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const { 
    businessId, 
    status, 
    limit = 50, 
    offset = 0, 
    city, 
    date,
    search,
    minRate,
    maxRate,
    startDate,
    endDate,
    radius,
    lat,
    lng,
  } = filters;

  const conditions = [];
  
  // Basic filters
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

  // Search filter (fuzzy match on title and description)
  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        ilike(jobs.title, searchPattern),
        ilike(jobs.description, searchPattern)
      )!
    );
  }

  // Pay rate filters
  if (minRate !== undefined) {
    conditions.push(gte(sql`CAST(${jobs.payRate} AS DECIMAL)`, minRate));
  }
  if (maxRate !== undefined) {
    conditions.push(lte(sql`CAST(${jobs.payRate} AS DECIMAL)`, maxRate));
  }

  // Date range filters
  if (startDate) {
    conditions.push(gte(jobs.date, startDate));
  }
  if (endDate) {
    conditions.push(lte(jobs.date, endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get all jobs matching filters (before distance filtering)
  let allJobs = await db
    .select()
    .from(jobs)
    .where(whereClause)
    .orderBy(desc(jobs.createdAt));

  // Apply distance filtering if radius and coordinates are provided
  if (radius !== undefined && lat !== undefined && lng !== undefined) {
    allJobs = allJobs.filter(job => {
      if (!job.lat || !job.lng) return false;
      const jobLat = parseFloat(job.lat);
      const jobLng = parseFloat(job.lng);
      if (isNaN(jobLat) || isNaN(jobLng)) return false;
      
      const distance = calculateDistance(lat, lng, jobLat, jobLng);
      return distance <= radius;
    });
  }

  // Get total count
  const total = allJobs.length;

  // Apply pagination
  const paginatedJobs = allJobs.slice(offset, offset + limit);

  return {
    data: paginatedJobs,
    total,
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
    status?: 'open' | 'filled' | 'closed' | 'completed';
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
      status: jobData.status || 'open',
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
    status?: 'open' | 'filled' | 'closed' | 'completed';
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

  const { 
    businessId, 
    status, 
    limit = 50, 
    offset = 0,
    city,
    date,
    search,
    minRate,
    maxRate,
    startDate,
    endDate,
    radius,
    lat,
    lng,
  } = filters;

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
  
  // Search filter (fuzzy match on title and description)
  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        ilike(jobs.title, searchPattern),
        ilike(jobs.description, searchPattern)
      )!
    );
  }

  // Pay rate filters
  if (minRate !== undefined) {
    conditions.push(gte(sql`CAST(${jobs.payRate} AS DECIMAL)`, minRate));
  }
  if (maxRate !== undefined) {
    conditions.push(lte(sql`CAST(${jobs.payRate} AS DECIMAL)`, maxRate));
  }

  // Date range filters
  if (startDate) {
    conditions.push(gte(jobs.date, startDate));
  }
  if (endDate) {
    conditions.push(lte(jobs.date, endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Use leftJoin and count aggregation
  let query = db
    .select({
      ...getTableColumns(jobs),
      applicationCount: sql<number>`count(${applications.id})`.mapWith(Number),
    })
    .from(jobs)
    .leftJoin(applications, eq(jobs.id, applications.jobId))
    .where(whereClause)
    .groupBy(jobs.id)
    .orderBy(desc(jobs.createdAt));

  // Apply distance filtering in memory if radius is provided
  if (radius !== undefined && lat !== undefined && lng !== undefined) {
    const allJobs = await query as unknown as (typeof jobs.$inferSelect & { applicationCount: number })[];
    const filteredJobs = allJobs.filter(job => {
      if (!job.lat || !job.lng) return false;
      const jobLat = parseFloat(job.lat as string);
      const jobLng = parseFloat(job.lng as string);
      if (isNaN(jobLat) || isNaN(jobLng)) return false;
      
      const distance = calculateDistance(lat, lng, jobLat, jobLng);
      return distance <= radius;
    });
    
    return filteredJobs.slice(offset, offset + limit);
  }

  // Otherwise use SQL limit/offset
  const paginatedJobs = await query.limit(limit).offset(offset) as unknown as (typeof jobs.$inferSelect & { applicationCount: number })[];
  return paginatedJobs;
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
