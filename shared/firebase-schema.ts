import { z } from "zod";

// Snipshift User Roles - expanded to support the new multi-role model
export type UserRole = "hub" | "professional" | "brand" | "trainer" | "client";

// Base User Schema (multi-role)
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  password: z.string().nullable(),
  roles: z.array(z.enum(["hub", "professional", "brand", "trainer", "client"])).default([]),
  currentRole: z.enum(["hub", "professional", "brand", "trainer", "client"]).nullable().default(null),
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

// Hub-specific fields  
export const hubProfileSchema = z.object({
  businessName: z.string(),
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
  }),
  businessType: z.enum(["barbershop", "salon", "spa", "other"]),
  operatingHours: z.object({
    monday: z.object({ open: z.string(), close: z.string() }).optional(),
    tuesday: z.object({ open: z.string(), close: z.string() }).optional(),
    wednesday: z.object({ open: z.string(), close: z.string() }).optional(),
    thursday: z.object({ open: z.string(), close: z.string() }).optional(),
    friday: z.object({ open: z.string(), close: z.string() }).optional(),
    saturday: z.object({ open: z.string(), close: z.string() }).optional(),
    sunday: z.object({ open: z.string(), close: z.string() }).optional(),
  }).optional(),
});

// Brand-specific fields
export const brandProfileSchema = z.object({
  companyName: z.string(),
  website: z.string().optional(),
  description: z.string().optional(),
  productCategories: z.array(z.string()).default([]),
  logoUrl: z.string().optional(),
  websiteLink: z.string().optional(),
  socialPostsCount: z.number().default(0),
});

// Trainer-specific fields
export const trainerProfileSchema = z.object({
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
  hubId: z.string(), // Reference to hub user ID
  title: z.string(),
  description: z.string(),
  date: z.date(),
  startTime: z.string(),
  endTime: z.string(),
  skillsRequired: z.array(z.string()).default([]),
  payRate: z.number(),
  payType: z.enum(["hourly", "daily", "fixed"]).default("hourly"),
  location: z.object({
    city: z.string(),
    state: z.string(),
    isRemote: z.boolean().default(false),
  }),
  status: z.enum(["open", "filled", "cancelled"]).default("open"),
  applicants: z.array(z.string()).default([]), // Array of professional IDs
  selectedProfessional: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Social Feed Post Schema
export const socialPostSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  authorRole: z.enum(["brand", "trainer"]),
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
  trainerId: z.string(),
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
  trainerId: z.string(),
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
  hubId: z.string(),
  status: z.enum(["pending", "accepted", "rejected"]).default("pending"),
  message: z.string().optional(),
  appliedAt: z.date(),
  respondedAt: z.date().optional(),
});

// Insert schemas (for creating new records)
// Backward compatible: accepts legacy `role` and maps it into `roles` and `currentRole`
export const insertUserSchema = userSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    name: z.string().optional(),
    role: z.enum(["hub", "professional", "brand", "trainer", "client"]).optional(),
    roles: z.array(z.enum(["hub", "professional", "brand", "trainer", "client"]).optional()).optional(),
    currentRole: z.enum(["hub", "professional", "brand", "trainer", "client"]).nullable().optional(),
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
export type HubProfile = z.infer<typeof hubProfileSchema>;
export type BrandProfile = z.infer<typeof brandProfileSchema>;
export type TrainerProfile = z.infer<typeof trainerProfileSchema>;
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

export type Message = z.infer<typeof messageSchema>;
export type Chat = z.infer<typeof chatSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertChat = z.infer<typeof insertChatSchema>;