/**
 * Business Configuration
 * 
 * Centralized configuration for business-related constants.
 * These values can be overridden via environment variables for different environments.
 * 
 * Naming convention:
 * - Use SCREAMING_SNAKE_CASE for constants
 * - Prefix with category (e.g., SHIFT_, PAYMENT_)
 * - Document units in comments (AUD, cents, etc.)
 */

/**
 * Shift-related defaults
 */
export const SHIFT_CONFIG = {
  /**
   * Default hourly rate for auto-generated shifts (AUD)
   * Used when no venue-specific or template-specific rate is configured
   * Based on 2026 HIGA Award Level 2 casual rate
   */
  DEFAULT_HOURLY_RATE: process.env.DEFAULT_HOURLY_RATE || '45',
  
  /**
   * Minimum hourly rate allowed (AUD)
   * Based on 2026 minimum wage compliance
   */
  MIN_HOURLY_RATE: process.env.MIN_HOURLY_RATE || '24.10',
  
  /**
   * Maximum hourly rate allowed (AUD)
   * Sanity check to prevent data entry errors
   */
  MAX_HOURLY_RATE: process.env.MAX_HOURLY_RATE || '200',
} as const;

/**
 * Payment and commission configuration
 */
export const PAYMENT_CONFIG = {
  /**
   * Platform commission rate (decimal, e.g., 0.10 = 10%)
   * Applied to shift payments for subscribed users
   */
  COMMISSION_RATE: parseFloat(process.env.HOSPOGO_COMMISSION_RATE || '0.10'),
  
  /**
   * Flat booking fee for non-subscribed users (cents)
   * $20.00 = 2000 cents
   */
  BOOKING_FEE_CENTS: parseInt(process.env.BOOKING_FEE_CENTS || '2000', 10),
  
  /**
   * Currency code for all transactions
   */
  CURRENCY: process.env.PAYMENT_CURRENCY || 'AUD',
} as const;

/**
 * Capacity/Template configuration
 */
export const CAPACITY_CONFIG = {
  /**
   * Default number of staff required per shift slot
   */
  DEFAULT_REQUIRED_STAFF: 1,
  
  /**
   * Default cancellation window in hours
   */
  DEFAULT_CANCELLATION_WINDOW_HOURS: parseInt(process.env.DEFAULT_CANCELLATION_WINDOW_HOURS || '24', 10),
} as const;

/**
 * Validate that hourly rate is within acceptable bounds
 */
export function validateHourlyRate(rate: string | number): boolean {
  const numRate = typeof rate === 'string' ? parseFloat(rate) : rate;
  const min = parseFloat(SHIFT_CONFIG.MIN_HOURLY_RATE);
  const max = parseFloat(SHIFT_CONFIG.MAX_HOURLY_RATE);
  return !isNaN(numRate) && numRate >= min && numRate <= max;
}

/**
 * Format currency amount for display (AUD)
 */
export function formatAUD(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: PAYMENT_CONFIG.CURRENCY,
    minimumFractionDigits: 2,
  }).format(amount);
}
