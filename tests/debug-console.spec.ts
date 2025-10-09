import { test, expect } from '@playwright/test';

test.describe('Console Debug Test', () => {
  test('should check for console errors', async ({ page }) => {
    const consoleMessages: string[] = [];
    const errors: string[] = [];
    
    // Capture console messages
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      errors.push(`Page error: ${error.message}`);
    });
    
    try {
      await page.goto('/', { timeout: 30000 });
      
      // Wait a bit for the app to load
      await page.waitForTimeout(3000);
      
      console.log('Console messages:', consoleMessages);
      console.log('Errors:', errors);
      
      // Check if there are any errors
      if (errors.length > 0) {
        console.error('Found errors:', errors);
      }
      
      // Check if React app loaded
      const rootElement = await page.locator('#root').textContent();
      console.log('Root element content:', rootElement);
      
      // Check if any React components are rendered
      const hasReactContent = await page.locator('div').count() > 1;
      console.log('Has React content:', hasReactContent);
      
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });
});
