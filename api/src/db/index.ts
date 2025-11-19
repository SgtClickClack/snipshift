/**
 * Database Instance Export
 * 
 * Provides a single Drizzle database instance for use across the application
 * 
 * Force updated: 2025-11-19 - Ensure correct exports for Vercel deployment
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { getDatabase } from './connection';
import * as schema from './schema';

/**
 * Get Drizzle database instance
 * Returns null if DATABASE_URL is not configured (for graceful fallback)
 */
export function getDb() {
  const pool = getDatabase();
  if (!pool) {
    return null;
  }
  return drizzle(pool, { schema });
}

export * from './schema';
export * from './connection';

