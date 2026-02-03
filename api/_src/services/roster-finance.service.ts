/**
 * Roster Finance Service
 *
 * Calculates wage costs for roster periods. Used by business/venue owners
 * to see estimated wage spend for confirmed/filled shifts.
 */

import { getDb } from '../db/index.js';
import { shifts, shiftAssignments, users } from '../db/schema.js';
import { eq, and, gte, lte, isNull, inArray } from 'drizzle-orm';

export interface RosterTotalsResult {
  totalHours: number;
  totalCost: number;
  currency: string;
}

/** Statuses that count toward roster wage cost (staff assigned) */
const COSTED_STATUSES = ['confirmed', 'filled', 'completed'] as const;

/**
 * Calculate roster wage totals for a venue (employer) within a date range.
 * Fetches APPROVED/PUBLISHED shifts (confirmed, filled, completed) with assigned staff,
 * joins users for base_hourly_rate, computes duration * rate per assignment.
 *
 * @param employerId - Venue owner / business user ID (shifts.employerId)
 * @param startDate - Start of period
 * @param endDate - End of period
 */
export async function calculateRosterTotals(
  employerId: string,
  startDate: Date,
  endDate: Date
): Promise<RosterTotalsResult> {
  const db = getDb();
  if (!db) {
    return { totalHours: 0, totalCost: 0, currency: 'AUD' };
  }

  try {
    const fullShifts = await db
      .select({
        id: shifts.id,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        hourlyRate: shifts.hourlyRate,
        assigneeId: shifts.assigneeId,
      })
      .from(shifts)
      .where(
        and(
          eq(shifts.employerId, employerId),
          isNull(shifts.deletedAt),
          inArray(shifts.status, [...COSTED_STATUSES]),
          gte(shifts.startTime, startDate),
          lte(shifts.startTime, endDate)
        )
      );

    const shiftIds = fullShifts.map((s) => s.id);
    const assignments =
      shiftIds.length > 0
        ? await db
            .select({ userId: shiftAssignments.userId, shiftId: shiftAssignments.shiftId })
            .from(shiftAssignments)
            .where(inArray(shiftAssignments.shiftId, shiftIds))
        : [];

    const shiftIdToAssignments = new Map<string, string[]>();
    for (const a of assignments) {
      const list = shiftIdToAssignments.get(a.shiftId) || [];
      list.push(a.userId);
      shiftIdToAssignments.set(a.shiftId, list);
    }

    const allStaffIds = new Set<string>();
    for (const s of fullShifts) {
      if (s.assigneeId) allStaffIds.add(s.assigneeId);
    }
    for (const list of shiftIdToAssignments.values()) {
      list.forEach((id) => allStaffIds.add(id));
    }

    const staffRates =
      allStaffIds.size > 0
        ? await db
            .select({
              id: users.id,
              baseHourlyRate: users.baseHourlyRate,
              currency: users.currency,
            })
            .from(users)
            .where(inArray(users.id, Array.from(allStaffIds)))
        : [];

    const rateMap = new Map<string, { rate: number; currency: string }>();
    for (const u of staffRates) {
      const rate = u.baseHourlyRate ? Number(u.baseHourlyRate) : 0;
      const currency = u.currency || 'AUD';
      rateMap.set(u.id, { rate, currency });
    }

    let totalHours = 0;
    let totalCost = 0;
    let currency = 'AUD';

    for (const shift of fullShifts) {
      const start = shift.startTime instanceof Date ? shift.startTime : new Date(shift.startTime);
      const end = shift.endTime instanceof Date ? shift.endTime : new Date(shift.endTime);
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const shiftHourlyRate = shift.hourlyRate ? Number(shift.hourlyRate) : 0;

      const assignees: string[] = [];
      if (shift.assigneeId) assignees.push(shift.assigneeId);
      const fromAssignments = shiftIdToAssignments.get(shift.id) || [];
      fromAssignments.forEach((id) => {
        if (!assignees.includes(id)) assignees.push(id);
      });

      for (const staffId of assignees) {
        const staffRateInfo = rateMap.get(staffId);
        const rate = staffRateInfo?.rate ?? shiftHourlyRate;
        if (staffRateInfo?.currency) currency = staffRateInfo.currency;
        totalHours += durationHours;
        totalCost += durationHours * rate;
      }
    }

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      currency: currency || 'AUD',
    };
  } catch (err) {
    console.error('[roster-finance] calculateRosterTotals error:', err);
    return { totalHours: 0, totalCost: 0, currency: 'AUD' };
  }
}
