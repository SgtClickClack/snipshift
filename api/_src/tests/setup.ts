import { afterAll } from 'vitest';
import { closeDatabase } from '../db/connection.js';

const TEST_DB_URL = 'postgresql://postgres:test@localhost:5433/hospogo_test';

// CRITICAL: Set environment variables at the top level
process.env.DATABASE_URL = TEST_DB_URL;
process.env.POSTGRES_URL = TEST_DB_URL;
process.env.NODE_ENV = 'test';

afterAll(async () => {
  // Close connection after tests in this file finish
  await closeDatabase();
});
