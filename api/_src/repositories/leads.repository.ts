/**
 * Leads Repository
 * 
 * Database operations for enterprise lead management
 */

import { eq, desc } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { leads } from '../db/schema.js';

export interface CreateLeadInput {
  companyName: string;
  contactName?: string;
  email: string;
  phone?: string;
  numberOfLocations?: number;
  inquiryType?: 'enterprise_plan' | 'custom_solution' | 'partnership' | 'general';
  message?: string;
  source?: string;
}

export interface Lead {
  id: string;
  companyName: string;
  contactName: string | null;
  email: string;
  phone: string | null;
  numberOfLocations: number | null;
  inquiryType: 'enterprise_plan' | 'custom_solution' | 'partnership' | 'general';
  message: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'closed_won' | 'closed_lost';
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a new enterprise lead
 */
export async function createLead(input: CreateLeadInput): Promise<Lead | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const [newLead] = await db
      .insert(leads)
      .values({
        companyName: input.companyName,
        contactName: input.contactName || null,
        email: input.email,
        phone: input.phone || null,
        numberOfLocations: input.numberOfLocations || null,
        inquiryType: input.inquiryType || 'enterprise_plan',
        message: input.message || null,
        source: input.source || 'contact_form',
      })
      .returning();

    return newLead as Lead;
  } catch (error) {
    console.error('[LEADS REPO] Error creating lead:', error);
    return null;
  }
}

/**
 * Get lead by ID
 */
export async function getLeadById(id: string): Promise<Lead | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, id))
      .limit(1);

    return lead as Lead || null;
  } catch (error) {
    console.error('[LEADS REPO] Error fetching lead:', error);
    return null;
  }
}

/**
 * Get all leads (for admin dashboard)
 */
export async function getAllLeads(options?: {
  status?: Lead['status'];
  limit?: number;
  offset?: number;
}): Promise<{ data: Lead[]; total: number } | null> {
  const db = getDb();
  if (!db) return null;

  try {
    let query = db.select().from(leads);

    if (options?.status) {
      query = query.where(eq(leads.status, options.status)) as typeof query;
    }

    // Get total count
    const allResults = await query;
    const total = allResults.length;

    // Apply pagination
    let paginatedQuery = db
      .select()
      .from(leads)
      .orderBy(desc(leads.createdAt));

    if (options?.status) {
      paginatedQuery = paginatedQuery.where(eq(leads.status, options.status)) as typeof paginatedQuery;
    }

    if (options?.limit) {
      paginatedQuery = paginatedQuery.limit(options.limit) as typeof paginatedQuery;
    }

    if (options?.offset) {
      paginatedQuery = paginatedQuery.offset(options.offset) as typeof paginatedQuery;
    }

    const results = await paginatedQuery;

    return {
      data: results as Lead[],
      total,
    };
  } catch (error) {
    console.error('[LEADS REPO] Error fetching leads:', error);
    return null;
  }
}

/**
 * Update lead status
 */
export async function updateLeadStatus(
  id: string,
  status: Lead['status']
): Promise<Lead | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const [updated] = await db
      .update(leads)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    return updated as Lead || null;
  } catch (error) {
    console.error('[LEADS REPO] Error updating lead status:', error);
    return null;
  }
}
