/**
 * Shift Logs Repository
 * 
 * Encapsulates database queries for shift attendance logs
 */

import { eq, and, desc } from 'drizzle-orm';
import { shiftLogs } from '../db/schema/shifts.js';
import { getDb } from '../db/index.js';

export interface CreateShiftLogInput {
  shiftId: string;
  staffId: string;
  eventType: string;
  latitude?: number | null;
  longitude?: number | null;
  venueLatitude?: number | null;
  venueLongitude?: number | null;
  distanceMeters?: number | null;
  accuracy?: number | null;
  metadata?: string | null;
}

/**
 * Create a new shift log entry
 */
export async function createShiftLog(
  input: CreateShiftLogInput
): Promise<typeof shiftLogs.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [newLog] = await db
    .insert(shiftLogs)
    .values({
      shiftId: input.shiftId,
      staffId: input.staffId,
      eventType: input.eventType,
      latitude: input.latitude !== undefined && input.latitude !== null ? input.latitude.toString() : null,
      longitude: input.longitude !== undefined && input.longitude !== null ? input.longitude.toString() : null,
      venueLatitude: input.venueLatitude !== undefined && input.venueLatitude !== null ? input.venueLatitude.toString() : null,
      venueLongitude: input.venueLongitude !== undefined && input.venueLongitude !== null ? input.venueLongitude.toString() : null,
      distanceMeters: input.distanceMeters ?? null,
      accuracy: input.accuracy !== undefined && input.accuracy !== null ? input.accuracy.toString() : null,
      metadata: input.metadata ?? null,
    })
    .returning();

  return newLog || null;
}

/**
 * Get shift logs for a specific shift
 */
export async function getShiftLogsByShiftId(shiftId: string): Promise<typeof shiftLogs.$inferSelect[]> {
  const db = getDb();
  if (!db) {
    return [];
  }

  return await db
    .select()
    .from(shiftLogs)
    .where(eq(shiftLogs.shiftId, shiftId))
    .orderBy(desc(shiftLogs.timestamp));
}

/**
 * Get shift logs for a specific staff member
 */
export async function getShiftLogsByStaffId(staffId: string): Promise<typeof shiftLogs.$inferSelect[]> {
  const db = getDb();
  if (!db) {
    return [];
  }

  return await db
    .select()
    .from(shiftLogs)
    .where(eq(shiftLogs.staffId, staffId))
    .orderBy(desc(shiftLogs.timestamp));
}
