import { execSync } from 'child_process';
import path from 'path';

const TEST_DB_URL = 'postgres://test:test@localhost:5433/snipshift_test';

export async function setup() {
  console.log('🟡 [GLOBAL SETUP] Starting Test Database migration...');
  
  const cwd = process.cwd().endsWith('api') ? process.cwd() : path.join(process.cwd(), 'api');

  try {
    // Run drizzle-kit push to sync schema
    // This runs ONCE before all tests
    execSync('npx drizzle-kit push --force', { 
        stdio: 'inherit',
        cwd: cwd,
        env: { ...process.env, DATABASE_URL: TEST_DB_URL }
    });
    console.log('✅ [GLOBAL SETUP] Test Database Schema Synced');
  } catch (error) {
    console.error('❌ [GLOBAL SETUP] Failed to sync schema:', error);
    throw error;
  }
}

export async function teardown() {
  // Optional: Drop DB or cleanup
}

