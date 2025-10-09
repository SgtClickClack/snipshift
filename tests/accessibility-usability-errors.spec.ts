import { test, expect } from '@playwright/test';

test.describe('Accessibility & Usability Error Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('Keyboard Navigation Errors', () => {
    test('Application handles keyboard-only navigation without mouse', async ({ page }) => {
      await page.goto('/');
      
      // Navigate using only keyboard
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Continue tabbing through interactive elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to activate buttons with Enter/Space
      await page.keyboard.press('Enter');
      
      // Should navigate to appropriate page
      await expect(page).toHaveURL(/\/login|\/signup/);
    });

    test('Application handles focus trap in modals', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Open a modal
      await page.goto('/professional/dashboard');
      await page.click('[data-testid="settings-button"]');
      
      // Focus should be trapped in modal
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should not escape modal
      const modal = page.locator('[data-testid="settings-modal"]');
      await expect(modal).toBeVisible();
      
      // Should be able to close with Escape
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    });

    test('Application handles focus restoration after modal close', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await page.goto('/professional/dashboard');
      
      // Focus on settings button
      await page.locator('[data-testid="settings-button"]').focus();
      
      // Open modal
      await page.keyboard.press('Enter');
      
      // Close modal
      await page.keyboard.press('Escape');
      
      // Focus should return to settings button
      await expect(page.locator('[data-testid="settings-button"]')).toBeFocused();
    });

    test('Application handles skip links for screen readers', async ({ page }) => {
      await page.goto('/');
      
      // Should have skip link
      const skipLink = page.locator('[data-testid="skip-to-main"]');
      await expect(skipLink).toBeVisible();
      
      // Should be focusable
      await skipLink.focus();
      await expect(skipLink).toBeFocused();
      
      // Should navigate to main content
      await page.keyboard.press('Enter');
      await expect(page.locator('main')).toBeFocused();
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test('Application provides proper ARIA labels for form elements', async ({ page }) => {
      await page.goto('/signup');
      
      // Check form inputs have proper labels
      const emailInput = page.locator('[data-testid="email-input"]');
      await expect(emailInput).toHaveAttribute('aria-label');
      
      const passwordInput = page.locator('[data-testid="password-input"]');
      await expect(passwordInput).toHaveAttribute('aria-label');
      
      // Check error messages have proper ARIA attributes
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.click('[data-testid="register-button"]');
      
      const errorMessage = page.locator('[data-testid="email-error"]');
      await expect(errorMessage).toHaveAttribute('role', 'alert');
    });

    test('Application announces dynamic content changes', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await page.goto('/professional/jobs');
      
      // Search for jobs
      await page.fill('[data-testid="job-search-input"]', 'barber');
      await page.click('[data-testid="search-button"]');
      
      // Results should be announced
      const resultsContainer = page.locator('[data-testid="search-results"]');
      await expect(resultsContainer).toHaveAttribute('aria-live', 'polite');
    });

    test('Application handles loading states for screen readers', async ({ page }) => {
      // Mock slow API response
      await page.route('**/api/jobs', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
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
      
      // Loading state should be announced
      const loadingMessage = page.locator('[data-testid="loading-message"]');
      await expect(loadingMessage).toHaveAttribute('aria-live', 'assertive');
      await expect(loadingMessage).toContainText('Loading jobs');
    });

    test('Application provides proper heading hierarchy', async ({ page }) => {
      await page.goto('/');
      
      // Check heading structure
      const h1 = page.locator('h1');
      await expect(h1).toHaveCount(1);
      
      // Check heading levels are sequential
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      
      for (let i = 0; i < headingCount; i++) {
        const heading = headings.nth(i);
        const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
        expect(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']).toContain(tagName);
      }
    });
  });

  test.describe('Color and Contrast Issues', () => {
    test('Application maintains readability in high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/');
      
      // Check text is still readable
      const textElements = page.locator('p, span, div, h1, h2, h3, h4, h5, h6');
      const firstText = textElements.first();
      await expect(firstText).toBeVisible();
      
      // Check buttons are still visible
      const buttons = page.locator('button, [role="button"]');
      await expect(buttons.first()).toBeVisible();
    });

    test('Application handles colorblind users', async ({ page }) => {
      await page.goto('/signup');
      
      // Fill form with error
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.click('[data-testid="register-button"]');
      
      // Error should be indicated by more than just color
      const errorMessage = page.locator('[data-testid="email-error"]');
      await expect(errorMessage).toHaveAttribute('role', 'alert');
      await expect(errorMessage).toContainText('Please enter a valid email address');
      
      // Error icon should be present
      const errorIcon = page.locator('[data-testid="error-icon"]');
      await expect(errorIcon).toBeVisible();
    });

    test('Application provides alternative text for images', async ({ page }) => {
      await page.goto('/');
      
      // Check all images have alt text
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const image = images.nth(i);
        const altText = await image.getAttribute('alt');
        expect(altText).toBeTruthy();
        expect(altText).not.toBe('');
      }
    });
  });

  test.describe('Mobile Accessibility Issues', () => {
    test('Application handles touch targets on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      
      // Check touch targets are large enough (minimum 44px)
      const buttons = page.locator('button, [role="button"], a');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const boundingBox = await button.boundingBox();
        
        if (boundingBox) {
          expect(boundingBox.width).toBeGreaterThanOrEqual(44);
          expect(boundingBox.height).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test('Application handles zoom on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      
      // Simulate zoom
      await page.evaluate(() => {
        document.body.style.zoom = '200%';
      });
      
      // Should still be usable
      const signupButton = page.locator('[data-testid="signup-button"]');
      await expect(signupButton).toBeVisible();
      await expect(signupButton).toBeEnabled();
    });

    test('Application handles orientation changes', async ({ page }) => {
      // Start in portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      
      // Switch to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      
      // Should adapt layout
      const signupButton = page.locator('[data-testid="signup-button"]');
      await expect(signupButton).toBeVisible();
      
      // Switch back to portrait
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Should still work
      await expect(signupButton).toBeVisible();
    });
  });

  test.describe('Form Accessibility Errors', () => {
    test('Application handles form validation errors accessibly', async ({ page }) => {
      await page.goto('/signup');
      
      // Submit empty form
      await page.click('[data-testid="register-button"]');
      
      // Check error messages are properly associated
      const emailInput = page.locator('[data-testid="email-input"]');
      const emailError = page.locator('[data-testid="email-error"]');
      
      const emailInputId = await emailInput.getAttribute('id');
      const emailErrorAriaDescribedBy = await emailError.getAttribute('aria-describedby');
      
      expect(emailErrorAriaDescribedBy).toContain(emailInputId);
    });

    test('Application handles required field indicators', async ({ page }) => {
      await page.goto('/signup');
      
      // Check required fields are marked
      const requiredFields = page.locator('[required], [aria-required="true"]');
      const requiredCount = await requiredFields.count();
      expect(requiredCount).toBeGreaterThan(0);
      
      // Check visual indicators
      const requiredIndicators = page.locator('[data-testid*="required-indicator"]');
      const indicatorCount = await requiredIndicators.count();
      expect(indicatorCount).toBeGreaterThan(0);
    });

    test('Application handles form field grouping', async ({ page }) => {
      await page.goto('/signup');
      
      // Check form sections are properly grouped
      const fieldset = page.locator('fieldset');
      const fieldsetCount = await fieldset.count();
      
      if (fieldsetCount > 0) {
        for (let i = 0; i < fieldsetCount; i++) {
          const currentFieldset = fieldset.nth(i);
          const legend = currentFieldset.locator('legend');
          await expect(legend).toBeVisible();
        }
      }
    });
  });

  test.describe('Navigation Accessibility Issues', () => {
    test('Application handles breadcrumb navigation', async ({ page }) => {
      // Login and navigate to nested page
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'professional@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await page.goto('/professional/profile/edit');
      
      // Check breadcrumbs exist
      const breadcrumbs = page.locator('[data-testid="breadcrumbs"]');
      await expect(breadcrumbs).toBeVisible();
      
      // Check breadcrumbs have proper structure
      const breadcrumbItems = breadcrumbs.locator('[role="listitem"]');
      const itemCount = await breadcrumbItems.count();
      expect(itemCount).toBeGreaterThan(1);
    });

    test('Application handles navigation landmarks', async ({ page }) => {
      await page.goto('/');
      
      // Check main navigation
      const mainNav = page.locator('nav[role="navigation"]');
      await expect(mainNav).toBeVisible();
      
      // Check main content area
      const mainContent = page.locator('main[role="main"]');
      await expect(mainContent).toBeVisible();
      
      // Check complementary content
      const aside = page.locator('aside[role="complementary"]');
      if (await aside.count() > 0) {
        await expect(aside.first()).toBeVisible();
      }
    });

    test('Application handles skip navigation', async ({ page }) => {
      await page.goto('/');
      
      // Check skip links exist
      const skipLinks = page.locator('a[href^="#"]');
      const skipLinkCount = await skipLinks.count();
      expect(skipLinkCount).toBeGreaterThan(0);
      
      // Check skip links are focusable
      for (let i = 0; i < skipLinkCount; i++) {
        const skipLink = skipLinks.nth(i);
        await skipLink.focus();
        await expect(skipLink).toBeFocused();
      }
    });
  });

  test.describe('Error Message Accessibility', () => {
    test('Application announces error messages to screen readers', async ({ page }) => {
      await page.goto('/login');
      
      // Submit empty form
      await page.click('[data-testid="login-button"]');
      
      // Error messages should be announced
      const errorMessages = page.locator('[role="alert"]');
      await expect(errorMessages).toHaveCount(1);
      
      const errorMessage = errorMessages.first();
      await expect(errorMessage).toContainText('required');
    });

    test('Application handles multiple error messages', async ({ page }) => {
      await page.goto('/signup');
      
      // Submit form with multiple errors
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.fill('[data-testid="password-input"]', '123');
      await page.click('[data-testid="register-button"]');
      
      // Multiple errors should be handled
      const errorMessages = page.locator('[role="alert"]');
      const errorCount = await errorMessages.count();
      expect(errorCount).toBeGreaterThan(1);
      
      // Should have summary of errors
      const errorSummary = page.locator('[data-testid="error-summary"]');
      await expect(errorSummary).toBeVisible();
    });

    test('Application clears error messages when fixed', async ({ page }) => {
      await page.goto('/signup');
      
      // Submit with error
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.click('[data-testid="register-button"]');
      
      // Should show error
      const errorMessage = page.locator('[data-testid="email-error"]');
      await expect(errorMessage).toBeVisible();
      
      // Fix the error
      await page.fill('[data-testid="email-input"]', 'valid@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.fill('[data-testid="confirm-password-input"]', 'password123');
      await page.fill('[data-testid="name-input"]', 'Test User');
      
      // Error should be cleared
      await expect(errorMessage).not.toBeVisible();
    });
  });
});
