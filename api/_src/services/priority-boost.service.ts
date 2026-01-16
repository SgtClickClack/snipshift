/**
 * Priority Boost Service
 * 
 * Checks waitlists for shifts starting in 2 hours and grants priority boost tokens
 * to workers who are Rank 1 on the waitlist.
 */

import { eq, and, gte, lte, sql, isNotNull } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { shifts, shiftWaitlist } from '../db/schema.js';
import * as priorityBoostTokensRepo from '../repositories/priority-boost-tokens.repository.js';
import * as shiftWaitlistRepo from '../repositories/shift-waitlist.repository.js';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
const CHECK_WINDOW_MS = 15 * 60 * 1000; // 15 minute window to catch shifts

/**
 * Check waitlists for shifts starting in 2 hours and grant priority boost tokens
 * to Rank 1 workers
 */
export async function checkWaitlistsAndGrantTokens(): Promise<{
  checked: number;
  tokensGranted: number;
}> {
  const db = getDb();
  if (!db) {
    console.error('[PRIORITY_BOOST] Database not available');
    return { checked: 0, tokensGranted: 0 };
  }

  try {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + TWO_HOURS_MS);
    const twoHoursMinusWindow = new Date(now.getTime() + TWO_HOURS_MS - CHECK_WINDOW_MS);
    const twoHoursPlusWindow = new Date(now.getTime() + TWO_HOURS_MS + CHECK_WINDOW_MS);

    // Find shifts that:
    // - Start between 1h 45min and 2h 15min from now (30 min window to catch shifts)
    // - Have active waitlists
    // - Status is 'filled' or 'confirmed' (shifts that can have waitlists)
    const shiftsWithWaitlists = await db
      .select({
        shiftId: shifts.id,
        shiftTitle: shifts.title,
        startTime: shifts.startTime,
        status: shifts.status,
      })
      .from(shifts)
      .innerJoin(shiftWaitlist, eq(shifts.id, shiftWaitlist.shiftId))
      .where(
        and(
          eq(shiftWaitlist.status, 'active'),
          gte(shifts.startTime, twoHoursMinusWindow),
          lte(shifts.startTime, twoHoursPlusWindow),
          sql`${shifts.status} IN ('filled', 'confirmed')`
        )
      )
      .groupBy(shifts.id, shifts.title, shifts.startTime, shifts.status);

    if (shiftsWithWaitlists.length === 0) {
      return { checked: 0, tokensGranted: 0 };
    }

    console.log(`[PRIORITY_BOOST] Found ${shiftsWithWaitlists.length} shift(s) with waitlists starting in ~2 hours`);

    let tokensGranted = 0;

    for (const shift of shiftsWithWaitlists) {
      try {
        // Get Rank 1 worker from waitlist
        const topWorkers = await shiftWaitlistRepo.getTopWaitlistedWorkers(shift.shiftId, 1);
        
        if (topWorkers.length === 0 || topWorkers[0].rank !== 1) {
          continue; // No Rank 1 worker or rank changed
        }

        const rank1Worker = topWorkers[0];

        // Check if token already granted for this shift (avoid duplicates)
        const existingTokens = await priorityBoostTokensRepo.getTokenHistoryForWorker(
          rank1Worker.workerId,
          100
        );
        
        const alreadyGranted = existingTokens.some(
          token => token.shiftId === shift.shiftId && token.isActive
        );

        if (alreadyGranted) {
          continue; // Token already granted for this shift
        }

        // Grant priority boost token
        const token = await priorityBoostTokensRepo.grantPriorityBoostToken({
          workerId: rank1Worker.workerId,
          shiftId: shift.shiftId,
        });

        if (token) {
          tokensGranted++;
          console.log(
            `[PRIORITY_BOOST] Granted priority boost token to worker ${rank1Worker.workerId} ` +
            `for shift "${shift.shiftTitle}" (Rank 1 on waitlist)`
          );
        }
      } catch (error) {
        console.error(
          `[PRIORITY_BOOST] Error processing shift ${shift.shiftId}:`,
          error
        );
      }
    }

    if (tokensGranted > 0) {
      console.log(`[PRIORITY_BOOST] Granted ${tokensGranted} priority boost token(s)`);
    }

    return {
      checked: shiftsWithWaitlists.length,
      tokensGranted,
    };
  } catch (error) {
    console.error('[PRIORITY_BOOST] Error checking waitlists:', error);
    return { checked: 0, tokensGranted: 0 };
  }
}

/**
 * Expire old priority boost tokens
 * Should be run periodically
 */
export async function expireOldTokens(): Promise<number> {
  return await priorityBoostTokensRepo.expireOldTokens();
}
