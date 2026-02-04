/**
 * Centralized Query Keys
 * 
 * Standardized query keys for React Query cache management.
 * Using constants prevents typos and ensures consistent cache invalidation.
 * 
 * Naming convention:
 * - Use semantic names for domain entities (e.g., 'shifts', 'templates')
 * - Avoid API path prefixes for cleaner keys
 * - Use arrays for hierarchical keys where appropriate
 */

export const QUERY_KEYS = {
  // Auth-related queries (for prefetching)
  CURRENT_USER: 'current-user',
  CURRENT_VENUE: 'current-venue',
  
  // Shift-related queries
  SHIFTS: 'shifts',
  SHOP_SHIFTS: 'shop-shifts',
  SHOP_SCHEDULE_SHIFTS: 'shop-schedule-shifts',
  EMPLOYER_SHIFTS: 'employer-shifts',
  
  // Template-related queries
  SHIFT_TEMPLATES: 'shift-templates',
  
  // Application-related queries
  APPLICATIONS: 'applications',
  
  // Job-related queries
  JOBS: 'jobs',
  MY_JOBS: 'my-jobs',
  
  // Booking-related queries
  BOOKINGS: 'bookings',
  
  // Integration-related queries
  XERO_STATUS: 'xero-status',
  XERO_SYNC_LOGS: 'xero-sync-logs-recent',
  XERO_PAYROLL_READINESS: 'xero-payroll-readiness',
} as const;

/**
 * Default stale times for different query types (in milliseconds)
 * - Integration status: 5 min (rarely changes)
 * - User data: 5 min (profile data)
 * - Shift data: 1 min (more dynamic)
 */
export const QUERY_STALE_TIMES = {
  INTEGRATION_STATUS: 5 * 60 * 1000, // 5 minutes
  USER_DATA: 5 * 60 * 1000, // 5 minutes
  SHIFT_DATA: 60 * 1000, // 1 minute
} as const;

/**
 * Helper to invalidate all shift-related queries
 * Use this after any shift mutation to ensure UI consistency
 */
export function getShiftInvalidationKeys(): string[] {
  return [
    QUERY_KEYS.SHIFTS,
    QUERY_KEYS.SHOP_SHIFTS,
    QUERY_KEYS.SHOP_SCHEDULE_SHIFTS,
    QUERY_KEYS.EMPLOYER_SHIFTS,
  ];
}

/**
 * Helper to invalidate all calendar-related queries
 * Use this after bulk operations like Auto-Fill
 */
export function getCalendarInvalidationKeys(): string[] {
  return [
    QUERY_KEYS.SHIFTS,
    QUERY_KEYS.SHOP_SHIFTS,
    QUERY_KEYS.SHOP_SCHEDULE_SHIFTS,
    QUERY_KEYS.EMPLOYER_SHIFTS,
    QUERY_KEYS.APPLICATIONS,
    QUERY_KEYS.BOOKINGS,
    QUERY_KEYS.JOBS,
    QUERY_KEYS.MY_JOBS,
  ];
}

// Type for query key values
export type QueryKeyValue = typeof QUERY_KEYS[keyof typeof QUERY_KEYS];
