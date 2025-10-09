import { Page, Route } from '@playwright/test';

/**
 * Error handling test utilities for SnipShift E2E tests
 * Provides common error scenarios and mock responses
 */

export interface ErrorResponse {
  status: number;
  error: string;
  message: string;
  code?: string;
  retryAfter?: number;
  suggestions?: string[];
}

export interface MockErrorConfig {
  url: string;
  error: ErrorResponse;
  delay?: number;
}

/**
 * Common error responses for testing
 */
export const ERROR_RESPONSES = {
  NETWORK_DISCONNECTED: {
    status: 0,
    error: 'Network Error',
    message: 'Network connection lost'
  },
  SERVER_ERROR: {
    status: 500,
    error: 'Internal Server Error',
    message: 'Something went wrong on our end'
  },
  UNAUTHORIZED: {
    status: 401,
    error: 'Unauthorized',
    message: 'Invalid credentials',
    suggestions: [
      'Check your email address',
      'Reset your password if you forgot it',
      'Contact support if you continue having issues'
    ]
  },
  FORBIDDEN: {
    status: 403,
    error: 'Forbidden',
    message: 'Access denied',
    code: 'INSUFFICIENT_PERMISSIONS'
  },
  NOT_FOUND: {
    status: 404,
    error: 'Not Found',
    message: 'Resource not found'
  },
  RATE_LIMITED: {
    status: 429,
    error: 'Too Many Requests',
    message: 'Rate limit exceeded',
    retryAfter: 60
  },
  PAYMENT_DECLINED: {
    status: 402,
    error: 'Payment Declined',
    message: 'Your card was declined',
    code: 'card_declined'
  },
  INSUFFICIENT_FUNDS: {
    status: 402,
    error: 'Insufficient Funds',
    message: 'Your account has insufficient funds',
    code: 'insufficient_funds'
  },
  DATABASE_ERROR: {
    status: 503,
    error: 'Database Unavailable',
    message: 'Database connection failed',
    code: 'DB_CONNECTION_ERROR'
  },
  FILE_TOO_LARGE: {
    status: 413,
    error: 'File Too Large',
    message: 'File size exceeds limit',
    code: 'FILE_SIZE_EXCEEDED'
  },
  INVALID_FILE_TYPE: {
    status: 400,
    error: 'Invalid File Type',
    message: 'File type not allowed',
    code: 'INVALID_FILE_TYPE'
  },
  CORRUPTED_FILE: {
    status: 400,
    error: 'Corrupted File',
    message: 'The uploaded file appears to be corrupted'
  },
  SESSION_EXPIRED: {
    status: 401,
    error: 'Token Expired',
    message: 'Your session has expired'
  },
  SESSION_CONFLICT: {
    status: 409,
    error: 'Session Conflict',
    message: 'Another session is active'
  }
} as const;

/**
 * Mock API error responses for testing
 */
export class ErrorTestHelpers {
  /**
   * Mock a network disconnection error
   */
  static mockNetworkDisconnection(page: Page, url: string) {
    return page.route(url, route => route.abort('internetdisconnected'));
  }

  /**
   * Mock a server error response
   */
  static mockServerError(page: Page, url: string, error: ErrorResponse = ERROR_RESPONSES.SERVER_ERROR) {
    return page.route(url, async route => {
      await route.fulfill({
        status: error.status,
        contentType: 'application/json',
        body: JSON.stringify(error)
      });
    });
  }

