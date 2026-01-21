import { eq, sql, and, inArray } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { users } from '../db/schema.js';

// In-memory store for development
export let mockUsers: typeof users.$inferSelect[] = [];

/**
 * Normalize role values: 'venue' maps to 'business' internally for permissions.
 * This ensures consistent role handling across the system.
 */
function normalizeRole(role: string | null | undefined): 'professional' | 'business' | 'admin' | 'trainer' | 'hub' {
  if (!role) return 'professional';
  const normalized = role.toLowerCase();
  // Map 'venue' to 'business' for internal consistency
  if (normalized === 'venue') return 'business';
  // Return valid roles as-is, default to 'professional' for unknown values
  if (['professional', 'business', 'admin', 'trainer', 'hub'].includes(normalized)) {
    return normalized as 'professional' | 'business' | 'admin' | 'trainer' | 'hub';
  }
  return 'professional';
}

/**
 * Normalize roles array: applies normalizeRole to each role and removes duplicates.
 */
function normalizeRolesArray(roles: string[] | null | undefined): Array<'professional' | 'business' | 'admin' | 'trainer' | 'hub'> {
  if (!Array.isArray(roles) || roles.length === 0) return [];
  const normalized = roles.map(r => normalizeRole(r));
  return Array.from(new Set(normalized)) as Array<'professional' | 'business' | 'admin' | 'trainer' | 'hub'>;
}

/**
 * Normalize a user object's role and roles array.
 * This ensures 'venue' is always mapped to 'business' for permissions.
 */
function normalizeUserRoles(user: typeof users.$inferSelect): typeof users.$inferSelect {
  const normalizedRole = normalizeRole(user.role);
  const normalizedRoles = normalizeRolesArray(user.roles);
  
  // If roles array is empty or doesn't include the normalized role, add it
  const finalRoles = normalizedRoles.length > 0 
    ? (normalizedRoles.includes(normalizedRole) ? normalizedRoles : [...normalizedRoles, normalizedRole])
    : [normalizedRole];
  
  return {
    ...user,
    role: normalizedRole,
    roles: finalRoles,
  };
}

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
    const data = mockUsers.slice(offset, offset + limit).map(normalizeUserRoles);
    return { data, total: mockUsers.length, limit, offset };
  }

  const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const total = Number(totalResult.count);

  const rawData = await db.select().from(users).limit(limit).offset(offset);
  const data = rawData.map(normalizeUserRoles);

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
      role: normalizeRole(userData.role),
      roles: [normalizeRole(userData.role)],
      passwordHash: userData.passwordHash || null,
      bio: null,
      phone: null,
      location: null,
      avatarUrl: null,
      bannerUrl: null,
      rsaVerified: false,
      rsaNotRequired: false,
      rsaNumber: null,
      rsaExpiry: null,
      rsaStateOfIssue: null,
      rsaCertUrl: null,
      rsaCertificateUrl: null,
      hospitalityRole: null,
      hourlyRatePreference: null,
      averageRating: null,
      reviewCount: '0',
      verificationStatus: 'pending_review',
      completedShiftCount: 0,
      noShowCount: 0,
      lastNoShowAt: null,
      consecutiveFiveStarCount: 0,
      topRatedBadge: false,
      ratingWarningAt: null,
      strikes: 0,
      lastStrikeDate: null,
      shiftsSinceLastStrike: 0,
      totalEarnedCents: 0,
      recoveryProgress: 0,
      reliabilityScore: null,
      suspendedUntil: null,
      isOnboarded: false,
      hasCompletedOnboarding: false,
      isActive: true,
      stripeAccountId: null,
      stripeOnboardingComplete: false,
      stripeCustomerId: null,
      notificationPreferences: null,
      favoriteProfessionals: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockUsers.push(newUser);
    return newUser;
  }

  // Try to insert user, handle duplicate email gracefully if needed (though caller should handle unique constraint violation)
  // Normalize role before inserting
  const normalizedRole = normalizeRole(userData.role);
  const isUndefinedColumnError = (error: any): boolean => {
    const message = typeof error?.message === 'string' ? error.message : '';
    return error?.code === '42703' || (message.includes('column') && message.includes('does not exist'));
  };

  try {
    const [newUser] = await db
      .insert(users)
      .values({
        email: userData.email,
        name: userData.name,
        passwordHash: userData.passwordHash || null,
        role: normalizedRole,
        roles: [normalizedRole],
        isActive: true, // Explicitly set isActive to ensure it's always provided
        stripeOnboardingComplete: false, // Explicitly set to ensure it's always provided
      })
      .returning();

    return newUser ? normalizeUserRoles(newUser) : null;
  } catch (error: any) {
    if (isUndefinedColumnError(error)) {
      console.warn('[createUser] Falling back to legacy insert (missing columns)', {
        message: error?.message,
        code: error?.code,
      });

      const [legacyUser] = await db
        .insert(users)
        .values({
          email: userData.email,
          name: userData.name,
          passwordHash: userData.passwordHash || null,
          role: normalizedRole,
        })
        .returning();

      return legacyUser ? normalizeUserRoles(legacyUser) : null;
    }

    throw error;
  }
}

