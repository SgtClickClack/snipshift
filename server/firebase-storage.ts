import { 
  User, 
  Job, 
  SocialPost, 
  Application, 
  InsertUser, 
  InsertJob, 
  InsertSocialPost, 
  InsertApplication, 
  UserRole 
} from "@shared/firebase-schema";
import { randomUUID } from "crypto";

// Firebase-compatible storage interface
export interface IFirebaseStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  
  // Job methods
  createJob(job: InsertJob): Promise<Job>;
  getJobs(filters?: any): Promise<Job[]>;
  getJobsByHub(hubId: string): Promise<Job[]>;
  getJob(id: string): Promise<Job | undefined>;
  updateJob(id: string, updates: Partial<Job>): Promise<Job>;
  applyToJob(jobId: string, professionalId: string): Promise<Application>;
  
  // Social post methods
  createSocialPost(post: InsertSocialPost): Promise<SocialPost>;
  getSocialPosts(filters?: any): Promise<SocialPost[]>;
  updateSocialPost(id: string, updates: Partial<SocialPost>): Promise<SocialPost>;
  
  // Application methods
  getApplicationsByJob(jobId: string): Promise<Application[]>;
  getApplicationsByProfessional(professionalId: string): Promise<Application[]>;
  
  // Messaging methods
  createChat(chatId: string, chatData: any): Promise<void>;
  getChat(chatId: string): Promise<any>;
  getUserChats(userId: string): Promise<any[]>;
  sendMessage(chatId: string, messageData: any): Promise<void>;
  getChatMessages(chatId: string): Promise<any[]>;
  markMessagesAsRead(chatId: string, userId: string): Promise<void>;
}

// In-memory implementation for development (mimicking Firebase structure)
export class MemFirebaseStorage implements IFirebaseStorage {
  private users: Map<string, User>;
  private jobs: Map<string, Job>;
  private socialPosts: Map<string, SocialPost>;
  private applications: Map<string, Application>;
  private chats: Map<string, any>;
  private messages: Map<string, any[]>;

  constructor() {
    this.users = new Map();
    this.jobs = new Map();
    this.socialPosts = new Map();
    this.applications = new Map();
    this.chats = new Map();
    this.messages = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const roles: UserRole[] = Array.isArray((insertUser as any).roles) ? (insertUser as any).roles as UserRole[] : [];
    const currentRole: UserRole | null = (insertUser as any).currentRole ?? (roles.length ? roles[0] : null);
    const user: User = {
      ...(insertUser as any),
      id,
      roles,
      currentRole,
      createdAt: new Date(),
      updatedAt: new Date()
    } as User;
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error('User not found');
    
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Job methods
  async createJob(insertJob: InsertJob): Promise<Job> {
    const id = randomUUID();
    const job: Job = {
      ...insertJob,
      id,
      status: "open",
      applicants: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.jobs.set(id, job);
    return job;
  }

  async getJobs(filters?: any): Promise<Job[]> {
    let jobs = Array.from(this.jobs.values());
    
    if (filters?.status) {
      jobs = jobs.filter(job => job.status === filters.status);
    }
    if (filters?.location) {
      jobs = jobs.filter(job => job.location.city === filters.location);
    }
    if (filters?.hubId) {
      jobs = jobs.filter(job => job.hubId === filters.hubId);
    }
    
    return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getJobsByHub(hubId: string): Promise<Job[]> {
    return this.getJobs({ hubId });
  }

  async getJob(id: string): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job> {
    const job = this.jobs.get(id);
    if (!job) throw new Error('Job not found');
    
    const updatedJob = { ...job, ...updates, updatedAt: new Date() };
    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  async applyToJob(jobId: string, professionalId: string): Promise<Application> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Job not found');

    // Update job applicants
    if (!job.applicants.includes(professionalId)) {
      job.applicants.push(professionalId);
      await this.updateJob(jobId, { applicants: job.applicants });
    }

    // Create application record
    const applicationId = randomUUID();
    const application: Application = {
      id: applicationId,
      jobId,
      professionalId,
      hubId: job.hubId,
      status: "pending",
      appliedAt: new Date()
    };
    
    this.applications.set(applicationId, application);
    return application;
  }

  // Social post methods
  async createSocialPost(insertPost: InsertSocialPost): Promise<SocialPost> {
    const id = randomUUID();
    const post: SocialPost = {
      ...insertPost,
      id,
      likes: 0,
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.socialPosts.set(id, post);
    return post;
  }

  async getSocialPosts(filters?: any): Promise<SocialPost[]> {
    let posts = Array.from(this.socialPosts.values());
    
    if (filters?.type) {
      posts = posts.filter(post => post.postType === filters.type);
    }
    if (filters?.authorRole) {
      posts = posts.filter(post => post.authorRole === filters.authorRole);
    }
    if (filters?.authorId) {
      posts = posts.filter(post => post.authorId === filters.authorId);
    }
    
    return posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateSocialPost(id: string, updates: Partial<SocialPost>): Promise<SocialPost> {
    const post = this.socialPosts.get(id);
    if (!post) throw new Error('Post not found');
    
    const updatedPost = { ...post, ...updates, updatedAt: new Date() };
    this.socialPosts.set(id, updatedPost);
    return updatedPost;
  }

  // Application methods
  async getApplicationsByJob(jobId: string): Promise<Application[]> {
    return Array.from(this.applications.values()).filter(app => app.jobId === jobId);
  }

  async getApplicationsByProfessional(professionalId: string): Promise<Application[]> {
    return Array.from(this.applications.values()).filter(app => app.professionalId === professionalId);
  }

  // Messaging methods
  async createChat(chatId: string, chatData: any): Promise<void> {
    const chat = {
      ...chatData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.chats.set(chatId, chat);
    this.messages.set(chatId, []);
  }

  async getChat(chatId: string): Promise<any> {
    return this.chats.get(chatId);
  }

  async getUserChats(userId: string): Promise<any[]> {
    return Array.from(this.chats.values())
      .filter(chat => chat.participants.includes(userId))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async sendMessage(chatId: string, messageData: any): Promise<void> {
    const messages = this.messages.get(chatId) || [];
    const message = {
      ...messageData,
      id: randomUUID(),
      timestamp: new Date(),
      isRead: false
    };
    
    messages.push(message);
    this.messages.set(chatId, messages);

    // Update chat
    const chat = this.chats.get(chatId);
    if (chat) {
      const newUnreadCount = { ...chat.unreadCount };
      newUnreadCount[messageData.receiverId] = (newUnreadCount[messageData.receiverId] || 0) + 1;
      
      const updatedChat = {
        ...chat,
        lastMessage: messageData.content,
        lastMessageSender: messageData.senderId,
        lastMessageTimestamp: new Date(),
        unreadCount: newUnreadCount,
        updatedAt: new Date()
      };
      
      this.chats.set(chatId, updatedChat);
    }
  }

  async getChatMessages(chatId: string): Promise<any[]> {
    return this.messages.get(chatId) || [];
  }

  async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    const chat = this.chats.get(chatId);
    if (chat) {
      const newUnreadCount = { ...chat.unreadCount };
      newUnreadCount[userId] = 0;
      
      const updatedChat = {
        ...chat,
        unreadCount: newUnreadCount,
        updatedAt: new Date()
      };
      
      this.chats.set(chatId, updatedChat);
    }
  }
}

export const firebaseStorage = new MemFirebaseStorage();