import { z } from "zod";

// Snipshift User Roles - simplified to two-role model
export type UserRole = "professional" | "business";

// Base User Schema (multi-role)
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  password: z.string().nullable(),
  roles: z.array(z.enum(["professional", "business"])).default(["professional"]),
  currentRole: z.enum(["professional", "business"]).nullable().default("professional"),
  displayName: z.string().optional(),
  profileImage: z.string().optional(),
  googleId: z.string().optional(),
  provider: z.enum(["email", "google"]).default("email"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Professional-specific fields
export const professionalProfileSchema = z.object({
  isVerified: z.boolean().default(false),
  verifiedBy: z.array(z.string()).default([]), // Array of admin IDs who verified
  certifications: z.array(z.object({
    type: z.string(),
    issuer: z.string(),
    date: z.date(),
    documentUrl: z.string().optional(),
  })).default([]),
  skills: z.array(z.string()).default([]),
  experience: z.string().optional(),
  homeLocation: z.object({
    city: z.string(),
    state: z.string(),
    country: z.string(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
  }).optional(),
  isRoamingNomad: z.boolean().default(false),
  preferredRegions: z.array(z.string()).default([]),
});

// Business-specific fields (consolidated from hub, brand, trainer)
export const businessProfileSchema = z.object({
  businessName: z.string(),
  businessType: z.enum(["barbershop", "salon", "spa", "brand", "training", "other"]),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    postcode: z.string(),
    country: z.string(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
  }).optional(),
  operatingHours: z.object({
    monday: z.object({ open: z.string(), close: z.string() }).optional(),
    tuesday: z.object({ open: z.string(), close: z.string() }).optional(),
    wednesday: z.object({ open: z.string(), close: z.string() }).optional(),
    thursday: z.object({ open: z.string(), close: z.string() }).optional(),
    friday: z.object({ open: z.string(), close: z.string() }).optional(),
    saturday: z.object({ open: z.string(), close: z.string() }).optional(),
    sunday: z.object({ open: z.string(), close: z.string() }).optional(),
  }).optional(),
  website: z.string().optional(),
  description: z.string().optional(),
  productCategories: z.array(z.string()).default([]),
  logoUrl: z.string().optional(),
  socialPostsCount: z.number().default(0),
  // Training-specific fields (for businesses offering training)
  qualifications: z.array(z.string()).default([]),
  specializations: z.array(z.string()).default([]),
  yearsExperience: z.number().optional(),
  trainingLocation: z.string().optional(),
  credentials: z.array(z.string()).default([]),
  trainingOfferings: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    price: z.number().optional(),
    duration: z.string().optional(),
    level: z.enum(["beginner", "intermediate", "advanced"]),
    category: z.string(),
  })).default([]),
  trainingHubContent: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    videoUrl: z.string(),
    thumbnailUrl: z.string().optional(),
    price: z.number().default(0),
    duration: z.string(),
    isPaid: z.boolean().default(false),
    purchaseCount: z.number().default(0),
  })).default([]),
});


// Job/Shift Schema - renamed from shift to job for clarity
export const jobSchema = z.object({
  id: z.string(),
  businessId: z.string(), // Reference to business user ID (formerly hubId)
  title: z.string(),
  description: z.string(),
  requirements: z.string().optional(), // Additional requirements field
  date: z.date(),
  startTime: z.string(),
  endTime: z.string(),
  skillsRequired: z.array(z.string()).default([]),
  payRate: z.number(),
  payType: z.enum(["hourly", "daily", "fixed"]).default("hourly"),
  location: z.object({
    street: z.string().optional(),
    city: z.string(),
    state: z.string(),
    postcode: z.string().optional(),
    isRemote: z.boolean().default(false),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
  }),
  status: z.enum(["draft", "open", "filled", "cancelled", "expired"]).default("open"),
  urgency: z.enum(["low", "medium", "high"]).default("medium"),
  maxApplicants: z.number().default(5),
  applicants: z.array(z.string()).default([]), // Array of professional IDs
  selectedProfessionalId: z.string().optional(),
  deadline: z.date().optional(), // Application deadline
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Social Feed Post Schema
export const socialPostSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  authorRole: z.enum(["business"]),
  postType: z.enum(["offer", "event", "announcement", "product", "discount"]),
  content: z.string(),
  imageUrl: z.string().optional(),
  linkUrl: z.string().optional(),
  location: z.string().optional(),
  eventDate: z.date().optional(), // For training/workshops
  createdAt: z.date(),
  updatedAt: z.date(),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  likes: z.number().default(0),
  comments: z.array(z.object({
    id: z.string(),
    userId: z.string(),
    content: z.string(),
    createdAt: z.date()
  })).default([]),
  discountCode: z.string().optional(),
  discountPercentage: z.number().optional(),
  validUntil: z.date().optional(),
});

// Training Content Schema
export const trainingContentSchema = z.object({
  id: z.string(),
  businessId: z.string(), // Reference to business user ID (formerly trainerId)
  title: z.string(),
  description: z.string(),
  videoUrl: z.string(),
  thumbnailUrl: z.string().optional(),
  price: z.number().default(0),
  duration: z.string(),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  category: z.string(),
  isPaid: z.boolean().default(false),
  purchaseCount: z.number().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Purchase Record Schema
export const purchaseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  contentId: z.string(),
  businessId: z.string(), // Reference to business user ID (formerly trainerId)
  amount: z.number(),
  paymentStatus: z.enum(["pending", "completed", "failed"]).default("pending"),
  purchasedAt: z.date(),
  accessGranted: z.boolean().default(false),
});

