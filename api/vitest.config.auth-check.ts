import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest config for auth-check test only
 * This test doesn't need a database, so we skip globalSetup
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['_src/tests/authCheck.test.ts'],
    // Skip globalSetup - auth-check test doesn't need database
    setupFiles: ['./_src/tests/setup.ts'],
    testTimeout: 15000,
    alias: {
      '@': path.resolve(__dirname, './_src'),
    },
  },
});
