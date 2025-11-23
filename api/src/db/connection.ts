/**
 * Database Connection Module
 * 
 * Provides PostgreSQL connection using the `pg` package with lazy initialization
 * and proper connection pooling configuration.
 * 
 * Force updated: 2025-11-19 - Ensure correct imports for Vercel deployment
 */

import { Pool } from 'pg';

let pool: Pool | null = null;
let isInitialized = false;

/**
 * Connection configuration optimized for production and development
 * - Lazy initialization: connections created on first use
 * - Fast fail: 3 second timeout for cold starts
 * - Reasonable pool size: max 20, min 2 (not 5 to avoid blocking startup)
 * - SSL enforcement: Always enabled for cloud databases (Neon, Vercel, etc.)
 */
const getConnectionConfig = (databaseUrl: string) => {
  // Strictly enforce SSL for production and cloud databases
  // Neon Postgres ALWAYS requires SSL - no exceptions
  const isNeon = databaseUrl.includes('neon.tech') || databaseUrl.includes('neon');
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  const isCloudDatabase = 
    isNeon ||
    databaseUrl.includes('vercel') ||
    databaseUrl.includes('supabase') ||
    databaseUrl.includes('railway') ||
    databaseUrl.includes('render.com');

  // Always enable SSL for Neon, production, or cloud databases
  const requiresSSL = isNeon || isProduction || isCloudDatabase;

  return {
    max: 20,
    min: 2, // Reduced from 5 to avoid blocking startup
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 3000, // Fast fail: 3 seconds instead of 10
    ssl: requiresSSL ? { rejectUnauthorized: false } : false,
  };
};

/**
 * Initialize database connection lazily
 * Only creates connection pool when first accessed, not at module load time
 * 
 * @returns Pool instance or null if DATABASE_URL is not configured
 */
export function getDatabase(): Pool | null {
  if (isInitialized) {
    return pool;
  }

  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!databaseUrl) {
    console.warn('[DB] DATABASE_URL not configured. Database features will be unavailable.');
    console.warn('[DB] Falling back to in-memory storage for development.');
    isInitialized = true;
    return null;
  }

  try {
    pool = new Pool({
      connectionString: databaseUrl,
      ...getConnectionConfig(databaseUrl),
    });

    // Add error listener to prevent crashing on idle client errors
    pool.on('error', (err, client) => {
      console.error('[DB] Unexpected error on idle client', err);
      console.error('[DB] Error stack:', err?.stack);
      // Don't throw here, just log it
    });

    isInitialized = true;
    console.log('[DB] Database connection pool initialized successfully');
    return pool;
  } catch (error: any) {
    console.error('[DB] Failed to initialize database connection:', error?.message || error);
    console.error('[DB] Error stack:', error?.stack);
    console.error('[DB] DATABASE_URL exists:', !!databaseUrl);
    console.error('[DB] DATABASE_URL length:', databaseUrl?.length || 0);
    // Mark as initialized to prevent retrying immediately on every request if config is bad
    // But pool remains null
    isInitialized = true;
    return null;
  }
}

/**
 * Test database connection
 * Useful for health checks and startup validation
 */
export async function testConnection(): Promise<boolean> {
  const db = getDatabase();
  if (!db) {
    return false;
  }

  try {
    await db.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('[DB] Connection test failed:', error);
    return false;
  }
}

/**
 * Close database connection pool
 * Should be called during graceful shutdown
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    isInitialized = false;
    console.log('[DB] Database connection pool closed');
  }
}

