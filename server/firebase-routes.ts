import type { Express } from "express";
import { createServer, type Server } from "http";
import { firebaseStorage } from "./firebase-storage";
import { authLimiter } from "./middleware/security";
import { 
  insertUserSchema, 
  loginSchema, 
  insertJobSchema, 
  insertSocialPostSchema 
} from "@shared/firebase-schema";
import fetch from 'node-fetch';
// Minimal type shim for node-fetch on ESM without types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FetchInit = any;
// import nodemailer from "nodemailer"; // Unused in current implementation

export async function registerFirebaseRoutes(app: Express): Promise<Server> {
  // Create test users for E2E tests
  try {
    // Create barber test user
    const existingBarber = await firebaseStorage.getUserByEmail("barber.pro@snipshift.com");
    if (existingBarber) {
      console.log("ℹ️ Firebase barber test user already exists:", existingBarber.email);
    } else {
      const barberUser = await firebaseStorage.createUser({
        email: "barber.pro@snipshift.com",
        password: "SecurePass123!",
        roles: ["professional"],
        currentRole: "professional",
        displayName: "Test Barber Pro",
        provider: "email"
      });
      console.log("✅ Firebase barber test user created:", barberUser.email, "with password:", barberUser.password);
    }

    // Create shop test user
    const existingShop = await firebaseStorage.getUserByEmail("shop.owner@snipshift.com");
    if (existingShop) {
      console.log("ℹ️ Firebase shop test user already exists:", existingShop.email);
    } else {
      const shopUser = await firebaseStorage.createUser({
        email: "shop.owner@snipshift.com",
        password: "SecurePass123!",
        roles: ["shop"],
        currentRole: "shop",
        displayName: "Test Shop Owner",
        provider: "email"
      });
      console.log("✅ Firebase shop test user created:", shopUser.email, "with password:", shopUser.password);
    }

    // Create general test user
    const existingUser = await firebaseStorage.getUserByEmail("user@example.com");
    if (existingUser) {
      console.log("ℹ️ Firebase general test user already exists:", existingUser.email);
    } else {
      const testUser = await firebaseStorage.createUser({
        email: "user@example.com",
        password: "SecurePassword123!",
        roles: ["professional"],
        currentRole: "professional",
        displayName: "Test User",
        provider: "email"
      });
      console.log("✅ Firebase general test user created:", testUser.email, "with password:", testUser.password);
    }
  } catch (error) {
    console.error("❌ Firebase test user creation failed:", error);
  }

  // User authentication routes
  app.post("/api/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await firebaseStorage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      const user = await firebaseStorage.createUser(userData);
      res.json({ 
        id: user.id, 
        email: user.email, 
        roles: (user as any).roles || [],
        currentRole: (user as any).currentRole || null,
        displayName: (user as any).displayName 
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ message: "Invalid registration data" });
    }
  });

  app.post("/api/login", authLimiter, async (req, res) => {
    try {
      const loginData = loginSchema.parse(req.body);
      const user = await firebaseStorage.getUserByEmail(loginData.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Support Google OAuth login: accept googleId instead of password
      if (loginData.googleId) {
        const storedGoogleId = (user as any).googleId;
        if (storedGoogleId && storedGoogleId !== loginData.googleId) {
          return res.status(401).json({ message: "Invalid Google authentication" });
        }
        // Optionally attach googleId if missing (first Google login)
        if (!storedGoogleId) {
          await firebaseStorage.updateUser(user.id, { googleId: loginData.googleId, provider: 'google' } as any);
        }
      } else {
        // Password-based auth path
        if (!user.password || user.password !== loginData.password) {
          return res.status(401).json({ message: "Invalid email or password" });
        }
      }

      // establish session
      (req as any).session.user = { id: user.id, roles: (user as any).roles, currentRole: (user as any).currentRole, email: user.email };

      res.json({ 
        id: user.id, 
        email: user.email, 
        roles: (user as any).roles || [],
        currentRole: (user as any).currentRole || null,
        displayName: (user as any).displayName 
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ message: "Invalid login data" });
    }
  });

  // OAuth code exchange (Google) - PKCE-secured for public clients
  app.post('/api/oauth/google/exchange', async (req, res) => {
    try {
      const { code, redirectUri, codeVerifier } = req.body || {};
      const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
      const missing: string[] = [];
      if (!code) missing.push('code');
      if (!redirectUri) missing.push('redirectUri');
      if (!clientId) missing.push('GOOGLE_CLIENT_ID');
      if (!codeVerifier) missing.push('codeVerifier');
      if (missing.length) return res.status(400).json({ message: 'Missing OAuth parameters', missing });

      // Exchange code for tokens using PKCE (no client_secret needed for public clients)
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(code),
          client_id: String(clientId),
          code_verifier: String(codeVerifier), // PKCE verification
          redirect_uri: String(redirectUri),
          grant_type: 'authorization_code',
        }) as unknown as any,
      } as FetchInit);
      if (!tokenRes.ok) {
        const text = await tokenRes.text();
        return res.status(400).json({ message: 'Token exchange failed', detail: text });
      }
      const tokenJson = await tokenRes.json();
      const idToken = tokenJson.id_token as string | undefined;
      if (!idToken) return res.status(400).json({ message: 'No id_token in response' });

      // Verify ID token using Google's public endpoint for security
      let email: string, sub: string; // Declare in outer scope
      try {
        const verifyResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        if (!verifyResponse.ok) {
          return res.status(400).json({ message: 'ID token verification failed' });
        }
        
        const payload = await verifyResponse.json() as any;
        email = payload?.email as string | undefined;
        sub = payload?.sub as string | undefined;
        const aud = payload?.aud as string | undefined;
        const exp = payload?.exp as number | undefined;
        const iss = payload?.iss as string | undefined;
        
        // Validate token claims for security
        if (!email || !sub) return res.status(400).json({ message: 'Invalid id_token payload' });
        if (aud !== clientId) return res.status(400).json({ message: 'Invalid token audience' });
        if (!exp || Date.now() / 1000 > exp) return res.status(400).json({ message: 'Token expired' });
        if (iss !== 'accounts.google.com' && iss !== 'https://accounts.google.com') {
          return res.status(400).json({ message: 'Invalid token issuer' });
        }
      } catch (err) {
        console.error('ID token verification error:', err);
        return res.status(400).json({ message: 'Token verification failed' });
      }

      // Upsert user
      let user = await firebaseStorage.getUserByEmail(email);
      if (!user) {
        user = await firebaseStorage.createUser({
          email,
          password: null,
          provider: 'google' as any,
          googleId: sub,
          roles: [],
          currentRole: null,
        } as any);
      } else if ((user as any).googleId !== sub) {
        user = await firebaseStorage.updateUser(user.id, { googleId: sub, provider: 'google' } as any);
      }

      // create session
      (req as any).session.user = { id: user.id, roles: (user as any).roles, currentRole: (user as any).currentRole, email: user.email };
      res.json({
        id: user.id,
        email: user.email,
        roles: (user as any).roles || [],
        currentRole: (user as any).currentRole || null,
        displayName: (user as any).displayName,
      });
    } catch (err) {
      console.error('OAuth exchange error', err);
      res.status(500).json({ message: 'OAuth exchange failed' });
    }
  });

  // User role management (requires active session)
  app.get("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const user = await firebaseStorage.getUser(id);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({
        id: user.id,
        email: user.email,
        roles: (user as any).roles || [],
        currentRole: (user as any).currentRole || null,
        displayName: (user as any).displayName,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });
  app.patch("/api/users/:id/current-role", async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body as { role?: string };
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

      const user = await firebaseStorage.getUser(id);
      if (!user) return res.status(404).json({ error: "User not found" });

      const roles = ([...(user as any).roles || []] as string[]);
      if (!roles.includes(role)) roles.push(role);
      const updatedUser = await firebaseStorage.updateUser(id, { roles, currentRole: role } as any);
      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        roles: (updatedUser as any).roles,
        currentRole: (updatedUser as any).currentRole,
        displayName: (updatedUser as any).displayName
      });
    } catch (error) {
      res.status(400).json({ error: "Failed to update currentRole" });
    }
  });

  app.patch("/api/users/:id/roles", async (req, res) => {
    try {
      const { id } = req.params;
      const { action, role } = req.body as { action: "add" | "remove"; role: string };
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) return res.status(401).json({ error: "Authentication required" });
      if (sessionUser.id !== id) return res.status(403).json({ error: "Cannot modify another user's roles" });
      if (!role || !["hub", "professional", "brand", "trainer", "client"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      const user = await firebaseStorage.getUser(id);
      if (!user) return res.status(404).json({ error: "User not found" });

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

      const updatedUser = await firebaseStorage.updateUser(id, { roles, currentRole } as any);
      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        roles: (updatedUser as any).roles,
        currentRole: (updatedUser as any).currentRole,
        displayName: (updatedUser as any).displayName
      });
    } catch (error) {
      res.status(400).json({ error: "Failed to update roles" });
    }
  });

  // Profile update endpoint for onboarding data
  app.patch("/api/users/:id/profile", async (req, res) => {
    try {
      const { id } = req.params;
      const { profileType, data } = req.body;
      const sessionUser = (req as any).session?.user;
      
      if (!sessionUser) {
        return res.status(401).json({ error: "Authentication required" });
      }
      if (sessionUser.id !== id) {
        return res.status(403).json({ error: "Cannot modify another user's profile" });
      }
      if (!profileType || !["professional", "hub", "brand", "trainer"].includes(profileType)) {
        return res.status(400).json({ error: "Invalid profile type" });
      }

      const user = await firebaseStorage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Parse the profile data
      let profileData;
      try {
        profileData = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (parseError) {
        return res.status(400).json({ error: "Invalid profile data format" });
      }

      // Add the role to user's roles if not already present
      let roles: string[] = (user as any).roles || [];
      if (!roles.includes(profileType)) {
        roles = [...roles, profileType];
      }

      // Set current role to the profile type
      const currentRole = profileType;

      // Update user with profile data and role
      const updatedUser = await firebaseStorage.updateUser(id, { 
        roles, 
        currentRole,
        [`${profileType}Profile`]: profileData,
        displayName: profileData.fullName || profileData.contactName || profileData.companyName || (user as any).displayName
      } as any);

      res.json({ 
        id: updatedUser.id, 
        email: updatedUser.email, 
        roles: (updatedUser as any).roles,
        currentRole: (updatedUser as any).currentRole,
        displayName: (updatedUser as any).displayName,
        profileImage: (updatedUser as any).profileImage,
        profileData: (updatedUser as any)[`${profileType}Profile`]
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(400).json({ error: "Failed to update profile" });
    }
  });

  // Test-only helpers (seed/login) - enabled only in CI/test runs
  if (process.env.NODE_ENV === 'test' || process.env.E2E_TEST === '1') {
    app.post('/api/test/login', async (req, res) => {
      try {
        const testKeyHeader = req.headers['x-test-key'];
        const expectedKey = process.env.E2E_TEST_KEY || 'test';
        if (testKeyHeader !== expectedKey) {
          return res.status(403).json({ message: 'Forbidden' });
        }

        const { email, password = 'password123', role = 'professional', displayName = 'E2E User' } = req.body || {};
        if (!email) return res.status(400).json({ message: 'email is required' });

        let user = await firebaseStorage.getUserByEmail(email);
        if (!user) {
          user = await firebaseStorage.createUser({
            email,
            password,
            roles: [role],
            currentRole: role,
            displayName,
          } as any);
        } else if (!(user as any).roles?.includes(role)) {
          const nextRoles = ([...(user as any).roles || [], role]).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
          const nextCurrent = (user as any).currentRole || role;
          user = await firebaseStorage.updateUser(user.id, { roles: nextRoles, currentRole: nextCurrent } as any);
        }

        (req as any).session.user = { id: user.id, roles: (user as any).roles, currentRole: (user as any).currentRole, email: user.email };
        res.json({ id: user.id, email: user.email, roles: (user as any).roles, currentRole: (user as any).currentRole, displayName: (user as any).displayName });
      } catch (err) {
        console.error('test login error', err);
        res.status(500).json({ message: 'test login failed' });
      }
    });
  }
  // Session helpers
  app.post('/api/logout', (req, res) => {
    (req as any).session.destroy(() => {
      res.json({ ok: true });
    });
  });


  // Job management routes
  app.post("/api/jobs", async (req, res) => {
    try {
      const jobData = insertJobSchema.parse(req.body);
      const job = await firebaseStorage.createJob(jobData);
      res.json(job);
    } catch (error) {
      console.error('Job creation error:', error);
      res.status(400).json({ message: "Invalid job data" });
    }
  });

  app.get("/api/jobs", async (req, res) => {
    try {
      const { status, location, hubId } = req.query;
      const filters: any = {};
      
      if (status) filters.status = status;
      if (location) filters.location = location;
      if (hubId) filters.hubId = hubId;
      
      const jobs = await firebaseStorage.getJobs(filters);
      res.json(jobs);
    } catch (error) {
      console.error('Job fetch error:', error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/hub/:hubId", async (req, res) => {
    try {
      const { hubId } = req.params;
      const jobs = await firebaseStorage.getJobsByHub(hubId);
      res.json(jobs);
    } catch (error) {
      console.error('Hub jobs fetch error:', error);
      res.status(500).json({ message: "Failed to fetch hub jobs" });
    }
  });

  app.post("/api/jobs/:id/apply", async (req, res) => {
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
      
      // Email notification simulation
      console.log('📧 EMAIL NOTIFICATION SENT:');
      console.log(`To: ${hubOwner?.email || 'hub@example.com'}`);
      console.log(`Subject: New Application for ${job.title}`);
      console.log(`Message: A professional has applied for your job "${job.title}" scheduled for ${job.date}. Please log in to your dashboard to review the application.`);

      res.json({ 
        message: "Application submitted successfully",
        applicationId: application.id 
      });
    } catch (error) {
      console.error('Job application error:', error);
      res.status(500).json({ message: "Failed to submit application" });
    }
  });

  // Social feed routes
  app.post("/api/social-posts", async (req, res) => {
    try {
      const postData = insertSocialPostSchema.parse({
        ...req.body,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
        likes: 0,
        comments: []
      });
      const post = await firebaseStorage.createSocialPost(postData);
      res.json(post);
    } catch (error) {
      console.error('Social post creation error:', error);
      res.status(400).json({ message: "Invalid post data" });
    }
  });

  app.get("/api/social-posts", async (req, res) => {
    try {
      const { postType, authorRole, authorId } = req.query;
      const filters: any = {};
      
      if (postType) filters.postType = postType;
      if (authorRole) filters.authorRole = authorRole;
      if (authorId) filters.authorId = authorId;
      
      const posts = await firebaseStorage.getSocialPosts(filters);
      res.json(posts);
    } catch (error) {
      console.error('Social posts fetch error:', error);
      res.status(500).json({ message: "Failed to fetch social posts" });
    }
  });

  // Application management routes
  app.get("/api/applications/job/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      const applications = await firebaseStorage.getApplicationsByJob(jobId);
      res.json(applications);
    } catch (error) {
      console.error('Applications fetch error:', error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.get("/api/applications/professional/:professionalId", async (req, res) => {
    try {
      const { professionalId } = req.params;
      const applications = await firebaseStorage.getApplicationsByProfessional(professionalId);
      res.json(applications);
    } catch (error) {
      console.error('Professional applications fetch error:', error);
      res.status(500).json({ message: "Failed to fetch professional applications" });
    }
  });

  // Messaging routes
  app.post("/api/chats", async (req, res) => {
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
      console.error('Chat creation error:', error);
      res.status(500).json({ message: "Failed to create chat" });
    }
  });

  app.get("/api/chats/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const chats = await firebaseStorage.getUserChats(userId);
      res.json(chats);
    } catch (error) {
      console.error('User chats fetch error:', error);
      res.status(500).json({ message: "Failed to fetch user chats" });
    }
  });

  app.post("/api/chats/:chatId/messages", async (req, res) => {
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
        messageType: 'text'
      };

      await firebaseStorage.sendMessage(chatId, messageData);
      res.json({ message: "Message sent successfully" });
    } catch (error) {
      console.error('Message send error:', error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.get("/api/chats/:chatId/messages", async (req, res) => {
    try {
      const { chatId } = req.params;
      const messages = await firebaseStorage.getChatMessages(chatId);
      res.json(messages);
    } catch (error) {
      console.error('Messages fetch error:', error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.put("/api/chats/:chatId/read/:userId", async (req, res) => {
    try {
      const { chatId, userId } = req.params;
      await firebaseStorage.markMessagesAsRead(chatId, userId);
      res.json({ message: "Messages marked as read" });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}