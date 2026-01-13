import { test, expect } from '@playwright/test';

test.describe('Navigation Test', () => {
  test('should navigate public links', async ({ page }) => {
    await page.goto('/');
    
    // Check Login link navigation
    // Use exact: true to distinguish from other login links if any
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(/.*\/login/);
    
    // Go back
    await page.goto('/');
    
    // Check Sign Up link navigation
    await page.getByRole('link', { name: 'Sign Up' }).click();
    await expect(page).toHaveURL(/.*\/signup/);
  });

  // FIXME: This test requires a valid test user. 
  // Run `node scripts/create-test-user.cjs` with valid credentials to seed the user.
  test.fixme('should navigate to Find Shifts and Messages (Authenticated)', async ({ page }) => {
    // This test requires authentication.
    // We attempt to log in with a test user.
    
    await page.goto('/login');
    
    // Fill in credentials
    await page.getByLabel('Email Address').fill('test@hospogo.com');
    await page.getByLabel('Password').fill('password123');
    
    // Click Sign In
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    // Wait for navigation to home/dashboard
    await expect(page).toHaveURL(/.*\/home/, { timeout: 15000 });

    // Check Navbar links
    
    // 1. "Find Shifts" -> /jobs
    await page.getByRole('link', { name: 'Find Shifts' }).click();
    await expect(page).toHaveURL(/.*\/jobs/);
    
    // 2. "Messages" -> /messages
    await page.getByRole('link', { name: /messages/i }).click();
    await expect(page).toHaveURL(/.*\/messages/);
  });
});
