import type { Express } from "express";
import { createServer, type Server } from "http";
import { firebaseStorage } from "./firebase-storage";
import { 
  insertUserSchema, 
  loginSchema, 
  insertJobSchema, 
  insertSocialPostSchema 
} from "@shared/firebase-schema";
import nodemailer from "nodemailer";

export async function registerFirebaseRoutes(app: Express): Promise<Server> {
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
        role: user.role,
        displayName: user.displayName 
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ message: "Invalid registration data" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const loginData = loginSchema.parse(req.body);
      
      const user = await firebaseStorage.getUserByEmail(loginData.email);
      if (!user || user.password !== loginData.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      res.json({ 
        id: user.id, 
        email: user.email, 
        role: user.role,
        displayName: user.displayName 
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ message: "Invalid login data" });
    }
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