  /**
   * Mock a timeout error by delaying response
   */
  static mockTimeout(page: Page, url: string, delay: number = 10000) {
    return page.route(url, async route => {
      await new Promise(resolve => setTimeout(resolve, delay));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
  }

  /**
   * Mock multiple error scenarios for different endpoints
   */
  static mockMultipleErrors(page: Page, configs: MockErrorConfig[]) {
    const routes: Route[] = [];
    
    configs.forEach(config => {
      const route = page.route(config.url, async route => {
        if (config.delay) {
          await new Promise(resolve => setTimeout(resolve, config.delay));
        }
        await route.fulfill({
          status: config.error.status,
          contentType: 'application/json',
          body: JSON.stringify(config.error)
        });
      });
      routes.push(route);
    });
    
    return routes;
  }

  /**
   * Mock file upload errors
   */
  static mockFileUploadError(page: Page, url: string, errorType: 'size' | 'type' | 'corrupted' | 'network') {
    const errors = {
      size: ERROR_RESPONSES.FILE_TOO_LARGE,
      type: ERROR_RESPONSES.INVALID_FILE_TYPE,
      corrupted: ERROR_RESPONSES.CORRUPTED_FILE,
      network: ERROR_RESPONSES.SERVER_ERROR
    };

    return page.route(url, async route => {
      await route.fulfill({
        status: errors[errorType].status,
        contentType: 'application/json',
        body: JSON.stringify(errors[errorType])
      });
    });
  }

  /**
   * Mock authentication errors
   */
  static mockAuthError(page: Page, url: string, errorType: 'unauthorized' | 'expired' | 'conflict') {
    const errors = {
      unauthorized: ERROR_RESPONSES.UNAUTHORIZED,
      expired: ERROR_RESPONSES.SESSION_EXPIRED,
      conflict: ERROR_RESPONSES.SESSION_CONFLICT
    };

    return page.route(url, async route => {
      await route.fulfill({
        status: errors[errorType].status,
        contentType: 'application/json',
        body: JSON.stringify(errors[errorType])
      });
    });
  }

  /**
   * Mock payment processing errors
   */
  static mockPaymentError(page: Page, url: string, errorType: 'declined' | 'insufficient_funds' | 'timeout') {
    const errors = {
      declined: ERROR_RESPONSES.PAYMENT_DECLINED,
      insufficient_funds: ERROR_RESPONSES.INSUFFICIENT_FUNDS,
      timeout: { ...ERROR_RESPONSES.SERVER_ERROR, message: 'Payment processing timeout' }
    };

    return page.route(url, async route => {
      if (errorType === 'timeout') {
        // Simulate timeout by delaying response
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
      
      await route.fulfill({
        status: errors[errorType].status,
        contentType: 'application/json',
        body: JSON.stringify(errors[errorType])
      });
    });
  }

  /**
   * Mock database errors
   */
  static mockDatabaseError(page: Page, url: string) {
    return page.route(url, async route => {
      await route.fulfill({
        status: ERROR_RESPONSES.DATABASE_ERROR.status,
        contentType: 'application/json',
        body: JSON.stringify(ERROR_RESPONSES.DATABASE_ERROR)
      });
    });
  }

  /**
   * Mock rate limiting
   */
  static mockRateLimit(page: Page, url: string, retryAfter: number = 60) {
    return page.route(url, async route => {
      await route.fulfill({
        status: ERROR_RESPONSES.RATE_LIMITED.status,
        contentType: 'application/json',
        body: JSON.stringify({
          ...ERROR_RESPONSES.RATE_LIMITED,
          retryAfter
        })
      });
    });
  }

  /**
   * Create a large file for testing file size limits
   */
  static createLargeFile(sizeInMB: number = 10, filename: string = 'large-file.jpg'): File {
    const content = 'x'.repeat(sizeInMB * 1024 * 1024);
    return new File([content], filename, { type: 'image/jpeg' });
  }

  /**
   * Create an invalid file type for testing
   */
  static createInvalidFile(filename: string = 'document.exe'): File {
    return new File(['content'], filename, { type: 'application/x-executable' });
  }

  /**
   * Corrupt session storage for testing
   */
  static async corruptSessionStorage(page: Page) {
    await page.evaluate(() => {
      localStorage.setItem('currentUser', 'corrupted-json-data{');
      sessionStorage.setItem('authToken', 'invalid-token');
    });
  }

  /**
   * Fill up localStorage to simulate quota exceeded
   */
  static async fillLocalStorage(page: Page) {
    await page.evaluate(() => {
      try {
        for (let i = 0; i < 1000; i++) {
          localStorage.setItem(`test-key-${i}`, 'x'.repeat(1000));
        }
      } catch (e) {
        // Quota exceeded - this is expected
      }
    });
  }

  /**
   * Set invalid JWT token
   */
  static async setInvalidToken(page: Page) {
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'invalid-jwt-token');
    });
  }