export async function getUserByEmail(email: string): Promise<typeof users.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    const user = mockUsers.find((u) => u.email === email);
    return user ? normalizeUserRoles(user) : null;
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user ? normalizeUserRoles(user) : null;
}

export async function getUserById(id: string): Promise<typeof users.$inferSelect | null> {
  const db = getDb();
  if (!db) {
    const user = mockUsers.find((u) => u.id === id);
    return user ? normalizeUserRoles(user) : null;
  }

  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ? normalizeUserRoles(user) : null;
}

/**
 * Batch fetch users by IDs (optimized for N+1 prevention)
 * Returns a Map of userId -> user for O(1) lookups
 */
export async function getUsersByIds(ids: string[]): Promise<Map<string, typeof users.$inferSelect>> {
  const db = getDb();
  const userMap = new Map<string, typeof users.$inferSelect>();

  if (!db) {
    // Mock mode: filter from in-memory store
    ids.forEach(id => {
      const user = mockUsers.find((u) => u.id === id);
      if (user) {
        userMap.set(id, normalizeUserRoles(user));
      }
    });
    return userMap;
  }

  if (ids.length === 0) {
    return userMap;
  }

  try {
    const fetchedUsers = await db
      .select()
      .from(users)
      .where(inArray(users.id, ids));

    fetchedUsers.forEach(user => {
      userMap.set(user.id, normalizeUserRoles(user));
    });
  } catch (error: any) {
    console.error('[getUsersByIds] Database error:', {
      message: error?.message,
      code: error?.code,
      idsCount: ids.length,
    });
    // Return empty map on error (graceful degradation)
  }

  return userMap;
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
    return normalizeUserRoles(mockUsers[index]);
  }

  const [updatedUser] = await db
    .update(users)
    .set({ ...userData, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
    
  return updatedUser ? normalizeUserRoles(updatedUser) : null;
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

export async function listProfessionals(params: {
  search?: string;
  limit: number;
  offset: number;
}): Promise<Array<{
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  averageRating: number | null;
  reviewCount: number;
  location: string | null;
}>> {
  const db = getDb();
  if (!db) {
    // Database not configured: return empty list (avoid mock users in runtime features)
    return [];
  }

  const search = (params.search ?? '').trim();
  const where = and(
    // Include anyone with professional as primary role or included in roles array.
    sql`(${users.role} = 'professional' OR 'professional' = ANY(${users.roles}))`,
    // Active users only
    sql`(${users.isActive} IS NULL OR ${users.isActive} = true)`,
    search
      ? sql`(${users.name} ILIKE ${'%' + search + '%'} OR ${users.email} ILIKE ${'%' + search + '%'})`
      : sql`true`
  );

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      averageRating: users.averageRating,
      reviewCount: users.reviewCount,
      location: users.location,
    })
    .from(users)
    .where(where)
    .limit(params.limit)
    .offset(params.offset);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    avatarUrl: r.avatarUrl ?? null,
    averageRating: r.averageRating ? Number(r.averageRating) : null,
    reviewCount: r.reviewCount ? Number(r.reviewCount) : 0,
    location: r.location ?? null,
  }));
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
