import { test, expect } from '@playwright/test';

test.describe('Smoke Test', () => {
  test('should load the landing page', async ({ page }) => {
    await page.goto('/');

    // Verify title
    await expect(page).toHaveTitle(/HospoGo/i);

    // Verify "Login" and "Sign Up" buttons are visible
    // Note: Based on navbar.tsx, the text is "Login" and "Sign Up"
    // Use exact: true because there might be other links with "Login" text (e.g. "Already have an account? Login")
    await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign Up' })).toBeVisible();
    
    // Verify Logo is present (use .first() as there might be multiple logos on the page)
    const logo = page.getByAltText('HospoGo Logo').first();
    await expect(logo).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(/.*\/login/);
    
    // Verify login page content
    // Check for "Sign In" button (using testid for robustness)
    await expect(page.getByTestId('button-signin')).toBeVisible();
  });
});

