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

const DEFAULT_HOURLY_RATE = '45';

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
 */
export async function generateFromTemplates(
  employerId: string,
  startDate: Date,
  endDate: Date,
  options?: { defaultHourlyRate?: string; defaultLocation?: string }
): Promise<GenerateFromTemplatesResult> {
  const result: GenerateFromTemplatesResult = { created: 0, skipped: 0, errors: [] };
  const hourlyRate = options?.defaultHourlyRate ?? DEFAULT_HOURLY_RATE;
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

      const overlappingCount = existingShifts.filter((s) => {
        const sStart = s.startTime instanceof Date ? s.startTime : new Date(s.startTime);
        const sEnd = s.endTime instanceof Date ? s.endTime : new Date(s.endTime);
        return shiftsOverlap(slotStart, slotEnd, sStart, sEnd);
      }).length;

      const toCreate = Math.max(0, template.requiredStaffCount - overlappingCount);
      result.skipped += overlappingCount;

      if (toCreate === 0) continue;

      for (let i = 0; i < toCreate; i++) {
        try {
          const shift = await shiftsRepo.createShift({
            employerId,
            title: template.label,
            description: `Auto-generated from capacity template (${template.label})`,
            startTime: slotStart,
            endTime: slotEnd,
            hourlyRate,
            status: 'open',
            assigneeId: undefined,
            location: location || undefined,
            capacity: 1,
          });

          if (shift) {
            result.created++;
            existingShifts.push(shift as any);
          }
        } catch (err) {
          result.errors.push(
            `Failed to create shift ${template.label} ${slotStart.toISOString()}: ${(err as Error).message}`
          );
        }
      }
    }

    current.setDate(current.getDate() + 1);
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
