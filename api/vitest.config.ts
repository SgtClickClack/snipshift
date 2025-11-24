import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['_src/tests/**/*.test.ts'],
    alias: {
      // Ensure we resolve source files
      '@': path.resolve(__dirname, './_src'),
    },
  },
});

