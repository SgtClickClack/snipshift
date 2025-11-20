/**
 * Users Repository
 * 
 * Encapsulates database queries for users
 */

import { eq } from 'drizzle-orm';
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

