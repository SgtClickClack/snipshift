/**
 * Quick script to check test user role
 */
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');
const fs = require('fs');

// Load environment variables
const rootEnvPath = path.resolve(__dirname, '../.env');
const apiEnvPath = path.resolve(__dirname, '../api/.env');

if (fs.existsSync(rootEnvPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(rootEnvPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    if (fs.existsSync(apiEnvPath)) {
        const envConfig = dotenv.parse(fs.readFileSync(apiEnvPath));
        for (const k in envConfig) {
            process.env[k] = envConfig[k];
        }
    }
}

const TEST_EMAIL = process.env.TEST_EMAIL || 'test@hospogo.com';

async function checkUserRole() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: (process.env.DATABASE_URL || process.env.POSTGRES_URL)?.includes('localhost') ? false : { rejectUnauthorized: false }
  });
  
  await client.connect();
  const res = await client.query('SELECT id, email, role, roles, is_onboarded FROM users WHERE email = $1', [TEST_EMAIL]);
  console.log('User:', res.rows[0]);
  await client.end();
}

checkUserRole().catch(console.error);

