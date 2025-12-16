/**
 * Shift Invitations Repository
 * 
 * Encapsulates database queries for shift invitations
 * Supports the "First-to-Accept" invitation pattern
 */

import { eq, and, desc, ne, inArray, sql } from 'drizzle-orm';
import { shiftInvitations, shifts } from '../db/schema.js';
import { getDb } from '../db/index.js';

export type ShiftInvitationStatus = 'PENDING' | 'EXPIRED' | 'DECLINED';

/**
 * Create a new shift invitation
 */
export async function createShiftInvitation(invitationData: {
  shiftId: string;
  professionalId: string;
}): Promise<typeof shiftInvitations.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    console.error('[createShiftInvitation] Database not available');
    return null;
  }

  try {
    const [newInvitation] = await db
      .insert(shiftInvitations)
      .values({
        shiftId: invitationData.shiftId,
        professionalId: invitationData.professionalId,
        status: 'PENDING',
      })
      .returning();

    return newInvitation || null;
  } catch (error: any) {
    // Handle unique constraint violation (duplicate invitation)
    if (error?.code === '23505') {
      console.warn('[createShiftInvitation] Duplicate invitation for shift and professional');
      return null;
    }
    console.error('[createShiftInvitation] Database error:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      constraint: error?.constraint,
      data: invitationData,
    });
    throw error;
  }
}

/**
 * Create multiple shift invitations at once (for multi-invite)
 */
export async function createBulkInvitations(
  shiftId: string,
  professionalIds: string[]
): Promise<typeof shiftInvitations.$inferSelect[]> {
  const db = getDb();
  if (!db) {
    console.error('[createBulkInvitations] Database not available');
    return [];
  }

  if (professionalIds.length === 0) {
    return [];
  }

  try {
    const values = professionalIds.map((professionalId) => ({
      shiftId,
      professionalId,
      status: 'PENDING' as const,
    }));

    const newInvitations = await db
      .insert(shiftInvitations)
      .values(values)
      .onConflictDoNothing() // Skip duplicates gracefully
      .returning();

    return newInvitations || [];
  } catch (error: any) {
    console.error('[createBulkInvitations] Database error:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      shiftId,
      professionalIds,
    });
    throw error;
  }
}

/**
 * Get a shift invitation by ID
 */
export async function getShiftInvitationById(id: string): Promise<typeof shiftInvitations.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [invitation] = await db
    .select()
    .from(shiftInvitations)
    .where(eq(shiftInvitations.id, id))
    .limit(1);

  return invitation || null;
}

/**
 * Get all pending invitations for a shift
 */
export async function getPendingInvitationsForShift(shiftId: string): Promise<typeof shiftInvitations.$inferSelect[]> {
  const db = getDb();
  if (!db) {
    return [];
  }

  const result = await db
    .select()
    .from(shiftInvitations)
    .where(and(
      eq(shiftInvitations.shiftId, shiftId),
      eq(shiftInvitations.status, 'PENDING')
    ))
    .orderBy(desc(shiftInvitations.createdAt));

  return result;
}

/**
 * Get all pending invitations for a professional
 */
export async function getPendingInvitationsForProfessional(professionalId: string): Promise<typeof shiftInvitations.$inferSelect[]> {
  const db = getDb();
  if (!db) {
    return [];
  }

  const result = await db
    .select()
    .from(shiftInvitations)
    .where(and(
      eq(shiftInvitations.professionalId, professionalId),
      eq(shiftInvitations.status, 'PENDING')
    ))
    .orderBy(desc(shiftInvitations.createdAt));

  return result;
}

/**
 * Get pending invitations for a professional with shift details
 */
