import { defineConfig } from '@playwright/test';

/**
 * Playwright config for frontend/e2e specs (e.g. onboarding-flow.spec.ts).
 * Uses same global setup and storageState as main config; only testDir differs.
 */
const baseURL = process.env.E2E_AUTH_MODE === 'production' ? 'https://hospogo.com' : 'http://localhost:3000';

export default defineConfig({
  testDir: './frontend/e2e',
  globalSetup: process.env.E2E_AUTH_MODE === 'production' ? undefined : './tests/auth.setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  maxFailures: 1,
  reporter: 'html',
  use: {
    baseURL,
    storageState: process.env.E2E_AUTH_MODE === 'production' ? 'playwright/.auth/user.json' : './tests/storageState.json',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  expect: { timeout: 5000 },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer:
    process.env.E2E_AUTH_MODE === 'production'
      ? undefined
      : {
          command: 'npm run dev:all',
          url: 'http://localhost:3000',
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
          stdout: 'pipe',
          stderr: 'pipe',
          env: { VITE_E2E: '1', NODE_ENV: 'test' },
        },
});
