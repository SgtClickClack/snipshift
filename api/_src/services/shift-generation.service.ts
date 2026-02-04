/**
 * Shift Generation Service
 * Auto-generates OPEN shifts from ShiftTemplates for a venue/date range.
 *
 * Safety:
 * - Prevents duplicate generation: only creates missing slots (requiredStaffCount - existing)
 * - Uses venue context (employerId -> venue) for template lookup
 *
 * Future: Venue timezone - when venues schema includes timezone, combineDateAndTime
 * should use that timezone for correct local shift times.
 */

import * as shiftTemplatesRepo from '../repositories/shift-templates.repository.js';
import * as shiftsRepo from '../repositories/shifts.repository.js';
import * as venuesRepo from '../repositories/venues.repository.js';
import { SHIFT_CONFIG } from '../config/business.config.js';

export interface GenerateFromTemplatesResult {
  created: number;
  skipped: number;
  errors: string[];
}

/**
 * Build a Date from a base date + HH:mm time string
 */
function combineDateAndTime(baseDate: Date, timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Check if two shifts overlap (same start and end)
 */
function shiftsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart.getTime() === bStart.getTime() && aEnd.getTime() === bEnd.getTime();
}

/**
 * Generate OPEN shifts from ShiftTemplates for a venue and date range.
 * - employerId: the venue owner (user) ID - used to resolve venue and create shifts
 * - Fetches templates for the venue
 * - For each day in range, creates requiredStaffCount shifts per matching template
 * - Skips slots that already have a shift (prevents duplicates)
 * - dayOfWeek: 0=Sun, 1=Mon, ..., 6=Sat (JavaScript Date.getDay())
 * 
 * PERFORMANCE: Uses batch insert with transaction wrapper to prevent N+1 queries
 * and ensure atomic operation (all-or-nothing).
 */
export async function generateFromTemplates(
  employerId: string,
  startDate: Date,
  endDate: Date,
  options?: { defaultHourlyRate?: string; defaultLocation?: string }
): Promise<GenerateFromTemplatesResult> {
  const result: GenerateFromTemplatesResult = { created: 0, skipped: 0, errors: [] };
  const hourlyRate = options?.defaultHourlyRate ?? SHIFT_CONFIG.DEFAULT_HOURLY_RATE;
  const location = options?.defaultLocation ?? '';

  const venue = await venuesRepo.getVenueByUserId(employerId);
  if (!venue) {
    result.errors.push('Venue not found');
    return result;
  }

  const venueId = venue.id;

  const templates = await shiftTemplatesRepo.getTemplatesByVenueId(venueId);
  if (templates.length === 0) {
    result.errors.push('No shift templates configured. Add capacity in Settings > Capacity Planner.');
    return result;
  }

  const existingShifts = await shiftsRepo.getShiftsByEmployerInRange(
    employerId,
    startDate,
    endDate
  );

  // Pre-index existing shifts by time slot key for O(1) lookups
  // This reduces complexity from O(n*m*d) to O(n + m*d)
  const existingShiftsBySlot = new Map<string, number>();
  for (const shift of existingShifts) {
    const sStart = shift.startTime instanceof Date ? shift.startTime : new Date(shift.startTime);
    const sEnd = shift.endTime instanceof Date ? shift.endTime : new Date(shift.endTime);
    const slotKey = `${sStart.getTime()}-${sEnd.getTime()}`;
    existingShiftsBySlot.set(slotKey, (existingShiftsBySlot.get(slotKey) ?? 0) + 1);
  }

  // Collect all shifts to create in a batch array
  const shiftsToCreate: Array<{
    employerId: string;
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    hourlyRate: string;
    status: 'open';
    location?: string;
    templateId?: string; // Links to source template for audit trail
  }> = [];

  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const baseDate = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 0, 0, 0, 0);

    for (const template of templates) {
      if (template.dayOfWeek !== dayOfWeek) continue;

      const slotStart = combineDateAndTime(baseDate, template.startTime);
      const slotEnd = combineDateAndTime(baseDate, template.endTime);

      if (slotEnd <= slotStart) {
        result.errors.push(`Invalid template ${template.label}: end before start`);
        continue;
      }

      // O(1) lookup instead of O(n) filter
      const slotKey = `${slotStart.getTime()}-${slotEnd.getTime()}`;
      const overlappingCount = existingShiftsBySlot.get(slotKey) ?? 0;

      const toCreate = Math.max(0, template.requiredStaffCount - overlappingCount);
      result.skipped += overlappingCount;

      if (toCreate === 0) continue;

      // Queue shifts for batch creation instead of individual inserts
      for (let i = 0; i < toCreate; i++) {
        shiftsToCreate.push({
          employerId,
          title: template.label,
          description: `Auto-generated from capacity template (${template.label})`,
          startTime: slotStart,
          endTime: slotEnd,
          hourlyRate,
          status: 'open',
          location: location || undefined,
          templateId: template.id, // Link to source template for audit trail
        });

        // Update the index to prevent duplicates within this batch
        existingShiftsBySlot.set(slotKey, (existingShiftsBySlot.get(slotKey) ?? 0) + 1);
      }
    }

    current.setDate(current.getDate() + 1);
  }

  // Batch insert all shifts in a single transaction
  // This fixes N+1 query issue and provides atomic operation
  if (shiftsToCreate.length > 0) {
    try {
      const createdShifts = await shiftsRepo.createBatchShifts(shiftsToCreate);
      result.created = createdShifts.length;
    } catch (err) {
      result.errors.push(
        `Failed to create shifts in batch: ${(err as Error).message}`
      );
    }
  }

  return result;
}

/**
 * Preview how many shifts would be generated without creating them.
 * Used by the frontend to show estimated count in the confirmation modal.
 */
export async function previewFromTemplates(
  employerId: string,
  startDate: Date,
  endDate: Date
): Promise<{ estimatedCount: number; hasTemplates: boolean; error?: string }> {
  const venue = await venuesRepo.getVenueByUserId(employerId);
  if (!venue) {
    return { estimatedCount: 0, hasTemplates: false, error: 'Venue not found' };
  }

  const templates = await shiftTemplatesRepo.getTemplatesByVenueId(venue.id);
  if (templates.length === 0) {
    return { estimatedCount: 0, hasTemplates: false, error: 'No shift templates configured' };
  }

  const existingShifts = await shiftsRepo.getShiftsByEmployerInRange(
    employerId,
    startDate,
    endDate
  );

  let estimatedCount = 0;
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const baseDate = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 0, 0, 0, 0);

    for (const template of templates) {
      if (template.dayOfWeek !== dayOfWeek) continue;

      const slotStart = combineDateAndTime(baseDate, template.startTime);
      const slotEnd = combineDateAndTime(baseDate, template.endTime);

      if (slotEnd <= slotStart) continue;

      const overlappingCount = existingShifts.filter((s) => {
        const sStart = s.startTime instanceof Date ? s.startTime : new Date(s.startTime);
        const sEnd = s.endTime instanceof Date ? s.endTime : new Date(s.endTime);
        return shiftsOverlap(slotStart, slotEnd, sStart, sEnd);
      }).length;

      estimatedCount += Math.max(0, template.requiredStaffCount - overlappingCount);
    }

    current.setDate(current.getDate() + 1);
  }

  return { estimatedCount, hasTemplates: true };
}
