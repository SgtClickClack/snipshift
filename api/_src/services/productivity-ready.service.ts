/**
 * Productivity Ready Service
 * 
 * Manages the "Productivity Ready" flag for enterprise compliance.
 * This flag gates work eligibility for large enterprise clients (e.g., Endeavour Group).
 * 
 * Requirements for Productivity Ready:
 * 1. Government ID verification approved (idVerifiedStatus === 'APPROVED')
 * 2. VEVO verification completed (vevoVerified === true)
 * 3. VEVO not expired (vevoExpiryDate > now OR null for citizens)
 * 
 * COMPLIANCE NOTES:
 * - This is a hard gate for enterprise clients
 * - VEVO checks verify Australian work rights
 * - Required for all workers on enterprise-tier venues
 */

import { eq } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { profiles, users } from '../db/schema.js';

export interface VevoVerificationInput {
  userId: string;
  vevoReferenceNumber: string;
  vevoCheckType: 'citizen' | 'permanent_resident' | 'work_visa' | 'student_visa';
  vevoExpiryDate?: Date | null; // null for citizens/permanent residents
}

export interface ProductivityReadyStatus {
  isReady: boolean;
  idVerified: boolean;
  vevoVerified: boolean;
  vevoExpired: boolean;
  missingRequirements: string[];
  productivityReadyAt: Date | null;
}

/**
 * Check if a user is Productivity Ready
 * 
 * Returns detailed status including what requirements are missing.
 */
export async function checkProductivityReady(userId: string): Promise<ProductivityReadyStatus> {
  const db = getDb();
  if (!db) {
    return {
      isReady: false,
      idVerified: false,
      vevoVerified: false,
      vevoExpired: false,
      missingRequirements: ['Database unavailable'],
      productivityReadyAt: null,
    };
  }

  try {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!profile) {
      return {
        isReady: false,
        idVerified: false,
        vevoVerified: false,
        vevoExpired: false,
        missingRequirements: ['Profile not found'],
        productivityReadyAt: null,
      };
    }

    const missingRequirements: string[] = [];
    
    // Check ID verification
    const idVerified = profile.idVerifiedStatus === 'APPROVED';
    if (!idVerified) {
      missingRequirements.push('Government ID verification required');
    }

    // Check VEVO verification
    const vevoVerified = profile.vevoVerified === true;
    if (!vevoVerified) {
      missingRequirements.push('VEVO work rights verification required');
    }

    // Check VEVO expiry (if applicable)
    let vevoExpired = false;
    if (vevoVerified && profile.vevoExpiryDate) {
      const expiryDate = new Date(profile.vevoExpiryDate);
      const now = new Date();
      if (expiryDate < now) {
        vevoExpired = true;
        missingRequirements.push('VEVO work rights have expired - re-verification required');
      }
    }

    const isReady = idVerified && vevoVerified && !vevoExpired;

    return {
      isReady,
      idVerified,
      vevoVerified,
      vevoExpired,
      missingRequirements,
      productivityReadyAt: profile.productivityReadyAt || null,
    };
  } catch (error) {
    console.error('[PRODUCTIVITY_READY] Error checking status:', error);
    return {
      isReady: false,
      idVerified: false,
      vevoVerified: false,
      vevoExpired: false,
      missingRequirements: ['Error checking status'],
      productivityReadyAt: null,
    };
  }
}

/**
 * Mark VEVO verification as complete
 * 
 * This should be called after manual or automated VEVO check completion.
 * Automatically updates the productivityReady flag if all requirements are met.
 */
export async function completeVevoVerification(
  input: VevoVerificationInput
): Promise<{ success: boolean; productivityReady: boolean; error?: string }> {
  const db = getDb();
  if (!db) {
    return { success: false, productivityReady: false, error: 'Database unavailable' };
  }

  try {
    // Get current profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, input.userId))
      .limit(1);

    if (!profile) {
      return { success: false, productivityReady: false, error: 'Profile not found' };
    }

    const now = new Date();
    
    // Check if VEVO is expired (for visa holders)
    let vevoExpired = false;
    if (input.vevoExpiryDate) {
      vevoExpired = new Date(input.vevoExpiryDate) < now;
    }

    // Determine if user becomes productivity ready
    const idVerified = profile.idVerifiedStatus === 'APPROVED';
    const willBeProductivityReady = idVerified && !vevoExpired;

    // Update profile with VEVO verification
    await db
      .update(profiles)
      .set({
        vevoVerified: true,
        vevoVerifiedAt: now,
        vevoExpiryDate: input.vevoExpiryDate || null,
        vevoReferenceNumber: input.vevoReferenceNumber,
        vevoCheckType: input.vevoCheckType,
        productivityReady: willBeProductivityReady,
        productivityReadyAt: willBeProductivityReady && !profile.productivityReady ? now : profile.productivityReadyAt,
        updatedAt: now,
      })
      .where(eq(profiles.userId, input.userId));

    console.log(`[PRODUCTIVITY_READY] VEVO verification completed for user ${input.userId}. Productivity Ready: ${willBeProductivityReady}`);

    return {
      success: true,
      productivityReady: willBeProductivityReady,
    };
  } catch (error: any) {
    console.error('[PRODUCTIVITY_READY] Error completing VEVO verification:', error);
    return { success: false, productivityReady: false, error: error.message };
  }
}

/**
 * Update Productivity Ready flag based on current verification status
 * 
 * Should be called whenever ID verification status changes.
 */
export async function recalculateProductivityReady(userId: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  try {
    const status = await checkProductivityReady(userId);
    
    await db
      .update(profiles)
      .set({
        productivityReady: status.isReady,
        productivityReadyAt: status.isReady ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId));

    console.log(`[PRODUCTIVITY_READY] Recalculated for user ${userId}. Ready: ${status.isReady}`);
    return status.isReady;
  } catch (error) {
    console.error('[PRODUCTIVITY_READY] Error recalculating:', error);
    return false;
  }
}

/**
 * Revoke VEVO verification (e.g., visa expired, work rights revoked)
 */
export async function revokeVevoVerification(
  userId: string,
  reason: string
): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  try {
    await db
      .update(profiles)
      .set({
        vevoVerified: false,
        productivityReady: false,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId));

    console.log(`[PRODUCTIVITY_READY] VEVO verification revoked for user ${userId}. Reason: ${reason}`);
    return true;
  } catch (error) {
    console.error('[PRODUCTIVITY_READY] Error revoking VEVO:', error);
    return false;
  }
}

/**
 * Check if user can work for enterprise venues
 * 
 * This is the gate function that enterprise clients should check
 * before allowing a worker to accept shifts.
 */
export async function canWorkForEnterprise(userId: string): Promise<{
  canWork: boolean;
  reason?: string;
}> {
  const status = await checkProductivityReady(userId);
  
  if (!status.isReady) {
    return {
      canWork: false,
      reason: status.missingRequirements.join('; '),
    };
  }

  return { canWork: true };
}
