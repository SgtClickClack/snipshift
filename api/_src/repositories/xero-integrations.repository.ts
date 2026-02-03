/**
 * Xero Integrations Repository
 * Database operations for Xero OAuth tokens and OAuth state (CSRF protection)
 */

import { eq } from 'drizzle-orm';
import { xeroIntegrations, xeroOauthState } from '../db/schema/xero-integrations.js';
import { getDb } from '../db/index.js';
import { encrypt, decrypt } from '../lib/encryption.js';

export interface XeroIntegrationRow {
  id: string;
  userId: string;
  xeroTenantId: string;
  xeroTenantName: string | null;
  accessTokenEnc: string;
  refreshTokenEnc: string;
  expiresAt: Date;
  scope: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateXeroIntegrationInput {
  userId: string;
  xeroTenantId: string;
  xeroTenantName?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope?: string;
}

/**
 * Store OAuth state for CSRF protection. Call before redirecting to Xero.
 */
export async function storeOAuthState(state: string, userId: string, expiresAt: Date): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('Database not configured');

  await db.insert(xeroOauthState).values({
    state,
    userId,
    expiresAt,
  });
}

/**
 * Consume OAuth state and return userId if valid. Deletes the state (one-time use).
 */
export async function consumeOAuthState(state: string): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  const [validRow] = await db
    .select()
    .from(xeroOauthState)
    .where(eq(xeroOauthState.state, state));

  if (!validRow) return null;
  if (validRow.expiresAt < new Date()) {
    await db.delete(xeroOauthState).where(eq(xeroOauthState.state, state));
    return null;
  }

  await db.delete(xeroOauthState).where(eq(xeroOauthState.state, state));
  return validRow.userId;
}

/**
 * Create or replace Xero integration for a user (one integration per user).
 */
export async function upsertXeroIntegration(input: CreateXeroIntegrationInput): Promise<XeroIntegrationRow | null> {
  const db = getDb();
  if (!db) return null;

  const accessTokenEnc = encrypt(input.accessToken);
  const refreshTokenEnc = encrypt(input.refreshToken);

  const [existing] = await db
    .select()
    .from(xeroIntegrations)
    .where(eq(xeroIntegrations.userId, input.userId));

  if (existing) {
    const [updated] = await db
      .update(xeroIntegrations)
      .set({
        xeroTenantId: input.xeroTenantId,
        xeroTenantName: input.xeroTenantName ?? null,
        accessTokenEnc,
        refreshTokenEnc,
        expiresAt: input.expiresAt,
        scope: input.scope ?? null,
        updatedAt: new Date(),
      })
      .where(eq(xeroIntegrations.userId, input.userId))
      .returning();
    return updated ?? null;
  }

  const [inserted] = await db
    .insert(xeroIntegrations)
    .values({
      userId: input.userId,
      xeroTenantId: input.xeroTenantId,
      xeroTenantName: input.xeroTenantName ?? null,
      accessTokenEnc,
      refreshTokenEnc,
      expiresAt: input.expiresAt,
      scope: input.scope ?? null,
    })
    .returning();

  return inserted ?? null;
}

/**
 * Get Xero integration for user (without decrypted tokens).
 */
export async function getXeroIntegrationByUserId(userId: string): Promise<{
  id: string;
  xeroTenantId: string;
  xeroTenantName: string | null;
  expiresAt: Date;
} | null> {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select({
      id: xeroIntegrations.id,
      xeroTenantId: xeroIntegrations.xeroTenantId,
      xeroTenantName: xeroIntegrations.xeroTenantName,
      expiresAt: xeroIntegrations.expiresAt,
    })
    .from(xeroIntegrations)
    .where(eq(xeroIntegrations.userId, userId));

  return row ?? null;
}

/**
 * Get decrypted access token for API calls. Returns null if expired or not found.
 */
export async function getDecryptedTokens(userId: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
} | null> {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select()
    .from(xeroIntegrations)
    .where(eq(xeroIntegrations.userId, userId));

  if (!row) return null;

  try {
    return {
      accessToken: decrypt(row.accessTokenEnc),
      refreshToken: decrypt(row.refreshTokenEnc),
      expiresAt: row.expiresAt,
    };
  } catch {
    return null;
  }
}

/**
 * Update tokens after refresh.
 */
export async function updateTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date
): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db
    .update(xeroIntegrations)
    .set({
      accessTokenEnc: encrypt(accessToken),
      refreshTokenEnc: encrypt(refreshToken),
      expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(xeroIntegrations.userId, userId));
}

/**
 * Delete Xero integration for user (disconnect).
 */
export async function deleteXeroIntegration(userId: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db.delete(xeroIntegrations).where(eq(xeroIntegrations.userId, userId));
}
