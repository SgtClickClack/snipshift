/**
 * Users Repository
 * 
 * Encapsulates database queries for users
 */

import { eq, sql, count } from 'drizzle-orm';
import { users } from '../db/schema';
import { getDb } from '../db';

/**
 * Get a user by ID
 */
export async function getUserById(id: string): Promise<typeof users.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] || null;
}

/**
 * Get a user by email
 */
export async function getUserByEmail(email: string): Promise<typeof users.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0] || null;
}

/**
 * Create a new user
 */
export async function createUser(
  userData: {
    email: string;
    name: string;
    passwordHash?: string;
    role?: 'professional' | 'business' | 'admin' | 'trainer';
  }
): Promise<typeof users.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [newUser] = await db
    .insert(users)
    .values({
      email: userData.email,
      name: userData.name,
      passwordHash: userData.passwordHash || null,
      role: userData.role || 'professional',
    })
    .returning();

  return newUser || null;
}

/**
 * Update a user
 */
export async function updateUser(
  id: string,
  updates: Partial<typeof users.$inferInsert>
): Promise<typeof users.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [updatedUser] = await db
    .update(users)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

  return updatedUser || null;
}

/**
 * Get or create a mock business user for development
 * This is a temporary helper until proper authentication is implemented
 */
export async function getOrCreateMockBusinessUser(): Promise<typeof users.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  // Try to find existing mock business user
  const existingUser = await getUserByEmail('business@example.com');
  if (existingUser) {
    return existingUser;
  }

  // Create mock business user if it doesn't exist
  return await createUser({
    email: 'business@example.com',
    name: 'Test Business',
    role: 'business',
  });
}

/**
 * Update user's rating fields
 */
export async function updateUserRating(
  userId: string,
  averageRating: number | null,
  reviewCount: number
): Promise<typeof users.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [updatedUser] = await db
    .update(users)
    .set({
      averageRating: averageRating !== null ? averageRating.toFixed(2) : null,
      reviewCount: reviewCount.toString(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return updatedUser || null;
}

/**
 * Get all users (for admin)
 */
export async function getAllUsers(limit: number = 100, offset: number = 0) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const result = await db
    .select()
    .from(users)
    .limit(limit)
    .offset(offset)
    .orderBy(users.createdAt);

  const [totalResult] = await db
    .select({ count: count() })
    .from(users);

  return {
    data: result,
    total: totalResult?.count || 0,
    limit,
    offset,
  };
}

/**
 * Get total user count
 */
export async function getUserCount(): Promise<number> {
  const db = getDb();
  if (!db) {
    return 0;
  }

  const [result] = await db
    .select({ count: count() })
    .from(users);

  return result?.count || 0;
}

/**
 * Delete a user (admin only)
 */
export async function deleteUser(id: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  try {
    await db.delete(users).where(eq(users.id, id));
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    return false;
  }
}

