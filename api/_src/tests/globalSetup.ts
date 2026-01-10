import path from 'path';
import fs from 'fs';
import { Pool } from 'pg';
import { spawnSync } from 'child_process';

const TEST_DB_URL = 'postgres://test:test@localhost:5433/snipshift_test';

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPostgres(pool: Pool, timeoutMs: number) {
  const start = Date.now();
  let lastError: unknown = null;

  while (Date.now() - start < timeoutMs) {
    try {
      await pool.query('SELECT 1;');
      return;
    } catch (error) {
      lastError = error;
      await sleep(500);
    }
  }

  throw new Error(`Timed out waiting for Postgres to accept connections: ${String((lastError as any)?.message ?? lastError)}`);
}

export async function setup() {
  console.log('🟡 [GLOBAL SETUP] Starting Test Database migration...');

  const apiRoot = process.cwd().endsWith('api') ? process.cwd() : path.join(process.cwd(), 'api');

  const pool = new Pool({ connectionString: TEST_DB_URL });

  try {
    // docker-compose may report "started" before Postgres is ready to accept connections.
    await waitForPostgres(pool, 30000);

    // Ensure UUID generator exists for initial migrations (gen_random_uuid)
    await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    // Reset schema for deterministic test runs
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE;');
    await pool.query('CREATE SCHEMA public;');

    // This repo uses drizzle-kit push to manage schema; SQL migrations are not committed.
    // Sync schema for tests by forcing a drizzle-kit push against the test DB.
    const drizzleKitBin = path.join(
      apiRoot,
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'drizzle-kit.cmd' : 'drizzle-kit'
    );

    // On Windows, .cmd shims require cmd.exe. Spawning them directly without a shell can throw EINVAL.
    const command = process.platform === 'win32' ? 'cmd.exe' : drizzleKitBin;
    const args = process.platform === 'win32'
      ? ['/c', drizzleKitBin, 'push', '--force']
      : ['push', '--force'];

    const result = spawnSync(command, args, {
      cwd: apiRoot,
      env: {
        ...process.env,
        DATABASE_URL: TEST_DB_URL,
      },
      stdio: 'inherit',
      shell: false,
    });

    if (result.status !== 0) {
      const details = [
        `exit=${String(result.status)}`,
        result.signal ? `signal=${result.signal}` : null,
        result.error ? `error=${String(result.error)}` : null,
      ].filter(Boolean).join(' ');
      throw new Error(`drizzle-kit push failed (${details})`);
    }

    // Apply any repo-local SQL migrations that are not part of drizzle-kit push
    // (kept small and idempotent for test determinism).
    try {
      const hospoShiftMigrationPath = path.join(
        apiRoot,
        '_src',
        'db',
        'migrations',
        '0015_add_shift_hospitality_fields.sql'
      );

      if (fs.existsSync(hospoShiftMigrationPath)) {
        const sqlText = fs.readFileSync(hospoShiftMigrationPath, 'utf8');
        if (sqlText.trim().length > 0) {
          await pool.query(sqlText);
        }
      }
    } catch (error) {
      console.warn('🟠 [GLOBAL SETUP] Optional SQL migrations failed to apply:', error);
    }

    console.log('✅ [GLOBAL SETUP] Test Database Schema Synced (drizzle-kit push)');
  } catch (error) {
    console.error('❌ [GLOBAL SETUP] Failed to sync schema:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

export async function teardown() {
  // Optional: Drop DB or cleanup
}

