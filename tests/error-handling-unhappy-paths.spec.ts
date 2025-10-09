import { test, expect } from '@playwright/test';

test.describe('Error Handling & Unhappy Paths', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('Network Connectivity & API Failures', () => {
    test('Application handles network disconnection gracefully', async ({ page }) => {
      // Navigate to a page that requires API calls
      await page.goto('/professional/dashboard');
      
      // Simulate network disconnection
      await page.route('**/api/**', route => route.abort('internetdisconnected'));
      
      // Try to perform an action that requires API call
      await page.click('[data-testid="load-jobs-button"]');
      
      // Should show network error message
      await expect(page.locator('[data-testid="network-error-message"]')).toContainText('Network connection lost');
      
      // Should show retry option
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('Application handles API server errors (500)', async ({ page }) => {
      // Mock 500 server error
      await page.route('**/api/auth/login', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal Server Error',
            message: 'Something went wrong on our end'
          })
        });
      });
      
      // Try to login
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Should show server error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Server error occurred');
      
      // Should provide helpful message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Please try again later');
    });

    test('Application handles API timeout scenarios', async ({ page }) => {
      // Mock API timeout
      await page.route('**/api/jobs', async route => {
        // Simulate slow response that times out
        await new Promise(resolve => setTimeout(resolve, 10000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      });
      
      // Navigate to jobs page
      await page.goto('/professional/jobs');
      
      // Should show loading state initially
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      
      // Should show timeout message after reasonable time
      await expect(page.locator('[data-testid="timeout-message"]')).toBeVisible({ timeout: 8000 });
      await expect(page.locator('[data-testid="timeout-message"]')).toContainText('Request timed out');
    });

    test('Application handles rate limiting (429)', async ({ page }) => {
      // Mock rate limiting response
      await page.route('**/api/jobs/search', async route => {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded',
            retryAfter: 60
          })
        });
      });
      
      // Try to search for jobs multiple times quickly
      await page.goto('/professional/jobs');
      await page.fill('[data-testid="job-search-input"]', 'barber');
      await page.click('[data-testid="search-button"]');
      
      // Should show rate limit message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Too many requests');
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Please wait 60 seconds');
    });
  });

  test.describe('Form Validation & Input Errors', () => {
    test('Registration form shows validation errors for invalid email', async ({ page }) => {
      await page.goto('/signup');
      
      // Enter invalid email
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.fill('[data-testid="confirm-password-input"]', 'password123');
      await page.fill('[data-testid="name-input"]', 'Test User');
      
      // Try to submit
      await page.click('[data-testid="register-button"]');
      
      // Should show email validation error
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Please enter a valid email address');
      
      // Should stay on signup page
      await expect(page).toHaveURL('/signup');
    });

    test('Registration form shows validation errors for weak password', async ({ page }) => {
      await page.goto('/signup');
      
      // Enter weak password
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', '123');
      await page.fill('[data-testid="confirm-password-input"]', '123');
      await page.fill('[data-testid="name-input"]', 'Test User');
      
      // Try to submit
      await page.click('[data-testid="register-button"]');
      
      // Should show password validation error
      await expect(page.locator('[data-testid="password-error"]')).toContainText('Password must be at least 8 characters');
      
      // Should stay on signup page
      await expect(page).toHaveURL('/signup');
    });

    test('Registration form shows validation errors for password mismatch', async ({ page }) => {
      await page.goto('/signup');
      
      // Enter mismatched passwords
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.fill('[data-testid="confirm-password-input"]', 'differentpassword');
      await page.fill('[data-testid="name-input"]', 'Test User');
      
      // Try to submit
      await page.click('[data-testid="register-button"]');
      
      // Should show password mismatch error
      await expect(page.locator('[data-testid="confirm-password-error"]')).toContainText('Passwords do not match');
      
      // Should stay on signup page
      await expect(page).toHaveURL('/signup');
    });

    test('Job posting form shows validation errors for required fields', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'hub@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Navigate to job posting
      await page.goto('/hub/post-job');
      
      // Try to submit empty form
      await page.click('[data-testid="submit-job-button"]');
      
      // Should show validation errors for required fields
      await expect(page.locator('[data-testid="title-error"]')).toContainText('Job title is required');
      await expect(page.locator('[data-testid="description-error"]')).toContainText('Job description is required');
      await expect(page.locator('[data-testid="pay-error"]')).toContainText('Pay rate is required');
      
      // Should stay on job posting page
      await expect(page).toHaveURL('/hub/post-job');
    });

    test('Form handles extremely long input gracefully', async ({ page }) => {
      await page.goto('/signup');
      
      // Enter extremely long name
      const longName = 'A'.repeat(1000);
      await page.fill('[data-testid="name-input"]', longName);
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.fill('[data-testid="confirm-password-input"]', 'password123');
      
      // Try to submit
      await page.click('[data-testid="register-button"]');
      
      // Should show validation error for name length
      await expect(page.locator('[data-testid="name-error"]')).toContainText('Name must be less than 100 characters');
    });
  });

  test.describe('Authentication & Authorization Errors', () => {
    test('Application handles invalid JWT tokens', async ({ page }) => {
      // Set invalid token in localStorage
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('authToken', 'invalid-jwt-token');
      });
      
      // Try to access protected route
      await page.goto('/professional/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL('/login');
      
      // Should show token error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid session');
    });

    test('Application handles expired JWT tokens', async ({ page }) => {
      // Set expired token in localStorage
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('authToken', 'expired-jwt-token');
      });
      
      // Mock API response for expired token
      await page.route('**/api/auth/verify', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Token Expired',
            message: 'Your session has expired'
          })
        });
      });
      
      // Try to access protected route
      await page.goto('/professional/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL('/login');
      
      // Should show session expired message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Session expired');
    });

    test('Application prevents unauthorized access to admin routes', async ({ page }) => {
      // Login as regular user
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'professional@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Try to access admin route
      await page.goto('/admin/users');
      
      // Should redirect to unauthorized page or dashboard
      await expect(page).toHaveURL(/\/professional\/dashboard|\/unauthorized/);
      
      // Should show unauthorized message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Access denied');
    });

    test('Application handles role-based access control errors', async ({ page }) => {
      // Login as professional
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'professional@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Try to access hub-specific route
      await page.goto('/hub/dashboard');
      
      // Should redirect to appropriate dashboard
      await expect(page).toHaveURL('/professional/dashboard');
      
      // Should show role access error
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Insufficient permissions');
    });
  });

  test.describe('File Upload Errors', () => {
    test('Application handles file upload size limit exceeded', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'professional@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Navigate to profile page
      await page.goto('/professional/profile');
      
      // Create a large file (simulate)
      const largeFile = new File(['x'.repeat(10 * 1024 * 1024)], 'large-file.jpg', { type: 'image/jpeg' });
      
      // Try to upload large file
      const fileInput = page.locator('[data-testid="profile-photo-input"]');
      await fileInput.setInputFiles([largeFile]);
      
      // Should show file size error
      await expect(page.locator('[data-testid="file-upload-error"]')).toContainText('File size exceeds 5MB limit');
    });

    test('Application handles invalid file type uploads', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'professional@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Navigate to profile page
      await page.goto('/professional/profile');
      
      // Try to upload invalid file type
      const invalidFile = new File(['content'], 'document.exe', { type: 'application/x-executable' });
      
      const fileInput = page.locator('[data-testid="profile-photo-input"]');
      await fileInput.setInputFiles([invalidFile]);
      
      // Should show file type error
      await expect(page.locator('[data-testid="file-upload-error"]')).toContainText('Invalid file type');
      await expect(page.locator('[data-testid="file-upload-error"]')).toContainText('Please upload an image file');
    });

    test('Application handles file upload network failures', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'professional@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Navigate to profile page
      await page.goto('/professional/profile');
      
      // Mock file upload failure
      await page.route('**/api/upload/profile-photo', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Upload Failed',
            message: 'File upload service unavailable'
          })
        });
      });
      
      // Try to upload file
      const validFile = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
      const fileInput = page.locator('[data-testid="profile-photo-input"]');
      await fileInput.setInputFiles([validFile]);
      
      // Should show upload error
      await expect(page.locator('[data-testid="file-upload-error"]')).toContainText('Upload failed');
      await expect(page.locator('[data-testid="retry-upload-button"]')).toBeVisible();
    });

    test('Application handles corrupted file uploads', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'professional@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Navigate to profile page
      await page.goto('/professional/profile');
      
      // Mock corrupted file response
      await page.route('**/api/upload/profile-photo', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Corrupted File',
            message: 'The uploaded file appears to be corrupted'
          })
        });
      });
      
      // Try to upload file
      const corruptedFile = new File(['corrupted content'], 'photo.jpg', { type: 'image/jpeg' });
      const fileInput = page.locator('[data-testid="profile-photo-input"]');
      await fileInput.setInputFiles([corruptedFile]);
      
      // Should show corruption error
      await expect(page.locator('[data-testid="file-upload-error"]')).toContainText('File appears to be corrupted');
    });
  });

  test.describe('Session Management Errors', () => {
    test('Application handles concurrent session conflicts', async ({ page, context }) => {
      // Login in first browser
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Create second browser context (simulating different device)
      const secondContext = await context.browser()?.newContext();
      const secondPage = await secondContext?.newPage();
      
      if (secondPage) {
        // Login in second browser
        await secondPage.goto('/login');
        await secondPage.fill('[data-testid="email-input"]', 'test@example.com');
        await secondPage.fill('[data-testid="password-input"]', 'password123');
        await secondPage.click('[data-testid="login-button"]');
        
        // Try to use first browser after second login
        await page.reload();
        
        // Should show session conflict message
        await expect(page.locator('[data-testid="session-conflict-message"]')).toContainText('Session conflict detected');
        await expect(page.locator('[data-testid="session-conflict-message"]')).toContainText('Please log in again');
        
        await secondContext?.close();
      }
    });

    test('Application handles session storage corruption', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Corrupt session storage
      await page.evaluate(() => {
        localStorage.setItem('currentUser', 'corrupted-json-data{');
        sessionStorage.setItem('authToken', 'invalid-token');
      });
      
      // Try to access protected route
      await page.goto('/professional/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL('/login');
      
      // Should show session error
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Session data corrupted');
    });

    test('Application handles browser storage quota exceeded', async ({ page }) => {
      // Fill up localStorage to simulate quota exceeded
      await page.goto('/');
      await page.evaluate(() => {
        try {
          // Try to fill up storage
          for (let i = 0; i < 1000; i++) {
            localStorage.setItem(`test-key-${i}`, 'x'.repeat(1000));
          }
        } catch (e) {
          // Quota exceeded
        }
      });
      
      // Try to login
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Should handle storage error gracefully
      await expect(page.locator('[data-testid="storage-error-message"]')).toContainText('Storage limit exceeded');
      await expect(page.locator('[data-testid="clear-storage-button"]')).toBeVisible();
    });
  });

  test.describe('Payment Processing Errors', () => {
    test('Application handles payment method declined', async ({ page }) => {
      // Login as professional
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'professional@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Navigate to subscription page
      await page.goto('/professional/subscription');
      
      // Mock declined payment
      await page.route('**/api/payments/process', async route => {
        await route.fulfill({
          status: 402,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Payment Declined',
            message: 'Your card was declined',
            code: 'card_declined'
          })
        });
      });
      
      // Try to subscribe
      await page.click('[data-testid="subscribe-button"]');
      
      // Should show payment declined error
      await expect(page.locator('[data-testid="payment-error"]')).toContainText('Payment declined');
      await expect(page.locator('[data-testid="payment-error"]')).toContainText('Please try a different payment method');
    });

    test('Application handles insufficient funds error', async ({ page }) => {
      // Login as professional
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'professional@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Navigate to subscription page
      await page.goto('/professional/subscription');
      
      // Mock insufficient funds
      await page.route('**/api/payments/process', async route => {
        await route.fulfill({
          status: 402,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Insufficient Funds',
            message: 'Your account has insufficient funds',
            code: 'insufficient_funds'
          })
        });
      });
      
      // Try to subscribe
      await page.click('[data-testid="subscribe-button"]');
      
      // Should show insufficient funds error
      await expect(page.locator('[data-testid="payment-error"]')).toContainText('Insufficient funds');
      await expect(page.locator('[data-testid="payment-error"]')).toContainText('Please add funds to your account');
    });

    test('Application handles payment processing timeout', async ({ page }) => {
      // Login as professional
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'professional@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Navigate to subscription page
      await page.goto('/professional/subscription');
      
      // Mock payment timeout
      await page.route('**/api/payments/process', async route => {
        // Simulate slow payment processing
        await new Promise(resolve => setTimeout(resolve, 15000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });
      
      // Try to subscribe
      await page.click('[data-testid="subscribe-button"]');
      
      // Should show processing state
      await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible();
      
      // Should show timeout message after reasonable time
      await expect(page.locator('[data-testid="payment-timeout-message"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="payment-timeout-message"]')).toContainText('Payment is taking longer than expected');
    });
  });

  test.describe('Database & Data Errors', () => {
    test('Application handles database connection failures', async ({ page }) => {
      // Mock database connection error
      await page.route('**/api/**', async route => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Database Unavailable',
            message: 'Database connection failed',
            code: 'DB_CONNECTION_ERROR'
          })
        });
      });
      
      // Try to access any page that requires database
      await page.goto('/professional/dashboard');
      
      // Should show database error message
      await expect(page.locator('[data-testid="database-error-message"]')).toContainText('Database temporarily unavailable');
      await expect(page.locator('[data-testid="database-error-message"]')).toContainText('Please try again in a few minutes');
    });

    test('Application handles data corruption gracefully', async ({ page }) => {
      // Mock corrupted data response
      await page.route('**/api/user/profile', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: null,
            email: undefined,
            name: '',
            profile: null
          })
        });
      });
      
      // Login and navigate to profile
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await page.goto('/professional/profile');
      
      // Should show data error message
      await expect(page.locator('[data-testid="data-error-message"]')).toContainText('Profile data unavailable');
      await expect(page.locator('[data-testid="refresh-data-button"]')).toBeVisible();
    });

    test('Application handles missing required data', async ({ page }) => {
      // Mock missing data response
      await page.route('**/api/jobs', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            jobs: [],
            total: 0,
            message: 'No jobs found'
          })
        });
      });
      
      // Login and navigate to jobs
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'professional@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await page.goto('/professional/jobs');
      
      // Should show empty state
      await expect(page.locator('[data-testid="empty-jobs-message"]')).toContainText('No jobs available');
      await expect(page.locator('[data-testid="empty-jobs-message"]')).toContainText('Check back later for new opportunities');
    });
  });

  test.describe('Browser & Environment Errors', () => {
    test('Application handles JavaScript disabled gracefully', async ({ page }) => {
      // Disable JavaScript
      await page.setJavaScriptEnabled(false);
      
      // Navigate to the application
      await page.goto('/');
      
      // Should show no-JS message
      await expect(page.locator('[data-testid="no-js-message"]')).toContainText('JavaScript is required');
      await expect(page.locator('[data-testid="no-js-message"]')).toContainText('Please enable JavaScript to use this application');
    });

    test('Application handles browser compatibility issues', async ({ page }) => {
      // Mock unsupported browser
      await page.addInitScript(() => {
        // Simulate old browser
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)',
          configurable: true
        });
      });
      
      // Navigate to the application
      await page.goto('/');
      
      // Should show browser compatibility message
      await expect(page.locator('[data-testid="browser-compatibility-message"]')).toContainText('Browser not supported');
      await expect(page.locator('[data-testid="browser-compatibility-message"]')).toContainText('Please use a modern browser');
    });

    test('Application handles viewport size limitations', async ({ page }) => {
      // Set very small viewport
      await page.setViewportSize({ width: 200, height: 200 });
      
      // Navigate to the application
      await page.goto('/');
      
      // Should show viewport warning
      await expect(page.locator('[data-testid="viewport-warning"]')).toContainText('Screen size too small');
      await expect(page.locator('[data-testid="viewport-warning"]')).toContainText('Please use a larger screen');
    });

    test('Application handles offline mode gracefully', async ({ page }) => {
      // Go offline
      await page.context().setOffline(true);
      
      // Navigate to the application
      await page.goto('/');
      
      // Should show offline message
      await expect(page.locator('[data-testid="offline-message"]')).toContainText('You are offline');
      await expect(page.locator('[data-testid="offline-message"]')).toContainText('Please check your internet connection');
    });
  });

  test.describe('Error Recovery & User Experience', () => {
    test('Application provides clear error recovery options', async ({ page }) => {
      // Mock API error
      await page.route('**/api/jobs', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Server Error',
            message: 'Something went wrong'
          })
        });
      });
      
      // Navigate to jobs page
      await page.goto('/professional/jobs');
      
      // Should show error with recovery options
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="contact-support-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="go-back-button"]')).toBeVisible();
    });

    test('Application maintains user context during errors', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Mock error on protected route
      await page.route('**/api/user/profile', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Server Error',
            message: 'Profile unavailable'
          })
        });
      });
      
      // Navigate to profile
      await page.goto('/professional/profile');
      
      // Should show error but maintain navigation
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="navigation-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('Application provides helpful error messages with next steps', async ({ page }) => {
      // Mock specific error
      await page.route('**/api/auth/login', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Invalid Credentials',
            message: 'Email or password is incorrect',
            suggestions: [
              'Check your email address',
              'Reset your password if you forgot it',
              'Contact support if you continue having issues'
            ]
          })
        });
      });
      
      // Try to login with wrong credentials
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'wrong@example.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="login-button"]');
      
      // Should show helpful error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Email or password is incorrect');
      await expect(page.locator('[data-testid="error-suggestions"]')).toContainText('Check your email address');
      await expect(page.locator('[data-testid="error-suggestions"]')).toContainText('Reset your password');
      await expect(page.locator('[data-testid="forgot-password-link"]')).toBeVisible();
    });
  });
});
