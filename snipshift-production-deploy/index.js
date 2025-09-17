// server/index.ts
import express3 from "express";

// server/firebase-routes.ts
import { createServer } from "http";

// server/firebase-storage.ts
import { randomUUID } from "crypto";
var MemFirebaseStorage = class {
  users;
  jobs;
  socialPosts;
  applications;
  chats;
  messages;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.jobs = /* @__PURE__ */ new Map();
    this.socialPosts = /* @__PURE__ */ new Map();
    this.applications = /* @__PURE__ */ new Map();
    this.chats = /* @__PURE__ */ new Map();
    this.messages = /* @__PURE__ */ new Map();
  }
  // User methods
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByEmail(email) {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }
  async createUser(insertUser) {
    const id = randomUUID();
    const roles = Array.isArray(insertUser.roles) ? insertUser.roles : [];
    const currentRole = insertUser.currentRole ?? (roles.length ? roles[0] : null);
    const user = {
      ...insertUser,
      id,
      roles,
      currentRole,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.users.set(id, user);
    return user;
  }
  async updateUser(id, updates) {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    const updatedUser = { ...user, ...updates, updatedAt: /* @__PURE__ */ new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  // Job methods
  async createJob(insertJob) {
    const id = randomUUID();
    const job = {
      ...insertJob,
      id,
      status: "open",
      applicants: [],
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.jobs.set(id, job);
    return job;
  }
  async getJobs(filters) {
    let jobs = Array.from(this.jobs.values());
    if (filters?.status) {
      jobs = jobs.filter((job) => job.status === filters.status);
    }
    if (filters?.location) {
      jobs = jobs.filter((job) => job.location.city === filters.location);
    }
    if (filters?.hubId) {
      jobs = jobs.filter((job) => job.hubId === filters.hubId);
    }
    return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async getJobsByHub(hubId) {
    return this.getJobs({ hubId });
  }
  async getJob(id) {
    return this.jobs.get(id);
  }
  async updateJob(id, updates) {
    const job = this.jobs.get(id);
    if (!job) throw new Error("Job not found");
    const updatedJob = { ...job, ...updates, updatedAt: /* @__PURE__ */ new Date() };
    this.jobs.set(id, updatedJob);
    return updatedJob;
  }
  async applyToJob(jobId, professionalId) {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error("Job not found");
    if (!job.applicants.includes(professionalId)) {
      job.applicants.push(professionalId);
      await this.updateJob(jobId, { applicants: job.applicants });
    }
    const applicationId = randomUUID();
    const application = {
      id: applicationId,
      jobId,
      professionalId,
      hubId: job.hubId,
      status: "pending",
      appliedAt: /* @__PURE__ */ new Date()
    };
    this.applications.set(applicationId, application);
    return application;
  }
  // Social post methods
  async createSocialPost(insertPost) {
    const id = randomUUID();
    const post = {
      ...insertPost,
      id,
      likes: 0,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.socialPosts.set(id, post);
    return post;
  }
  async getSocialPosts(filters) {
    let posts = Array.from(this.socialPosts.values());
    if (filters?.type) {
      posts = posts.filter((post) => post.postType === filters.type);
    }
    if (filters?.authorRole) {
      posts = posts.filter((post) => post.authorRole === filters.authorRole);
    }
    if (filters?.authorId) {
      posts = posts.filter((post) => post.authorId === filters.authorId);
    }
    return posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async updateSocialPost(id, updates) {
    const post = this.socialPosts.get(id);
    if (!post) throw new Error("Post not found");
    const updatedPost = { ...post, ...updates, updatedAt: /* @__PURE__ */ new Date() };
    this.socialPosts.set(id, updatedPost);
    return updatedPost;
  }
  // Application methods
  async getApplicationsByJob(jobId) {
    return Array.from(this.applications.values()).filter((app2) => app2.jobId === jobId);
  }
  async getApplicationsByProfessional(professionalId) {
    return Array.from(this.applications.values()).filter((app2) => app2.professionalId === professionalId);
  }
  // Messaging methods
  async createChat(chatId, chatData) {
    const chat = {
      ...chatData,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.chats.set(chatId, chat);
    this.messages.set(chatId, []);
  }
  async getChat(chatId) {
    return this.chats.get(chatId);
  }
  async getUserChats(userId) {
    return Array.from(this.chats.values()).filter((chat) => chat.participants.includes(userId)).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
  async sendMessage(chatId, messageData) {
    const messages = this.messages.get(chatId) || [];
    const message = {
      ...messageData,
      id: randomUUID(),
      timestamp: /* @__PURE__ */ new Date(),
      isRead: false
    };
    messages.push(message);
    this.messages.set(chatId, messages);
    const chat = this.chats.get(chatId);
    if (chat) {
      const newUnreadCount = { ...chat.unreadCount };
      newUnreadCount[messageData.receiverId] = (newUnreadCount[messageData.receiverId] || 0) + 1;
      const updatedChat = {
        ...chat,
        lastMessage: messageData.content,
        lastMessageSender: messageData.senderId,
        lastMessageTimestamp: /* @__PURE__ */ new Date(),
        unreadCount: newUnreadCount,
        updatedAt: /* @__PURE__ */ new Date()
      };
      this.chats.set(chatId, updatedChat);
    }
  }
  async getChatMessages(chatId) {
    return this.messages.get(chatId) || [];
  }
  async markMessagesAsRead(chatId, userId) {
    const chat = this.chats.get(chatId);
    if (chat) {
      const newUnreadCount = { ...chat.unreadCount };
      newUnreadCount[userId] = 0;
      const updatedChat = {
        ...chat,
        unreadCount: newUnreadCount,
        updatedAt: /* @__PURE__ */ new Date()
      };
      this.chats.set(chatId, updatedChat);
    }
  }
};
var firebaseStorage = new MemFirebaseStorage();

// shared/firebase-schema.ts
import { z } from "zod";
var userSchema = z.object({
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
  updatedAt: z.date()
});
var professionalProfileSchema = z.object({
  isVerified: z.boolean().default(false),
  verifiedBy: z.array(z.string()).default([]),
  // Array of admin IDs who verified
  certifications: z.array(z.object({
    type: z.string(),
    issuer: z.string(),
    date: z.date(),
    documentUrl: z.string().optional()
  })).default([]),
  skills: z.array(z.string()).default([]),
  experience: z.string().optional(),
  homeLocation: z.object({
    city: z.string(),
    state: z.string(),
    country: z.string(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional()
  }).optional(),
  isRoamingNomad: z.boolean().default(false),
  preferredRegions: z.array(z.string()).default([])
});
var hubProfileSchema = z.object({
  businessName: z.string(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    postcode: z.string(),
    country: z.string(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional()
  }),
  businessType: z.enum(["barbershop", "salon", "spa", "other"]),
  operatingHours: z.object({
    monday: z.object({ open: z.string(), close: z.string() }).optional(),
    tuesday: z.object({ open: z.string(), close: z.string() }).optional(),
    wednesday: z.object({ open: z.string(), close: z.string() }).optional(),
    thursday: z.object({ open: z.string(), close: z.string() }).optional(),
    friday: z.object({ open: z.string(), close: z.string() }).optional(),
    saturday: z.object({ open: z.string(), close: z.string() }).optional(),
    sunday: z.object({ open: z.string(), close: z.string() }).optional()
  }).optional()
});
var brandProfileSchema = z.object({
  companyName: z.string(),
  website: z.string().optional(),
  description: z.string().optional(),
  productCategories: z.array(z.string()).default([]),
  logoUrl: z.string().optional(),
  websiteLink: z.string().optional(),
  socialPostsCount: z.number().default(0)
});
var trainerProfileSchema = z.object({
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
    category: z.string()
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
    purchaseCount: z.number().default(0)
  })).default([])
});
var jobSchema = z.object({
  id: z.string(),
  hubId: z.string(),
  // Reference to hub user ID
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
    isRemote: z.boolean().default(false)
  }),
  status: z.enum(["open", "filled", "cancelled"]).default("open"),
  applicants: z.array(z.string()).default([]),
  // Array of professional IDs
  selectedProfessional: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});
var socialPostSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  authorRole: z.enum(["brand", "trainer"]),
  postType: z.enum(["offer", "event", "announcement", "product", "discount"]),
  content: z.string(),
  imageUrl: z.string().optional(),
  linkUrl: z.string().optional(),
  location: z.string().optional(),
  eventDate: z.date().optional(),
  // For training/workshops
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
  validUntil: z.date().optional()
});
var trainingContentSchema = z.object({
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
  updatedAt: z.date()
});
var purchaseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  contentId: z.string(),
  trainerId: z.string(),
  amount: z.number(),
  paymentStatus: z.enum(["pending", "completed", "failed"]).default("pending"),
  purchasedAt: z.date(),
  accessGranted: z.boolean().default(false)
});
var applicationSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  professionalId: z.string(),
  hubId: z.string(),
  status: z.enum(["pending", "accepted", "rejected"]).default("pending"),
  message: z.string().optional(),
  appliedAt: z.date(),
  respondedAt: z.date().optional()
});
var insertUserSchema = userSchema.omit({ id: true, createdAt: true, updatedAt: true }).extend({
  name: z.string().optional(),
  role: z.enum(["hub", "professional", "brand", "trainer", "client"]).optional(),
  roles: z.array(z.enum(["hub", "professional", "brand", "trainer", "client"]).optional()).optional(),
  currentRole: z.enum(["hub", "professional", "brand", "trainer", "client"]).nullable().optional()
}).transform((data) => {
  const legacyRole = data.role;
  const inputRoles = data.roles;
  const roles = inputRoles ?? (legacyRole ? [legacyRole] : []);
  const currentRole = data.currentRole ?? (legacyRole ?? null);
  const { role: _legacyRole, ...rest } = data;
  return { ...rest, roles, currentRole };
});
var loginSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
  googleId: z.string().optional()
});
var shiftSchema = z.object({
  id: z.string(),
  hubId: z.string(),
  title: z.string(),
  date: z.date(),
  requirements: z.string(),
  pay: z.number()
});
var insertShiftSchema = shiftSchema.omit({ id: true });
var insertJobSchema = jobSchema.omit({ id: true, createdAt: true, updatedAt: true });
var insertSocialPostSchema = socialPostSchema.omit({ id: true, createdAt: true, updatedAt: true });
var insertApplicationSchema = applicationSchema.omit({ id: true, appliedAt: true });
var messageSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  receiverId: z.string(),
  content: z.string(),
  timestamp: z.date(),
  isRead: z.boolean().default(false),
  messageType: z.enum(["text", "system"]).default("text")
});
var chatSchema = z.object({
  id: z.string(),
  participants: z.array(z.string()).length(2),
  // Array of two user IDs
  participantNames: z.record(z.string()),
  // Map of userId -> displayName
  participantRoles: z.record(z.string()),
  // Map of userId -> role
  lastMessage: z.string().optional(),
  lastMessageSender: z.string().optional(),
  lastMessageTimestamp: z.date().optional(),
  unreadCount: z.record(z.number()).default({}),
  // Map of userId -> unreadCount
  createdAt: z.date(),
  updatedAt: z.date()
});
var insertMessageSchema = messageSchema.omit({ id: true, timestamp: true, isRead: true });
var insertChatSchema = chatSchema.omit({ id: true, createdAt: true, updatedAt: true });

