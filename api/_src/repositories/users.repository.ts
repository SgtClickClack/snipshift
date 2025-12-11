import { eq, sql, and } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { users } from '../db/schema.js';

// In-memory store for development
export let mockUsers: typeof users.$inferSelect[] = [];

/**
 * Get total number of users
 */
export async function getUserCount(): Promise<number> {
  const db = getDb();
  if (!db) {
    return mockUsers.length;
  }

  const [result] = await db.select({ count: sql<number>`count(*)` }).from(users);
  return Number(result.count);
}

/**
 * Get all users with pagination
 */
export async function getAllUsers(limit: number, offset: number): Promise<{ data: typeof users.$inferSelect[], total: number, limit: number, offset: number } | null> {
  const db = getDb();
  if (!db) {
    const data = mockUsers.slice(offset, offset + limit);
    return { data, total: mockUsers.length, limit, offset };
  }

  const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const total = Number(totalResult.count);

  const data = await db.select().from(users).limit(limit).offset(offset);

  return { data, total, limit, offset };
}

/**
 * Create a new user
 * 
 * Note: Email welcome email should be sent after user creation
 * Call emailService.sendWelcomeEmail() separately after this function
 */
export async function createUser(
  userData: {
    email: string;
    name: string;
    passwordHash?: string;
    role?: 'professional' | 'business' | 'admin' | 'trainer' | 'hub';
  }
): Promise<typeof users.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    console.warn('Creating mock user in memory (DB not configured)');
    const newUser: typeof users.$inferSelect = {
      id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      email: userData.email,
      name: userData.name,
      role: userData.role || 'professional',
      roles: [userData.role || 'professional'],
      passwordHash: userData.passwordHash || null,
      bio: null,
      phone: null,
      location: null,
      avatarUrl: null,
      bannerUrl: null,
      averageRating: null,
      reviewCount: '0',
      isOnboarded: false,
      isActive: true,
      stripeAccountId: null,
      stripeOnboardingComplete: false,
      stripeCustomerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockUsers.push(newUser);
    return newUser;
  }

  // Try to insert user, handle duplicate email gracefully if needed (though caller should handle unique constraint violation)
  const [newUser] = await db
    .insert(users)
    .values({
      email: userData.email,
      name: userData.name,
      passwordHash: userData.passwordHash || null,
      role: userData.role || 'professional',
      roles: [userData.role || 'professional'],
      isActive: true, // Explicitly set isActive to ensure it's always provided
    })
    .returning();

  return newUser || null;
}

export async function getUserByEmail(email: string): Promise<typeof users.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return mockUsers.find((u) => u.email === email) || null;
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user || null;
}

export async function getUserById(id: string): Promise<typeof users.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return mockUsers.find((u) => u.id === id) || null;
  }

  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user || null;
}

export async function getOrCreateMockBusinessUser(): Promise<typeof users.$inferSelect | null> {
  const email = 'business@example.com';
  let user = await getUserByEmail(email);
  
  if (!user) {
    user = await createUser({
      email,
      name: 'Metro Barbers Brisbane',
      role: 'business',
      passwordHash: 'password123'
    });
    // Update with bio after creation
    if (user) {
      user = await updateUser(user.id, {
        bio: 'Premier barbershop in the CBD specializing in modern fades.',
      });
    }
  } else if (user.name === 'Test Business' || user.name === 'Sick Cuts') {
    // Update existing test business to professional name
    user = await updateUser(user.id, {
      name: 'Metro Barbers Brisbane',
      bio: 'Premier barbershop in the CBD specializing in modern fades.',
    });
  }
  
  return user;
}

// Update user function
export async function updateUser(
  id: string,
  userData: Partial<typeof users.$inferSelect>
): Promise<typeof users.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    const index = mockUsers.findIndex((u) => u.id === id);
    if (index === -1) return null;
    
    mockUsers[index] = { ...mockUsers[index], ...userData, updatedAt: new Date() };
    return mockUsers[index];
  }

  const [updatedUser] = await db
    .update(users)
    .set({ ...userData, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
    
  return updatedUser || null;
}

// Delete user function (for cleanup)
export async function deleteUser(id: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    const initialLength = mockUsers.length;
    mockUsers = mockUsers.filter((u) => u.id !== id);
    return mockUsers.length < initialLength;
  }

  const [deletedUser] = await db
    .delete(users)
    .where(eq(users.id, id))
    .returning();
    
  return !!deletedUser;
}

/**
 * Get user count by role
 */
export async function getUserCountByRole(role: 'professional' | 'business' | 'admin' | 'trainer' | 'hub'): Promise<number> {
  const db = getDb();
  if (!db) {
    return mockUsers.filter(u => u.role === role).length;
  }

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.role, role));

  return Number(result?.count || 0);
}

/**
 * Get active user count by role
 */
export async function getActiveUserCountByRole(role: 'professional' | 'business' | 'admin' | 'trainer' | 'hub'): Promise<number> {
  const db = getDb();
  if (!db) {
    return mockUsers.filter(u => u.role === role && (u.isActive !== false)).length;
  }

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(
      and(
        eq(users.role, role),
        sql`(${users.isActive} IS NULL OR ${users.isActive} = true)`
      )
    );

  return Number(result?.count || 0);
}

/**
 * Ban a user (set isActive to false)
 */
export async function banUser(id: string): Promise<typeof users.$inferSelect | null> {
  return updateUser(id, { isActive: false });
}

/**
 * Unban a user (set isActive to true)
 */
export async function unbanUser(id: string): Promise<typeof users.$inferSelect | null> {
  return updateUser(id, { isActive: true });
}
