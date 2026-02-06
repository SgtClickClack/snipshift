/**
 * Structured location object following ISO standards
 */
export interface ShiftLocation {
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  countryCode: string; // ISO 3166-1 alpha-2 country code (e.g., 'AU', 'US', 'GB')
}

export interface Shift {
  id: string;
  employerId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  hourlyRate: string;
  status: 'draft' | 'pending' | 'invited' | 'open' | 'filled' | 'completed' | 'confirmed' | 'cancelled' | 'pending_completion';
  location?: string | ShiftLocation; // Supports both legacy string format and structured object
  autoAccept?: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Frontend compatibility fields
  pay?: string; // Alias for hourlyRate
  date?: string; // Alias for startTime
  requirements?: string; // Alias for description
  
  // Recurring shift metadata
  recurringSeriesId?: string; // ID to group shifts in the same recurring series
  isRecurring?: boolean; // Flag to indicate if this shift is part of a recurring series
  recurringIndex?: number; // Index in the recurring series (0-based)
  
  // Venue branding fields (legacy API property names preserved for backward compat)
  /** @deprecated Use venueName when available */
  shopName?: string | null;
  /** @deprecated Use venueAvatarUrl when available */
  shopAvatarUrl?: string | null;
  
  // Location coordinates for distance filtering (legacy support)
  // Prefer using structured location object when available
  lat?: string | number | null; // Latitude
  lng?: string | number | null; // Longitude

  // Hospitality cancellation logic
  cancellationWindowHours?: number; // Default: 24
  killFeeAmount?: string | null; // numeric(10,2) as string in most API payloads
  staffCancellationReason?: string | null;
  isEmergencyFill?: boolean;

  // Capacity: staff required (default 1). assignedStaff/assignments for one-to-many.
  capacity?: number;
  /** Array of assigned workers (preferred). Legacy: single assignedStaff or assigneeId. */
  assignedStaff?: Array<{ id?: string; name?: string; displayName?: string; avatarUrl?: string }> | { id?: string; name?: string; displayName?: string; avatarUrl?: string };
  assignments?: Array<{ userId: string; displayName?: string; avatarUrl?: string }>;
}

export interface Post {
  id: string;
  authorId: string;
  content: string;
  imageUrl?: string;
  type: 'community' | 'brand';
  likesCount: number;
  createdAt: string;
  updatedAt: string;
  
  // Enriched fields
  authorName?: string;
  authorRole?: string; // "professional" | "hub" | "brand" | "trainer"
  authorAvatar?: string;
  isLiked?: boolean;
  
  // Frontend compatibility fields
  postType?: 'social' | 'job';
  images?: string[];
  likes?: number;
  timestamp?: string;
  comments?: Comment[];
  commentsCount?: number;
  
  // Job-specific fields (used when postType is 'job')
  location?: {
    city: string;
    state: string;
  };
  payRate?: number;
  payType?: string;
  date?: string;
  skillsRequired?: string[];
}

export interface Comment {
  id: string;
  author: string;
  authorId: string;
  text: string;
  timestamp: string;
}

export interface TrainingModule {
  id: string;
  trainerId: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  price: number; // number for frontend, string in db
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  createdAt: string;
  updatedAt: string;
  
  // Enriched fields
  trainerName?: string;
  isPaid?: boolean;
  purchaseCount?: number;
  rating?: number;
}

export interface TrainingPurchase {
  id: string;
  userId: string;
  moduleId: string;
  purchasedAt: string;
}
