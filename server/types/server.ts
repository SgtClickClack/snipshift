// Server-specific type definitions
import { Request, Response } from 'express';

// Express request with session user
export interface AuthenticatedRequest extends Request {
  session: {
    user?: {
      id: string;
      email: string;
      roles: string[];
      currentRole: string;
      displayName?: string;
      profileImage?: string;
    };
  } & any;
}

// Job filter interface
export interface JobFilters {
  hubId?: string;
  location?: string;
  skills?: string[];
  payRateMin?: number;
  payRateMax?: number;
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
}

// Social post filter interface
export interface SocialPostFilters {
  authorId?: string;
  postType?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

// Chat message interface
export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  readBy: Record<string, Date>;
}

// Chat data interface
export interface ChatData {
  id: string;
  participants: string[];
  lastMessage?: ChatMessage;
  unreadCount: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

// Database user interface
export interface DatabaseUser {
  id: string;
  email: string;
  password_hash: string;
  roles: string[];
  current_role: string;
  display_name?: string;
  profile_image?: string;
  created_at: Date;
  updated_at: Date;
}

// Database shift interface
export interface DatabaseShift {
  id: string;
  hub_id: string;
  title: string;
  date: Date;
  requirements: string;
  pay: number;
  created_at: Date;
  updated_at: Date;
}

// Profile update data interface
export interface ProfileUpdateData {
  profileType: 'professional' | 'hub' | 'brand' | 'trainer';
  data: Record<string, unknown>;
}

// Role update interface
export interface RoleUpdateData {
  action: 'add' | 'remove';
  role: string;
}

// Current role update interface
export interface CurrentRoleUpdateData {
  role: string;
}
