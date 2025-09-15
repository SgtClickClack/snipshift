// Shared types for SnipShift platform
export type UserRole = 'client' | 'hub' | 'professional' | 'brand' | 'trainer';

export type JobStatus = 'open' | 'filled' | 'cancelled' | 'completed';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export type ContentType = 'video' | 'article' | 'workshop' | 'course';

export type MessageType = 'text' | 'system';

// Base types
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Location {
  city: string;
  state: string;
  country: string;
  coordinates?: Coordinates;
}

export interface Address extends Location {
  street: string;
  postcode: string;
}

export interface TimeSlot {
  open: string;
  close: string;
}

export interface OperatingHours {
  monday?: TimeSlot;
  tuesday?: TimeSlot;
  wednesday?: TimeSlot;
  thursday?: TimeSlot;
  friday?: TimeSlot;
  saturday?: TimeSlot;
  sunday?: TimeSlot;
}

// User types
export interface User {
  id: string;
  email: string;
  displayName?: string;
  profileImage?: string;
  roles: UserRole[];
  currentRole?: UserRole;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface HubProfile {
  businessName: string;
  address: Address;
  businessType: string;
  operatingHours?: OperatingHours;
  description?: string;
  website?: string;
  logoUrl?: string;
}

export interface ProfessionalProfile {
  isVerified: boolean;
  certifications?: Certification[];
  skills: string[];
  experience?: string;
  homeLocation?: Location;
  isRoamingNomad: boolean;
  preferredRegions?: string[];
  rating?: number;
  reviewCount: number;
}

export interface BrandProfile {
  companyName: string;
  website?: string;
  description?: string;
  productCategories?: string[];
  logoUrl?: string;
  socialPostsCount: number;
}

export interface TrainerProfile {
  qualifications?: string[];
  specializations?: string[];
  yearsExperience?: number;
  trainingLocation?: string;
  credentials?: string[];
  rating?: number;
  reviewCount: number;
  totalStudents: number;
  trainingOfferings?: TrainingOffering[];
}

export interface Certification {
  type: string;
  issuer: string;
  date: Date;
  documentUrl?: string;
}

export interface TrainingOffering {
  id: string;
  title: string;
  description: string;
  price?: number;
  duration?: string;
  level: string;
  category: string;
}

// Job types
export interface Job {
  id: string;
  title: string;
  description: string;
  skillsRequired: string[];
  payRate: number;
  payType: string;
  location: Location;
  date: Date;
  startTime: string;
  endTime: string;
  status: JobStatus;
  hubId: string;
  hub?: User;
  applicants?: Application[];
  selectedProfessionalId?: string;
  selectedProfessional?: User;
  createdAt: Date;
  updatedAt: Date;
  applicationsCount: number;
}

export interface Application {
  id: string;
  jobId: string;
  job?: Job;
  professionalId: string;
  professional?: User;
  status: string;
  message?: string;
  appliedAt: Date;
  respondedAt?: Date;
}

// Social types
export interface SocialPost {
  id: string;
  authorId: string;
  author?: User;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  postType: string;
  eventDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  likes: number;
  comments?: Comment[];
  discountCode?: string;
  discountPercentage?: number;
  validUntil?: Date;
}

export interface Comment {
  id: string;
  authorId: string;
  author?: User;
  content: string;
  createdAt: Date;
}

// Training types
export interface TrainingContent {
  id: string;
  trainerId: string;
  trainer?: User;
  title: string;
  description: string;
  contentType: ContentType;
  videoUrl?: string;
  thumbnailUrl?: string;
  price?: number;
  duration: string;
  level: string;
  category: string;
  tags?: string[];
  isPaid: boolean;
  purchaseCount: number;
  rating?: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Purchase {
  id: string;
  userId: string;
  user?: User;
  contentId: string;
  content?: TrainingContent;
  amount: number;
  paymentStatus: PaymentStatus;
  purchasedAt: Date;
  accessGranted: boolean;
}

// Chat types
export interface Chat {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantRoles: Record<string, string>;
  lastMessage?: string;
  lastMessageSenderId?: string;
  lastMessageSender?: User;
  lastMessageTimestamp?: Date;
  unreadCount: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  sender?: User;
  receiverId: string;
  receiver?: User;
  content: string;
  messageType: MessageType;
  isRead: boolean;
  timestamp: Date;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  hasNextPage: boolean;
  nextCursor?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form types
export interface LoginCredentials {
  email: string;
  password?: string;
  googleId?: string;
}

export interface RegisterData {
  email: string;
  password?: string;
  displayName?: string;
  roles: UserRole[];
  currentRole?: UserRole;
  googleId?: string;
}

export interface JobFilters {
  status?: JobStatus;
  location?: string;
  skills?: string[];
  payMin?: number;
  payMax?: number;
  dateFrom?: Date;
  dateTo?: Date;
  hubId?: string;
}

export interface CreateJobData {
  title: string;
  description: string;
  skillsRequired: string[];
  payRate: number;
  payType: string;
  location: Location;
  date: Date;
  startTime: string;
  endTime: string;
  hubId: string;
}

// Mobile-specific types
export interface MobileAppConfig {
  version: string;
  buildNumber: string;
  environment: 'development' | 'staging' | 'production';
  apiUrl: string;
  websocketUrl: string;
  googleMapsApiKey?: string;
  stripePublishableKey?: string;
}

export interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
  type: 'job_alert' | 'application_update' | 'message' | 'social_post' | 'training_reminder';
}

// Error types
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Constants
export const USER_ROLES: UserRole[] = ['client', 'hub', 'professional', 'brand', 'trainer'];
export const JOB_STATUSES: JobStatus[] = ['open', 'filled', 'cancelled', 'completed'];
export const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'completed', 'failed', 'refunded'];
export const CONTENT_TYPES: ContentType[] = ['video', 'article', 'workshop', 'course'];

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
