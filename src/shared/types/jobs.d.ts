/**
 * Shared marketplace domain types used across the web frontend.
 */

export interface Job {
  id: string;
  title: string;
  description: string;
  compensation: number;
  compensationType: 'hourly' | 'fixed';
  location: string;
  businessId: string;
  status: 'open' | 'filled' | 'closed';
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'professional' | 'business' | 'admin' | 'trainer';
}


