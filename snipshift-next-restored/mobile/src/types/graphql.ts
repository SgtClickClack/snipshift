// GraphQL Types for SnipShift Mobile App

export interface User {
  id: string;
  email: string;
  displayName?: string;
  profileImage?: string;
  roles: string[];
  currentRole?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  hubProfile?: HubProfile;
  professionalProfile?: ProfessionalProfile;
  brandProfile?: BrandProfile;
  trainerProfile?: TrainerProfile;
}

export interface HubProfile {
  businessName: string;
  address: Address;
  businessType: string;
  operatingHours?: Record<string, { open: string; close: string }>;
  description?: string;
  website?: string;
  logoUrl?: string;
}

export interface ProfessionalProfile {
  isVerified: boolean;
  certifications?: Array<{
    type: string;
    issuer: string;
    date: string;
    documentUrl?: string;
  }>;
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

export interface Address {
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  coordinates?: Coordinates;
}

export interface Location {
  city: string;
  state: string;
  country: string;
  coordinates?: Coordinates;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  skillsRequired: string[];
  payRate: number;
  payType: string;
  location: Location;
  date: string;
  startTime: string;
  endTime: string;
  status: 'open' | 'filled' | 'cancelled' | 'completed';
  hub: User;
  applicants: Application[];
  selectedProfessional?: User;
  createdAt: string;
  updatedAt: string;
  applicationsCount: number;
}

export interface Application {
  id: string;
  job: Job;
  professional: User;
  status: string;
  message?: string;
  appliedAt: string;
  respondedAt?: string;
}

export interface SocialPost {
  id: string;
  author: User;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  postType: string;
  eventDate?: string;
  createdAt: string;
  updatedAt: string;
  likes: number;
  comments: Comment[];
  discountCode?: string;
  discountPercentage?: number;
  validUntil?: string;
  isLikedByUser: boolean;
}

export interface Comment {
  id: string;
  author: User;
  content: string;
  createdAt: string;
}

export interface TrainingContent {
  id: string;
  trainer: User;
  title: string;
  description: string;
  contentType: 'video' | 'article' | 'workshop' | 'course';
  videoUrl?: string;
  thumbnailUrl?: string;
  price?: number;
  duration: string;
  level: string;
  category: string;
  tags: string[];
  isPaid: boolean;
  purchaseCount: number;
  rating?: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
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

export interface Chat {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantRoles: Record<string, string>;
  lastMessage?: string;
  lastMessageSenderId?: string;
  lastMessageTimestamp?: string;
  unreadCount: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  sender: User;
  receiver: User;
  content: string;
  timestamp: string;
  isRead: boolean;
  messageType: string;
}

export interface Purchase {
  id: string;
  user: User;
  content: TrainingContent;
  amount: number;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  purchasedAt: string;
  accessGranted: boolean;
}

// Input types for mutations
export interface CreateUserInput {
  email: string;
  password?: string;
  displayName?: string;
  roles: string[];
  currentRole?: string;
  googleId?: string;
  profileImage?: string;
}

export interface UpdateUserInput {
  displayName?: string;
  profileImage?: string;
  currentRole?: string;
}

export interface CreateJobInput {
  title: string;
  description: string;
  skillsRequired: string[];
  payRate: number;
  payType: string;
  location: Location;
  date: string;
  startTime: string;
  endTime: string;
  hubId: string;
}

export interface JobFilters {
  status?: string;
  location?: string;
  skills?: string[];
  payMin?: number;
  payMax?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateApplicationInput {
  jobId: string;
  professionalId: string;
  message?: string;
}

export interface CreateSocialPostInput {
  content: string;
  imageUrl?: string;
  postType: string;
  eventDate?: string;
  discountCode?: string;
  discountPercentage?: number;
}

export interface CreateTrainingContentInput {
  title: string;
  description: string;
  contentType: 'video' | 'article' | 'workshop' | 'course';
  videoUrl?: string;
  price?: number;
  duration: string;
  level: string;
  category: string;
  tags: string[];
}

// Response types
export interface AuthPayload {
  user: User;
  token: string;
  refreshToken: string;
}

export interface PaginatedJobs {
  jobs: Job[];
  totalCount: number;
  hasNextPage: boolean;
}

export interface PaginatedPosts {
  posts: SocialPost[];
  totalCount: number;
  hasNextPage: boolean;
}

export interface PaginatedContent {
  content: TrainingContent[];
  totalCount: number;
  hasNextPage: boolean;
}
