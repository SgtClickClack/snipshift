import { format } from 'date-fns';

/**
 * Brisbane timezone constant (Australia/Brisbane)
 * Brisbane does not observe daylight saving time (AEST - Australian Eastern Standard Time)
 */
export const BRISBANE_TIMEZONE = 'Australia/Brisbane';

/**
 * Safely format a date value to a string.
 * Handles null, undefined, invalid dates, and various date formats gracefully.
 * Accepts UTC ISO 8601 strings and displays them in Brisbane timezone (AEST) using Intl.DateTimeFormat.
 * 
 * @param date - Date value (Date object, ISO 8601 string, timestamp, or null/undefined)
 * @param formatStr - date-fns format string (default: 'MMM d, yyyy')
 * @param fallback - Fallback string to return if date is invalid (default: 'N/A')
 * @returns Formatted date string in Brisbane timezone or fallback
 */
export function formatDateSafe(
  date: unknown,
  formatStr: string = 'MMM d, yyyy',
  fallback: string = 'N/A'
): string {
  if (!date) return fallback;
  
  try {
    let dateObj: Date;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      // Parse ISO 8601 string (e.g., "2024-01-01T12:00:00Z" or "2024-01-01T12:00:00+00:00")
      // ISO 8601 strings are parsed as UTC by default
      dateObj = new Date(date);
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    } else {
      return fallback;
    }
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return fallback;
    }
    
    // Use Intl.DateTimeFormat with Brisbane timezone for proper timezone conversion
    // This ensures UTC ISO 8601 input is displayed in Brisbane local time (AEST)
    // Map common date-fns format strings to Intl options
    const formatMap: Record<string, Intl.DateTimeFormatOptions> = {
      'MMM d, yyyy': { year: 'numeric', month: 'short', day: 'numeric' },
      'MMM d, yyyy HH:mm': { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false },
      'yyyy-MM-dd': { year: 'numeric', month: '2-digit', day: '2-digit' },
      'dd/MM/yyyy': { year: 'numeric', month: '2-digit', day: '2-digit' },
      'MMM d': { month: 'short', day: 'numeric' },
      'yyyy': { year: 'numeric' },
    };
    
    const intlOptions = formatMap[formatStr];
    if (intlOptions) {
      const formatter = new Intl.DateTimeFormat('en-AU', {
        ...intlOptions,
        timeZone: BRISBANE_TIMEZONE
      });
      return formatter.format(dateObj);
    }
    
    // For complex date-fns formats not in the map, use date-fns
    // Note: This will use the browser's local timezone, not Brisbane
    // For full Brisbane timezone support with all formats, consider using date-fns-tz
    return format(dateObj, formatStr);
  } catch {
    return fallback;
  }
}

/**
 * Safely convert a date value to an ISO string.
 * Handles null, undefined, invalid dates gracefully.
 * 
 * @param date - Date value (Date object, ISO string, timestamp, or null/undefined)
 * @param fallback - Fallback ISO string to return if date is invalid (default: current date)
 * @returns ISO string or fallback
 */
export function toISOStringSafe(date: unknown, fallback?: string): string {
  if (!date) {
    return fallback || new Date().toISOString();
  }
  
  try {
    let dateObj: Date;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    } else {
      return fallback || new Date().toISOString();
    }
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return fallback || new Date().toISOString();
    }
    
    return dateObj.toISOString();
  } catch {
    return fallback || new Date().toISOString();
  }
}

/**
 * Safely create a Date object from various input types.
 * Returns null if the input is invalid.
 * 
 * @param date - Date value (Date object, ISO string, timestamp, or null/undefined)
 * @returns Date object or null if invalid
 */
export function toDateSafe(date: unknown): Date | null {
  if (!date) return null;

  try {
    let dateObj: Date;

    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    } else {
      return null;
    }

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return null;
    }

    return dateObj;
  } catch {
    return null;
  }
}

/**
 * Parse a YYYY-MM-DD date string as LOCAL midnight.
 * `new Date('YYYY-MM-DD')` is parsed as UTC by browsers, which becomes
 * 10:00/11:00 local time in AU. This function avoids that drift.
 */
export function parseLocalDateOnly(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/** Check whether a string looks like an ISO 8601 datetime (has a T separator). */
export function isIsoDateTimeString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T/.test(value);
}

/**
 * Parse a date/datetime value with multiple fallback strategies.
 * 1. ISO datetime string → native Date
 * 2. YYYY-MM-DD → local midnight (avoids UTC drift)
 * 3. Legacy formats → native Date fallback
 */
export function parseDateTime(dateOrDateTime: unknown): Date | null {
  if (!dateOrDateTime) return null;
  if (dateOrDateTime instanceof Date) return isNaN(dateOrDateTime.getTime()) ? null : dateOrDateTime;
  if (typeof dateOrDateTime !== 'string') return null;

  if (isIsoDateTimeString(dateOrDateTime)) {
    const d = new Date(dateOrDateTime);
    return isNaN(d.getTime()) ? null : d;
  }

  const localDate = parseLocalDateOnly(dateOrDateTime);
  if (localDate) return localDate;

  const fallback = new Date(dateOrDateTime);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Combine a YYYY-MM-DD date string with an HH:mm or HH:mm:ss time string.
 * Returns a local Date or null if inputs are invalid.
 */
export function combineDateAndTime(dateStr: unknown, timeStr: unknown): Date | null {
  if (typeof dateStr !== 'string' || typeof timeStr !== 'string') return null;

  const base = parseLocalDateOnly(dateStr);
  if (!base) return null;

  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(timeStr);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] ? Number(match[3]) : 0;
  if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(seconds)) return null;

  const d = new Date(base);
  d.setHours(hours, minutes, seconds, 0);
  return isNaN(d.getTime()) ? null : d;
}
