/**
 * Formats a date string to a friendly format.
 * Returns "Yesterday" if the date is yesterday, otherwise returns a formatted date string.
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Reset time to start of day for comparison
  const dateStartOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const yesterdayStartOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  
  // Check if the date is yesterday
  if (dateStartOfDay.getTime() === yesterdayStartOfDay.getTime()) {
    return 'Yesterday';
  }
  
  // For other dates, return a formatted string
  // Format: "MMM DD, YYYY" (e.g., "Jan 12, 2025")
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

