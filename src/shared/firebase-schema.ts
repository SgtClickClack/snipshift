/**
 * Shared Firebase schema types used across the application
 */

export interface Job {
  id: string;
  title: string;
  shopName?: string;
  rate?: string;
  payRate?: string;
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
  status?: 'open' | 'filled' | 'closed';
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
  lastMessage?: Message;
  lastMessageAt?: string;
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
  location?: string;
  pay?: string | number; // Hourly rate (alias for hourlyRate)
  hourlyRate?: string | number;
  requirements?: string; // Description/requirements (alias for description)
  description?: string;
  status?: 'open' | 'filled' | 'completed';
  employerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

