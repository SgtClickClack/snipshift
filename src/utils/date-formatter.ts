import { format } from 'date-fns';

/**
 * Safely format a date value to a string.
 * Handles null, undefined, invalid dates, and various date formats gracefully.
 * 
 * @param date - Date value (Date object, ISO string, timestamp, or null/undefined)
 * @param formatStr - date-fns format string (default: 'MMM d, yyyy')
 * @param fallback - Fallback string to return if date is invalid (default: 'N/A')
 * @returns Formatted date string or fallback
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
