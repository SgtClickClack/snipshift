/**
 * Waitlist Type Definitions
 * 
 * TypeScript types for waitlist functionality
 */

/**
 * Waitlist entry role type
 */
export type WaitlistRole = 'venue' | 'staff';

/**
 * Waitlist entry interface
 * Matches the database schema and repository interface
 */
export interface WaitlistEntry {
  id: string;
  role: WaitlistRole;
  name: string; // Venue Name or Full Name
  contact: string; // Email or Mobile Number
  location: string; // ISO Standardized location
  approvalStatus?: 'pending' | 'approved' | 'rejected'; // Approval status for venue onboarding
  approvedAt?: Date | string | null; // ISO 8601 UTC timestamp when approved/rejected
  createdAt: Date | string; // ISO 8601 timestamp
}

/**
 * Waitlist submission input (for API requests)
 */
export interface WaitlistSubmission {
  role: WaitlistRole;
  venueName?: string; // Required if role === 'venue'
  managerEmail?: string; // Required if role === 'venue'
  fullName?: string; // Required if role === 'staff'
  mobileNumber?: string; // Required if role === 'staff'
  location?: string; // Optional, defaults to 'Brisbane, AU'
}
