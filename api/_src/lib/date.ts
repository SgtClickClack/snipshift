/**
 * Date utilities (API)
 *
 * The DB/ORM can return timestamp fields as either Date objects or ISO strings
 * depending on driver/config/environment. These helpers prevent runtime crashes
 * (e.g. calling `.toISOString()` on a string).
 */

/**
 * Safely convert a date-like value to an ISO string.
 *
 * - Accepts Date, ISO string, number, or date-like objects
 * - Never throws; falls back to "now" when value is null/invalid
 */
export function toISOStringSafe(value: unknown): string {
  if (value == null) return new Date().toISOString();

  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  // Date or Date-like object
  const maybe: any = value as any;
  if (maybe && typeof maybe.toISOString === 'function') {
    try {
      return maybe.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  const d = new Date(value as any);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}


