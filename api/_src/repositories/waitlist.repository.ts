/**
 * Waitlist Repository
 * 
 * Database operations for waitlist signups
 */

import { eq, desc, and, sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { waitlist, users, venues } from '../db/schema.js';

export interface CreateWaitlistInput {
  role: 'venue' | 'staff';
  name: string; // Venue Name or Full Name
  contact: string; // Email or Mobile
  location?: string; // ISO Standardized location, defaults to 'Brisbane, AU'
}

export interface WaitlistEntry {
  id: string;
  role: 'venue' | 'staff';
  name: string;
  contact: string;
  location: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedAt: Date | null;
  createdAt: Date;
}

/**
 * Create a new waitlist entry
 */
export async function createWaitlistEntry(input: CreateWaitlistInput): Promise<WaitlistEntry | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const [newEntry] = await db
      .insert(waitlist)
      .values({
        role: input.role,
        name: input.name,
        contact: input.contact,
        location: input.location || 'Brisbane, AU',
      })
      .returning();

    return newEntry as WaitlistEntry;
  } catch (error) {
    console.error('[WAITLIST REPO] Error creating waitlist entry:', error);
    return null;
  }
}

/**
 * Get all waitlist entries
 * 
 * @param options - Optional query parameters
 * @param options.role - Filter by role ('venue' | 'staff')
 * @param options.limit - Maximum number of entries to return
 * @param options.offset - Number of entries to skip
 * @returns Array of waitlist entries sorted by creation date (newest first)
 */
export async function getAllWaitlistEntries(options?: {
  role?: 'venue' | 'staff';
  limit?: number;
  offset?: number;
}): Promise<WaitlistEntry[]> {
  const db = getDb();
  if (!db) return [];

  try {
    let query = db.select().from(waitlist);

    // Filter by role if provided
    if (options?.role) {
      query = query.where(eq(waitlist.role, options.role)) as any;
    }

    // Order by creation date (newest first)
    query = query.orderBy(desc(waitlist.createdAt)) as any;

    // Apply limit and offset
    if (options?.limit) {
      query = query.limit(options.limit) as any;
    }
    if (options?.offset) {
      query = query.offset(options.offset) as any;
    }

    const entries = await query;
    return entries as WaitlistEntry[];
  } catch (error) {
    console.error('[WAITLIST REPO] Error fetching waitlist entries:', error);
    return [];
  }
}

/**
 * Get waitlist entry by contact (email or phone)
 * 
 * @param contact - Email or phone number
 * @param role - Optional role filter ('venue' | 'staff')
 * @returns Waitlist entry or null if not found
 */
export async function getWaitlistEntryByContact(
  contact: string,
  role?: 'venue' | 'staff'
): Promise<WaitlistEntry | null> {
  const db = getDb();
  if (!db) return null;

  try {
    let query = db.select().from(waitlist);
    
    // Build where conditions
    const conditions = [eq(waitlist.contact, contact)];
    if (role) {
      conditions.push(eq(waitlist.role, role));
    }
    
    // Apply all conditions
    if (conditions.length > 1) {
      query = query.where(and(...conditions)) as any;
    } else {
      query = query.where(conditions[0]) as any;
    }

    const [entry] = await query.limit(1);
    return entry as WaitlistEntry | null;
  } catch (error) {
    console.error('[WAITLIST REPO] Error getting waitlist entry by contact:', error);
    return null;
  }
}

/**
 * Get waitlist entry by ID
 * 
 * @param id - Waitlist entry ID
 * @returns Waitlist entry or null if not found
 */
export async function getWaitlistEntryById(id: string): Promise<WaitlistEntry | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const [entry] = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.id, id))
      .limit(1);

    return entry as WaitlistEntry | null;
  } catch (error) {
    console.error('[WAITLIST REPO] Error getting waitlist entry by ID:', error);
    return null;
  }
}

/**
 * Update waitlist entry approval status
 * 
 * @param id - Waitlist entry ID
 * @param status - New approval status ('pending' | 'approved' | 'rejected')
 * @returns Updated waitlist entry or null if not found
 */
export async function updateWaitlistStatus(
  id: string,
  status: 'pending' | 'approved' | 'rejected'
): Promise<WaitlistEntry | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const updateData: any = {
      approvalStatus: status,
    };

    // Set approvedAt timestamp (ISO 8601 UTC) when status is 'approved'
    if (status === 'approved') {
      updateData.approvedAt = new Date();
    } else if (status === 'rejected' || status === 'pending') {
      // Clear approvedAt when status is rejected or reset to pending
      updateData.approvedAt = null;
    }

    const [updatedEntry] = await db
      .update(waitlist)
      .set(updateData)
      .where(eq(waitlist.id, id))
      .returning();

    if (!updatedEntry) {
      return null;
    }

    return updatedEntry as WaitlistEntry;
  } catch (error) {
    console.error('[WAITLIST REPO] Error updating waitlist status:', error);
    return null;
  }
}

