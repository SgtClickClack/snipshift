/**
 * Shared Firebase schema types used across the application
 */

import type { ShiftLocation } from './types';

export interface Job {
  id: string;
  title: string;
  shopName?: string;
  rate?: string | number;
  payRate?: string | number;
  hourlyRate?: string | number; // Alias for rate/payRate (shift compatibility)
  pay?: string | number; // Alias for rate/payRate
  date: string;
  lat?: number;
  lng?: number;
  location?: string | { city?: string; state?: string };
  description?: string;
  startTime?: string;
  endTime?: string;
  address?: string;
  city?: string;
  state?: string;
  hubId?: string;
  skillsRequired?: string[];
  businessId?: string;
  status?: 'open' | 'filled' | 'closed' | 'completed';
  createdAt?: string;
  payType?: string;
  applicants?: string[];
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role?: string;
  phone?: string;
  bio?: string;
  location?: string;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string | Message;
  lastMessageAt?: string;
  lastMessageTimestamp?: string;
  lastMessageSender?: string;
  unreadCount?: number;
  createdAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface InsertMessage {
  chatId: string;
  senderId: string;
  content: string;
}

export interface Shift {
  id: string;
  title: string;
  date: string; // ISO datetime string (startTime)
  startTime?: string; // ISO datetime string
  endTime?: string; // ISO datetime string
  location?: string | ShiftLocation; // Supports both legacy string format and structured object
  pay?: string | number; // Hourly rate (alias for hourlyRate)
  hourlyRate?: string | number;
  requirements?: string; // Description/requirements (alias for description)
  description?: string;
  status?: 'open' | 'filled' | 'completed' | 'draft' | 'invited' | 'confirmed';
  employerId?: string;
  createdAt?: string;
  updatedAt?: string;
  // Shop branding fields
  shopName?: string | null;
  shopAvatarUrl?: string | null;
  // Location coordinates (legacy support - prefer structured location object)
  lat?: string | number | null;
  lng?: string | number | null;
}

export interface WaitlistEntry {
  id: string;
  role: 'venue' | 'staff';
  name: string;      // Venue Name or Full Name
  contact: string;   // Email or Mobile
  location: string;  // Standardized (e.g., 'Brisbane, AU')
  createdAt: string; // ISO 8601 UTC
}
