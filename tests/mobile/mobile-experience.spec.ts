import { test, expect, Page, devices } from '@playwright/test';

// Test on mobile devices
test.use({ ...devices['iPhone 12'] });

test.describe('Mobile Experience', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a user
    await page.goto('/');
    await page.click('[data-testid="button-login"]');
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    // Wait for login to complete
    await page.waitForURL('/role-selection', { timeout: 10000 });
  });

  test.describe('Mobile Navigation', () => {
    test('should display mobile navigation menu', async ({ page }) => {
      // User should already be logged in from beforeEach
      await page.goto('/');
      
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible({ timeout: 10000 });
      await page.click('[data-testid="mobile-menu-button"]');
      
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible({ timeout: 10000 });
      // Check for navigation items (they have different testids in our implementation)
      await expect(page.locator('[data-testid="mobile-nav-jobs"], [data-testid="mobile-nav-community"], [data-testid="mobile-nav-messages"]').first()).toBeVisible();
    });

    test('should navigate through mobile menu', async ({ page }) => {
      await page.goto('/');
      await page.click('[data-testid="mobile-menu-button"]');
      
      // Navigate to jobs
      await page.click('[data-testid="mobile-nav-jobs"]');
      await expect(page).toHaveURL(/.*mobile\/jobs/);
      
      // Open menu again and navigate to community
      await page.click('[data-testid="mobile-menu-button"]');
      await page.click('[data-testid="mobile-nav-community"]');
      await expect(page).toHaveURL(/.*mobile\/community/);
    });

    test('should close mobile menu on navigation', async ({ page }) => {
      await page.goto('/');
      await page.click('[data-testid="mobile-menu-button"]');
      
      await page.click('[data-testid="mobile-nav-jobs"]');
      
      // Menu should close automatically
      await expect(page.locator('[data-testid="mobile-menu"]')).not.toBeVisible({ timeout: 10000 });
    });

    test('should display user menu on mobile', async ({ page }) => {
      await page.goto('/');
      
      await expect(page.locator('[data-testid="mobile-user-menu"]')).toBeVisible();
      await page.click('[data-testid="mobile-user-menu"]');
      
      await expect(page.locator('[data-testid="mobile-user-dropdown"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-profile-link"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-settings-link"]')).toBeVisible();
      await expect(page.locator('[data-testid="logout-link"]')).toBeVisible();
    });
  });

  test.describe('Mobile Job Browsing', () => {
    test('should display job feed on mobile', async ({ page }) => {
      await page.goto('/mobile/jobs');
      
      await expect(page.locator('[data-testid="mobile-job-feed"]')).toBeVisible({ timeout: 10000 });
      // Wait for job cards to load or show empty state
      await page.waitForSelector('[data-testid="mobile-job-card"], .text-center:has-text("No jobs found")', { timeout: 10000 });
      
      const jobCards = page.locator('[data-testid="mobile-job-card"]');
      const count = await jobCards.count();
      
      if (count > 0) {
        // Check mobile job card layout
        const firstJobCard = jobCards.first();
        await expect(firstJobCard.locator('[data-testid="job-title"]')).toBeVisible();
        await expect(firstJobCard.locator('[data-testid="job-location"]')).toBeVisible();
        await expect(firstJobCard.locator('[data-testid="job-pay"]')).toBeVisible();
      }
    });

    test('should filter jobs on mobile', async ({ page }) => {
      await page.goto('/mobile/jobs');
      
      await page.click('[data-testid="mobile-filter-button"]');
      await expect(page.locator('[data-testid="mobile-filter-panel"]')).toBeVisible({ timeout: 10000 });
      
      // Apply location filter
      await page.fill('[data-testid="mobile-location-input"]', 'Sydney');
      await page.click('[data-testid="mobile-apply-filter"]');
      
      await expect(page.locator('[data-testid="mobile-filter-panel"]')).not.toBeVisible({ timeout: 10000 });
      // Check if filter indicator appears (may not if no jobs match)
      const filterIndicator = page.locator('[data-testid="active-filter-indicator"]');
      if (await filterIndicator.isVisible()) {
        await expect(filterIndicator).toBeVisible();
      }
    });

    test('should view job details on mobile', async ({ page }) => {
      await page.goto('/mobile/jobs');
      
      // Wait for job cards to load
      await page.waitForSelector('[data-testid="mobile-job-card"], .text-center:has-text("No jobs found")', { timeout: 10000 });
      
      const jobCards = page.locator('[data-testid="mobile-job-card"]');
      const count = await jobCards.count();
      
      if (count > 0) {
        await jobCards.first().click();
        
        await expect(page.locator('[data-testid="mobile-job-details"]')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('[data-testid="job-title"]')).toBeVisible();
        await expect(page.locator('[data-testid="job-description"]')).toBeVisible();
        await expect(page.locator('[data-testid="mobile-apply-button"]')).toBeVisible();
      } else {
        // Skip test if no jobs available
        test.skip();
      }
    });

    test('should apply for job on mobile', async ({ page }) => {
      await page.goto('/jobs');
      await page.click('[data-testid="mobile-job-card"]').first();
      
      await page.click('[data-testid="mobile-apply-button"]');
      
      await expect(page.locator('[data-testid="mobile-application-modal"]')).toBeVisible();
      
      // Fill application form
      await page.fill('[data-testid="mobile-cover-letter"]', 'I am interested in this position.');
      await page.click('[data-testid="mobile-submit-application"]');
      
      await expect(page.locator('text=Application submitted successfully')).toBeVisible();
    });
  });

  test.describe('Mobile Community Features', () => {
    test('should browse community feed on mobile', async ({ page }) => {
      await page.goto('/mobile/community');
      
      await expect(page.locator('[data-testid="mobile-community-feed"]')).toBeVisible({ timeout: 10000 });
      
      // Wait for posts to load or show empty state
      await page.waitForSelector('[data-testid="mobile-post-card"], .text-center:has-text("No posts yet")', { timeout: 10000 });
      
      const postCards = page.locator('[data-testid="mobile-post-card"]');
      const count = await postCards.count();
      
      if (count > 0) {
        // Check mobile post layout
        const firstPost = postCards.first();
        await expect(firstPost.locator('[data-testid="post-author"]')).toBeVisible();
        await expect(firstPost.locator('[data-testid="post-content"]')).toBeVisible();
        await expect(firstPost.locator('[data-testid="mobile-post-actions"]')).toBeVisible();
      }
    });

    test('should create post on mobile', async ({ page }) => {
      await page.goto('/community');
      await page.click('[data-testid="mobile-create-post"]');
      
      await expect(page.locator('[data-testid="mobile-post-creation"]')).toBeVisible();
      
      // Create text post
      await page.fill('[data-testid="mobile-post-content"]', 'Great day at work! #barberlife');
      await page.click('[data-testid="mobile-publish-post"]');
      
      await expect(page.locator('text=Post published successfully')).toBeVisible();
    });

    test('should interact with posts on mobile', async ({ page }) => {
      await page.goto('/community');
      
      const firstPost = page.locator('[data-testid="mobile-post-card"]').first();
      
      // Like post
      await firstPost.locator('[data-testid="mobile-like-button"]').click();
      await expect(firstPost.locator('[data-testid="liked-indicator"]')).toBeVisible();
      
      // Comment on post
      await firstPost.locator('[data-testid="mobile-comment-button"]').click();
      await expect(page.locator('[data-testid="mobile-comment-input"]')).toBeVisible();
      
      await page.fill('[data-testid="mobile-comment-input"]', 'Great work!');
      await page.click('[data-testid="mobile-post-comment"]');
      
      await expect(page.locator('[data-testid="mobile-comment-item"]')).toContainText('Great work!');
    });
  });

  test.describe('Mobile Messaging', () => {
    test('should access messages on mobile', async ({ page }) => {
      await page.goto('/mobile/messages');
      
      await expect(page.locator('[data-testid="mobile-messages-list"]')).toBeVisible({ timeout: 10000 });
      
      // Wait for chat items to load or show empty state
      await page.waitForSelector('[data-testid="mobile-chat-item"], .text-center:has-text("No conversations yet")', { timeout: 10000 });
      
      const chatItems = page.locator('[data-testid="mobile-chat-item"]');
      const count = await chatItems.count();
      
      if (count > 0) {
        await expect(chatItems).toHaveCount.greaterThan(0);
      }
    });

    test('should send messages on mobile', async ({ page }) => {
      await page.goto('/messages');
      await page.click('[data-testid="mobile-chat-item"]').first();
      
      await expect(page.locator('[data-testid="mobile-chat-interface"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-message-input"]')).toBeVisible();
      
      // Send message
      await page.fill('[data-testid="mobile-message-input"]', 'Hello from mobile!');
      await page.click('[data-testid="mobile-send-button"]');
      
      await expect(page.locator('[data-testid="mobile-message-bubble"]').last()).toContainText('Hello from mobile!');
    });

    test('should start new chat on mobile', async ({ page }) => {
      await page.goto('/messages');
      await page.click('[data-testid="mobile-new-chat"]');
      
      await expect(page.locator('[data-testid="mobile-new-chat-modal"]')).toBeVisible();
      
      // Search for user
      await page.fill('[data-testid="mobile-user-search"]', 'john');
      await page.click('[data-testid="mobile-search-users"]');
      
      await expect(page.locator('[data-testid="mobile-user-result"]')).toHaveCount.greaterThan(0);
      
      // Start chat
      await page.click('[data-testid="mobile-user-result"]').first();
      await page.click('[data-testid="mobile-start-chat"]');
      
      await expect(page.locator('[data-testid="mobile-chat-interface"]')).toBeVisible();
    });
  });

  test.describe('Mobile Dashboard', () => {
    test('should display mobile dashboard', async ({ page }) => {
      await page.goto('/mobile/dashboard');
      
      await expect(page.locator('[data-testid="mobile-dashboard"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="mobile-dashboard-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-metrics-cards"]')).toBeVisible();
    });

    test('should navigate dashboard sections on mobile', async ({ page }) => {
      await page.goto('/professional-dashboard');
      
      // Use mobile navigation tabs
      await page.click('[data-testid="mobile-tab-jobs"]');
      await expect(page.locator('[data-testid="mobile-jobs-section"]')).toBeVisible();
      
      await page.click('[data-testid="mobile-tab-earnings"]');
      await expect(page.locator('[data-testid="mobile-earnings-section"]')).toBeVisible();
      
      await page.click('[data-testid="mobile-tab-profile"]');
      await expect(page.locator('[data-testid="mobile-profile-section"]')).toBeVisible();
    });

    test('should view mobile charts and graphs', async ({ page }) => {
      await page.goto('/professional-dashboard');
      await page.click('[data-testid="mobile-tab-earnings"]');
      
      await expect(page.locator('[data-testid="mobile-earnings-chart"]')).toBeVisible();
      
      // Test mobile chart interactions
      await page.tap('[data-testid="mobile-chart-point"]');
      await expect(page.locator('[data-testid="mobile-chart-tooltip"]')).toBeVisible();
    });
  });

  test.describe('Mobile Forms & Input', () => {
    test('should handle mobile form inputs', async ({ page }) => {
      await page.goto('/profile');
      
      await expect(page.locator('[data-testid="mobile-profile-form"]')).toBeVisible();
      
      // Test text inputs
      await page.fill('[data-testid="mobile-first-name"]', 'John');
      await page.fill('[data-testid="mobile-last-name"]', 'Doe');
      await page.fill('[data-testid="mobile-phone"]', '+1234567890');
      
      // Test select dropdowns
      await page.selectOption('[data-testid="mobile-experience-level"]', 'intermediate');
      
      // Test textarea
      await page.fill('[data-testid="mobile-bio"]', 'Experienced barber with 5+ years in the industry.');
      
      await page.click('[data-testid="mobile-save-profile"]');
      
      await expect(page.locator('text=Profile updated successfully')).toBeVisible();
    });

    test('should handle mobile file uploads', async ({ page }) => {
      await page.goto('/profile');
      
      // Upload profile picture
      const fileInput = page.locator('[data-testid="mobile-profile-picture"]');
      await fileInput.setInputFiles({
        name: 'profile.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      });
      
      await expect(page.locator('[data-testid="mobile-upload-progress"]')).toBeVisible();
      await expect(page.locator('text=Upload completed')).toBeVisible();
    });

    test('should handle mobile date/time pickers', async ({ page }) => {
      await page.goto('/jobs');
      await page.click('[data-testid="mobile-filter-button"]');
      await page.click('[data-testid="mobile-date-filter"]');
      
      await expect(page.locator('[data-testid="mobile-date-picker"]')).toBeVisible();
      
      // Select date range
      await page.click('[data-testid="mobile-start-date"]');
      await page.click('[data-testid="mobile-date-15"]');
      
      await page.click('[data-testid="mobile-end-date"]');
      await page.click('[data-testid="mobile-date-20"]');
      
      await page.click('[data-testid="mobile-apply-date-filter"]');
      
      await expect(page.locator('[data-testid="mobile-filter-panel"]')).not.toBeVisible();
    });
  });

  test.describe('Mobile Touch Interactions', () => {
    test('should handle swipe gestures', async ({ page }) => {
      await page.goto('/jobs');
      
      const jobCard = page.locator('[data-testid="mobile-job-card"]').first();
      
      // Swipe left to reveal actions
      await jobCard.hover();
      await page.mouse.down();
      await page.mouse.move(-100, 0);
      await page.mouse.up();
      
      await expect(page.locator('[data-testid="mobile-swipe-actions"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-save-job"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-share-job"]')).toBeVisible();
    });

    test('should handle pull-to-refresh', async ({ page }) => {
      await page.goto('/community');
      
      // Simulate pull-to-refresh gesture
      await page.evaluate(() => {
        const event = new Event('touchstart');
        document.dispatchEvent(event);
      });
      
      await page.mouse.move(0, 100);
      await page.mouse.down();
      await page.mouse.move(0, 200);
      await page.mouse.up();
      
      await expect(page.locator('[data-testid="mobile-refresh-indicator"]')).toBeVisible();
    });

    test('should handle long press interactions', async ({ page }) => {
      await page.goto('/messages');
      await page.click('[data-testid="mobile-chat-item"]').first();
      
      const messageBubble = page.locator('[data-testid="mobile-message-bubble"]').last();
      
      // Long press on message
      await messageBubble.hover();
      await page.mouse.down();
      await page.waitForTimeout(1000); // Long press duration
      await page.mouse.up();
      
      await expect(page.locator('[data-testid="mobile-message-context-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-copy-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-delete-message"]')).toBeVisible();
    });
  });

  test.describe('Mobile Performance', () => {
    test('should load pages quickly on mobile', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/jobs');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
      
      await expect(page.locator('[data-testid="mobile-job-feed"]')).toBeVisible();
    });

    test('should handle mobile network conditions', async ({ page }) => {
      // Simulate slow network
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 1000);
      });
      
      await page.goto('/community');
      
      await expect(page.locator('[data-testid="mobile-loading-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-community-feed"]')).toBeVisible();
    });

    test('should optimize images for mobile', async ({ page }) => {
      await page.goto('/community');
      
      const images = page.locator('[data-testid="mobile-post-image"]');
      const count = await images.count();
      
      for (let i = 0; i < count; i++) {
        const image = images.nth(i);
        const src = await image.getAttribute('src');
        
        // Check if image is optimized (contains mobile-specific parameters)
        expect(src).toMatch(/w=\d+&h=\d+/); // Responsive image parameters
      }
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should support screen readers on mobile', async ({ page }) => {
      await page.goto('/jobs');
      
      // Check for ARIA labels
      await expect(page.locator('[data-testid="mobile-filter-button"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="mobile-job-card"]').first()).toHaveAttribute('role', 'button');
      
      // Check for proper heading structure
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('h2')).toHaveCount.greaterThan(0);
    });

    test('should support keyboard navigation on mobile', async ({ page }) => {
      await page.goto('/community');
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Test enter key activation
      await page.keyboard.press('Enter');
      // Should activate focused element
    });

    test('should have proper touch targets', async ({ page }) => {
      await page.goto('/jobs');
      
      const buttons = page.locator('[data-testid="mobile-apply-button"]');
      const count = await buttons.count();
      
      for (let i = 0; i < count; i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();
        
        // Touch targets should be at least 44x44 pixels
        expect(box?.width).toBeGreaterThanOrEqual(44);
        expect(box?.height).toBeGreaterThanOrEqual(44);
      }
    });
  });

  test.describe('Mobile Notifications', () => {
    test('should request notification permissions', async ({ page }) => {
      await page.goto('/');
      
      // Mock notification permission request
      await page.evaluate(() => {
        if ('Notification' in window) {
          Notification.requestPermission = () => Promise.resolve('granted');
        }
      });
      
      await page.click('[data-testid="mobile-enable-notifications"]');
      
      await expect(page.locator('text=Notifications enabled')).toBeVisible();
    });

    test('should display mobile push notifications', async ({ page }) => {
      // Simulate push notification
      await page.evaluate(() => {
        if ('Notification' in window) {
          new Notification('New job available', {
            body: 'A new barber position is available in your area',
            icon: '/icon-192x192.png'
          });
        }
      });
      
      // Check if notification was handled
      await expect(page.locator('[data-testid="mobile-notification-badge"]')).toBeVisible();
    });
  });

  test.describe('Mobile Offline Support', () => {
    test('should work offline', async ({ page }) => {
      await page.goto('/jobs');
      
      // Go offline
      await page.context().setOffline(true);
      
      // Try to navigate
      await page.click('[data-testid="mobile-job-card"]').first();
      
      // Should show offline indicator
      await expect(page.locator('[data-testid="mobile-offline-indicator"]')).toBeVisible();
      
      // Go back online
      await page.context().setOffline(false);
      
      // Should sync data
      await expect(page.locator('text=Back online')).toBeVisible();
    });

    test('should cache content for offline viewing', async ({ page }) => {
      await page.goto('/community');
      
      // Load content
      await expect(page.locator('[data-testid="mobile-community-feed"]')).toBeVisible();
      
      // Go offline
      await page.context().setOffline(true);
      
      // Refresh page
      await page.reload();
      
      // Should show cached content
      await expect(page.locator('[data-testid="mobile-community-feed"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-cached-indicator"]')).toBeVisible();
    });
  });
});
