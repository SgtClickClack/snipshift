import { test, expect } from '@playwright/test';

test.describe('Basic Debug Test', () => {
  test('should load landing page', async ({ page }) => {
    console.log('Starting test...');
    
    try {
      await page.goto('/', { timeout: 30000 });
      console.log('Page loaded, URL:', page.url());
      
      // Check if page title exists
      const title = await page.title();
      console.log('Page title:', title);
      
      // Check if any content loads
      const body = await page.locator('body').textContent();
      console.log('Body content length:', body?.length || 0);
      
      // Check if login button exists
      const loginButton = page.locator('[data-testid="button-login"]');
      const isVisible = await loginButton.isVisible();
      console.log('Login button visible:', isVisible);
      
      if (isVisible) {
        console.log('Login button found!');
        await expect(loginButton).toBeVisible();
      } else {
        console.log('Login button not found, checking for any login-related elements...');
        const allButtons = await page.locator('button').allTextContents();
        console.log('All buttons:', allButtons);
      }
      
    } catch (error) {
      console.error('Test failed with error:', error);
      throw error;
    }
  });
});
