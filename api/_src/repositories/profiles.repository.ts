import { sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';

/**
 * Increment a user's reliability strikes and return the new count.
 *
 * Implemented via an UPSERT so profiles are created on first strike.
 */
export async function incrementReliabilityStrikes(userId: string): Promise<number | null> {
  const db = getDb();
  if (!db) return null;

  const result = await (db as any).execute(sql`
    INSERT INTO profiles (user_id, reliability_strikes)
    VALUES (${userId}, 1)
    ON CONFLICT (user_id)
    DO UPDATE SET
      reliability_strikes = profiles.reliability_strikes + 1,
      updated_at = NOW()
    RETURNING reliability_strikes
  `);

  const rows = (result as any)?.rows ?? result;
  const strikes = rows?.[0]?.reliability_strikes;
  const n = typeof strikes === 'number' ? strikes : Number.parseInt(String(strikes), 10);
  return Number.isFinite(n) ? n : null;
}

export async function getReliabilityStrikes(userId: string): Promise<number | null> {
  const db = getDb();
  if (!db) return null;

  const result = await (db as any).execute(sql`
    SELECT reliability_strikes
    FROM profiles
    WHERE user_id = ${userId}
    LIMIT 1
  `);

  const rows = (result as any)?.rows ?? result;
  const strikes = rows?.[0]?.reliability_strikes;
  if (strikes === undefined || strikes === null) return 0;

  const n = typeof strikes === 'number' ? strikes : Number.parseInt(String(strikes), 10);
  return Number.isFinite(n) ? n : 0;
}

export type ProfileCompliance = {
  rsa_verified: boolean;
  rsa_expiry: string | null;
  rsa_state_of_issue: string | null;
  rsa_cert_url: string | null;
  reliability_strikes: number;
};

export async function getProfileCompliance(userId: string): Promise<ProfileCompliance | null> {
  const db = getDb();
  if (!db) return null;

  const result = await (db as any).execute(sql`
    SELECT
      COALESCE(rsa_verified, false) AS rsa_verified,
      rsa_expiry AS rsa_expiry,
      rsa_state_of_issue AS rsa_state_of_issue,
      rsa_cert_url AS rsa_cert_url,
      COALESCE(reliability_strikes, 0) AS reliability_strikes
    FROM profiles
    WHERE user_id = ${userId}
    LIMIT 1
  `);

  const rows = (result as any)?.rows ?? result;
  const row = rows?.[0];
  if (!row) {
    return {
      rsa_verified: false,
      rsa_expiry: null,
      rsa_state_of_issue: null,
      rsa_cert_url: null,
      reliability_strikes: 0,
    };
  }

  return {
    rsa_verified: Boolean(row.rsa_verified),
    rsa_expiry: row.rsa_expiry ?? null,
    rsa_state_of_issue: row.rsa_state_of_issue ?? null,
    rsa_cert_url: row.rsa_cert_url ?? null,
    reliability_strikes: typeof row.reliability_strikes === 'number'
      ? row.reliability_strikes
      : Number.parseInt(String(row.reliability_strikes ?? 0), 10) || 0,
  };
}

export async function upsertProfileCompliance(
  userId: string,
  updates: {
    rsa_verified?: boolean;
    rsa_expiry?: string;
    rsa_state_of_issue?: string;
    rsa_cert_url?: string;
  }
): Promise<void> {
  const db = getDb();
  if (!db) return;

  const rsaVerified = updates.rsa_verified === true ? true : null;
  const rsaExpiry = updates.rsa_expiry ?? null;
  const rsaStateOfIssue = updates.rsa_state_of_issue ?? null;
  const rsaCertUrl = updates.rsa_cert_url ?? null;

  // Use UPSERT so profiles exist even for older users.
  await (db as any).execute(sql`
    INSERT INTO profiles (user_id, rsa_verified, rsa_expiry, rsa_state_of_issue, rsa_cert_url, updated_at)
    VALUES (${userId}, COALESCE(${rsaVerified}, false), ${rsaExpiry}, ${rsaStateOfIssue}, ${rsaCertUrl}, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      rsa_verified = CASE WHEN EXCLUDED.rsa_verified = true THEN true ELSE profiles.rsa_verified END,
      rsa_expiry = COALESCE(EXCLUDED.rsa_expiry, profiles.rsa_expiry),
      rsa_state_of_issue = COALESCE(EXCLUDED.rsa_state_of_issue, profiles.rsa_state_of_issue),
      rsa_cert_url = COALESCE(EXCLUDED.rsa_cert_url, profiles.rsa_cert_url),
      updated_at = NOW()
  `);
}

export async function setRsaVerified(userId: string, verified: boolean): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  await (db as any).execute(sql`
    INSERT INTO profiles (user_id, rsa_verified, updated_at)
    VALUES (${userId}, ${verified}, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      rsa_verified = ${verified},
      updated_at = NOW()
  `);

  return true;
}

export async function listPendingRsaVerifications(
  limit: number = 100,
  offset: number = 0
): Promise<{
  data: Array<{
    userId: string;
    email: string;
    name: string;
    rsaExpiry: string | null;
    rsaStateOfIssue: string | null;
    rsaCertUrl: string | null;
    updatedAt: string | null;
  }>;
  total: number;
  limit: number;
  offset: number;
}> {
  const db = getDb();
  if (!db) return { data: [], total: 0, limit, offset };

  const countResult = await (db as any).execute(sql`
    SELECT COUNT(*)::int AS count
    FROM profiles p
    WHERE p.rsa_cert_url IS NOT NULL
      AND COALESCE(p.rsa_verified, false) = false
  `);

  const countRows = (countResult as any)?.rows ?? countResult;
  const total = Number(countRows?.[0]?.count ?? 0);

  const result = await (db as any).execute(sql`
    SELECT
      u.id AS user_id,
      u.email AS email,
      u.name AS name,
      p.rsa_expiry AS rsa_expiry,
      p.rsa_state_of_issue AS rsa_state_of_issue,
      p.rsa_cert_url AS rsa_cert_url,
      p.updated_at AS updated_at
    FROM profiles p
    INNER JOIN users u ON u.id = p.user_id
    WHERE p.rsa_cert_url IS NOT NULL
      AND COALESCE(p.rsa_verified, false) = false
    ORDER BY p.updated_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const rows = (result as any)?.rows ?? result;

  return {
    data: (rows ?? []).map((r: any) => ({
      userId: r.user_id,
      email: r.email,
      name: r.name,
      rsaExpiry: r.rsa_expiry ?? null,
      rsaStateOfIssue: r.rsa_state_of_issue ?? null,
      rsaCertUrl: r.rsa_cert_url ?? null,
      updatedAt: r.updated_at ?? null,
    })),
    total,
    limit,
    offset,
  };
}

