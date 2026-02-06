/**
 * Centralized Query Keys
 * 
 * Domain-namespaced query keys to prevent cache pollution between venue and professional contexts.
 * Using hierarchical arrays prevents cross-domain cache collisions in multi-role sessions.
 * 
 * Naming convention:
 * - VENUE_* keys for venue/employer domain queries
 * - PROFESSIONAL_* keys for professional/worker domain queries
 * - Shared keys (no namespace) for cross-domain data (auth, notifications)
 * - Arrays enable targeted invalidation while maintaining isolation
 */

export const QUERY_KEYS = {
  // ========================================
  // Shared Domain (no namespace)
  // ========================================
  CURRENT_USER: ['user', 'current'] as const,
  CURRENT_VENUE: ['venue', 'current'] as const,
  NOTIFICATIONS: ['notifications'] as const,
  UNREAD_COUNT: ['notifications', 'unread-count'] as const,
  
  // ========================================
  // Venue Domain
  // ========================================
  // Shifts managed by venue owners
  VENUE_SHIFTS: ['shifts', 'venue'] as const,
  VENUE_SCHEDULE_SHIFTS: ['shifts', 'venue', 'schedule'] as const,
  EMPLOYER_SHIFTS: ['shifts', 'employer'] as const,
  
  // Templates for venue shift creation
  SHIFT_TEMPLATES: ['templates', 'venue'] as const,
  
  // Applications received by venue (candidates applying)
  VENUE_APPLICATIONS: ['applications', 'venue'] as const,
  SHIFT_APPLICATIONS: ['applications', 'venue', 'shift'] as const,
  
  // Jobs posted by venue
  VENUE_JOBS: ['jobs', 'venue'] as const,
  
  // Venue bookings and analytics
  VENUE_BOOKINGS: ['bookings', 'venue'] as const,
  VENUE_DASHBOARD_STATS: ['dashboard', 'venue', 'stats'] as const,
  VENUE_STATUS: ['status', 'venue'] as const,
  STRIPE_CONNECT_STATUS: ['stripe', 'connect-status'] as const,
  
  // Venue integrations
  XERO_STATUS: ['xero', 'status'] as const,
  XERO_SYNC_LOGS: ['xero', 'sync-logs'] as const,
  XERO_PAYROLL_READINESS: ['xero', 'payroll-readiness'] as const,
  
  // ========================================
  // Professional Domain
  // ========================================
  // Shifts available to professionals (job feed)
  PROFESSIONAL_SHIFTS: ['shifts', 'professional'] as const,
  PROFESSIONAL_AVAILABLE_SHIFTS: ['shifts', 'professional', 'available'] as const,
  
  // Applications submitted by professional
  PROFESSIONAL_APPLICATIONS: ['applications', 'professional'] as const,
  PROFESSIONAL_MY_APPLICATIONS: ['applications', 'professional', 'my'] as const,
  
  // Jobs available to professional (job feed)
  PROFESSIONAL_JOBS: ['jobs', 'professional'] as const,
  PROFESSIONAL_MY_JOBS: ['jobs', 'professional', 'my'] as const,
  
  // Professional bookings and dashboard
  PROFESSIONAL_BOOKINGS: ['bookings', 'professional'] as const,
  PROFESSIONAL_DASHBOARD_STATS: ['dashboard', 'professional', 'stats'] as const,
  
  // ========================================
  // Deprecated (for backward compatibility)
  // ========================================
  /** @deprecated Use VENUE_SHIFTS instead */
  SHOP_SHIFTS: ['shifts', 'venue'] as const,
  /** @deprecated Use VENUE_SCHEDULE_SHIFTS instead */
  SHOP_SCHEDULE_SHIFTS: ['shifts', 'venue', 'schedule'] as const,
  /** @deprecated Use VENUE_APPLICATIONS instead */
  APPLICATIONS: ['applications', 'venue'] as const,
  /** @deprecated Use PROFESSIONAL_MY_APPLICATIONS instead */
  MY_APPLICATIONS: ['applications', 'professional', 'my'] as const,
  /** @deprecated Use PROFESSIONAL_SHIFTS instead */
  SHIFTS: ['shifts', 'professional'] as const,
  /** @deprecated Use VENUE_JOBS or PROFESSIONAL_JOBS based on context */
  JOBS: ['jobs', 'venue'] as const,
  /** @deprecated Use PROFESSIONAL_MY_JOBS instead */
  MY_JOBS: ['jobs', 'professional', 'my'] as const,
  /** @deprecated Use VENUE_BOOKINGS or PROFESSIONAL_BOOKINGS based on context */
  BOOKINGS: ['bookings', 'venue'] as const,
  /** @deprecated Use VENUE_DASHBOARD_STATS or PROFESSIONAL_DASHBOARD_STATS based on context */
  DASHBOARD_STATS: ['dashboard', 'venue', 'stats'] as const,
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
 * Helper to invalidate venue shift-related queries
 * Use this after venue shift mutations
 */
export function getVenueShiftInvalidationKeys() {
  return [
    QUERY_KEYS.VENUE_SHIFTS,
    QUERY_KEYS.VENUE_SCHEDULE_SHIFTS,
    QUERY_KEYS.EMPLOYER_SHIFTS,
  ];
}

/**
 * Helper to invalidate professional shift-related queries
 * Use this after professional shift mutations (applications, etc.)
 */
export function getProfessionalShiftInvalidationKeys() {
  return [
    QUERY_KEYS.PROFESSIONAL_SHIFTS,
    QUERY_KEYS.PROFESSIONAL_AVAILABLE_SHIFTS,
  ];
}

/**
 * Helper to invalidate venue application queries
 * Use this after accept/reject actions by venue
 */
export function getVenueApplicationInvalidationKeys() {
  return [
    QUERY_KEYS.VENUE_APPLICATIONS,
    QUERY_KEYS.SHIFT_APPLICATIONS,
  ];
}

/**
 * Helper to invalidate professional application queries
 * Use this after apply/withdraw actions by professional
 */
export function getProfessionalApplicationInvalidationKeys() {
  return [
    QUERY_KEYS.PROFESSIONAL_APPLICATIONS,
    QUERY_KEYS.PROFESSIONAL_MY_APPLICATIONS,
  ];
}

/**
 * Helper to invalidate venue calendar-related queries
 * Use this after bulk operations like Auto-Fill (venue context)
 */
export function getVenueCalendarInvalidationKeys() {
  return [
    QUERY_KEYS.VENUE_SHIFTS,
    QUERY_KEYS.VENUE_SCHEDULE_SHIFTS,
    QUERY_KEYS.EMPLOYER_SHIFTS,
    QUERY_KEYS.VENUE_APPLICATIONS,
    QUERY_KEYS.VENUE_BOOKINGS,
    QUERY_KEYS.VENUE_JOBS,
  ];
}

/**
 * Helper to invalidate professional calendar-related queries
 * Use this after bulk operations (professional context)
 */
export function getProfessionalCalendarInvalidationKeys() {
  return [
    QUERY_KEYS.PROFESSIONAL_SHIFTS,
    QUERY_KEYS.PROFESSIONAL_APPLICATIONS,
    QUERY_KEYS.PROFESSIONAL_BOOKINGS,
    QUERY_KEYS.PROFESSIONAL_MY_JOBS,
  ];
}

// Backward compatibility helpers (deprecated)
/** @deprecated Use getVenueShiftInvalidationKeys or getProfessionalShiftInvalidationKeys */
export function getShiftInvalidationKeys() {
  return getVenueShiftInvalidationKeys();
}

/** @deprecated Use getVenueApplicationInvalidationKeys or getProfessionalApplicationInvalidationKeys */
export function getApplicationInvalidationKeys() {
  return getVenueApplicationInvalidationKeys();
}

/** @deprecated Use getVenueCalendarInvalidationKeys or getProfessionalCalendarInvalidationKeys */
export function getCalendarInvalidationKeys() {
  return getVenueCalendarInvalidationKeys();
}

// Type for query key values
export type QueryKeyValue = typeof QUERY_KEYS[keyof typeof QUERY_KEYS];
