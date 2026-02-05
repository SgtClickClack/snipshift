/**
 * Database Instance Export
 * 
 * Provides a single Drizzle database instance for use across the application
 * 
 * Force updated: 2025-11-19 - Ensure correct exports for Vercel deployment
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { getDatabase } from './connection.js';
import * as schema from './schema.js';

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

/**
 * Pre-instantiated database instance for direct import
 * Usage: import { db } from '../db/index.js'
 */
export const db = getDb();

export * from './schema.js';
export * from './connection.js';