/**
 * Onboarding Metrics Interface
 */
export interface OnboardingMetrics {
  totalApproved: number;
  totalOnboarded: number;
  totalBusinessUsers: number;
  totalProfessionalUsers: number;
  conversionRate: number; // Percentage
  pendingOnboarding: number;
  stuckLeads: WaitlistEntry[]; // Approved but not onboarded
  atRiskCount: number; // Approved leads > 24hrs ago without profile
  atRiskLeads: WaitlistEntry[]; // Approved > 24hrs ago without profile
  venuesByPostcode: Array<{
    postcode: string;
    count: number;
    venues: Array<{
      id: string;
      venueName: string;
      address: any;
      hasProfile: boolean;
    }>;
  }>;
}

/**
 * Get onboarding metrics for launch readiness report
 * 
 * @returns Metrics including conversion rates, stuck leads, and venue distribution
 */
export async function getOnboardingMetrics(): Promise<OnboardingMetrics | null> {
  const db = getDb();
  if (!db) return null;

  try {
    // Count total approved waitlist entries
    const [approvedCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(waitlist)
      .where(eq(waitlist.approvalStatus, 'approved'));

    const totalApproved = Number(approvedCountResult?.count || 0);

    // Count business users (role='business')
    const [businessCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, 'business'));

    const totalBusinessUsers = Number(businessCountResult?.count || 0);

    // Count professional users (role='professional')
    const [professionalCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, 'professional'));

    const totalProfessionalUsers = Number(professionalCountResult?.count || 0);

    // Count onboarded business users (users with role='business' and isOnboarded=true)
    const [onboardedCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(
        and(
          eq(users.role, 'business'),
          sql`${users.isOnboarded} = true`
        )
      );

    const totalOnboarded = Number(onboardedCountResult?.count || 0);

    // Calculate conversion rate
    const conversionRate = totalApproved > 0 
      ? Math.round((totalOnboarded / totalApproved) * 100) 
      : 0;

    // Get approved waitlist entries
    const approvedEntries = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.approvalStatus, 'approved'))
      .orderBy(desc(waitlist.approvedAt));

    // Get all onboarded business users with their emails
    const onboardedUsers = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(
        and(
          eq(users.role, 'business'),
          sql`${users.isOnboarded} = true`
        )
      );

    const onboardedEmails = new Set(onboardedUsers.map(u => u.email.toLowerCase()));

    // Find stuck leads: approved but not onboarded
    const stuckLeads = approvedEntries.filter(entry => {
      const entryEmail = entry.contact.toLowerCase();
      return !onboardedEmails.has(entryEmail);
    }) as WaitlistEntry[];

    const pendingOnboarding = stuckLeads.length;

    // Find "At Risk" leads: approved > 24hrs ago without profile
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const atRiskLeads = stuckLeads.filter(entry => {
      // Check if approved more than 24 hours ago
      if (!entry.approvedAt) return false;
      const approvedDate = new Date(entry.approvedAt);
      return approvedDate < twentyFourHoursAgo;
    }) as WaitlistEntry[];

    const atRiskCount = atRiskLeads.length;

    // Get venues grouped by postcode
    const allVenues = await db
      .select({
        id: venues.id,
        venueName: venues.venueName,
        address: venues.address,
      })
      .from(venues);

    // Group venues by postcode (Brisbane: 4000-4199)
    const postcodeMap = new Map<string, Array<{ id: string; venueName: string; address: any; hasProfile: boolean }>>();
    
    allVenues.forEach(venue => {
      const address = venue.address as any;
      const postcode = address?.postcode || 'unknown';
      const postcodeNum = parseInt(postcode);
      
      // Only include Brisbane postcodes (4000-4199)
      if (postcodeNum >= 4000 && postcodeNum <= 4199) {
        if (!postcodeMap.has(postcode)) {
          postcodeMap.set(postcode, []);
        }
        
        postcodeMap.get(postcode)!.push({
          id: venue.id,
          venueName: venue.venueName,
          address: venue.address,
          hasProfile: true, // If venue exists, it has a profile
        });
      }
    });

    // Convert to array and sort by count (descending), then by postcode
    const venuesByPostcode = Array.from(postcodeMap.entries())
      .map(([postcode, venues]) => ({
        postcode,
        count: venues.length,
        venues,
      }))
      .sort((a, b) => {
        // Sort by count descending, then by postcode ascending
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return a.postcode.localeCompare(b.postcode);
      });

    return {
      totalApproved,
      totalOnboarded,
      totalBusinessUsers,
      totalProfessionalUsers,
      conversionRate,
      pendingOnboarding,
      stuckLeads,
      atRiskCount,
      atRiskLeads,
      venuesByPostcode,
    };
  } catch (error) {
    console.error('[WAITLIST REPO] Error getting onboarding metrics:', error);
    return null;
  }
}