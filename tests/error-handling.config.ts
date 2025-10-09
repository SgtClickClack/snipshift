import { defineConfig, devices } from '@playwright/test';

/**
 * Error Handling & Unhappy Paths Test Configuration
 * Specialized configuration for comprehensive error scenario testing
 */

const disableWebServerInCI = !!process.env.CI || process.env.PW_NO_SERVER === '1';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run error tests sequentially to avoid conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 1, // More retries for error scenarios
  workers: process.env.CI ? 1 : 2, // Limited workers for stability
  reporter: [
    ['html', { outputFolder: 'playwright-report-error-handling' }],
    ['json', { outputFile: 'test-results-error-handling.json' }],
    ['junit', { outputFile: 'test-results-error-handling.xml' }]
  ],
  timeout: 60000, // Longer timeout for error scenarios
  expect: {
    timeout: 10000, // Longer expect timeout
  },
  use: {
    baseURL: 'http://localhost:5000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Slower actions for error testing
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'error-handling-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Additional Chrome flags for error testing
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ]
        }
      },
      testMatch: [
        '**/error-handling-unhappy-paths.spec.ts',
        '**/edge-cases-boundary-conditions.spec.ts',
        '**/accessibility-usability-errors.spec.ts'
      ],
    },
    {
      name: 'error-handling-firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefox-specific settings
        launchOptions: {
          firefoxUserPrefs: {
            'dom.disable_beforeunload': false,
            'dom.disable_window_move_resize': false,
            'dom.disable_window_flip': false,
            'dom.disable_window_open_feature.close': false,
            'dom.disable_window_open_feature.menubar': false,
            'dom.disable_window_open_feature.minimizable': false,
            'dom.disable_window_open_feature.personalbar': false,
            'dom.disable_window_open_feature.resizable': false,
            'dom.disable_window_open_feature.scrollbars': false,
            'dom.disable_window_open_feature.status': false,
            'dom.disable_window_open_feature.titlebar': false,
            'dom.disable_window_open_feature.toolbar': false,
          }
        }
      },
      testMatch: [
        '**/error-handling-unhappy-paths.spec.ts',
        '**/edge-cases-boundary-conditions.spec.ts'
      ],
    },
    {
      name: 'error-handling-webkit',
      use: { 
        ...devices['Desktop Safari'],
        // Safari-specific settings
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ]
        }
      },
      testMatch: [
        '**/error-handling-unhappy-paths.spec.ts'
      ],
    },
    {
      name: 'error-handling-mobile',
      use: { 
        ...devices['iPhone 12'],
        // Mobile-specific settings
        isMobile: true,
        hasTouch: true,
      },
      testMatch: [
        '**/accessibility-usability-errors.spec.ts'
      ],
    },
    {
      name: 'error-handling-tablet',
      use: { 
        ...devices['iPad Pro'],
        // Tablet-specific settings
        isMobile: true,
        hasTouch: true,
      },
      testMatch: [
        '**/accessibility-usability-errors.spec.ts'
      ],
    }
  ],
  // Web server configuration
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
          // Error testing specific environment variables
          ERROR_TESTING_MODE: '1',
          MOCK_ERROR_RESPONSES: '1',
          SLOW_API_RESPONSES: '1',
        },
      },
  // Global setup and teardown
  globalSetup: require.resolve('./utils/global-setup.ts'),
  globalTeardown: require.resolve('./utils/global-teardown.ts'),
});
