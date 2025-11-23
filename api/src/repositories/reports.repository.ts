/**
 * Reports Repository
 * 
 * Encapsulates database queries for reports
 */

import { eq, desc, and, count } from 'drizzle-orm';
import { reports } from '../db/schema.js';
import { getDb } from '../db/index.js';

/**
 * Create a new report
 */
export async function createReport(data: {
  reporterId: string;
  reportedId?: string;
  jobId?: string;
  reason: 'no_show' | 'payment_issue' | 'harassment' | 'spam' | 'other';
  description: string;
}) {
  const db = getDb();
  if (!db) {
    return null;
  }

  // Ensure at least one of reportedId or jobId is provided
  if (!data.reportedId && !data.jobId) {
    throw new Error('Either reportedId or jobId must be provided');
  }

  const [newReport] = await db
    .insert(reports)
    .values({
      reporterId: data.reporterId,
      reportedId: data.reportedId || null,
      jobId: data.jobId || null,
      reason: data.reason,
      description: data.description,
      status: 'pending',
    })
    .returning();

  return newReport || null;
}

/**
 * Get all reports (for admin)
 */
export async function getAllReports(limit: number = 100, offset: number = 0, status?: 'pending' | 'resolved' | 'dismissed') {
  const db = getDb();
  if (!db) {
    return null;
  }

  const conditions = [];
  if (status) {
    conditions.push(eq(reports.status, status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db
    .select()
    .from(reports)
    .where(whereClause)
    .orderBy(desc(reports.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count
  const [totalResult] = await db
    .select({ count: count() })
    .from(reports)
    .where(whereClause);

  return {
    data: result,
    total: totalResult?.count || 0,
    limit,
    offset,
  };
}

/**
 * Get report by ID
 */
export async function getReportById(id: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, id))
    .limit(1);

  return report || null;
}

/**
 * Update report status
 */
export async function updateReportStatus(
  id: string,
  status: 'pending' | 'resolved' | 'dismissed'
) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [updated] = await db
    .update(reports)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(reports.id, id))
    .returning();

  return updated || null;
}

/**
 * Get reports for a specific user (reports they made)
 */
export async function getReportsByReporter(reporterId: string) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const result = await db
    .select()
    .from(reports)
    .where(eq(reports.reporterId, reporterId))
    .orderBy(desc(reports.createdAt));

  return result;
}

