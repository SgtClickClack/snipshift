import { test, expect } from '@playwright/test';

test.describe('User Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to signup page from homepage', async ({ page }) => {
    await page.getByTestId('link-signup').click();
    await expect(page).toHaveURL('/signup');
    await expect(page.getByTestId('heading-signup')).toContainText('Join Snipshift');
  });

  test('should display all role options in signup form', async ({ page }) => {
    await page.goto('/signup');
    
    // Check that all user roles are available
    await expect(page.getByTestId('option-hub')).toBeVisible();
    await expect(page.getByTestId('option-professional')).toBeVisible();
    await expect(page.getByTestId('option-trainer')).toBeVisible();
    await expect(page.getByTestId('option-brand')).toBeVisible();
  });

  test('should successfully demonstrate hub login via demo', async ({ page }) => {
    await page.goto('/demo');
    
    // Click hub demo login
    await page.getByTestId('demo-login-hub').click();
    
    // Should redirect to hub dashboard
    await expect(page).toHaveURL('/hub-dashboard');
    await expect(page.getByTestId('heading-dashboard')).toBeVisible();
  });

  test('should successfully demonstrate professional login via demo', async ({ page }) => {
    await page.goto('/demo');
    
    // Click professional demo login
    await page.getByTestId('demo-login-professional').click();
    
    // Should redirect to professional dashboard
    await expect(page).toHaveURL('/professional-dashboard');
    await expect(page.getByTestId('heading-dashboard')).toBeVisible();
  });

  test('should successfully demonstrate trainer login via demo', async ({ page }) => {
    await page.goto('/demo');
    
    // Click trainer demo login
    await page.getByTestId('demo-login-trainer').click();
    
    // Should redirect to trainer dashboard
    await expect(page).toHaveURL('/trainer-dashboard');
    await expect(page.getByTestId('heading-dashboard')).toBeVisible();
  });

  test('should successfully demonstrate brand login via demo', async ({ page }) => {
    await page.goto('/demo');
    
    // Click brand demo login  
    await page.getByTestId('demo-login-brand').click();
    
    // Should redirect to brand dashboard
    await expect(page).toHaveURL('/brand-dashboard');
    await expect(page.getByTestId('heading-dashboard')).toBeVisible();
  });

  test('should allow user to switch between login and signup', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('link-signup').click();
    await expect(page).toHaveURL('/signup');
    
    await page.getByTestId('link-login').click();
    await expect(page).toHaveURL('/login');
  });

  test('should validate form inputs', async ({ page }) => {
    await page.goto('/signup');
    
    // Try to submit empty form
    await page.getByTestId('button-signup').click();
    
    // Should show validation - check HTML validation
    const emailField = page.getByTestId('input-email');
    const passwordField = page.getByTestId('input-password');
    
    await expect(emailField).toHaveAttribute('required');
    await expect(passwordField).toHaveAttribute('required');
  });

  test('should display design system showcase', async ({ page }) => {
    await page.goto('/demo');
    
    // Click design showcase button
    await page.getByText('View Design System').click();
    
    // Should redirect to design showcase
    await expect(page).toHaveURL('/design-showcase');
    await expect(page.getByTestId('design-showcase')).toBeVisible();
    
    // Should display chrome buttons
    await expect(page.getByTestId('chrome-button')).toBeVisible();
    await expect(page.getByTestId('accent-button')).toBeVisible();
    await expect(page.getByTestId('steel-button')).toBeVisible();
  });
});