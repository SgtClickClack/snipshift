/**
 * HospoGo Brisbane Waitlist Export Utility
 * 
 * Converts waitlist signups to a standardized CSV for marketing outreach.
 * Handles proper CSV escaping per RFC 4180 standard.
 */

import type { WaitlistEntry } from '@/types/waitlist';

/**
 * Escape a CSV field value according to RFC 4180
 * - Fields containing commas, quotes, or newlines must be quoted
 * - Quotes within quoted fields must be escaped by doubling them
 */
function escapeCsvField(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);
  
  // If field contains comma, quote, or newline, it must be quoted
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    // Escape quotes by doubling them and wrap in quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Format a date as ISO 8601 string
 */
function formatTimestamp(date: Date | string | null | undefined): string {
  if (!date) {
    return '';
  }

  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    return dateObj.toISOString();
  } catch {
    return '';
  }
}

/**
 * Export waitlist entries to CSV format
 * 
 * @param signups - Array of waitlist entries to export
 * @returns CSV content as a string
 * 
 * @example
 * ```typescript
 * const csvContent = exportWaitlistToCSV(waitlistEntries);
 * const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 * const url = URL.createObjectURL(blob);
 * const link = document.createElement('a');
 * link.href = url;
 * link.download = `hospogo-waitlist-${new Date().toISOString().split('T')[0]}.csv`;
 * link.click();
 * URL.revokeObjectURL(url);
 * ```
 */
export const exportWaitlistToCSV = (signups: WaitlistEntry[]): string => {
  // CSV headers
  const headers = ['Timestamp', 'Role', 'Name/Venue', 'Contact', 'Location'];
  
  // Map signups to CSV rows
  const rows = signups.map(signup => [
    formatTimestamp(signup.createdAt), // ISO 8601 timestamp
    signup.role, // 'venue' | 'staff'
    escapeCsvField(signup.name), // Venue Name or Full Name
    escapeCsvField(signup.contact), // Email or Mobile Number
    escapeCsvField(signup.location || 'Brisbane, AU'), // Location (defaults to Brisbane)
  ]);

  // Combine headers and rows, join with commas and newlines
  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');

  return csvContent;
};

/**
 * Download waitlist CSV file
 * 
 * @param signups - Array of waitlist entries to export
 * @param filename - Optional filename (defaults to timestamped filename)
 * 
 * @example
 * ```typescript
 * downloadWaitlistCSV(waitlistEntries);
 * // Downloads: hospogo-waitlist-2024-01-15.csv
 * ```
 */
export const downloadWaitlistCSV = (
  signups: WaitlistEntry[],
  filename?: string
): void => {
  // Generate CSV content
  const csvContent = exportWaitlistToCSV(signups);
  
  // Create blob with UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });
  
  // Generate filename if not provided
  const defaultFilename = `hospogo-waitlist-${new Date().toISOString().split('T')[0]}.csv`;
  const finalFilename = filename || defaultFilename;
  
  // Create download link and trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  link.style.display = 'none';
  
  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up object URL after a short delay
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
};
