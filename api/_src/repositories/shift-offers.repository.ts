/**
 * Shift Offers Repository
 * 
 * Encapsulates database queries for shift offers
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { shiftOffers } from '../db/schema.js';
import { getDb } from '../db/index.js';

/**
 * Create a new shift offer
 */
export async function createShiftOffer(offerData: {
  shiftId: string;
  professionalId: string;
  expiresAt?: Date | string;
}): Promise<typeof shiftOffers.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    console.error('[createShiftOffer] Database not available');
    return null;
  }

  try {
    const [newOffer] = await db
      .insert(shiftOffers)
      .values({
        shiftId: offerData.shiftId,
        professionalId: offerData.professionalId,
        status: 'pending',
        expiresAt: offerData.expiresAt 
          ? (typeof offerData.expiresAt === 'string' ? new Date(offerData.expiresAt) : offerData.expiresAt)
          : null,
      })
      .returning();

    return newOffer || null;
  } catch (error: any) {
    console.error('[createShiftOffer] Database error:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      constraint: error?.constraint,
      data: offerData,
    });
    throw error;
  }
}

/**
 * Get a shift offer by ID
 */
export async function getShiftOfferById(id: string): Promise<typeof shiftOffers.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [offer] = await db
    .select()
    .from(shiftOffers)
    .where(eq(shiftOffers.id, id))
    .limit(1);

  return offer || null;
}

/**
 * Get all pending offers for a shift
 */
export async function getPendingOffersForShift(shiftId: string): Promise<typeof shiftOffers.$inferSelect[]> {
  const db = getDb();
  if (!db) {
    return [];
  }

  const result = await db
    .select()
    .from(shiftOffers)
    .where(and(
      eq(shiftOffers.shiftId, shiftId),
      eq(shiftOffers.status, 'pending')
    ))
    .orderBy(desc(shiftOffers.createdAt));

  return result;
}

/**
 * Get all offers for a professional
 */
export async function getOffersForProfessional(professionalId: string, status?: 'pending' | 'accepted' | 'declined'): Promise<typeof shiftOffers.$inferSelect[]> {
  const db = getDb();
  if (!db) {
    return [];
  }

  const conditions = [eq(shiftOffers.professionalId, professionalId)];
  if (status) {
    conditions.push(eq(shiftOffers.status, status));
  }

  const result = await db
    .select()
    .from(shiftOffers)
    .where(and(...conditions))
    .orderBy(desc(shiftOffers.createdAt));

  return result;
}

/**
 * Update a shift offer
 */
export async function updateShiftOffer(
  id: string,
  updates: {
    status?: 'pending' | 'accepted' | 'declined';
  }
): Promise<typeof shiftOffers.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [updatedOffer] = await db
    .update(shiftOffers)
    .set({
      ...updates,
      updatedAt: sql`NOW()`,
    })
    .where(eq(shiftOffers.id, id))
    .returning();

  return updatedOffer || null;
}

/**
 * Update all pending offers for a shift to declined (when one is accepted)
 */
export async function declineAllPendingOffersForShift(shiftId: string, exceptOfferId?: string): Promise<number> {
  const db = getDb();
  if (!db) {
    return 0;
  }

  // Get all pending offers for this shift
  const pendingOffers = await db
    .select()
    .from(shiftOffers)
    .where(and(
      eq(shiftOffers.shiftId, shiftId),
      eq(shiftOffers.status, 'pending')
    ));

  // Update each offer individually (excluding the exception if provided)
  let updatedCount = 0;
  for (const offer of pendingOffers) {
    if (!exceptOfferId || offer.id !== exceptOfferId) {
      await db
        .update(shiftOffers)
        .set({
          status: 'declined',
          updatedAt: sql`NOW()`,
        })
        .where(eq(shiftOffers.id, offer.id));
      updatedCount++;
    }
  }

  return updatedCount;
}

/**
 * Check if an offer is still valid (not expired and still pending)
 */
export async function isOfferValid(offerId: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  const offer = await getShiftOfferById(offerId);
  if (!offer) {
    return false;
  }

  if (offer.status !== 'pending') {
    return false;
  }

  if (offer.expiresAt && new Date(offer.expiresAt) < new Date()) {
    return false;
  }

  return true;
}

