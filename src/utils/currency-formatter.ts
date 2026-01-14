/**
 * Currency formatting utilities for global ISO standards
 * 
 * Formats currency values for display with support for multiple currencies
 */

/**
 * Format a number as currency with support for currency codes (ISO 4217)
 * Defaults to Australian Dollar (AUD) if no currency is specified
 * 
 * @param amount - The amount to format (in the currency's base unit, e.g., dollars)
 * @param currency - ISO 4217 currency code (default: 'AUD')
 * @returns Formatted currency string (e.g., "$123.45" for AUD, "€123.45" for EUR)
 * 
 * @example
 * formatCurrency(123.45) // "$123.45" (AUD)
 * formatCurrency(123.45, 'USD') // "$123.45" (USD)
 * formatCurrency(123.45, 'EUR') // "€123.45"
 * formatCurrency(123.45, 'GBP') // "£123.45"
 */
export const formatCurrency = (amount: number, currency: string = 'AUD'): string => {
  // Determine locale based on currency for proper formatting
  // Default to en-AU for AUD, en-US for USD, etc.
  let locale = 'en-AU';
  
  // Map common currencies to their appropriate locales (ISO 4217 currency codes)
  // Locales use BCP 47 format (language-country)
  const currencyLocaleMap: Record<string, string> = {
    'AUD': 'en-AU', // Australian Dollar
    'USD': 'en-US', // US Dollar
    'EUR': 'en-IE', // Euro (using Ireland as representative locale, can also use 'de-DE', 'fr-FR', etc.)
    'GBP': 'en-GB', // British Pound
    'CAD': 'en-CA', // Canadian Dollar
    'NZD': 'en-NZ', // New Zealand Dollar
    'JPY': 'ja-JP', // Japanese Yen
    'CNY': 'zh-CN', // Chinese Yuan
    'CHF': 'de-CH', // Swiss Franc
    'SGD': 'en-SG', // Singapore Dollar
    'HKD': 'en-HK', // Hong Kong Dollar
  };
  
  locale = currencyLocaleMap[currency] || 'en-AU';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};
