import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables - prioritize local .env file (don't override if already set)
const localEnv = dotenv.config({ path: path.resolve(process.cwd(), '.env') });
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
}

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found. Make sure to set it before running migrations.');
  process.exit(1);
}

if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
  console.error('❌ Invalid DATABASE_URL format. Must start with postgresql:// or postgres://');
  process.exit(1);
}

console.log('📋 Using DATABASE_URL:', databaseUrl.substring(0, 30) + '...');

export default {
  schema: './_src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;

