import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import ws from 'ws';
import * as schema from '@shared/schema';
import { User, InsertUser, Shift, InsertShift, UserRole } from '@shared/firebase-schema';
import { appLogger, errorLogger } from './utils/logger';
import { DatabaseUser, DatabaseShift } from './types/server';

// Helper function to map database role to User role
function mapDatabaseRoleToUserRole(dbRole: string): 'professional' | 'business' {
  switch (dbRole) {
    case 'hub':
    case 'brand':
    case 'trainer':
      return 'business';
    case 'professional':
    default:
      return 'professional';
  }
}

// Database client type
type DatabaseClient = ReturnType<typeof drizzle>;

neonConfig.webSocketConstructor = ws;

let pool: Pool | null = null;
let db: DatabaseClient | null = null;

// Initialize database connection
export function initializeDatabase(): void {
  if (process.env.DATABASE_URL) {
    try {
      pool = new Pool({ connectionString: process.env.DATABASE_URL });
      db = drizzle({ client: pool, schema });
      appLogger.databaseConnection(true);
    } catch (error) {
      errorLogger.databaseError('initialization', error as Error);
      pool = null;
      db = null;
    }
  } else {
    console.warn('⚠️ DATABASE_URL not provided - using in-memory storage');
  }
}

// Check if database is available
export function isDatabaseAvailable(): boolean {
  return db !== null;
}

// Database storage implementation
export class DatabaseStorage {
  async getUser(id: string): Promise<User | undefined> {
    if (!db) throw new Error('Database not available');
    
    const result = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    if (result.length === 0) return undefined;
    
    const dbUser = result[0];
    return {
      id: dbUser.id,
      email: dbUser.email,
      password: dbUser.password,
      roles: [mapDatabaseRoleToUserRole(dbUser.role)],
      googleId: dbUser.googleId || undefined,
      provider: dbUser.provider as 'email' | 'google',
      displayName: dbUser.name || undefined,
      profileImage: dbUser.profilePicture || undefined,
      currentRole: mapDatabaseRoleToUserRole(dbUser.role),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!db) throw new Error('Database not available');
    
    const result = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (result.length === 0) return undefined;
    
    const dbUser = result[0];
    return {
      id: dbUser.id,
      email: dbUser.email,
      password: dbUser.password,
      roles: [mapDatabaseRoleToUserRole(dbUser.role)],
      googleId: dbUser.googleId || undefined,
      provider: dbUser.provider as 'email' | 'google',
      displayName: dbUser.name || undefined,
      profileImage: dbUser.profilePicture || undefined,
      currentRole: mapDatabaseRoleToUserRole(dbUser.role),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async getAllUsers(): Promise<User[]> {
    if (!db) throw new Error('Database not available');
    
    const results = await db.select().from(schema.users);
    return results.map((dbUser) => ({
      id: dbUser.id,
      email: dbUser.email,
      password: dbUser.password,
      roles: [mapDatabaseRoleToUserRole(dbUser.role)],
      googleId: dbUser.googleId || undefined,
      provider: dbUser.provider as 'email' | 'google',
      displayName: dbUser.name || undefined,
      profileImage: dbUser.profilePicture || undefined,
      currentRole: mapDatabaseRoleToUserRole(dbUser.role),
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!db) throw new Error('Database not available');
    
    const userData = {
      email: insertUser.email,
      password: insertUser.password,
      role: insertUser.role || 'client',
      googleId: insertUser.googleId,
      provider: insertUser.provider || 'email',
      name: insertUser.name
    };
    
    const result = await db.insert(schema.users).values(userData).returning();
    const dbUser = result[0];
    
    return {
      id: dbUser.id,
      email: dbUser.email,
      password: dbUser.password,
      roles: [mapDatabaseRoleToUserRole(dbUser.role)],
      googleId: dbUser.googleId || undefined,
      provider: dbUser.provider as 'email' | 'google',
      displayName: dbUser.name || undefined,
      profileImage: dbUser.profilePicture || undefined,
      currentRole: mapDatabaseRoleToUserRole(dbUser.role),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    if (!db) throw new Error('Database not available');
    
    const updateData: any = {};
    if (updates.email) updateData.email = updates.email;
    if (updates.password) updateData.password = updates.password;
    if (updates.googleId) updateData.googleId = updates.googleId;
    if (updates.provider) updateData.provider = updates.provider;
    if (updates.displayName) updateData.displayName = updates.displayName;
    if (updates.profileImage) updateData.profileImage = updates.profileImage;
    
    const result = await db.update(schema.users)
      .set(updateData)
      .where(eq(schema.users.id, id))
      .returning();
    
    if (result.length === 0) throw new Error('User not found');
    
    const dbUser = result[0];
    return {
      id: dbUser.id,
      email: dbUser.email,
      password: dbUser.password,
      roles: [mapDatabaseRoleToUserRole(dbUser.role)],
      googleId: dbUser.googleId || undefined,
      provider: dbUser.provider as 'email' | 'google',
      displayName: dbUser.name || undefined,
      profileImage: dbUser.profilePicture || undefined,
      currentRole: mapDatabaseRoleToUserRole(dbUser.role),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async createShift(insertShift: InsertShift): Promise<Shift> {
    if (!db) throw new Error('Database not available');
    
    const shiftData = {
      hubId: insertShift.hubId,
      title: insertShift.title,
      date: insertShift.date,
      requirements: insertShift.requirements,
      pay: insertShift.pay.toString()
    };
    
    const result = await db.insert(schema.shifts).values(shiftData).returning();
    const dbShift = result[0];
    
    return {
      id: dbShift.id,
      hubId: dbShift.hubId,
      title: dbShift.title,
      date: dbShift.date,
      requirements: dbShift.requirements,
      pay: parseInt(dbShift.pay)
    };
  }

  async getShifts(): Promise<Shift[]> {
    if (!db) throw new Error('Database not available');
    
    const results = await db.select().from(schema.shifts);
    return results.map((dbShift) => ({
      id: dbShift.id,
      hubId: dbShift.hubId,
      title: dbShift.title,
      date: dbShift.date,
      requirements: dbShift.requirements,
      pay: parseInt(dbShift.pay)
    }));
  }

  async getShiftsByShopId(shopId: string): Promise<Shift[]> {
    if (!db) throw new Error('Database not available');
    
    const results = await db.select().from(schema.shifts).where(eq(schema.shifts.hubId, shopId));
    return results.map((dbShift) => ({
      id: dbShift.id,
      hubId: dbShift.hubId,
      title: dbShift.title,
      date: dbShift.date,
      requirements: dbShift.requirements,
      pay: parseInt(dbShift.pay)
    }));
  }

  async getShift(id: string): Promise<Shift | undefined> {
    if (!db) throw new Error('Database not available');
    
    const result = await db.select().from(schema.shifts).where(eq(schema.shifts.id, id)).limit(1);
    if (result.length === 0) return undefined;
    
    const dbShift = result[0];
    return {
      id: dbShift.id,
      hubId: dbShift.hubId,
      title: dbShift.title,
      date: dbShift.date,
      requirements: dbShift.requirements,
      pay: parseInt(dbShift.pay)
    };
  }
}

// Create database storage instance
export const databaseStorage = new DatabaseStorage();

// Export the database instance for direct queries if needed
export { db, pool };
