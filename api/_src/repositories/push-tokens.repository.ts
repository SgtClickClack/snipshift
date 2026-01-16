/**
 * Push Tokens Repository
 * 
 * Database operations for user push notification tokens
 */

import { eq, and } from 'drizzle-orm';
import { userPushTokens } from '../db/schema.js';
import { getDb } from '../db/index.js';

export interface CreatePushTokenInput {
  userId: string;
  token: string;
  deviceId?: string;
  platform?: string;
}

export interface PushToken {
  id: string;
  userId: string;
  token: string;
  deviceId: string | null;
  platform: string | null;
  isActive: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create or update a push token for a user
 * If a token already exists for the user+device, update it; otherwise create new
 */
export async function upsertPushToken(
  input: CreatePushTokenInput
): Promise<PushToken | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  try {
    // Check if token already exists for this user
    const existing = await db
      .select()
      .from(userPushTokens)
      .where(
        and(
          eq(userPushTokens.userId, input.userId),
          eq(userPushTokens.token, input.token)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing token
      const [updated] = await db
        .update(userPushTokens)
        .set({
          isActive: true,
          lastUsedAt: new Date(),
          updatedAt: new Date(),
          deviceId: input.deviceId || existing[0].deviceId,
          platform: input.platform || existing[0].platform || 'web',
        })
        .where(eq(userPushTokens.id, existing[0].id))
        .returning();

      return updated || null;
    } else {
      // Create new token
      const [newToken] = await db
        .insert(userPushTokens)
        .values({
          userId: input.userId,
          token: input.token,
          deviceId: input.deviceId || null,
          platform: input.platform || 'web',
          isActive: true,
          lastUsedAt: new Date(),
        })
        .returning();

      return newToken || null;
    }
  } catch (error: any) {
    console.error('[PushTokens] Error upserting push token:', error);
    throw error;
  }
}

/**
 * Get all active push tokens for a user
 */
export async function getActiveTokensForUser(userId: string): Promise<PushToken[]> {
  const db = getDb();
  if (!db) {
    return [];
  }

  try {
    const tokens = await db
      .select()
      .from(userPushTokens)
      .where(
        and(
          eq(userPushTokens.userId, userId),
          eq(userPushTokens.isActive, true)
        )
      );

    return tokens;
  } catch (error: any) {
    console.error('[PushTokens] Error getting active tokens:', error);
    return [];
  }
}

/**
 * Deactivate a push token (soft delete)
 */
export async function deactivateToken(token: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  try {
    await db
      .update(userPushTokens)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(userPushTokens.token, token));

    return true;
  } catch (error: any) {
    console.error('[PushTokens] Error deactivating token:', error);
    return false;
  }
}

/**
 * Deactivate all tokens for a user (e.g., on logout)
 */
export async function deactivateAllUserTokens(userId: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  try {
    await db
      .update(userPushTokens)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(userPushTokens.userId, userId));

    return true;
  } catch (error: any) {
    console.error('[PushTokens] Error deactivating user tokens:', error);
    return false;
  }
}

/**
 * Get push token by token string
 */
export async function getTokenByToken(token: string): Promise<PushToken | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  try {
    const [result] = await db
      .select()
      .from(userPushTokens)
      .where(eq(userPushTokens.token, token))
      .limit(1);

    return result || null;
  } catch (error: any) {
    console.error('[PushTokens] Error getting token:', error);
    return null;
  }
}
