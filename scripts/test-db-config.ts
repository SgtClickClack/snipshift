/**
 * Test Database Configuration Utility
 * 
 * Constructs test database connection URL from environment variables
 * to match docker-compose.test.yml configuration.
 * 
 * Supports:
 * - POSTGRES_USER (defaults to 'postgres')
 * - POSTGRES_PASSWORD (defaults to 'test')
 * - POSTGRES_DB (defaults to 'hospogo_test')
 * - POSTGRES_PORT (defaults to 5433)
 * 
 * Or use DATABASE_URL/POSTGRES_URL directly.
 */

export function getTestDatabaseUrl(): string {
  // Check for test-specific environment variables first
  // This ensures test scripts use test DB even if DATABASE_URL is set for production
  if (process.env.TEST_DATABASE_URL) {
    return process.env.TEST_DATABASE_URL;
  }

  // If DATABASE_URL or POSTGRES_URL is explicitly set, use it
  // But only if it points to the test database (port 5433 or contains 'test')
  if (process.env.DATABASE_URL) {
    const url = process.env.DATABASE_URL;
    // If it's pointing to test DB (port 5433 or contains 'test'), use it
    if (url.includes(':5433') || url.includes('/hospogo_test') || url.includes('test')) {
      return url;
    }
    // Otherwise, ignore it and build test URL
  }
  if (process.env.POSTGRES_URL) {
    const url = process.env.POSTGRES_URL;
    // If it's pointing to test DB, use it
    if (url.includes(':5433') || url.includes('/hospogo_test') || url.includes('test')) {
      return url;
    }
    // Otherwise, ignore it and build test URL
  }

  // Build from individual components (matching docker-compose.test.yml)
  // Always default to 'test' password for test database
  const user = process.env.POSTGRES_USER || process.env.TEST_DB_USER || 'postgres';
  const password = process.env.POSTGRES_PASSWORD || process.env.TEST_DB_PASSWORD || 'test';
  const database = process.env.POSTGRES_DB || process.env.TEST_DB_NAME || 'hospogo_test';
  const host = process.env.POSTGRES_HOST || process.env.TEST_DB_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || process.env.TEST_DB_PORT || '5433';

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

/**
 * Get test database connection options for pg.Client
 */
export function getTestDatabaseConfig() {
  const url = getTestDatabaseUrl();
  const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
  
  return {
    connectionString: url,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
  };
}

/**
 * Mask password in connection string for logging
 */
export function maskConnectionString(url: string): string {
  try {
    const urlObj = new URL(url);
    if (urlObj.password) {
      urlObj.password = '***';
    }
    return urlObj.toString();
  } catch {
    // If URL parsing fails, try simple regex replacement
    return url.replace(/:([^:@]+)@/, ':***@');
  }
}
