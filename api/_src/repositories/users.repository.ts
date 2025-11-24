import { eq } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { users } from '../db/schema.js';

// In-memory store for development
export let mockUsers: typeof users.$inferSelect[] = [];

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
    role?: 'professional' | 'business' | 'admin' | 'trainer';
  }
): Promise<typeof users.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    console.log('Creating mock user in memory (DB not configured)');
    const newUser: typeof users.$inferSelect = {
      id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      email: userData.email,
      name: userData.name,
      role: userData.role || 'professional',
      passwordHash: userData.passwordHash || null,
      bio: null,
      phone: null,
      location: null,
      averageRating: null,
      reviewCount: '0',
      isOnboarded: false,
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
      name: 'Test Business',
      role: 'business',
      passwordHash: 'password123'
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
