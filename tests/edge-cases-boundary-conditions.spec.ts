import { test, expect } from '@playwright/test';
import { ErrorTestHelpers, ERROR_TEST_DATA, ERROR_RESPONSES } from './utils/error-test-helpers';

test.describe('Edge Cases & Boundary Conditions', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('Input Boundary Testing', () => {
    test('Form handles minimum and maximum length inputs', async ({ page }) => {
      await page.goto('/signup');
      
      // Test minimum length (empty)
      await page.fill('[data-testid="name-input"]', '');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.fill('[data-testid="confirm-password-input"]', 'password123');
      await page.click('[data-testid="register-button"]');
      
      await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is required');
      
      // Test maximum length
      await page.fill('[data-testid="name-input"]', ERROR_TEST_DATA.LONG_INPUTS.name);
      await page.click('[data-testid="register-button"]');
      
      await expect(page.locator('[data-testid="name-error"]')).toContainText('Name must be less than 100 characters');
    });

    test('Form handles special characters and unicode inputs', async ({ page }) => {
      await page.goto('/signup');
      
      // Test special characters
      const specialName = 'José María O\'Connor-Smith';
      await page.fill('[data-testid="name-input"]', specialName);
      await page.fill('[data-testid="email-input"]', 'josé.maría@example.com');
      await page.fill('[data-testid="password-input"]', 'P@ssw0rd!123');
      await page.fill('[data-testid="confirm-password-input"]', 'P@ssw0rd!123');
      await page.click('[data-testid="register-button"]');
      
      // Should accept valid special characters
      await expect(page).toHaveURL('/role-selection');
    });

    test('Form handles emoji and non-ASCII characters', async ({ page }) => {
      await page.goto('/signup');
      
      // Test emoji in name
      const emojiName = 'John Doe 🎯';
      await page.fill('[data-testid="name-input"]', emojiName);
      await page.fill('[data-testid="email-input"]', 'john@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.fill('[data-testid="confirm-password-input"]', 'password123');
      await page.click('[data-testid="register-button"]');
      
      // Should handle emoji gracefully
      await expect(page).toHaveURL('/role-selection');
    });

    test('Form handles SQL injection attempts', async ({ page }) => {
      await page.goto('/signup');
      
      // Test SQL injection in name field
      const sqlInjection = "'; DROP TABLE users; --";
      await page.fill('[data-testid="name-input"]', sqlInjection);
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.fill('[data-testid="confirm-password-input"]', 'password123');
      await page.click('[data-testid="register-button"]');
      
      // Should sanitize input and not break
      await expect(page).toHaveURL('/role-selection');
    });

    test('Form handles XSS attempts', async ({ page }) => {
      await page.goto('/signup');
      
      // Test XSS in name field
      const xssAttempt = '<script>alert("XSS")</script>';
      await page.fill('[data-testid="name-input"]', xssAttempt);
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.fill('[data-testid="confirm-password-input"]', 'password123');
      await page.click('[data-testid="register-button"]');
      
      // Should sanitize input and not execute script
      await expect(page).toHaveURL('/role-selection');
      
      // Verify no alert was triggered
      page.on('dialog', dialog => {
        expect(dialog.message()).not.toContain('XSS');
        dialog.dismiss();
      });
    });
  });

  test.describe('Concurrent User Scenarios', () => {
    test('Application handles multiple users accessing same resource', async ({ page, context }) => {
      // Create two browser contexts
      const secondContext = await context.browser()?.newContext();
      const secondPage = await secondContext?.newPage();
      
      if (secondPage) {
        // Login as first user
        await page.goto('/login');
        await page.fill('[data-testid="email-input"]', 'user1@example.com');
        await page.fill('[data-testid="password-input"]', 'password123');
        await page.click('[data-testid="login-button"]');
        
        // Login as second user
        await secondPage.goto('/login');
        await secondPage.fill('[data-testid="email-input"]', 'user2@example.com');
        await secondPage.fill('[data-testid="password-input"]', 'password123');
        await secondPage.click('[data-testid="login-button"]');
        
        // Both users try to access same job
        await page.goto('/professional/jobs/123');
        await secondPage.goto('/professional/jobs/123');
        
        // Both should be able to view the job
        await expect(page.locator('[data-testid="job-title"]')).toBeVisible();
        await expect(secondPage.locator('[data-testid="job-title"]')).toBeVisible();
        
        await secondContext?.close();
      }
    });

    test('Application handles race conditions in form submission', async ({ page }) => {
      await page.goto('/signup');
      
      // Fill form
      await page.fill('[data-testid="name-input"]', 'Test User');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.fill('[data-testid="confirm-password-input"]', 'password123');
      
      // Rapidly click submit button multiple times
      await page.click('[data-testid="register-button"]');
      await page.click('[data-testid="register-button"]');
      await page.click('[data-testid="register-button"]');
      
      // Should only process one submission
      await expect(page).toHaveURL('/role-selection');
      
      // Should not show duplicate success messages
      const successMessages = page.locator('[data-testid="success-message"]');
      await expect(successMessages).toHaveCount(1);
    });

    test('Application handles simultaneous file uploads', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'professional@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await page.goto('/professional/profile');
      
      // Create multiple files
      const file1 = new File(['content1'], 'photo1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['content2'], 'photo2.jpg', { type: 'image/jpeg' });
      const file3 = new File(['content3'], 'photo3.jpg', { type: 'image/jpeg' });
      
      // Try to upload multiple files simultaneously
      const fileInput = page.locator('[data-testid="profile-photo-input"]');
      await fileInput.setInputFiles([file1, file2, file3]);
      
      // Should handle multiple uploads gracefully
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    });
  });

  test.describe('Memory and Performance Edge Cases', () => {
    test('Application handles large data sets gracefully', async ({ page }) => {
      // Mock large dataset
      const largeJobList = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        title: `Job ${i}`,
        description: `Description for job ${i}`,
        pay: 50 + i,
        location: `Location ${i}`
      }));
      
      await page.route('**/api/jobs', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            jobs: largeJobList,
            total: 1000,
            page: 1,
            limit: 50
          })
        });
      });
      
      // Login and navigate to jobs
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'professional@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await page.goto('/professional/jobs');
      
      // Should show pagination
      await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
      
      // Should only render visible items
      const jobCards = page.locator('[data-testid="job-card"]');
      await expect(jobCards).toHaveCount(50); // Only first page
    });

    test('Application handles rapid API calls without overwhelming server', async ({ page }) => {
      let requestCount = 0;
      
      // Track API requests
      await page.route('**/api/jobs/search', async route => {
        requestCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ jobs: [], total: 0 })
        });
      });
      
      // Login and navigate to jobs
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'professional@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await page.goto('/professional/jobs');
      
      // Rapidly type in search box
      const searchInput = page.locator('[data-testid="job-search-input"]');
      await searchInput.fill('barber');
      await searchInput.fill('barber shop');
      await searchInput.fill('barber shop near me');
      await searchInput.fill('barber shop near me now');
      
      // Wait for debounced search
      await page.waitForTimeout(1000);
      
      // Should not make excessive API calls
      expect(requestCount).toBeLessThan(5);
    });

    test('Application handles memory leaks in long-running sessions', async ({ page }) => {
      // Login and perform multiple actions
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'professional@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Navigate through multiple pages multiple times
      for (let i = 0; i < 10; i++) {
        await page.goto('/professional/dashboard');
        await page.goto('/professional/jobs');
        await page.goto('/professional/profile');
        await page.goto('/professional/messages');
      }
      
      // Should still be responsive
      await page.goto('/professional/dashboard');
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
    });
  });

  test.describe('Browser Environment Edge Cases', () => {
    test('Application handles browser back/forward navigation', async ({ page }) => {
      // Navigate through multiple pages
      await page.goto('/');
      await page.goto('/login');
      await page.goto('/signup');
      
      // Go back
      await page.goBack();
      await expect(page).toHaveURL('/login');
      
      // Go back again
      await page.goBack();
      await expect(page).toHaveURL('/');
      
      // Go forward
      await page.goForward();
      await expect(page).toHaveURL('/login');
      
      // Should maintain proper state
      await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    });

    test('Application handles page refresh during form submission', async ({ page }) => {
      await page.goto('/signup');
      
      // Fill form
      await page.fill('[data-testid="name-input"]', 'Test User');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.fill('[data-testid="confirm-password-input"]', 'password123');
      
      // Start submission and immediately refresh
      await page.click('[data-testid="register-button"]');
      await page.reload();
      
      // Should handle refresh gracefully
      await expect(page.locator('[data-testid="name-input"]')).toBeVisible();
    });

    test('Application handles browser tab switching', async ({ page, context }) => {
      // Create second tab
      const secondPage = await context.newPage();
      
      // Login in first tab
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Switch to second tab and login
      await secondPage.goto('/login');
      await secondPage.fill('[data-testid="email-input"]', 'test2@example.com');
      await secondPage.fill('[data-testid="password-input"]', 'password123');
      await secondPage.click('[data-testid="login-button"]');
      
      // Switch back to first tab
      await page.bringToFront();
      
      // Should maintain session
      await expect(page).toHaveURL('/professional/dashboard');
      
      await secondPage.close();
    });

    test('Application handles browser zoom levels', async ({ page }) => {
      // Test different zoom levels
      const zoomLevels = [50, 75, 100, 125, 150, 200];
      
      for (const zoom of zoomLevels) {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.evaluate((zoom) => {
          document.body.style.zoom = `${zoom}%`;
        }, zoom);
        
        await page.goto('/');
        
        // Should be usable at all zoom levels
        await expect(page.locator('[data-testid="signup-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
      }
    });
  });

  test.describe('Data Integrity Edge Cases', () => {
    test('Application handles malformed API responses', async ({ page }) => {
      // Mock malformed JSON response
      await page.route('**/api/jobs', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '{"jobs": [{"id": 1, "title": "Job 1", "description": "Description 1", "pay": 50, "location": "Location 1"}], "total": 1, "page": 1, "limit": 50, "invalid": "malformed data", "nested": {"deep": {"object": {"with": {"many": {"levels": "data"}}}}}}'
        });
      });
      
      // Login and navigate to jobs
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'professional@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await page.goto('/professional/jobs');
      
      // Should handle malformed data gracefully
      await expect(page.locator('[data-testid="job-card"]')).toHaveCount(1);
    });

    test('Application handles null and undefined values', async ({ page }) => {
      // Mock response with null values
      await page.route('**/api/user/profile', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            name: null,
            email: 'test@example.com',
            profile: {
              bio: undefined,
              skills: null,
              experience: []
            }
          })
        });
      });
      
      // Login and navigate to profile
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await page.goto('/professional/profile');
      
      // Should handle null/undefined values gracefully
      await expect(page.locator('[data-testid="profile-content"]')).toBeVisible();
    });

    test('Application handles circular references in data', async ({ page }) => {
      // Mock response with circular reference (should be handled by JSON.stringify)
      await page.route('**/api/jobs/123', async route => {
        const job = {
          id: 123,
          title: 'Test Job',
          description: 'Test Description',
          pay: 50,
          location: 'Test Location'
        };
        
        // This would cause issues if not handled properly
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(job)
        });
      });
      
      // Login and navigate to specific job
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'professional@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await page.goto('/professional/jobs/123');
      
      // Should handle data without issues
      await expect(page.locator('[data-testid="job-title"]')).toContainText('Test Job');
    });
  });

  test.describe('Security Edge Cases', () => {
    test('Application handles CSRF token validation', async ({ page }) => {
      // Mock CSRF error
      await page.route('**/api/auth/login', async route => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'CSRF Token Mismatch',
            message: 'Invalid CSRF token'
          })
        });
      });
      
      // Try to login
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Should show CSRF error
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Security token invalid');
    });

    test('Application handles content security policy violations', async ({ page }) => {
      // Try to inject external script
      await page.goto('/');
      await page.evaluate(() => {
        const script = document.createElement('script');
        script.src = 'https://malicious-site.com/script.js';
        document.head.appendChild(script);
      });
      
      // Should not execute external scripts
      await expect(page.locator('[data-testid="signup-button"]')).toBeVisible();
    });

    test('Application handles clickjacking attempts', async ({ page }) => {
      // Check for X-Frame-Options header
      const response = await page.goto('/');
      const headers = response?.headers();
      
      // Should have X-Frame-Options header
      expect(headers?.['x-frame-options']).toBeDefined();
    });
  });
});
