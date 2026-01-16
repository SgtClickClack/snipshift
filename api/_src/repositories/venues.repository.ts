/**
 * Venues Repository
 * 
 * Database operations for venue profiles
 */

import { eq } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { venues } from '../db/schema.js';
import type { VenueAddress, OperatingHours } from '../db/schema/venues.js';

export interface CreateVenueInput {
  userId: string;
  waitlistId?: string; // Optional link to waitlist entry
  venueName: string;
  liquorLicenseNumber?: string;
  address: VenueAddress;
  operatingHours: OperatingHours;
}

export interface Venue {
  id: string;
  userId: string;
  waitlistId: string | null;
  venueName: string;
  liquorLicenseNumber: string | null;
  address: VenueAddress;
  operatingHours: OperatingHours;
  status: 'pending' | 'active';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a new venue profile
 */
export async function createVenue(input: CreateVenueInput): Promise<Venue | null> {
  const db = getDb();
  if (!db) {
    console.error('[VENUES REPO] Database not available');
    return null;
  }

  try {
    const [newVenue] = await db
      .insert(venues)
      .values({
        userId: input.userId,
        waitlistId: input.waitlistId || null,
        venueName: input.venueName,
        liquorLicenseNumber: input.liquorLicenseNumber || null,
        address: input.address,
        operatingHours: input.operatingHours,
      })
      .returning();

    return newVenue as Venue;
  } catch (error) {
    console.error('[VENUES REPO] Error creating venue:', error);
    return null;
  }
}

/**
 * Get venue by user ID
 */
export async function getVenueByUserId(userId: string): Promise<Venue | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  try {
    const [venue] = await db
      .select()
      .from(venues)
      .where(eq(venues.userId, userId))
      .limit(1);

    return venue as Venue | null;
  } catch (error) {
    console.error('[VENUES REPO] Error getting venue by user ID:', error);
    return null;
  }
}

/**
 * Get venue by waitlist ID
 */
export async function getVenueByWaitlistId(waitlistId: string): Promise<Venue | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  try {
    const [venue] = await db
      .select()
      .from(venues)
      .where(eq(venues.waitlistId, waitlistId))
      .limit(1);

    return venue as Venue | null;
  } catch (error) {
    console.error('[VENUES REPO] Error getting venue by waitlist ID:', error);
    return null;
  }
}

/**
 * Update venue profile
 */
export async function updateVenue(
  venueId: string,
  updates: Partial<Omit<CreateVenueInput, 'userId' | 'waitlistId'> & { status?: 'pending' | 'active' }>
): Promise<Venue | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  try {
    const [updatedVenue] = await db
      .update(venues)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(venues.id, venueId))
      .returning();

    return updatedVenue as Venue | null;
  } catch (error) {
    console.error('[VENUES REPO] Error updating venue:', error);
    return null;
  }
}

/**
 * Update venue status by user ID
 */
export async function updateVenueStatusByUserId(
  userId: string,
  status: 'pending' | 'active'
): Promise<Venue | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  try {
    const [updatedVenue] = await db
      .update(venues)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(venues.userId, userId))
      .returning();

    return updatedVenue as Venue | null;
  } catch (error) {
    console.error('[VENUES REPO] Error updating venue status:', error);
    return null;
  }
}
