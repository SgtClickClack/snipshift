import { User, InsertUser, Shift, InsertShift, UserRole, Job, InsertJob, SocialPost, InsertSocialPost, Application, InsertApplication } from '@shared/firebase-schema';
import { MemStorage } from './storage';
import { DatabaseStorage, isDatabaseAvailable } from './database-storage';
import { MemFirebaseStorage } from './firebase-storage';
import { JobFilters, SocialPostFilters, ChatData, ChatMessage } from './types/server';

/**
 * Hybrid storage service that uses database when available,
 * falls back to in-memory storage for development/testing
 */
export class HybridStorage {
  private memStorage: MemStorage;
  private dbStorage: DatabaseStorage;
  private firebaseStorage: MemFirebaseStorage;

  constructor() {
    this.memStorage = new MemStorage();
    this.dbStorage = new DatabaseStorage();
    this.firebaseStorage = new MemFirebaseStorage();
  }

  private getStorage() {
    return isDatabaseAvailable() ? this.dbStorage : this.memStorage;
  }

  async getUser(id: string): Promise<User | undefined> {
    try {
      return await this.getStorage().getUser(id);
    } catch (error) {
      console.error('Storage error in getUser:', error);
      // Fallback to memory storage if database fails
      if (isDatabaseAvailable()) {
        console.warn('Falling back to memory storage due to database error');
        return await this.memStorage.getUser(id);
      }
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      return await this.getStorage().getUserByEmail(email);
    } catch (error) {
      console.error('Storage error in getUserByEmail:', error);
      // Fallback to memory storage if database fails
      if (isDatabaseAvailable()) {
        console.warn('Falling back to memory storage due to database error');
        return await this.memStorage.getUserByEmail(email);
      }
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await this.getStorage().getAllUsers();
    } catch (error) {
      console.error('Storage error in getAllUsers:', error);
      // Fallback to memory storage if database fails
      if (isDatabaseAvailable()) {
        console.warn('Falling back to memory storage due to database error');
        return await this.memStorage.getAllUsers();
      }
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      return await this.getStorage().createUser(insertUser);
    } catch (error) {
      console.error('Storage error in createUser:', error);
      // Fallback to memory storage if database fails
      if (isDatabaseAvailable()) {
        console.warn('Falling back to memory storage due to database error');
        return await this.memStorage.createUser(insertUser);
      }
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    try {
      return await this.getStorage().updateUser(id, updates);
    } catch (error) {
      console.error('Storage error in updateUser:', error);
      // Fallback to memory storage if database fails
      if (isDatabaseAvailable()) {
        console.warn('Falling back to memory storage due to database error');
        return await this.memStorage.updateUser(id, updates);
      }
      throw error;
    }
  }

  async createShift(insertShift: InsertShift): Promise<Shift> {
    try {
      return await this.getStorage().createShift(insertShift);
    } catch (error) {
      console.error('Storage error in createShift:', error);
      // Fallback to memory storage if database fails
      if (isDatabaseAvailable()) {
        console.warn('Falling back to memory storage due to database error');
        return await this.memStorage.createShift(insertShift);
      }
      throw error;
    }
  }

  async getShifts(): Promise<Shift[]> {
    try {
      return await this.getStorage().getShifts();
    } catch (error) {
      console.error('Storage error in getShifts:', error);
      // Fallback to memory storage if database fails
      if (isDatabaseAvailable()) {
        console.warn('Falling back to memory storage due to database error');
        return await this.memStorage.getShifts();
      }
      throw error;
    }
  }

  async getShiftsByShopId(shopId: string): Promise<Shift[]> {
    try {
      return await this.getStorage().getShiftsByShopId(shopId);
    } catch (error) {
      console.error('Storage error in getShiftsByShopId:', error);
      // Fallback to memory storage if database fails
      if (isDatabaseAvailable()) {
        console.warn('Falling back to memory storage due to database error');
        return await this.memStorage.getShiftsByShopId(shopId);
      }
      throw error;
    }
  }

  async getShift(id: string): Promise<Shift | undefined> {
    try {
      return await this.getStorage().getShift(id);
    } catch (error) {
      console.error('Storage error in getShift:', error);
      // Fallback to memory storage if database fails
      if (isDatabaseAvailable()) {
        console.warn('Falling back to memory storage due to database error');
        return await this.memStorage.getShift(id);
      }
      throw error;
    }
  }

  // Job methods
  async createJob(job: InsertJob): Promise<Job> {
    return await this.firebaseStorage.createJob(job);
  }

  async getJobs(filters?: JobFilters): Promise<Job[]> {
    return await this.firebaseStorage.getJobs(filters);
  }

  async getJobsByHub(hubId: string): Promise<Job[]> {
    return await this.firebaseStorage.getJobsByHub(hubId);
  }

  async getJob(id: string): Promise<Job | undefined> {
    return await this.firebaseStorage.getJob(id);
  }

  async applyToJob(jobId: string, professionalId: string): Promise<Application> {
    return await this.firebaseStorage.applyToJob(jobId, professionalId);
  }

  // Social post methods
  async createSocialPost(post: InsertSocialPost): Promise<SocialPost> {
    return await this.firebaseStorage.createSocialPost(post);
  }

  async getSocialPosts(filters?: SocialPostFilters): Promise<SocialPost[]> {
    return await this.firebaseStorage.getSocialPosts(filters);
  }

  // Application methods
  async getApplicationsByJob(jobId: string): Promise<Application[]> {
    return await this.firebaseStorage.getApplicationsByJob(jobId);
  }

  async getApplicationsByProfessional(professionalId: string): Promise<Application[]> {
    return await this.firebaseStorage.getApplicationsByProfessional(professionalId);
  }

  // Messaging methods
  async createChat(chatId: string, chatData: ChatData): Promise<void> {
    return await this.firebaseStorage.createChat(chatId, chatData);
  }

  async getUserChats(userId: string): Promise<any[]> {
    return await this.firebaseStorage.getUserChats(userId);
  }

  async sendMessage(chatId: string, messageData: ChatMessage): Promise<void> {
    return await this.firebaseStorage.sendMessage(chatId, messageData);
  }

  async getChatMessages(chatId: string): Promise<any[]> {
    return await this.firebaseStorage.getChatMessages(chatId);
  }

  async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    return await this.firebaseStorage.markMessagesAsRead(chatId, userId);
  }

  // Utility methods
  isUsingDatabase(): boolean {
    return isDatabaseAvailable();
  }

  getStorageType(): 'database' | 'memory' {
    return isDatabaseAvailable() ? 'database' : 'memory';
  }
}

// Export singleton instance
export const hybridStorage = new HybridStorage();
