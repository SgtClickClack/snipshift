import { test, expect, Page } from '@playwright/test';

test.describe('Error Handling & Unhappy Paths', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a user
    await page.goto('/');
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.click('[data-testid="login-button"]');
  });

  test.describe('Network Error Handling', () => {
    test('should handle network timeouts', async ({ page }) => {
      // Simulate network timeout
      await page.route('**/api/**', route => {
        setTimeout(() => route.abort(), 100);
      });

      await page.goto('/jobs');
      
      // Wait for error to appear or page to load normally
      await page.waitForSelector('[data-testid="error-message"], [data-testid="job-card"], .text-center:has-text("No jobs found")', { timeout: 10000 });
      
      const errorMessage = page.locator('[data-testid="error-message"]');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toContainText(/Network|timeout|error/i);
        await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      }
    });

    test('should handle server errors (500)', async ({ page }) => {
      // Mock 500 server error
      await page.route('**/api/jobs', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });

      await page.goto('/jobs');
      
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Server error');
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('should handle service unavailable (503)', async ({ page }) => {
      // Mock 503 service unavailable
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Service Unavailable' })
        });
      });

      await page.goto('/community');
      
      await expect(page.locator('[data-testid="maintenance-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="maintenance-message"]')).toContainText('Service temporarily unavailable');
    });

    test('should handle rate limiting (429)', async ({ page }) => {
      // Mock 429 rate limit error
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Rate limit exceeded',
            retryAfter: 60
          })
        });
      });

      await page.goto('/jobs');
      
      await expect(page.locator('[data-testid="rate-limit-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="rate-limit-message"]')).toContainText('Too many requests');
      await expect(page.locator('[data-testid="retry-after-timer"]')).toBeVisible();
    });

    test('should handle connection refused', async ({ page }) => {
      // Simulate connection refused
      await page.route('**/api/**', route => {
        route.abort('connectionrefused');
      });

      await page.goto('/messages');
      
      await expect(page.locator('[data-testid="connection-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-error"]')).toContainText('Connection failed');
      await expect(page.locator('[data-testid="offline-mode"]')).toBeVisible();
    });
  });

  test.describe('Authentication Errors', () => {
    test('should handle invalid credentials', async ({ page }) => {
      await page.goto('/');
      await page.click('text=Login');
      
      await page.fill('[data-testid="email-input"]', 'invalid@example.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="login-button"]');
      
      await expect(page.locator('[data-testid="auth-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="auth-error"]')).toContainText('Invalid email or password');
    });

    test('should handle expired session', async ({ page }) => {
      // Login first
      await page.goto('/');
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="login-button"]');
      
      // Simulate session expiration
      await page.evaluate(() => {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('user');
      });
      
      // Try to access protected page
      await page.goto('/dashboard');
      
      await expect(page).toHaveURL('/login');
      await expect(page.locator('[data-testid="session-expired"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-expired"]')).toContainText('Session expired');
    });

    test('should handle unauthorized access', async ({ page }) => {
      // Try to access admin page without admin role
      await page.goto('/admin');
      
      await expect(page.locator('[data-testid="unauthorized-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="unauthorized-error"]')).toContainText('Access denied');
      await expect(page.locator('[data-testid="contact-admin"]')).toBeVisible();
    });

    test('should handle account locked', async ({ page }) => {
      await page.goto('/');
      await page.click('text=Login');
      
      // Mock account locked response
      await page.route('**/api/auth/login', route => {
        route.fulfill({
          status: 423,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Account locked due to too many failed attempts' })
        });
      });
      
      await page.fill('[data-testid="email-input"]', 'locked@example.com');
      await page.fill('[data-testid="password-input"]', 'password');
      await page.click('[data-testid="login-button"]');
      
      await expect(page.locator('[data-testid="account-locked"]')).toBeVisible();
      await expect(page.locator('[data-testid="account-locked"]')).toContainText('Account locked');
      await expect(page.locator('[data-testid="unlock-instructions"]')).toBeVisible();
    });
  });

  test.describe('Form Validation Errors', () => {
    test('should handle required field validation', async ({ page }) => {
      await page.goto('/signup');
      
      // Try to submit empty form
      await page.click('[data-testid="register-button"]');
      
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required');
      await expect(page.locator('[data-testid="password-error"]')).toContainText('Password is required');
      await expect(page.locator('[data-testid="first-name-error"]')).toContainText('First name is required');
    });

    test('should handle email format validation', async ({ page }) => {
      await page.goto('/signup');
      
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.fill('[data-testid="first-name-input"]', 'John');
      await page.fill('[data-testid="last-name-input"]', 'Doe');
      await page.click('[data-testid="register-button"]');
      
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Please enter a valid email');
    });

    test('should handle password strength validation', async ({ page }) => {
      await page.goto('/signup');
      
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'weak');
      await page.fill('[data-testid="first-name-input"]', 'John');
      await page.fill('[data-testid="last-name-input"]', 'Doe');
      await page.click('[data-testid="register-button"]');
      
      await expect(page.locator('[data-testid="password-error"]')).toContainText('Password must be at least 8 characters');
    });

    test('should handle file upload errors', async ({ page }) => {
      await page.goto('/profile');
      
      // Try to upload invalid file type
      const fileInput = page.locator('[data-testid="profile-picture-input"]');
      await fileInput.setInputFiles({
        name: 'document.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('not an image')
      });
      
      await expect(page.locator('[data-testid="file-upload-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-upload-error"]')).toContainText('Please upload an image file');
    });

    test('should handle file size limit errors', async ({ page }) => {
      await page.goto('/profile');
      
      // Create large file (simulate)
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      const fileInput = page.locator('[data-testid="profile-picture-input"]');
      await fileInput.setInputFiles({
        name: 'large-image.jpg',
        mimeType: 'image/jpeg',
        buffer: largeBuffer
      });
      
      await expect(page.locator('[data-testid="file-size-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-size-error"]')).toContainText('File size must be less than 5MB');
    });
  });

  test.describe('Data Loading Errors', () => {
    test('should handle empty data states', async ({ page }) => {
      // Mock empty response
      await page.route('**/api/jobs', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ jobs: [] })
        });
      });

      await page.goto('/jobs');
      
      await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="empty-state"]')).toContainText('No jobs found');
      await expect(page.locator('[data-testid="suggest-action"]')).toBeVisible();
    });

    test('should handle malformed data responses', async ({ page }) => {
      // Mock malformed JSON response
      await page.route('**/api/jobs', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json'
        });
      });

      await page.goto('/jobs');
      
      await expect(page.locator('[data-testid="data-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="data-error"]')).toContainText('Data format error');
    });

    test('should handle partial data loading failures', async ({ page }) => {
      // Mock partial failure
      await page.route('**/api/jobs', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            jobs: [{ id: 1, title: 'Job 1' }],
            error: 'Some data could not be loaded'
          })
        });
      });

      await page.goto('/jobs');
      
      await expect(page.locator('[data-testid="partial-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="partial-error"]')).toContainText('Some data could not be loaded');
      await expect(page.locator('[data-testid="job-card"]')).toHaveCount(1);
    });
  });

  test.describe('Payment & Transaction Errors', () => {
    test('should handle payment failures', async ({ page }) => {
      await page.goto('/training');
      await page.click('[data-testid="course-card"]').first();
      await page.click('[data-testid="purchase-button"]');
      
      // Mock payment failure
      await page.route('**/api/payments/process', route => {
        route.fulfill({
          status: 402,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Payment failed' })
        });
      });
      
      await page.click('[data-testid="proceed-payment"]');
      await page.fill('[data-testid="card-number"]', '4000000000000002'); // Card that will be declined
      await page.fill('[data-testid="expiry-date"]', '12/25');
      await page.fill('[data-testid="cvv"]', '123');
      await page.click('[data-testid="complete-payment"]');
      
      await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-error"]')).toContainText('Payment failed');
      await expect(page.locator('[data-testid="try-again-button"]')).toBeVisible();
    });

    test('should handle insufficient funds', async ({ page }) => {
      await page.goto('/training');
      await page.click('[data-testid="course-card"]').first();
      await page.click('[data-testid="purchase-button"]');
      
      // Mock insufficient funds
      await page.route('**/api/payments/process', route => {
        route.fulfill({
          status: 402,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Insufficient funds' })
        });
      });
      
      await page.click('[data-testid="proceed-payment"]');
      await page.fill('[data-testid="card-number"]', '4000000000009995');
      await page.fill('[data-testid="expiry-date"]', '12/25');
      await page.fill('[data-testid="cvv"]', '123');
      await page.click('[data-testid="complete-payment"]');
      
      await expect(page.locator('[data-testid="insufficient-funds"]')).toBeVisible();
      await expect(page.locator('[data-testid="insufficient-funds"]')).toContainText('Insufficient funds');
      await expect(page.locator('[data-testid="update-payment-method"]')).toBeVisible();
    });

    test('should handle expired payment methods', async ({ page }) => {
      await page.goto('/payments');
      
      // Mock expired card
      await page.route('**/api/payments/methods', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            methods: [{
              id: 1,
              type: 'card',
              last4: '4242',
              expired: true
            }]
          })
        });
      });
      
      await expect(page.locator('[data-testid="expired-card-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="expired-card-warning"]')).toContainText('Card expired');
      await expect(page.locator('[data-testid="update-card"]')).toBeVisible();
    });
  });

  test.describe('Resource Not Found Errors', () => {
    test('should handle 404 page not found', async ({ page }) => {
      await page.goto('/non-existent-page');
      
      await expect(page.locator('[data-testid="404-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="404-error"]')).toContainText('Page not found');
      await expect(page.locator('[data-testid="go-home-button"]')).toBeVisible();
    });

    test('should handle job not found', async ({ page }) => {
      // Mock job not found
      await page.route('**/api/jobs/999', route => {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Job not found' })
        });
      });

      await page.goto('/jobs/999');
      
      await expect(page.locator('[data-testid="job-not-found"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-not-found"]')).toContainText('Job not found');
      await expect(page.locator('[data-testid="browse-other-jobs"]')).toBeVisible();
    });

    test('should handle user profile not found', async ({ page }) => {
      // Mock user not found
      await page.route('**/api/users/non-existent', route => {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'User not found' })
        });
      });

      await page.goto('/profile/non-existent');
      
      await expect(page.locator('[data-testid="user-not-found"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-not-found"]')).toContainText('User not found');
    });
  });

  test.describe('Concurrent Access Errors', () => {
    test('should handle concurrent modifications', async ({ page }) => {
      await page.goto('/profile');
      
      // Simulate concurrent modification
      await page.route('**/api/profile/update', route => {
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Profile was modified by another user' })
        });
      });
      
      await page.fill('[data-testid="first-name-input"]', 'Updated Name');
      await page.click('[data-testid="save-profile-button"]');
      
      await expect(page.locator('[data-testid="concurrent-modification"]')).toBeVisible();
      await expect(page.locator('[data-testid="concurrent-modification"]')).toContainText('Profile was modified');
      await expect(page.locator('[data-testid="reload-profile"]')).toBeVisible();
    });

    test('should handle resource conflicts', async ({ page }) => {
      await page.goto('/jobs');
      await page.click('[data-testid="job-card"]').first();
      await page.click('[data-testid="apply-button"]');
      
      // Mock resource conflict
      await page.route('**/api/jobs/apply', route => {
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Job application conflict' })
        });
      });
      
      await page.click('[data-testid="submit-application"]');
      
      await expect(page.locator('[data-testid="application-conflict"]')).toBeVisible();
      await expect(page.locator('[data-testid="application-conflict"]')).toContainText('Application conflict');
    });
  });

  test.describe('System Maintenance Errors', () => {
    test('should handle system maintenance mode', async ({ page }) => {
      // Mock maintenance mode
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'System maintenance',
            maintenanceEnd: '2024-01-01T12:00:00Z'
          })
        });
      });

      await page.goto('/jobs');
      
      await expect(page.locator('[data-testid="maintenance-mode"]')).toBeVisible();
      await expect(page.locator('[data-testid="maintenance-mode"]')).toContainText('System maintenance');
      await expect(page.locator('[data-testid="maintenance-timer"]')).toBeVisible();
    });

    test('should handle database connection errors', async ({ page }) => {
      // Mock database error
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Database connection failed' })
        });
      });

      await page.goto('/community');
      
      await expect(page.locator('[data-testid="database-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="database-error"]')).toContainText('Database error');
      await expect(page.locator('[data-testid="contact-support"]')).toBeVisible();
    });
  });

  test.describe('Error Recovery & Retry', () => {
    test('should provide retry mechanisms', async ({ page }) => {
      // Mock initial failure
      await page.route('**/api/jobs', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' })
        });
      });

      await page.goto('/jobs');
      
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      
      // Mock successful retry
      await page.route('**/api/jobs', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ jobs: [{ id: 1, title: 'Test Job' }] })
        });
      });
      
      await page.click('[data-testid="retry-button"]');
      
      await expect(page.locator('[data-testid="job-card"]')).toHaveCount(1);
    });

    test('should implement exponential backoff', async ({ page }) => {
      let attemptCount = 0;
      
      await page.route('**/api/jobs', route => {
        attemptCount++;
        if (attemptCount < 3) {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Server error' })
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ jobs: [] })
          });
        }
      });

      await page.goto('/jobs');
      
      // Should show retry with backoff
      await expect(page.locator('[data-testid="retry-with-backoff"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-countdown"]')).toBeVisible();
    });

    test('should provide fallback content', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/jobs', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' })
        });
      });

      await page.goto('/jobs');
      
      await expect(page.locator('[data-testid="fallback-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="fallback-content"]')).toContainText('Popular jobs');
      await expect(page.locator('[data-testid="cached-jobs"]')).toBeVisible();
    });
  });

  test.describe('Error Logging & Reporting', () => {
    test('should log errors for debugging', async ({ page }) => {
      const errors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // Trigger an error
      await page.route('**/api/jobs', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' })
        });
      });

      await page.goto('/jobs');
      
      // Check if error was logged
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('Server error'))).toBeTruthy();
    });

    test('should provide error reporting to users', async ({ page }) => {
      await page.route('**/api/jobs', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' })
        });
      });

      await page.goto('/jobs');
      
      await expect(page.locator('[data-testid="report-error"]')).toBeVisible();
      await page.click('[data-testid="report-error"]');
      
      await expect(page.locator('[data-testid="error-report-form"]')).toBeVisible();
      await page.fill('[data-testid="error-description"]', 'Jobs page not loading');
      await page.click('[data-testid="submit-error-report"]');
      
      await expect(page.locator('text=Error report submitted')).toBeVisible();
    });
  });
});