export async function getPendingInvitationsWithShiftDetails(professionalId: string): Promise<Array<{
  invitation: typeof shiftInvitations.$inferSelect;
  shift: typeof shifts.$inferSelect;
}>> {
  const db = getDb();
  if (!db) {
    return [];
  }

  try {
    const result = await db
      .select({
        invitation: shiftInvitations,
        shift: shifts,
      })
      .from(shiftInvitations)
      .innerJoin(shifts, eq(shiftInvitations.shiftId, shifts.id))
      .where(and(
        eq(shiftInvitations.professionalId, professionalId),
        eq(shiftInvitations.status, 'PENDING'),
        // Only include shifts that haven't been taken yet
        sql`${shifts.assigneeId} IS NULL`
      ))
      .orderBy(desc(shiftInvitations.createdAt));

    return result;
  } catch (error: any) {
    // Check if this is a "relation does not exist" error (table not created yet)
    const errorCode = error?.code ?? error?.cause?.code ?? error?.originalError?.code;
    const errorMessage = `${error?.message ?? ''} ${error?.cause?.message ?? ''}`.toLowerCase();
    
    if (errorCode === '42P01' || errorMessage.includes('does not exist') || errorMessage.includes('relation')) {
      console.warn('[getPendingInvitationsWithShiftDetails] shift_invitations table may not exist yet. Returning empty array.');
      return [];
    }
    
    // Log error details for debugging but don't expose to client
    console.error('[getPendingInvitationsWithShiftDetails] Database query error:', {
      professionalId,
      message: error?.message,
      code: errorCode,
      detail: error?.detail ?? error?.cause?.detail,
      hint: error?.hint ?? error?.cause?.hint,
    });
    
    // Return empty array for graceful degradation instead of crashing
    return [];
  }
}

/**
 * Check if a professional has a pending invitation for a shift
 */
export async function hasPendingInvitation(shiftId: string, professionalId: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  const [invitation] = await db
    .select()
    .from(shiftInvitations)
    .where(and(
      eq(shiftInvitations.shiftId, shiftId),
      eq(shiftInvitations.professionalId, professionalId),
      eq(shiftInvitations.status, 'PENDING')
    ))
    .limit(1);

  return !!invitation;
}

/**
 * Update a shift invitation status
 */
export async function updateShiftInvitation(
  id: string,
  updates: { status: ShiftInvitationStatus }
): Promise<typeof shiftInvitations.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [updatedInvitation] = await db
    .update(shiftInvitations)
    .set({ status: updates.status })
    .where(eq(shiftInvitations.id, id))
    .returning();

  return updatedInvitation || null;
}

/**
 * Expire all pending invitations for a shift (when someone accepts)
 * Optionally exclude a specific professional (the one who accepted)
 */
export async function expireAllPendingInvitationsForShift(
  shiftId: string,
  exceptProfessionalId?: string
): Promise<number> {
  const db = getDb();
  if (!db) {
    return 0;
  }

  // Build conditions
  const conditions = [
    eq(shiftInvitations.shiftId, shiftId),
    eq(shiftInvitations.status, 'PENDING'),
  ];
  
  if (exceptProfessionalId) {
    conditions.push(ne(shiftInvitations.professionalId, exceptProfessionalId));
  }

  const result = await db
    .update(shiftInvitations)
    .set({ status: 'EXPIRED' })
    .where(and(...conditions))
    .returning();

  return result.length;
}

/**
 * Decline a specific invitation
 */
export async function declineInvitation(
  shiftId: string,
  professionalId: string
): Promise<typeof shiftInvitations.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [updatedInvitation] = await db
    .update(shiftInvitations)
    .set({ status: 'DECLINED' })
    .where(and(
      eq(shiftInvitations.shiftId, shiftId),
      eq(shiftInvitations.professionalId, professionalId),
      eq(shiftInvitations.status, 'PENDING')
    ))
    .returning();

  return updatedInvitation || null;
}

/**
 * Get invitation counts by status for a shift
 */
export async function getInvitationCounts(shiftId: string): Promise<{
  pending: number;
  expired: number;
  declined: number;
  total: number;
}> {
  const db = getDb();
  if (!db) {
    return { pending: 0, expired: 0, declined: 0, total: 0 };
  }

  const invitations = await db
    .select()
    .from(shiftInvitations)
    .where(eq(shiftInvitations.shiftId, shiftId));

  const counts = {
    pending: 0,
    expired: 0,
    declined: 0,
    total: invitations.length,
  };

  for (const inv of invitations) {
    if (inv.status === 'PENDING') counts.pending++;
    else if (inv.status === 'EXPIRED') counts.expired++;
    else if (inv.status === 'DECLINED') counts.declined++;
  }

  return counts;
}
