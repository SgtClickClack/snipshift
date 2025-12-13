import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const TEST_DB_URL = 'postgres://test:test@localhost:5433/snipshift_test';

function splitSqlStatements(sqlText: string): string[] {
  // Normalize Drizzle migration marker
  const normalized = sqlText.replaceAll('--> statement-breakpoint', '');

  const statements: string[] = [];
  let current = '';
  let inDoBlock = false;

  const lines = normalized.split('\n');
  for (const rawLine of lines) {
    const line = rawLine;

    // Skip comment-only lines
    if (line.trim().startsWith('--')) continue;

    current += line + '\n';

    if (line.includes('DO $$')) inDoBlock = true;
    if (line.includes('END $$')) inDoBlock = false;

    if (line.trim().endsWith(';') && (!inDoBlock || line.includes('END $$'))) {
      const stmt = current.trim();
      if (stmt) statements.push(stmt);
      current = '';
    }
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}

export async function setup() {
  console.log('🟡 [GLOBAL SETUP] Starting Test Database migration...');

  const apiRoot = process.cwd().endsWith('api') ? process.cwd() : path.join(process.cwd(), 'api');
  const migrationsDir = path.join(apiRoot, 'drizzle');

  const pool = new Pool({ connectionString: TEST_DB_URL });

  try {
    // Ensure UUID generator exists for initial migrations (gen_random_uuid)
    await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    // Reset schema for deterministic test runs
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE;');
    await pool.query('CREATE SCHEMA public;');

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    for (const file of migrationFiles) {
      const fullPath = path.join(migrationsDir, file);
      const sqlText = fs.readFileSync(fullPath, 'utf-8');
      const statements = splitSqlStatements(sqlText);

      console.log(`   📦 Applying ${file} (${statements.length} statements)`);

      for (const stmt of statements) {
        if (!stmt.trim()) continue;

        // Test DB runs on vanilla Postgres (not Supabase). Skip Supabase RLS / auth policies.
        const normalizedStmt = stmt.toLowerCase();
        if (
          normalizedStmt.includes('enable row level security') ||
          normalizedStmt.includes('create policy') ||
          normalizedStmt.includes('auth.uid()') ||
          normalizedStmt.includes(' to authenticated') ||
          normalizedStmt.includes(' to anon')
        ) {
          continue;
        }

        try {
          await pool.query(stmt);
        } catch (error: any) {
          // Skip duplicates / already-exists errors to keep migrations idempotent
          if (
            error?.code === '42P07' || // duplicate_table
            error?.code === '42710' || // duplicate_object
            error?.code === '42723' || // duplicate_function
            error?.code === '42701' || // duplicate_column
            error?.code === '42704' || // undefined_object (e.g. missing roles like "authenticated")
            String(error?.message ?? '').includes('already exists') ||
            String(error?.message ?? '').includes('duplicate')
          ) {
            continue;
          }
          console.error(`   ❌ Migration failed in ${file}`);
          throw error;
        }
      }
    }

    console.log('✅ [GLOBAL SETUP] Test Database Schema Synced');
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

