/**
 * Currency formatting utilities
 * 
 * Formats currency values for display in the application
 */

/**
 * Format a number as Australian Dollar (AUD) currency
 * @param amount - The amount to format (in dollars)
 * @returns Formatted currency string (e.g., "$123.45")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number as currency without the currency symbol
 * @param amount - The amount to format (in dollars)
 * @returns Formatted number string (e.g., "123.45")
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