  /**
   * Set expired JWT token
   */
  static async setExpiredToken(page: Page) {
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'expired-jwt-token');
    });
  }

  /**
   * Simulate browser compatibility issues
   */
  static async simulateOldBrowser(page: Page) {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)',
        configurable: true
      });
    });
  }

  /**
   * Set very small viewport
   */
  static async setSmallViewport(page: Page, width: number = 200, height: number = 200) {
    await page.setViewportSize({ width, height });
  }

  /**
   * Go offline
   */
  static async goOffline(page: Page) {
    await page.context().setOffline(true);
  }

  /**
   * Disable JavaScript
   */
  static async disableJavaScript(page: Page) {
    await page.setJavaScriptEnabled(false);
  }

  /**
   * Common error message assertions
   */
  static async expectErrorMessage(page: Page, message: string) {
    await expect(page.locator('[data-testid="error-message"]')).toContainText(message);
  }

  static async expectNetworkError(page: Page) {
    await expect(page.locator('[data-testid="network-error-message"]')).toContainText('Network connection lost');
  }

  static async expectServerError(page: Page) {
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Server error occurred');
  }

  static async expectAuthError(page: Page) {
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid session');
  }

  static async expectFileUploadError(page: Page) {
    await expect(page.locator('[data-testid="file-upload-error"]')).toBeVisible();
  }

  static async expectPaymentError(page: Page) {
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
  }

  static async expectDatabaseError(page: Page) {
    await expect(page.locator('[data-testid="database-error-message"]')).toContainText('Database temporarily unavailable');
  }

  /**
   * Common recovery action assertions
   */
  static async expectRetryButton(page: Page) {
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  }

  static async expectContactSupportButton(page: Page) {
    await expect(page.locator('[data-testid="contact-support-button"]')).toBeVisible();
  }

  static async expectGoBackButton(page: Page) {
    await expect(page.locator('[data-testid="go-back-button"]')).toBeVisible();
  }

  static async expectClearStorageButton(page: Page) {
    await expect(page.locator('[data-testid="clear-storage-button"]')).toBeVisible();
  }

  /**
   * Common loading state assertions
   */
  static async expectLoadingState(page: Page) {
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
  }

  static async expectProcessingState(page: Page) {
    await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible();
  }

  /**
   * Common empty state assertions
   */
  static async expectEmptyState(page: Page, message: string) {
    await expect(page.locator('[data-testid="empty-state-message"]')).toContainText(message);
  }

  /**
   * Common success state assertions
   */
  static async expectSuccessMessage(page: Page, message: string) {
    await expect(page.locator('[data-testid="success-message"]')).toContainText(message);
  }
}

/**
 * Test data for error scenarios
 */
export const ERROR_TEST_DATA = {
  INVALID_EMAILS: [
    'invalid-email',
    'test@',
    '@example.com',
    'test..test@example.com',
    'test@example',
    ''
  ],
  WEAK_PASSWORDS: [
    '123',
    'abc',
    'password',
    '12345678',
    'qwerty',
    ''
  ],
  LONG_INPUTS: {
    name: 'A'.repeat(1000),
    description: 'B'.repeat(10000),
    email: 'C'.repeat(500) + '@example.com'
  },
  INVALID_FILE_TYPES: [
    'document.exe',
    'script.bat',
    'malware.scr',
    'virus.com'
  ],
  LARGE_FILES: [
    { size: 10, unit: 'MB' },
    { size: 50, unit: 'MB' },
    { size: 100, unit: 'MB' }
  ]
} as const;

/**
 * Common test scenarios
 */
export const ERROR_SCENARIOS = {
  NETWORK_ISSUES: [
    'disconnection',
    'timeout',
    'slow_connection',
    'intermittent_connection'
  ],
  AUTH_ISSUES: [
    'invalid_credentials',
    'expired_token',
    'missing_token',
    'corrupted_session',
    'session_conflict'
  ],
  FILE_ISSUES: [
    'file_too_large',
    'invalid_file_type',
    'corrupted_file',
    'upload_timeout',
    'storage_quota_exceeded'
  ],
  PAYMENT_ISSUES: [
    'card_declined',
    'insufficient_funds',
    'expired_card',
    'processing_timeout',
    'payment_gateway_error'
  ],
  DATA_ISSUES: [
    'database_unavailable',
    'data_corruption',
    'missing_data',
    'invalid_data_format',
    'concurrent_modification'
  ]
} as const;
