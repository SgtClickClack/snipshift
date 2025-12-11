export interface Shift {
  id: string;
  employerId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  hourlyRate: string;
  status: 'open' | 'filled' | 'completed' | 'draft' | 'invited' | 'confirmed';
  location?: string;
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
