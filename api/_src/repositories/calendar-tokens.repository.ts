/**
 * Calendar Tokens Repository
 * 
 * Database operations for user calendar feed tokens
 */

import { eq, and, or, isNull, gte, sql } from 'drizzle-orm';
import { userCalendarTokens } from '../db/schema/calendar-tokens.js';
import { getDb } from '../db/index.js';

export interface CreateCalendarTokenInput {
  userId: string;
  expiresAt?: Date; // Optional expiration date
}

export interface CalendarToken {
  id: string;
  userId: string;
  token: string;
  isActive: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a new calendar token for a user
 * If a token already exists, deactivate it and create a new one
 */
export async function createCalendarToken(
  input: CreateCalendarTokenInput
): Promise<CalendarToken | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  try {
    // Deactivate any existing active tokens for this user
    await db
      .update(userCalendarTokens)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userCalendarTokens.userId, input.userId),
          eq(userCalendarTokens.isActive, true)
        )
      );

    // Generate a secure random token
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');

    // Create new token
    const [newToken] = await db
      .insert(userCalendarTokens)
      .values({
        userId: input.userId,
        token,
        isActive: true,
        expiresAt: input.expiresAt || null,
        lastUsedAt: null,
      })
      .returning();

    return newToken || null;
  } catch (error: any) {
    console.error('[CalendarTokens] Error creating calendar token:', error);
    throw error;
  }
}

/**
 * Validate a calendar token and return the associated user ID
 * Returns null if token is invalid, expired, or inactive
 */
export async function validateCalendarToken(
  token: string,
  userId: string
): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  try {
    const [result] = await db
      .select()
      .from(userCalendarTokens)
      .where(
        and(
          eq(userCalendarTokens.token, token),
          eq(userCalendarTokens.userId, userId),
          eq(userCalendarTokens.isActive, true),
          // Check expiration: either expiresAt is null (no expiration) or it's in the future
          or(
            isNull(userCalendarTokens.expiresAt),
            gte(userCalendarTokens.expiresAt, new Date())
          )
        )
      )
      .limit(1);

    if (!result) {
      return false;
    }

    // Update last used timestamp
    await db
      .update(userCalendarTokens)
      .set({
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userCalendarTokens.id, result.id));

    return true;
  } catch (error: any) {
    console.error('[CalendarTokens] Error validating calendar token:', error);
    return false;
  }
}

/**
 * Get active calendar token for a user
 */
export async function getActiveTokenForUser(userId: string): Promise<CalendarToken | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  try {
    const [result] = await db
      .select()
      .from(userCalendarTokens)
      .where(
        and(
          eq(userCalendarTokens.userId, userId),
          eq(userCalendarTokens.isActive, true),
          // Check expiration: either expiresAt is null (no expiration) or it's in the future
          or(
            isNull(userCalendarTokens.expiresAt),
            gte(userCalendarTokens.expiresAt, new Date())
          )
        )
      )
      .orderBy(sql`${userCalendarTokens.createdAt} DESC`)
      .limit(1);

    return result || null;
  } catch (error: any) {
    console.error('[CalendarTokens] Error getting active token:', error);
    return null;
  }
}

/**
 * Deactivate a calendar token
 */
export async function deactivateCalendarToken(token: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  try {
    await db
      .update(userCalendarTokens)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(userCalendarTokens.token, token));

    return true;
  } catch (error: any) {
    console.error('[CalendarTokens] Error deactivating token:', error);
    return false;
  }
}

/**
 * Deactivate all calendar tokens for a user
 */
export async function deactivateAllUserCalendarTokens(userId: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    return false;
  }

  try {
    await db
      .update(userCalendarTokens)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(userCalendarTokens.userId, userId));

    return true;
  } catch (error: any) {
    console.error('[CalendarTokens] Error deactivating user tokens:', error);
    return false;
  }
}