// server/firebase-routes.ts
import fetch from "node-fetch";
async function registerFirebaseRoutes(app2) {
  app2.post("/api/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await firebaseStorage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }
      const user = await firebaseStorage.createUser(userData);
      res.json({
        id: user.id,
        email: user.email,
        roles: user.roles || [],
        currentRole: user.currentRole || null,
        displayName: user.displayName
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Invalid registration data" });
    }
  });
  app2.post("/api/login", async (req, res) => {
    try {
      const loginData = loginSchema.parse(req.body);
      const user = await firebaseStorage.getUserByEmail(loginData.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      if (loginData.googleId) {
        const storedGoogleId = user.googleId;
        if (storedGoogleId && storedGoogleId !== loginData.googleId) {
          return res.status(401).json({ message: "Invalid Google authentication" });
        }
        if (!storedGoogleId) {
          await firebaseStorage.updateUser(user.id, { googleId: loginData.googleId, provider: "google" });
        }
      } else {
        if (!user.password || user.password !== loginData.password) {
          return res.status(401).json({ message: "Invalid email or password" });
        }
      }
      req.session.user = { id: user.id, roles: user.roles, currentRole: user.currentRole, email: user.email };
      res.json({
        id: user.id,
        email: user.email,
        roles: user.roles || [],
        currentRole: user.currentRole || null,
        displayName: user.displayName
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Invalid login data" });
    }
  });
  app2.post("/api/oauth/google/exchange", async (req, res) => {
    try {
      const { code, redirectUri } = req.body || {};
      const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const missing = [];
      if (!code) missing.push("code");
      if (!redirectUri) missing.push("redirectUri");
      if (!clientId) missing.push("GOOGLE_CLIENT_ID");
      if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
      if (missing.length) return res.status(400).json({ message: "Missing OAuth parameters", missing });
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: String(code),
          client_id: String(clientId),
          client_secret: String(clientSecret),
          redirect_uri: String(redirectUri),
          grant_type: "authorization_code"
        })
      });
      if (!tokenRes.ok) {
        const text = await tokenRes.text();
        return res.status(400).json({ message: "Token exchange failed", detail: text });
      }
      const tokenJson = await tokenRes.json();
      const idToken = tokenJson.id_token;
      if (!idToken) return res.status(400).json({ message: "No id_token in response" });
      const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64").toString("utf8"));
      const email = payload?.email;
      const sub = payload?.sub;
      if (!email || !sub) return res.status(400).json({ message: "Invalid id_token payload" });
      let user = await firebaseStorage.getUserByEmail(email);
      if (!user) {
        user = await firebaseStorage.createUser({
          email,
          password: null,
          provider: "google",
          googleId: sub,
          roles: [],
          currentRole: null
        });
      } else if (user.googleId !== sub) {
        user = await firebaseStorage.updateUser(user.id, { googleId: sub, provider: "google" });
      }
      req.session.user = { id: user.id, roles: user.roles, currentRole: user.currentRole, email: user.email };
      res.json({
        id: user.id,
        email: user.email,
        roles: user.roles || [],
        currentRole: user.currentRole || null,
        displayName: user.displayName
      });
    } catch (err) {
      console.error("OAuth exchange error", err);
      res.status(500).json({ message: "OAuth exchange failed" });
    }
  });
  app2.get("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const user = await firebaseStorage.getUser(id);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({
        id: user.id,
        email: user.email,
        roles: user.roles || [],
        currentRole: user.currentRole || null,
        displayName: user.displayName
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });
  app2.patch("/api/users/:id/current-role", async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const sessionUser = req.session?.user;
      if (!sessionUser) {
        return res.status(401).json({ error: "Authentication required" });
      }
      if (sessionUser.id !== id) {
        return res.status(403).json({ error: "Cannot modify another user's role" });
      }
      if (!role || !["hub", "professional", "brand", "trainer", "client"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      const user = await firebaseStorage.getUser(id);
      if (!user) return res.status(404).json({ error: "User not found" });
      const roles = [...user.roles || []];
      if (!roles.includes(role)) roles.push(role);
      const updatedUser = await firebaseStorage.updateUser(id, { roles, currentRole: role });
      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        roles: updatedUser.roles,
        currentRole: updatedUser.currentRole,
        displayName: updatedUser.displayName
      });
    } catch (error) {
      res.status(400).json({ error: "Failed to update currentRole" });
    }
  });
  app2.patch("/api/users/:id/roles", async (req, res) => {
    try {
      const { id } = req.params;
      const { action, role } = req.body;
      const sessionUser = req.session?.user;
      if (!sessionUser) return res.status(401).json({ error: "Authentication required" });
      if (sessionUser.id !== id) return res.status(403).json({ error: "Cannot modify another user's roles" });
      if (!role || !["hub", "professional", "brand", "trainer", "client"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      const user = await firebaseStorage.getUser(id);
      if (!user) return res.status(404).json({ error: "User not found" });
      let roles = user.roles || [];
      let currentRole = user.currentRole ?? null;
      if (action === "add") {
        if (!roles.includes(role)) roles = [...roles, role];
        if (!currentRole) currentRole = role;
      } else if (action === "remove") {
        roles = roles.filter((r) => r !== role);
        if (currentRole === role) currentRole = roles[0] ?? null;
      } else {
        return res.status(400).json({ error: "Invalid action" });
      }
      const updatedUser = await firebaseStorage.updateUser(id, { roles, currentRole });
      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        roles: updatedUser.roles,
        currentRole: updatedUser.currentRole,
        displayName: updatedUser.displayName
      });
    } catch (error) {
      res.status(400).json({ error: "Failed to update roles" });
    }
  });
  if (process.env.NODE_ENV === "test" || process.env.E2E_TEST === "1") {
    app2.post("/api/test/login", async (req, res) => {
      try {
        const testKeyHeader = req.headers["x-test-key"];
        const expectedKey = process.env.E2E_TEST_KEY || "test";
        if (testKeyHeader !== expectedKey) {
          return res.status(403).json({ message: "Forbidden" });
        }
        const { email, password = "password123", role = "professional", displayName = "E2E User" } = req.body || {};
        if (!email) return res.status(400).json({ message: "email is required" });
        let user = await firebaseStorage.getUserByEmail(email);
        if (!user) {
          user = await firebaseStorage.createUser({
            email,
            password,
            roles: [role],
            currentRole: role,
            displayName
          });
        } else if (!user.roles?.includes(role)) {
          const nextRoles = [...user.roles || [], role].filter((v, i, a) => a.indexOf(v) === i);
          const nextCurrent = user.currentRole || role;
          user = await firebaseStorage.updateUser(user.id, { roles: nextRoles, currentRole: nextCurrent });
        }
        req.session.user = { id: user.id, roles: user.roles, currentRole: user.currentRole, email: user.email };
        res.json({ id: user.id, email: user.email, roles: user.roles, currentRole: user.currentRole, displayName: user.displayName });
      } catch (err) {
        console.error("test login error", err);
        res.status(500).json({ message: "test login failed" });
      }
    });
  }
  app2.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });
  app2.post("/api/jobs", async (req, res) => {
    try {
      const jobData = insertJobSchema.parse(req.body);
      const job = await firebaseStorage.createJob(jobData);
      res.json(job);
    } catch (error) {
      console.error("Job creation error:", error);
      res.status(400).json({ message: "Invalid job data" });
    }
  });
  app2.get("/api/jobs", async (req, res) => {
    try {
      const { status, location, hubId } = req.query;
      const filters = {};
      if (status) filters.status = status;
      if (location) filters.location = location;
      if (hubId) filters.hubId = hubId;
      const jobs = await firebaseStorage.getJobs(filters);
      res.json(jobs);
    } catch (error) {
      console.error("Job fetch error:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });
  app2.get("/api/jobs/hub/:hubId", async (req, res) => {
    try {
      const { hubId } = req.params;
      const jobs = await firebaseStorage.getJobsByHub(hubId);
      res.json(jobs);
    } catch (error) {
      console.error("Hub jobs fetch error:", error);
      res.status(500).json({ message: "Failed to fetch hub jobs" });
    }
  });
  app2.post("/api/jobs/:id/apply", async (req, res) => {
    try {
      const { id: jobId } = req.params;
      const { professionalId } = req.body;
      if (!professionalId) {
        return res.status(400).json({ message: "Professional ID is required" });
      }
      const job = await firebaseStorage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      const application = await firebaseStorage.applyToJob(jobId, professionalId);
      const hubOwner = await firebaseStorage.getUser(job.hubId);
      console.log("\u{1F4E7} EMAIL NOTIFICATION SENT:");
      console.log(`To: ${hubOwner?.email || "hub@example.com"}`);
      console.log(`Subject: New Application for ${job.title}`);
      console.log(`Message: A professional has applied for your job "${job.title}" scheduled for ${job.date}. Please log in to your dashboard to review the application.`);
      res.json({
        message: "Application submitted successfully",
        applicationId: application.id
      });
    } catch (error) {
      console.error("Job application error:", error);
      res.status(500).json({ message: "Failed to submit application" });
    }
  });
  app2.post("/api/social-posts", async (req, res) => {
    try {
      const postData = insertSocialPostSchema.parse({
        ...req.body,
        id: Date.now().toString(),
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date(),
        likes: 0,
        comments: []
      });
      const post = await firebaseStorage.createSocialPost(postData);
      res.json(post);
    } catch (error) {
      console.error("Social post creation error:", error);
      res.status(400).json({ message: "Invalid post data" });
    }
  });
  app2.get("/api/social-posts", async (req, res) => {
    try {
      const { postType, authorRole, authorId } = req.query;
      const filters = {};
      if (postType) filters.postType = postType;
      if (authorRole) filters.authorRole = authorRole;
      if (authorId) filters.authorId = authorId;
      const posts = await firebaseStorage.getSocialPosts(filters);
      res.json(posts);
    } catch (error) {
      console.error("Social posts fetch error:", error);
      res.status(500).json({ message: "Failed to fetch social posts" });
    }
  });
  app2.get("/api/applications/job/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      const applications = await firebaseStorage.getApplicationsByJob(jobId);
      res.json(applications);
    } catch (error) {
      console.error("Applications fetch error:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });
  app2.get("/api/applications/professional/:professionalId", async (req, res) => {
    try {
      const { professionalId } = req.params;
      const applications = await firebaseStorage.getApplicationsByProfessional(professionalId);
      res.json(applications);
    } catch (error) {
      console.error("Professional applications fetch error:", error);
      res.status(500).json({ message: "Failed to fetch professional applications" });
    }
  });
  app2.post("/api/chats", async (req, res) => {
    try {
      const { chatId, participants, participantNames, participantRoles } = req.body;
      if (!chatId || !participants || participants.length !== 2) {
        return res.status(400).json({ message: "Invalid chat data" });
      }
      const chatData = {
        id: chatId,
        participants,
        participantNames: participantNames || {},
        participantRoles: participantRoles || {},
        unreadCount: {
          [participants[0]]: 0,
          [participants[1]]: 0
        }
      };
      await firebaseStorage.createChat(chatId, chatData);
      res.json({ chatId });
    } catch (error) {
      console.error("Chat creation error:", error);
      res.status(500).json({ message: "Failed to create chat" });
    }
  });
  app2.get("/api/chats/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const chats = await firebaseStorage.getUserChats(userId);
      res.json(chats);
    } catch (error) {
      console.error("User chats fetch error:", error);
      res.status(500).json({ message: "Failed to fetch user chats" });
    }
  });
  app2.post("/api/chats/:chatId/messages", async (req, res) => {
    try {
      const { chatId } = req.params;
      const { senderId, receiverId, content } = req.body;
      if (!senderId || !receiverId || !content) {
        return res.status(400).json({ message: "Missing required message data" });
      }
      const messageData = {
        senderId,
        receiverId,
        content,
        messageType: "text"
      };
      await firebaseStorage.sendMessage(chatId, messageData);
      res.json({ message: "Message sent successfully" });
    } catch (error) {
      console.error("Message send error:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });
  app2.get("/api/chats/:chatId/messages", async (req, res) => {
    try {
      const { chatId } = req.params;
      const messages = await firebaseStorage.getChatMessages(chatId);
      res.json(messages);
    } catch (error) {
      console.error("Messages fetch error:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  app2.put("/api/chats/:chatId/read/:userId", async (req, res) => {
    try {
      const { chatId, userId } = req.params;
      await firebaseStorage.markMessagesAsRead(chatId, userId);
      res.json({ message: "Messages marked as read" });
    } catch (error) {
      console.error("Mark as read error:", error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  define: {
    "import.meta.env.VITE_GOOGLE_CLIENT_ID": JSON.stringify(process.env.VITE_GOOGLE_CLIENT_ID || ""),
    "import.meta.env.VITE_GOOGLE_REDIRECT_URI": JSON.stringify(process.env.VITE_GOOGLE_REDIRECT_URI || "")
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      // Ensure a single React instance is used
      react: path.resolve(import.meta.dirname, "node_modules/react"),
      "react-dom": path.resolve(import.meta.dirname, "node_modules/react-dom")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  if (process.env.NODE_ENV !== "production") {
    console.log(`${formattedTime} [${source}] ${message}`);
  } else {
    console.info(`${formattedTime} [${source}] ${message}`);
  }
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/middleware/production.ts
import express2 from "express";
import path3 from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path3.dirname(__filename);
function setupProductionMiddleware(app2) {
  app2.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    const isProduction = process.env.NODE_ENV === "production";
    const isCi = process.env.CI === "true" || process.env.CI === "1";
    const isE2e = process.env.E2E_TEST === "1" || process.env.VITE_E2E === "1";
    const hostHeader = req.header("host") || "";
    const isLocalHost = hostHeader.startsWith("localhost") || hostHeader.startsWith("127.0.0.1") || hostHeader.startsWith("[::1]") || hostHeader.startsWith("::1");
    const shouldRedirectToHttps = isProduction && !isCi && !isE2e && !isLocalHost && req.header("x-forwarded-proto") !== "https";
    if (shouldRedirectToHttps) {
      res.redirect(`https://${hostHeader}${req.url}`);
      return;
    }
    next();
  });
  app2.use((req, res, next) => {
    if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else if (req.url.match(/\.(html|json)$/)) {
      res.setHeader("Cache-Control", "public, max-age=3600");
    }
    next();
  });
  if (process.env.NODE_ENV === "production") {
    const clientBuildPath = path3.join(__dirname, "public");
    app2.use(express2.static(clientBuildPath));
    app2.get("*", (req, res, next) => {
      if (req.url.startsWith("/api/")) {
        return next();
      }
      res.sendFile(path3.join(clientBuildPath, "index.html"));
    });
  }
}
function setupHealthCheck(app2) {
  app2.get("/health", (req, res) => {
    res.status(200).json({
      status: "healthy",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: "1.0.0"
    });
  });
  app2.get("/ready", (req, res) => {
    res.status(200).json({
      status: "ready",
      checks: {
        database: "ok",
        // In real app, check actual database connection
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + "MB"
        }
      }
    });
  });
}

// server/middleware/security.ts
import { rateLimit } from "express-rate-limit";
var authLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: process.env.NODE_ENV === "development" ? 50 : 5,
  // Higher limit for development
  message: {
    error: "Too many authentication attempts, please try again later.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
  // trustProxy: true, // Always trust proxy for Replit deployment
  skip: (req) => process.env.NODE_ENV === "development" && req.ip === "::1"
});
var apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: process.env.NODE_ENV === "development" ? 1e3 : 100,
  // Higher limit for development
  message: {
    error: "Too many requests, please try again later.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
  // trustProxy: true, // Always trust proxy for Replit deployment
  skip: (req) => process.env.NODE_ENV === "development" && req.ip === "::1"
});
function requireCsrfHeader(req, res, next) {
  const method = req.method.toUpperCase();
  const isSafe = method === "GET" || method === "HEAD" || method === "OPTIONS";
  if (isSafe) return next();
  const header = req.headers["x-snipshift-csrf"];
  if (!header) {
    return res.status(403).json({ error: "Missing CSRF header" });
  }
  next();
}
function sanitizeInput(req, res, next) {
  function sanitizeObject(obj) {
    if (typeof obj === "string") {
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/<[^>]+>/g, "").trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === "object") {
      const sanitized = {};
      for (const key in obj) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
      return sanitized;
    }
    return obj;
  }
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
}
function securityHeaders(req, res, next) {
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self' https://www.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://apis.google.com https://maps.googleapis.com https://accounts.google.com https://replit.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://www.gstatic.com https://apis.google.com https://maps.googleapis.com https://accounts.google.com; frame-src 'self' https://accounts.google.com; child-src 'self' https://accounts.google.com;"
  );
  next();
}

// server/index.ts
import helmet from "helmet";
import compression from "compression";
import session from "express-session";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
var app = express3();
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(securityHeaders);
app.use(sanitizeInput);
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
var useMemoryStore = !process.env.DATABASE_URL || process.env.E2E_TEST === "1" || process.env.NODE_ENV === "test";
var PgSession = connectPg(session);
var MemoryStore = createMemoryStore(session);
app.use(session({
  name: "sid",
  store: useMemoryStore ? new MemoryStore({ checkPeriod: 1e3 * 60 * 30 }) : new PgSession({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || "dev-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    // In CI/E2E we run over HTTP on localhost; secure cookies would be dropped
    secure: process.env.NODE_ENV === "production" && process.env.E2E_TEST !== "1" && process.env.CI !== "true" && process.env.VITE_E2E !== "1",
    maxAge: 1e3 * 60 * 60 * 24 * 7
  }
}));
if (process.env.NODE_ENV === "production") {
  setupProductionMiddleware(app);
}
setupHealthCheck(app);
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  app.use("/api", apiLimiter);
  if (process.env.E2E_TEST !== "1" && process.env.CI !== "true") {
    app.use("/api", requireCsrfHeader);
  }
  const server = await registerFirebaseRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0"
  }, () => {
    log(`serving on port ${port}`);
  });
})();
