/**
 * Test Database Migration Script
 * 
 * Runs drizzle-kit push against the test database.
 * Cross-platform compatible.
 * 
 * Usage:
 *   npx ts-node scripts/migrate-test-db.ts
 */

import { spawnSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { getTestDatabaseUrl, maskConnectionString } from './test-db-config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
// Priority: .env.test > api/.env > .env
const testEnvPath = path.resolve(__dirname, '../.env.test');
const apiEnvPath = path.resolve(__dirname, '../api/.env');
const rootEnvPath = path.resolve(__dirname, '../.env');

// Load .env.test first (highest priority for test scripts)
if (fs.existsSync(testEnvPath)) {
  dotenv.config({ path: testEnvPath });
}
if (fs.existsSync(apiEnvPath)) {
  dotenv.config({ path: apiEnvPath });
}
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

const TEST_DB_URL = getTestDatabaseUrl();
const apiRoot = path.resolve(__dirname, '../api');

console.log('📐 Migrating test database schema...');
console.log(`📊 Database Connection String: ${maskConnectionString(TEST_DB_URL)}\n`);

const result = spawnSync('npx', ['drizzle-kit', 'push'], {
  cwd: apiRoot,
  env: {
    ...process.env,
    DATABASE_URL: TEST_DB_URL,
    POSTGRES_URL: TEST_DB_URL,
  },
  stdio: 'inherit',
  shell: true,
});

if (result.status === 0) {
  console.log('\n✅ Schema migration completed successfully');
  process.exit(0);
} else {
  console.error(`\n❌ Schema migration failed with exit code ${result.status}`);
  process.exit(1);
}