// Application Schema
export const applicationSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  professionalId: z.string(),
  businessId: z.string(), // Reference to business user ID (formerly hubId)
  status: z.enum(["pending", "accepted", "rejected", "withdrawn"]).default("pending"),
  coverLetter: z.string().optional(),
  portfolioSamples: z.array(z.string()).default([]), // Array of file URLs
  message: z.string().optional(),
  appliedAt: z.date(),
  respondedAt: z.date().optional(),
  withdrawnAt: z.date().optional(),
});

// Insert schemas (for creating new records)
// Backward compatible: accepts legacy `role` and maps it into `roles` and `currentRole`
export const insertUserSchema = userSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    name: z.string().optional(),
    role: z.enum(["professional", "business"]).optional(),
    roles: z.array(z.enum(["professional", "business"]).optional()).optional(),
    currentRole: z.enum(["professional", "business"]).nullable().optional(),
  })
  .transform((data) => {
    const legacyRole = (data as any).role as UserRole | undefined;
    const inputRoles = (data as any).roles as UserRole[] | undefined;
    const roles: UserRole[] = inputRoles ?? (legacyRole ? [legacyRole] : []);
    const currentRole: UserRole | null = (data as any).currentRole ?? (legacyRole ?? null);
    const { role: _legacyRole, ...rest } = data as any;
    return { ...rest, roles, currentRole };
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
  googleId: z.string().optional(),
});

// Add Shift schema for backend compatibility
export const shiftSchema = z.object({
  id: z.string(),
  hubId: z.string(),
  title: z.string(),
  date: z.date(),
  requirements: z.string(),
  pay: z.number(),
});

export const insertShiftSchema = shiftSchema.omit({ id: true });

export type Shift = z.infer<typeof shiftSchema>;
export type InsertShift = z.infer<typeof insertShiftSchema>;

export const insertJobSchema = jobSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertSocialPostSchema = socialPostSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertApplicationSchema = applicationSchema.omit({ id: true, appliedAt: true });



// Type exports
export type User = z.infer<typeof userSchema>;
export type ProfessionalProfile = z.infer<typeof professionalProfileSchema>;
export type BusinessProfile = z.infer<typeof businessProfileSchema>;
export type Job = z.infer<typeof jobSchema>;
export type SocialPost = z.infer<typeof socialPostSchema>;
export type Application = z.infer<typeof applicationSchema>;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type InsertSocialPost = z.infer<typeof insertSocialPostSchema>;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type LoginData = z.infer<typeof loginSchema>;

// Messaging Schema
export const messageSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  receiverId: z.string(),
  content: z.string(),
  timestamp: z.date(),
  isRead: z.boolean().default(false),
  messageType: z.enum(["text", "system"]).default("text"),
});

export const chatSchema = z.object({
  id: z.string(),
  participants: z.array(z.string()).length(2), // Array of two user IDs
  participantNames: z.record(z.string(), z.string()), // Map of userId -> displayName
  participantRoles: z.record(z.string(), z.string()), // Map of userId -> role
  lastMessage: z.string().optional(),
  lastMessageSender: z.string().optional(),
  lastMessageTimestamp: z.date().optional(),
  unreadCount: z.record(z.string(), z.number()).default({}), // Map of userId -> unreadCount
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertMessageSchema = messageSchema.omit({ id: true, timestamp: true, isRead: true });
export const insertChatSchema = chatSchema.omit({ id: true, createdAt: true, updatedAt: true });

// Rating and Review Schema
export const ratingSchema = z.object({
  id: z.string(),
  raterId: z.string(), // User who gave the rating
  ratedId: z.string(), // User who received the rating
  jobId: z.string().optional(), // Optional reference to the job/shift
  rating: z.number().min(1).max(5),
  review: z.string().optional(),
  createdAt: z.date(),
});

// Saved Shift Schema (for professionals to save shifts for later)
export const savedShiftSchema = z.object({
  id: z.string(),
  professionalId: z.string(),
  jobId: z.string(),
  savedAt: z.date(),
});

// Notification Schema
export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(["new_shift", "application_update", "new_application", "message"]),
  title: z.string(),
  message: z.string(),
  isRead: z.boolean().default(false),
  relatedId: z.string().optional(), // ID of related job, application, etc.
  createdAt: z.date(),
});

export const insertRatingSchema = ratingSchema.omit({ id: true, createdAt: true });
export const insertSavedShiftSchema = savedShiftSchema.omit({ id: true, savedAt: true });
export const insertNotificationSchema = notificationSchema.omit({ id: true, createdAt: true });

export type Message = z.infer<typeof messageSchema>;
export type Chat = z.infer<typeof chatSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type Rating = z.infer<typeof ratingSchema>;
export type SavedShift = z.infer<typeof savedShiftSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type InsertSavedShift = z.infer<typeof insertSavedShiftSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;