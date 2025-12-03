import { chromium, FullConfig } from '@playwright/test';
import { Client } from 'pg';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function globalSetup(config: FullConfig) {
  console.log('Global Setup: Initializing Test Environment...');

  const dbUrl = 'postgresql://test:test@localhost:5433/snipshift_test';
  process.env.DATABASE_URL = dbUrl;

  // 1. Wait for DB to be ready
  console.log('Waiting for Database (port 5433)...');
  const client = new Client({ connectionString: dbUrl });
  
  let retries = 10;
  while (retries > 0) {
    try {
        await client.connect();
        console.log('Database connected successfully.');
        break;
    } catch (e) {
        console.log(`Database not ready, retrying (${retries})...`);
        retries--;
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  if (retries === 0) {
      throw new Error('Could not connect to Test Database.');
  }

  try {
    // 1.5 Reset Schema (Ensure fresh state)
    console.log('Resetting Test Database Schema...');
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('GRANT ALL ON SCHEMA public TO public');
    await client.query('COMMENT ON SCHEMA public IS \'standard public schema\'');
    console.log('Schema reset complete.');

    // 2. Run Migrations (Drizzle Push)
    console.log('Pushing Schema to Test DB...');
    try {
        // Using local api/drizzle.config.ts but override url via env var is tricky with drizzle-kit push 
        // if it reads from .env file directly.
        // We will use the api directory context.
        execSync('npx drizzle-kit push', { 
            cwd: path.join(__dirname, '../api'),
            env: { ...process.env, DATABASE_URL: dbUrl },
            stdio: 'inherit'
        });
    } catch (e) {
        console.error('Schema push failed. Ensure `drizzle-kit` is installed and config is correct.');
        throw e;
    }

    // 3. Seed Test User
    console.log('Seeding Test User...');
    const TEST_EMAIL = 'test@snipshift.com';
    const TEST_ID = '00000000-0000-0000-0000-000000000001'; // Fixed ID for E2E tests

    // Check if user exists
    let userId;
    const res = await client.query('SELECT id FROM users WHERE email = $1', [TEST_EMAIL]);
    if (res.rows.length === 0) {
        const insertRes = await client.query(`
            INSERT INTO users (id, email, name, role, is_onboarded, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            RETURNING id
        `, [TEST_ID, TEST_EMAIL, 'Test User', 'business', true]); // Changed to 'business' role for shift posting
        userId = insertRes.rows[0].id;
        console.log(`Created user: ${TEST_EMAIL} (${userId})`);
    } else {
        userId = res.rows[0].id;
        console.log(`User ${TEST_EMAIL} already exists (${userId}).`);
    }

    // 4. Seed Test Job
    console.log('Seeding Test Job...');
    const jobRes = await client.query('SELECT id FROM jobs WHERE title = $1', ['E2E Test Job']);
    if (jobRes.rows.length === 0) {
         await client.query(`
            INSERT INTO jobs (
                business_id, 
                title, 
                pay_rate, 
                description, 
                date, 
                start_time, 
                end_time, 
                status, 
                shop_name,
                address,
                city,
                state,
                created_at, 
                updated_at
            )
            VALUES ($1, $2, $3, $4, NOW() + INTERVAL '1 day', '09:00:00', '17:00:00', 'open', $5, $6, $7, $8, NOW(), NOW())
        `, [
            userId, 
            'E2E Test Job', 
            50.00, 
            'This is a test job for E2E crawling.', 
            'Test Shop',
            '123 Test St',
            'Brisbane',
            'QLD'
        ]);
        console.log('Created E2E Test Job');
    } else {
        console.log('E2E Test Job already exists.');
    }

  } finally {
    await client.end();
  }
  
  console.log('Global Setup Complete.');
}

export default globalSetup;

