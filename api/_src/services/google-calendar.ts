import { sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { toISOStringSafe } from '../lib/date.js';
import * as shiftsRepo from '../repositories/shifts.repository.js';
import { errorReporting } from './error-reporting.service.js';

const CALENDAR_SYNC_FAILURE_MESSAGE =
  "We couldn't update your Google Calendar right now, but your shift is saved safely in HospoGo.";

const DEFAULT_FRONTEND_URL =
  process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_URL || 'https://hospogo.com';

const isProductionLockdown =
  process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

const isMissingColumnError = (error: any): boolean => {
  const message = typeof error?.message === 'string' ? error.message : '';
  return error?.code === '42703' || (message.includes('column') && message.includes('does not exist'));
};

const buildShiftLink = (shiftId: string): string => {
  return `${DEFAULT_FRONTEND_URL.replace(/\/$/, '')}/shifts/${shiftId}`;
};

const normalizeCalendarToken = (token: unknown): string | null => {
  if (typeof token !== 'string') return null;
  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const fetchGoogleCalendarToken = async (userId: string): Promise<string | null> => {
  const db = getDb();
  if (!db) {
    return null;
  }

  try {
    const result = await db.execute(
      sql`select google_calendar_token from users where id = ${userId} limit 1`
    );
    const token = (result as any)?.rows?.[0]?.google_calendar_token;
    return normalizeCalendarToken(token);
  } catch (error: any) {
    if (isMissingColumnError(error)) {
      return null;
    }

    await errorReporting.captureWarning(CALENDAR_SYNC_FAILURE_MESSAGE, {
      userId,
      metadata: {
        reason: 'token_lookup_failed',
        errorMessage: error?.message,
      },
    });
    return null;
  }
};

const buildEventSummary = (role: string | null | undefined, venueName: string | null | undefined): string => {
  const roleLabel = role?.trim() || 'Shift';
  const venueLabel = venueName?.trim();
  return venueLabel ? `${roleLabel} @ ${venueLabel}` : roleLabel;
};

/**
 * Sync a HospoGo shift to the user's Google Calendar.
 *
 * This runs behind production lockdown guards and only attempts to sync
 * when a valid `google_calendar_token` is available for the shift owner.
 */
export async function syncShiftToGoogle(shiftId: string): Promise<void> {
  if (!isProductionLockdown) {
    return;
  }

  try {
    const shift = await shiftsRepo.getShiftById(shiftId);
    if (!shift) {
      await errorReporting.captureWarning(CALENDAR_SYNC_FAILURE_MESSAGE, {
        metadata: { reason: 'shift_not_found', shiftId },
      });
      return;
    }

    const calendarToken = await fetchGoogleCalendarToken(shift.employerId);
    if (!calendarToken) {
      return;
    }

    const summary = buildEventSummary(shift.role, (shift as any).shopName);
    const shiftLink = buildShiftLink(shift.id);
    const description = `Shift details: ${shiftLink}`;

    const eventPayload = {
      summary,
      description,
      start: { dateTime: toISOStringSafe(shift.startTime) },
      end: { dateTime: toISOStringSafe(shift.endTime) },
      location: shift.location || undefined,
    };

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${calendarToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventPayload),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      await errorReporting.captureWarning(CALENDAR_SYNC_FAILURE_MESSAGE, {
        userId: shift.employerId,
        metadata: {
          reason: 'calendar_sync_failed',
          shiftId,
          responseStatus: response.status,
          responseBody: errorBody,
        },
      });
    }
  } catch (error: any) {
    await errorReporting.captureWarning(CALENDAR_SYNC_FAILURE_MESSAGE, {
      metadata: {
        reason: 'calendar_sync_exception',
        shiftId,
        errorMessage: error?.message,
      },
    });
  }
}
