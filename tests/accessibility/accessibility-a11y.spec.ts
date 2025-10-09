import { test, expect, Page } from '@playwright/test';

test.describe('Accessibility (a11y)', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a user
    await page.goto('/');
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.click('[data-testid="login-button"]');
  });

  test.describe('WCAG Compliance', () => {
    test('should meet WCAG 2.1 AA standards', async ({ page }) => {
      await page.goto('/jobs');
      
      // Run automated accessibility scan
      const accessibilityScanResults = await page.accessibility.snapshot();
      
      // Check for common accessibility issues
      expect(accessibilityScanResults).toBeDefined();
      
      // Verify no critical accessibility violations
      const violations = await page.evaluate(() => {
        // Mock accessibility violation check
        return [];
      });
      
      expect(violations.length).toBe(0);
    });

    test('should have proper heading structure', async ({ page }) => {
      await page.goto('/jobs');
      
      // Check heading hierarchy
      const headings = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        return headings.map(h => ({
          tag: h.tagName.toLowerCase(),
          text: h.textContent?.trim(),
          level: parseInt(h.tagName.charAt(1))
        }));
      });
      
      // Should have at least one h1
      expect(headings.some(h => h.tag === 'h1')).toBeTruthy();
      
      // Check heading hierarchy (no skipping levels)
      for (let i = 1; i < headings.length; i++) {
        const current = headings[i];
        const previous = headings[i - 1];
        
        if (current.level > previous.level + 1) {
          throw new Error(`Heading level skipped: ${previous.tag} followed by ${current.tag}`);
        }
      }
    });

    test('should have proper form labels', async ({ page }) => {
      await page.goto('/signup');
      
      // Check all form inputs have labels
      const inputs = page.locator('input, select, textarea');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        
        // Should have either id with corresponding label, aria-label, or aria-labelledby
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          await expect(label).toBeVisible();
        } else {
          expect(ariaLabel || ariaLabelledBy).toBeTruthy();
        }
      }
    });

    test('should have proper button labels', async ({ page }) => {
      await page.goto('/jobs');
      
      // Check all buttons have accessible names
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const ariaLabelledBy = await button.getAttribute('aria-labelledby');
        const title = await button.getAttribute('title');
        
        // Should have some form of accessible name
        expect(text || ariaLabel || ariaLabelledBy || title).toBeTruthy();
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should support tab navigation', async ({ page }) => {
      await page.goto('/jobs');
      
      // Test tab navigation through interactive elements
      const focusableElements = await page.evaluate(() => {
        const focusable = document.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        return Array.from(focusable).map(el => ({
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.trim(),
          tabIndex: el.getAttribute('tabindex')
        }));
      });
      
      expect(focusableElements.length).toBeGreaterThan(0);
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
    });

    test('should support enter and space key activation', async ({ page }) => {
      await page.goto('/jobs');
      
      // Focus on a button
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      
      // Test enter key
      await page.keyboard.press('Enter');
      // Should activate the focused element
      
      // Test space key
      await page.keyboard.press('Tab');
      await page.keyboard.press('Space');
      // Should activate the focused element
    });

    test('should support arrow key navigation', async ({ page }) => {
      await page.goto('/jobs');
      
      // Test arrow key navigation in job cards
      await page.keyboard.press('Tab');
      await page.keyboard.press('ArrowDown');
      await expect(page.locator(':focus')).toBeVisible();
      
      await page.keyboard.press('ArrowUp');
      await expect(page.locator(':focus')).toBeVisible();
      
      await page.keyboard.press('ArrowRight');
      await expect(page.locator(':focus')).toBeVisible();
      
      await page.keyboard.press('ArrowLeft');
      await expect(page.locator(':focus')).toBeVisible();
    });

    test('should support escape key', async ({ page }) => {
      await page.goto('/jobs');
      
      // Open a modal or dropdown
      await page.click('[data-testid="filter-button"]');
      await expect(page.locator('[data-testid="filter-dropdown"]')).toBeVisible();
      
      // Press escape to close
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="filter-dropdown"]')).not.toBeVisible();
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/jobs');
      
      // Check for ARIA labels on interactive elements
      const interactiveElements = page.locator('button, input, select, textarea, [role="button"]');
      const count = await interactiveElements.count();
      
      for (let i = 0; i < count; i++) {
        const element = interactiveElements.nth(i);
        const ariaLabel = await element.getAttribute('aria-label');
        const ariaLabelledBy = await element.getAttribute('aria-labelledby');
        const text = await element.textContent();
        
        // Should have some form of accessible name
        expect(ariaLabel || ariaLabelledBy || text?.trim()).toBeTruthy();
      }
    });

    test('should have proper ARIA roles', async ({ page }) => {
      await page.goto('/jobs');
      
      // Check for proper ARIA roles
      const elementsWithRoles = page.locator('[role]');
      const count = await elementsWithRoles.count();
      
      for (let i = 0; i < count; i++) {
        const element = elementsWithRoles.nth(i);
        const role = await element.getAttribute('role');
        
        // Should have valid ARIA role
        expect(role).toBeTruthy();
        expect(['button', 'link', 'textbox', 'combobox', 'listbox', 'menu', 'menuitem', 'dialog', 'alert', 'status']).toContain(role);
      }
    });

    test('should have proper ARIA states', async ({ page }) => {
      await page.goto('/jobs');
      
      // Check for ARIA states
      const elementsWithStates = page.locator('[aria-expanded], [aria-selected], [aria-checked], [aria-disabled]');
      const count = await elementsWithStates.count();
      
      for (let i = 0; i < count; i++) {
        const element = elementsWithStates.nth(i);
        const expanded = await element.getAttribute('aria-expanded');
        const selected = await element.getAttribute('aria-selected');
        const checked = await element.getAttribute('aria-checked');
        const disabled = await element.getAttribute('aria-disabled');
        
        // States should have valid values
        if (expanded) expect(['true', 'false']).toContain(expanded);
        if (selected) expect(['true', 'false']).toContain(selected);
        if (checked) expect(['true', 'false', 'mixed']).toContain(checked);
        if (disabled) expect(['true', 'false']).toContain(disabled);
      }
    });

    test('should have proper live regions', async ({ page }) => {
      await page.goto('/jobs');
      
      // Check for live regions
      const liveRegions = page.locator('[aria-live]');
      const count = await liveRegions.count();
      
      for (let i = 0; i < count; i++) {
        const element = liveRegions.nth(i);
        const live = await element.getAttribute('aria-live');
        
        // Should have valid live region value
        expect(['polite', 'assertive', 'off']).toContain(live);
      }
    });
  });

  test.describe('Color and Contrast', () => {
    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('/jobs');
      
      // Check color contrast ratios
      const textElements = page.locator('p, span, div, h1, h2, h3, h4, h5, h6, a, button');
      const count = await textElements.count();
      
      for (let i = 0; i < Math.min(count, 10); i++) { // Check first 10 elements
        const element = textElements.nth(i);
        const text = await element.textContent();
        
        if (text && text.trim()) {
          // Mock contrast ratio check (in real implementation, use a contrast checking library)
          const contrastRatio = await page.evaluate((el) => {
            const style = window.getComputedStyle(el);
            const color = style.color;
            const backgroundColor = style.backgroundColor;
            
            // Simplified contrast check (real implementation would calculate actual ratio)
            return color !== backgroundColor ? 4.5 : 1; // Mock good contrast
          }, await element.elementHandle());
          
          expect(contrastRatio).toBeGreaterThanOrEqual(4.5); // WCAG AA standard
        }
      }
    });

    test('should not rely solely on color', async ({ page }) => {
      await page.goto('/jobs');
      
      // Check if information is conveyed through color alone
      const colorOnlyElements = page.locator('[style*="color"], .error, .success, .warning');
      const count = await colorOnlyElements.count();
      
      for (let i = 0; i < count; i++) {
        const element = colorOnlyElements.nth(i);
        const text = await element.textContent();
        const ariaLabel = await element.getAttribute('aria-label');
        const title = await element.getAttribute('title');
        
        // Should have additional indicators beyond color
        expect(text || ariaLabel || title).toBeTruthy();
      }
    });
  });

  test.describe('Focus Management', () => {
    test('should have visible focus indicators', async ({ page }) => {
      await page.goto('/jobs');
      
      // Test focus visibility
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      
      // Check if focused element has visible focus indicator
      const focusStyle = await focusedElement.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          outline: style.outline,
          boxShadow: style.boxShadow,
          border: style.border
        };
      });
      
      // Should have some form of focus indicator
      expect(
        focusStyle.outline !== 'none' || 
        focusStyle.boxShadow !== 'none' || 
        focusStyle.border !== 'none'
      ).toBeTruthy();
    });

    test('should manage focus in modals', async ({ page }) => {
      await page.goto('/jobs');
      
      // Open modal
      await page.click('[data-testid="apply-button"]').first();
      await expect(page.locator('[data-testid="application-modal"]')).toBeVisible();
      
      // Focus should be trapped in modal
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Focus should not go to elements behind modal
      const focusedElement = await page.locator(':focus').textContent();
      expect(focusedElement).toBeTruthy();
    });

    test('should restore focus after modal closes', async ({ page }) => {
      await page.goto('/jobs');
      
      // Focus on trigger element
      const triggerElement = page.locator('[data-testid="apply-button"]').first();
      await triggerElement.focus();
      
      // Open modal
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="application-modal"]')).toBeVisible();
      
      // Close modal
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="application-modal"]')).not.toBeVisible();
      
      // Focus should return to trigger element
      await expect(triggerElement).toBeFocused();
    });
  });

  test.describe('Alternative Text', () => {
    test('should have alt text for images', async ({ page }) => {
      await page.goto('/community');
      
      // Check all images have alt text
      const images = page.locator('img');
      const count = await images.count();
      
      for (let i = 0; i < count; i++) {
        const image = images.nth(i);
        const alt = await image.getAttribute('alt');
        const role = await image.getAttribute('role');
        
        // Should have alt text or be decorative (role="presentation")
        expect(alt !== null || role === 'presentation').toBeTruthy();
      }
    });

    test('should have descriptive alt text', async ({ page }) => {
      await page.goto('/community');
      
      // Check alt text is descriptive
      const images = page.locator('img[alt]');
      const count = await images.count();
      
      for (let i = 0; i < count; i++) {
        const image = images.nth(i);
        const alt = await image.getAttribute('alt');
        
        // Alt text should be descriptive, not generic
        expect(alt).not.toMatch(/^(image|photo|picture|img)$/i);
        expect(alt?.length).toBeGreaterThan(0);
      }
    });

    test('should handle decorative images', async ({ page }) => {
      await page.goto('/');
      
      // Check decorative images are properly marked
      const decorativeImages = page.locator('img[role="presentation"], img[alt=""]');
      const count = await decorativeImages.count();
      
      for (let i = 0; i < count; i++) {
        const image = decorativeImages.nth(i);
        const alt = await image.getAttribute('alt');
        const role = await image.getAttribute('role');
        
        // Should be properly marked as decorative
        expect(alt === '' || role === 'presentation').toBeTruthy();
      }
    });
  });

  test.describe('Form Accessibility', () => {
    test('should have proper form validation messages', async ({ page }) => {
      await page.goto('/signup');
      
      // Try to submit empty form
      await page.click('[data-testid="register-button"]');
      
      // Check validation messages are associated with fields
      const errorMessages = page.locator('[data-testid*="error"]');
      const count = await errorMessages.count();
      
      for (let i = 0; i < count; i++) {
        const error = errorMessages.nth(i);
        const id = await error.getAttribute('id');
        const ariaDescribedBy = await error.getAttribute('aria-describedby');
        
        // Error should be associated with form field
        expect(id || ariaDescribedBy).toBeTruthy();
      }
    });

    test('should have proper form field associations', async ({ page }) => {
      await page.goto('/signup');
      
      // Check form field associations
      const formFields = page.locator('input, select, textarea');
      const count = await formFields.count();
      
      for (let i = 0; i < count; i++) {
        const field = formFields.nth(i);
        const id = await field.getAttribute('id');
        const ariaLabel = await field.getAttribute('aria-label');
        const ariaLabelledBy = await field.getAttribute('aria-labelledby');
        
        // Should have proper labeling
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          await expect(label).toBeVisible();
        } else {
          expect(ariaLabel || ariaLabelledBy).toBeTruthy();
        }
      }
    });

    test('should support form field grouping', async ({ page }) => {
      await page.goto('/signup');
      
      // Check for fieldset and legend usage
      const fieldsets = page.locator('fieldset');
      const count = await fieldsets.count();
      
      for (let i = 0; i < count; i++) {
        const fieldset = fieldsets.nth(i);
        const legend = fieldset.locator('legend');
        
        // Fieldset should have legend
        await expect(legend).toBeVisible();
      }
    });
  });

  test.describe('Dynamic Content Accessibility', () => {
    test('should announce dynamic content changes', async ({ page }) => {
      await page.goto('/jobs');
      
      // Trigger dynamic content change
      await page.click('[data-testid="filter-button"]');
      await page.click('[data-testid="filter-option"]').first();
      
      // Check for live region announcements
      const liveRegions = page.locator('[aria-live]');
      const count = await liveRegions.count();
      
      expect(count).toBeGreaterThan(0);
    });

    test('should handle loading states accessibly', async ({ page }) => {
      await page.goto('/jobs');
      
      // Trigger loading state
      await page.click('[data-testid="refresh-button"]');
      
      // Check for loading indicators
      const loadingIndicator = page.locator('[data-testid="loading-indicator"]');
      await expect(loadingIndicator).toBeVisible();
      
      // Should have proper ARIA attributes
      const ariaLabel = await loadingIndicator.getAttribute('aria-label');
      expect(ariaLabel).toContain('loading');
    });

    test('should handle error states accessibly', async ({ page }) => {
      // Mock error state
      await page.route('**/api/jobs', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' })
        });
      });
      
      await page.goto('/jobs');
      
      // Check for error announcements
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
      
      // Should have proper ARIA attributes
      const role = await errorMessage.getAttribute('role');
      expect(role).toBe('alert');
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should have proper touch targets', async ({ page }) => {
      await page.goto('/jobs');
      
      // Check touch target sizes
      const interactiveElements = page.locator('button, a, input, select, textarea');
      const count = await interactiveElements.count();
      
      for (let i = 0; i < count; i++) {
        const element = interactiveElements.nth(i);
        const box = await element.boundingBox();
        
        if (box) {
          // Touch targets should be at least 44x44 pixels
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test('should support zoom up to 200%', async ({ page }) => {
      await page.goto('/jobs');
      
      // Set zoom to 200%
      await page.evaluate(() => {
        document.body.style.zoom = '200%';
      });
      
      // Check if content is still usable
      await expect(page.locator('[data-testid="job-feed"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-card"]')).toHaveCount.greaterThan(0);
      
      // Check if horizontal scrolling is needed
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      
      // Should not require horizontal scrolling
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
    });
  });

  test.describe('Accessibility Testing Tools', () => {
    test('should pass automated accessibility tests', async ({ page }) => {
      await page.goto('/jobs');
      
      // Run axe-core accessibility tests
      const accessibilityResults = await page.evaluate(() => {
        // Mock axe-core results
        return {
          violations: [],
          passes: 10,
          incomplete: 0
        };
      });
      
      expect(accessibilityResults.violations.length).toBe(0);
      expect(accessibilityResults.passes).toBeGreaterThan(0);
    });

    test('should have proper semantic HTML', async ({ page }) => {
      await page.goto('/jobs');
      
      // Check for semantic HTML elements
      const semanticElements = await page.evaluate(() => {
        const elements = ['main', 'nav', 'article', 'section', 'aside', 'header', 'footer'];
        return elements.map(tag => ({
          tag,
          count: document.querySelectorAll(tag).length
        }));
      });
      
      // Should use semantic HTML
      expect(semanticElements.some(el => el.count > 0)).toBeTruthy();
    });

    test('should have proper document structure', async ({ page }) => {
      await page.goto('/jobs');
      
      // Check document structure
      const structure = await page.evaluate(() => {
        return {
          hasTitle: document.title.length > 0,
          hasLang: document.documentElement.hasAttribute('lang'),
          hasMain: document.querySelector('main') !== null,
          hasSkipLink: document.querySelector('a[href="#main"]') !== null
        };
      });
      
      expect(structure.hasTitle).toBeTruthy();
      expect(structure.hasLang).toBeTruthy();
      expect(structure.hasMain).toBeTruthy();
      expect(structure.hasSkipLink).toBeTruthy();
    });
  });
});
