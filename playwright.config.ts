import { defineConfig, devices } from '@playwright/test';

const disableWebServerInCI = !!process.env.CI || process.env.PW_NO_SERVER === '1';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 60000, // Increase global timeout to 60 seconds
  expect: {
    timeout: 10000, // Increase expect timeout to 10 seconds
  },
  use: {
    baseURL: 'http://localhost:5000',
    trace: 'on-first-retry',
    actionTimeout: 10000, // Increase action timeout
    navigationTimeout: 30000, // Increase navigation timeout
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  // In CI we start the server in the workflow and reuse it; disable Playwright webServer there
  webServer: disableWebServerInCI
    ? undefined
    : {
        command: 'node test-server.js',
        url: 'http://localhost:5000',
        reuseExistingServer: true,
        timeout: 180000,
        env: {
          E2E_TEST: '1',
          E2E_TEST_KEY: 'test',
          VITE_E2E: '1',
        },
      },
});