/**
 * Shift Acceptance Contract Service
 *
 * Logs binding agreements when a shift is accepted (action-as-signature).
 * Generates a contract hash for audit trail and digital receipt.
 */

import { getDb } from '../db/index.js';
import { contracts } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';
import * as usersRepo from '../repositories/users.repository.js';

const MSA_VERSION = '1.0';

/**
 * Generate a SHA-256 contract hash for audit trail.
 * Input: shiftId + venueId + professionalId + timestamp (ISO) + MSA version
 */
function generateContractHash(
  shiftId: string,
  venueId: string,
  professionalId: string,
  timestamp: Date
): string {
  const payload = `${shiftId}|${venueId}|${professionalId}|${timestamp.toISOString()}|${MSA_VERSION}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Create a contract record when a shift is accepted.
 * Call BEFORE or within the transaction that finalizes the status change.
 *
 * @param shiftId - The shift being accepted
 * @param venueId - The venue (employer) ID
 * @param professionalId - The professional who accepted
 * @param acceptedBy - 'professional' | 'venue' - Who performed the acceptance action
 * @returns The created contract or null if insertion fails
 */
export async function createShiftAcceptanceContract(
  shiftId: string,
  venueId: string,
  professionalId: string,
  acceptedBy: 'professional' | 'venue' = 'professional'
): Promise<{ id: string; contractHash: string; createdAt: Date } | null> {
  const db = getDb();
  if (!db) {
    console.error('[ContractService] Database not available');
    return null;
  }

  const now = new Date();
  const contractHash = generateContractHash(shiftId, venueId, professionalId, now);

  const professional = await usersRepo.getUserById(professionalId);
  const professionalName = professional?.name || 'Professional';

  const acceptanceLog =
    acceptedBy === 'professional'
      ? `User ${professionalName} (${professionalId}) accepted the terms of the MSA for Shift ${shiftId}`
      : `Venue accepted application; User ${professionalName} (${professionalId}) bound to MSA for Shift ${shiftId}`;

  try {
    const [inserted] = await db
      .insert(contracts)
      .values({
        shiftId,
        venueId,
        professionalId,
        contractHash,
        acceptanceLog,
      })
      .returning({ id: contracts.id, contractHash: contracts.contractHash, createdAt: contracts.createdAt });

    if (inserted) {
      console.log(`[ContractService] Contract recorded for shift ${shiftId}: ${contractHash.substring(0, 16)}...`);
      return inserted;
    }
  } catch (err) {
    // Handle duplicate (shift already has contract) - idempotent, don't fail
    if ((err as { code?: string })?.code === '23505') {
      const existing = await db.select().from(contracts).where(eq(contracts.shiftId, shiftId)).limit(1);
      if (existing[0]) {
        return {
          id: existing[0].id,
          contractHash: existing[0].contractHash,
          createdAt: existing[0].createdAt,
        };
      }
    }
    console.error('[ContractService] Failed to create contract:', err);
  }

  return null;
}

/**
 * Replace contract professional (e.g. when backup worker takes over).
 * Updates existing contract for the shift with the new professional.
 */
export async function replaceContractProfessional(
  shiftId: string,
  venueId: string,
  newProfessionalId: string
): Promise<{ id: string; contractHash: string; createdAt: Date } | null> {
  const db = getDb();
  if (!db) return null;

  const existing = await db.select().from(contracts).where(eq(contracts.shiftId, shiftId)).limit(1);
  if (existing.length === 0) {
    return createShiftAcceptanceContract(shiftId, venueId, newProfessionalId, 'professional');
  }

  const now = new Date();
  const contractHash = generateContractHash(shiftId, venueId, newProfessionalId, now);
  const professional = await usersRepo.getUserById(newProfessionalId);
  const professionalName = professional?.name || 'Professional';
  const acceptanceLog = `Backup worker ${professionalName} (${newProfessionalId}) accepted the terms of the MSA for Shift ${shiftId}`;

  const [updated] = await db
    .update(contracts)
    .set({
      professionalId: newProfessionalId,
      contractHash,
      acceptanceLog,
      createdAt: now,
    })
    .where(eq(contracts.shiftId, shiftId))
    .returning({ id: contracts.id, contractHash: contracts.contractHash, createdAt: contracts.createdAt });

  return updated || null;
}

/**
 * Get contract by shift ID (for digital receipt).
 */
export async function getContractByShiftId(
  shiftId: string
): Promise<{ id: string; contractHash: string; createdAt: Date; acceptanceLog: string | null } | null> {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select({
      id: contracts.id,
      contractHash: contracts.contractHash,
      createdAt: contracts.createdAt,
      acceptanceLog: contracts.acceptanceLog,
    })
    .from(contracts)
    .where(eq(contracts.shiftId, shiftId))
    .limit(1);

  return row || null;
}
