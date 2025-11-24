import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['_src/tests/**/*.test.ts'],
    setupFiles: ['./_src/tests/setup.ts'],
    globalSetup: ['./_src/tests/globalSetup.ts'], // Run migration once
    testTimeout: 15000, 
    hookTimeout: 30000, 
    alias: {
      '@': path.resolve(__dirname, './_src'),
    },
    fileParallelism: false,
  },
});
