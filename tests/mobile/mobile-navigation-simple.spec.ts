import { test, expect, devices } from '@playwright/test';

// Test on mobile devices
test.use({ ...devices['iPhone 12'] });

test.describe('Mobile Navigation - Simple Test', () => {
  test('should display mobile navigation menu when logged in', async ({ page }) => {
    // Go to landing page
    await page.goto('/');
    
    // Check if login button exists
    await expect(page.locator('[data-testid="button-login"]')).toBeVisible({ timeout: 10000 });
    
    // Click login
    await page.click('[data-testid="button-login"]');
    
    // Fill login form
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to role selection or dashboard
    await page.waitForURL(/.*role-selection|.*dashboard/, { timeout: 15000 });
    
    // Go back to home page where navbar should be visible
    await page.goto('/');
    
    // Check if mobile menu button is visible
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible({ timeout: 10000 });
    
    // Click mobile menu button
    await page.click('[data-testid="mobile-menu-button"]');
    
    // Check if mobile menu is visible
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible({ timeout: 10000 });
    
    // Check if navigation items are visible
    const navItems = page.locator('[data-testid="mobile-nav-jobs"], [data-testid="mobile-nav-community"], [data-testid="mobile-nav-messages"]');
    await expect(navItems.first()).toBeVisible({ timeout: 5000 });
  });
  
  test('should navigate to mobile jobs page', async ({ page }) => {
    // Go to landing page and login
    await page.goto('/');
    await page.click('[data-testid="button-login"]');
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*role-selection|.*dashboard/, { timeout: 15000 });
    
    // Go to home and open mobile menu
    await page.goto('/');
    await page.click('[data-testid="mobile-menu-button"]');
    
    // Click jobs navigation
    await page.click('[data-testid="mobile-nav-jobs"]');
    
    // Should navigate to mobile jobs page
    await expect(page).toHaveURL(/.*mobile\/jobs/, { timeout: 10000 });
  });
});
