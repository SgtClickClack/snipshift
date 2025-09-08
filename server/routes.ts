import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertShiftSchema } from "@shared/firebase-schema";
import { stripeConnectRoutes } from "./stripe-connect";
import nodemailer from "nodemailer";

export async function registerRoutes(app: Express): Promise<Server> {


  // Registration endpoint
  app.post("/api/register", async (req, res) => {
    try {
      // Parse the data and ensure default role is applied
      const userData = insertUserSchema.parse({
        ...req.body,
        role: req.body.role || "client" // Default to client for universal signup
      });
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      const user = await storage.createUser(userData);
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ User created in backend:', { id: user.id, email: user.email, roles: (user as any).roles, currentRole: (user as any).currentRole });
      }
      res.json({ 
        id: user.id, 
        email: user.email, 
        roles: (user as any).roles || [],
        currentRole: (user as any).currentRole || null,
        displayName: (user as any).displayName,
        profileImage: (user as any).profileImage
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ error: "Invalid registration data" });
    }
  });

  // Login endpoint (supports both email/password and Google auth)
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password, googleId } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // For Google auth, check googleId instead of password
      if (googleId) {
        if (!user.googleId || user.googleId !== googleId) {
          return res.status(401).json({ error: "Invalid Google authentication" });
        }
      } else {
        // Regular email/password auth
        if (!user.password || user.password !== password) {
          return res.status(401).json({ error: "Invalid email or password" });
        }
      }

      // establish session
      (req as any).session.user = { id: user.id, roles: (user as any).roles, currentRole: (user as any).currentRole, email: user.email };

      res.json({ 
        id: user.id, 
        email: user.email, 
        roles: (user as any).roles || [],
        currentRole: (user as any).currentRole || null,
        displayName: (user as any).displayName,
        profileImage: (user as any).profileImage
      });
    } catch (error) {
      res.status(400).json({ error: "Invalid login data" });
    }
  });

  // Create job endpoint
  app.post("/api/jobs", async (req, res) => {
    try {
      const jobData = {
        ...req.body,
        id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "open",
        applicants: []
      };
      
      // Store in memory (extend storage later)
      res.json(jobData);
    } catch (error) {
      res.status(400).json({ error: "Invalid job data" });
    }
  });

  // Get all jobs endpoint
  app.get("/api/jobs", async (req, res) => {
    try {
      // Return demo jobs for now
      const demoJobs = [
        {
          id: "job_1",
          hubId: "hub_1",
          hubName: "The Cutting Edge Barber Shop",
          title: "Senior Barber - Weekend Shift",
          description: "Looking for an experienced barber for weekend coverage at our busy downtown location.",
          date: new Date("2025-09-15T09:00:00Z"),
          startTime: "09:00",
          endTime: "17:00",
          skillsRequired: ["Hair Cutting", "Beard Trimming", "Customer Service"],
          payRate: 35,
          payType: "hour",
          location: { city: "Sydney", state: "NSW", postcode: "2000" },
          status: "open",
          applicants: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          urgency: "medium",
          maxApplicants: 5
        },
        {
          id: "job_2", 
          hubId: "hub_2",
          hubName: "Modern Hair Studio",
          title: "Hair Stylist - Special Event",
          description: "Need a talented stylist for a wedding event. Great opportunity for portfolio building.",
          date: new Date("2025-09-16T14:00:00Z"),
          startTime: "14:00",
          endTime: "20:00",
          skillsRequired: ["Hair Styling", "Hair Coloring", "Makeup"],
          payRate: 45,
          payType: "hour",
          location: { city: "Melbourne", state: "VIC", postcode: "3000" },
          status: "open",
          applicants: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          urgency: "high",
          maxApplicants: 3
        },
        {
          id: "job_3",
          hubId: "hub_3", 
          hubName: "Brisbane Barber Co.",
          title: "Apprentice Barber Opportunity",
          description: "Great opportunity for a barber apprentice to learn from experienced professionals in a modern salon.",
          date: new Date("2025-09-17T08:30:00Z"),
          startTime: "08:30",
          endTime: "16:30",
          skillsRequired: ["Basic Hair Cutting", "Willingness to Learn"],
          payRate: 25,
          payType: "hour",
          location: { city: "Brisbane", state: "QLD", postcode: "4000" },
          status: "open",
          applicants: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          urgency: "low",
          maxApplicants: 2
        },
        {
          id: "job_4",
          hubId: "hub_4",
          hubName: "Gold Coast Mobile Cuts", 
          title: "Mobile Barber Service",
          description: "Experienced barber for mobile service covering Gold Coast area. Own transport required.",
          date: new Date("2025-09-18T11:00:00Z"),
          startTime: "11:00",
          endTime: "19:00",
          skillsRequired: ["Mobile Service", "Hair Cutting", "Professional Presentation"],
          payRate: 45,
          payType: "hour",
          location: { city: "Gold Coast", state: "QLD", postcode: "4217" },
          status: "open",
          applicants: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          urgency: "medium",
          maxApplicants: 1
        },
        {
          id: "job_5",
          hubId: "hub_5",
          hubName: "Elite Hair Salon Perth",
          title: "Specialist Colorist",
          description: "Expert colorist needed for high-end salon. Advanced color techniques and consultation skills essential.",
          date: new Date("2025-09-19T09:30:00Z"),
          startTime: "09:30", 
          endTime: "17:30",
          skillsRequired: ["Advanced Hair Coloring", "Color Consultation", "Chemical Processing"],
          payRate: 50,
          payType: "hour",
          location: { city: "Perth", state: "WA", postcode: "6000" },
          status: "open",
          applicants: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          urgency: "high",
          maxApplicants: 2
        },
        {
          id: "job_6",
          hubId: "hub_6",
          hubName: "Adelaide Style House",
          title: "Weekend Hair Stylist",
          description: "Part-time stylist for busy weekend shifts. Experience with modern cuts and styling required.",
          date: new Date("2025-09-20T10:00:00Z"),
          startTime: "10:00",
          endTime: "18:00",
          skillsRequired: ["Hair Styling", "Blow Drying", "Customer Service"],
          payRate: 38,
          payType: "hour",
          location: { city: "Adelaide", state: "SA", postcode: "5000" },
          status: "open",
          applicants: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          urgency: "medium",
          maxApplicants: 4
        }
      ];
      
      res.json(demoJobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  // Get jobs by hub ID
  app.get("/api/jobs/hub/:hubId", async (req, res) => {
    try {
      const { hubId } = req.params;
      // Return filtered demo jobs
      const allJobs = [
        {
          id: "job_1",
          hubId: hubId,
          title: "Senior Barber - Weekend Shift",
          description: "Looking for an experienced barber for weekend coverage.",
          date: new Date("2024-12-15T09:00:00Z"),
          startTime: "09:00", 
          endTime: "17:00",
          skillsRequired: ["Hair Cutting", "Beard Trimming"],
          payRate: 35,
          payType: "hour",
          location: { city: "Sydney", state: "NSW", postcode: "2000" },
          status: "open",
          applicants: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      res.json(allJobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch hub jobs" });
    }
  });

  // Social Posts endpoints
  app.post("/api/social-posts", async (req, res) => {
    try {
      const postData = {
        ...req.body,
        id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "pending",
        likes: 0,
        comments: []
      };
      res.json(postData);
    } catch (error) {
      res.status(400).json({ error: "Invalid post data" });
    }
  });

  app.get("/api/social-feed", async (req, res) => {
    try {
      const demoFeed = [
        {
          id: "post_1",
          authorId: "brand_1",
          authorRole: "brand",
          authorName: "Professional Hair Products Co.",
          authorCompany: "ProfHair",
          postType: "discount",
          content: "🔥 SPECIAL OFFER! Get 25% off all premium styling products this week only. Perfect for professional barbers looking to upgrade their toolkit!",
          imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600",
          linkUrl: "https://example.com/products",
          status: "approved",
          likes: 42,
          comments: [],
          discountCode: "BARBER25",
          discountPercentage: 25,
          validUntil: new Date("2024-12-31T23:59:59Z"),
          createdAt: new Date("2024-12-10T10:00:00Z")
        },
        {
          id: "post_2",
          authorId: "trainer_1",
          authorRole: "trainer",
          authorName: "Master Barber Mike",
          postType: "event",
          content: "Join me for an exclusive 2-day masterclass on advanced fade techniques! Limited spots available. Hands-on training with live models.",
          imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600",
          status: "approved",
          likes: 28,
          comments: [],
          eventDate: new Date("2024-12-20T09:00:00Z"),
          location: "Downtown Training Center, Sydney",
          createdAt: new Date("2024-12-09T14:30:00Z")
        },
        {
          id: "post_3",
          authorId: "brand_2",
          authorRole: "brand",
          authorName: "Clipper Kings",
          authorCompany: "Clipper Kings",
          postType: "product",
          content: "Introducing our new wireless clipper series! 8-hour battery life, precision blades, and ergonomic design. The future of barbering is here.",
          imageUrl: "https://images.unsplash.com/photo-1585747256711-1154de8c06da?w=600",
          linkUrl: "https://example.com/clippers",
          status: "approved",
          likes: 63,
          comments: [],
          createdAt: new Date("2024-12-08T16:00:00Z")
        }
      ];
      res.json(demoFeed);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch social feed" });
    }
  });

  app.post("/api/social-posts/:id/like", async (req, res) => {
    try {
      const { id } = req.params;
      const { action } = req.body;
      // Mock like/unlike action
      res.json({ success: true, action });
    } catch (error) {
      res.status(400).json({ error: "Failed to process like" });
    }
  });

  // Update user currentRole (requires logged-in user and self-update)
  app.patch("/api/users/:id/current-role", async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ error: "Authentication required" });
      }
      if (sessionUser.id !== id) {
        return res.status(403).json({ error: "Cannot modify another user's role" });
      }
      
      if (!role || !["hub", "professional", "brand", "trainer", "client"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      
      const user = await storage.getUserById(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Ensure role exists in user's roles list before setting currentRole
      const roles = (user as any).roles || [];
      if (!roles.includes(role)) {
        roles.push(role);
      }
      const updatedUser = await storage.updateUser(id, { roles, currentRole: role } as any);
      res.json({ 
        id: updatedUser.id, 
        email: updatedUser.email, 
        roles: (updatedUser as any).roles,
        currentRole: (updatedUser as any).currentRole,
        displayName: (updatedUser as any).displayName,
        profileImage: (updatedUser as any).profileImage
      });
    } catch (error) {
      res.status(400).json({ error: "Failed to update currentRole" });
    }
  });

  // Add or remove roles from user profile
  app.patch("/api/users/:id/roles", async (req, res) => {
    try {
      const { id } = req.params;
      const { action, role } = req.body as { action: "add" | "remove"; role: string };
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ error: "Authentication required" });
      }
      if (sessionUser.id !== id) {
        return res.status(403).json({ error: "Cannot modify another user's roles" });
      }
      if (!role || !["hub", "professional", "brand", "trainer", "client"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      const user = await storage.getUserById(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let roles: string[] = (user as any).roles || [];
      let currentRole: string | null = (user as any).currentRole ?? null;

      if (action === "add") {
        if (!roles.includes(role)) roles = [...roles, role];
        if (!currentRole) currentRole = role;
      } else if (action === "remove") {
        roles = roles.filter(r => r !== role);
        if (currentRole === role) currentRole = roles[0] ?? null;
      } else {
        return res.status(400).json({ error: "Invalid action" });
      }

      const updatedUser = await storage.updateUser(id, { roles, currentRole } as any);
      res.json({ 
        id: updatedUser.id, 
        email: updatedUser.email, 
        roles: (updatedUser as any).roles,
        currentRole: (updatedUser as any).currentRole,
        displayName: (updatedUser as any).displayName,
        profileImage: (updatedUser as any).profileImage
      });
    } catch (error) {
      res.status(400).json({ error: "Failed to update roles" });
    }
  });

  // Training Content endpoints
  app.post("/api/training-content", async (req, res) => {
    try {
      const contentData = {
        ...req.body,
        id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        purchaseCount: 0
      };
      res.json(contentData);
    } catch (error) {
      res.status(400).json({ error: "Invalid content data" });
    }
  });

  app.get("/api/training-content", async (req, res) => {
    try {
      const demoContent = [
        {
          id: "content_1",
          trainerId: "trainer_1",
          trainerName: "Master Barber Mike",
          title: "Advanced Fade Techniques Masterclass",
          description: "Learn professional fade cutting techniques used by top barbers worldwide. Covers high fades, low fades, and skin fades with detailed step-by-step instruction.",
          videoUrl: "https://youtube.com/watch?v=example1",
          thumbnailUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400",
          price: 49.99,
          duration: "2h 15m",
          level: "advanced",
          category: "Hair Cutting",
          isPaid: true,
          purchaseCount: 156,
          rating: 4.8
        },
        {
          id: "content_2",
          trainerId: "trainer_2",
          trainerName: "Sarah Chen",
          title: "Beard Styling Fundamentals",
          description: "Master the art of beard trimming and styling. Perfect for beginners looking to expand their services or improve their technique.",
          videoUrl: "https://youtube.com/watch?v=example2",
          thumbnailUrl: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400",
          price: 0,
          duration: "45m",
          level: "beginner",
          category: "Beard Care",
          isPaid: false,
          purchaseCount: 234,
          rating: 4.6
        },
        {
          id: "content_3",
          trainerId: "trainer_3",
          trainerName: "Carlos Rodriguez",
          title: "Business Skills for Barbers",
          description: "Learn how to run a successful barbershop business. Covers marketing, customer service, pricing strategies, and building a loyal client base.",
          videoUrl: "https://youtube.com/watch?v=example3",
          thumbnailUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400",
          price: 29.99,
          duration: "1h 30m",
          level: "intermediate",
          category: "Business Skills",
          isPaid: true,
          purchaseCount: 89,
          rating: 4.7
        }
      ];
      res.json(demoContent);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch training content" });
    }
  });

  app.get("/api/purchased-content/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      // Mock purchased content - in real app this would check database
      const purchasedContent = ["content_2"]; // User has purchased the free content
      res.json(purchasedContent);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchased content" });
    }
  });

  app.post("/api/purchase-content", async (req, res) => {
    try {
      const { contentId } = req.body;
      // Mock purchase processing
      const purchase = {
        id: `purchase_${Date.now()}`,
        contentId,
        amount: 49.99,
        status: "completed",
        purchasedAt: new Date()
      };
      res.json(purchase);
    } catch (error) {
      res.status(400).json({ error: "Failed to process purchase" });
    }
  });

  // Admin moderation endpoints
  app.get("/api/admin/pending-posts", async (req, res) => {
    try {
      // Mock pending posts for admin review
      const pendingPosts = [
        {
          id: "post_pending_1",
          authorId: "brand_1",
          authorRole: "brand",
          authorName: "StyleCorp",
          authorCompany: "StyleCorp Products",
          postType: "discount",
          content: "Flash sale! 50% off all premium styling tools for the next 24 hours. Limited stock available!",
          imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600",
          linkUrl: "https://stylecorp.com/sale",
          status: "pending",
          discountCode: "FLASH50",
          discountPercentage: 50,
          validUntil: new Date("2024-12-31T23:59:59Z"),
          createdAt: new Date("2024-12-11T09:00:00Z")
        }
      ];
      res.json(pendingPosts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pending posts" });
    }
  });

  app.get("/api/admin/pending-training", async (req, res) => {
    try {
      // Mock pending training content
      const pendingTraining = [
        {
          id: "training_pending_1",
          trainerId: "trainer_4",
          trainerName: "Alex Thompson",
          title: "Modern Pompadour Techniques",
          description: "Master the art of creating perfect pompadours with modern styling techniques and products.",
          videoUrl: "https://youtube.com/watch?v=pending1",
          thumbnailUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400",
          price: 35.99,
          duration: "1h 20m",
          level: "intermediate",
          category: "Hair Styling",
          isPaid: true,
          status: "pending",
          createdAt: new Date("2024-12-11T11:30:00Z")
        }
      ];
      res.json(pendingTraining);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pending training" });
    }
  });

  app.post("/api/admin/moderate-post/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { action, reason } = req.body;
      
      // Mock moderation response
      const moderation = {
        postId: id,
        action,
        reason,
        moderatedAt: new Date(),
        moderatorId: "admin_1"
      };
      
      res.json(moderation);
    } catch (error) {
      res.status(400).json({ error: "Failed to moderate post" });
    }
  });

  app.post("/api/admin/moderate-training/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { action, reason } = req.body;
      
      // Mock moderation response
      const moderation = {
        contentId: id,
        action,
        reason,
        moderatedAt: new Date(),
        moderatorId: "admin_1"
      };
      
      res.json(moderation);
    } catch (error) {
      res.status(400).json({ error: "Failed to moderate training content" });
    }
  });

  // Create shift endpoint (legacy support)
  app.post("/api/shifts", async (req, res) => {
    try {
      const shiftData = insertShiftSchema.parse(req.body);
      const shift = await storage.createShift(shiftData);
      res.json(shift);
    } catch (error) {
      res.status(400).json({ message: "Invalid shift data" });
    }
  });

  // Get all shifts endpoint
  app.get("/api/shifts", async (req, res) => {
    try {
      const shifts = await storage.getShifts();
      res.json(shifts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shifts" });
    }
  });

  // Get shifts by shop ID
  app.get("/api/shifts/shop/:shopId", async (req, res) => {
    try {
      const { shopId } = req.params;
      const shifts = await storage.getShiftsByShopId(shopId);
      res.json(shifts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shop shifts" });
    }
  });

  // Apply to shift endpoint
  app.post("/api/shifts/:id/apply", async (req, res) => {
    try {
      const { id } = req.params;
      const shift = await storage.getShift(id);
      
      if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
      }

      const shopOwner = await storage.getUser(shift.hubId);
      
      // Create nodemailer transporter (for demo purposes, log to console)
      const transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true
      });

      const mailOptions = {
        from: 'noreply@theplatform.com',
        to: shopOwner?.email || 'shop@example.com',
        subject: `New Application for ${shift.title}`,
        text: `A professional has applied for your shift "${shift.title}" scheduled for ${shift.date}. Please log in to your dashboard to review the application.`,
      };

      // For MVP, just log the email to console
      console.log('📧 EMAIL NOTIFICATION SENT:');
      console.log(`To: ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`Message: ${mailOptions.text}`);

      res.json({ message: "Application submitted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to submit application" });
    }
  });

  // Stripe Connect routes for trainer payments
  app.post('/api/stripe/create-account', stripeConnectRoutes.createAccount);
  app.get('/api/stripe/account-status/:trainerId', stripeConnectRoutes.getAccountStatus);
  app.post('/api/stripe/create-payment-intent', stripeConnectRoutes.createPaymentIntent);
  app.post('/api/stripe/webhook', stripeConnectRoutes.handleWebhook);

  const httpServer = createServer(app);
  return httpServer;
}
