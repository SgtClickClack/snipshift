import { test, expect } from '@playwright/test';

test.describe('User Registration & Login', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('User can successfully register for an account with email and password', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/signup');
    
    // Fill out registration form
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.fill('[data-testid="confirm-password-input"]', 'password123');
    await page.fill('[data-testid="name-input"]', 'Test User');
    
    // Submit registration
    await page.click('[data-testid="register-button"]');
    
    // Should redirect to role selection
    await expect(page).toHaveURL('/role-selection');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Account created successfully');
  });

  test('User can register with Google OAuth authentication', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/signup');
    
    // Mock Google OAuth response
    await page.route('**/api/oauth/google/exchange', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'google-user-123',
          email: 'google@example.com',
          roles: [],
          currentRole: null,
          displayName: 'Google User'
        })
      });
    });
    
    // Click Google signup button
    await page.click('[data-testid="google-signup-button"]');
    
    // Should redirect to role selection
    await expect(page).toHaveURL('/role-selection');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Welcome! Please select your role');
  });

  test('User can login with existing email and password credentials', async ({ page }) => {
    // First create a test user
    await page.goto('/api/test/login');
    await page.route('**/api/test/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-123',
          email: 'existing@example.com',
          roles: ['professional'],
          currentRole: 'professional',
          displayName: 'Existing User'
        })
      });
    });
    
    // Navigate to login page
    await page.goto('/login');
    
    // Fill out login form
    await page.fill('[data-testid="email-input"]', 'existing@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    
    // Submit login
    await page.click('[data-testid="login-button"]');
    
    // Should redirect to professional dashboard
    await expect(page).toHaveURL('/professional/dashboard');
    
    // Should show welcome message
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome back, Existing User');
  });

  test('User can login with Google OAuth', async ({ page }) => {
    // Mock Google OAuth response for existing user
    await page.route('**/api/oauth/google/exchange', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'google-user-456',
          email: 'existing-google@example.com',
          roles: ['hub'],
          currentRole: 'hub',
          displayName: 'Google Hub User'
        })
      });
    });
    
    // Navigate to login page
    await page.goto('/login');
    
    // Click Google login button
    await page.click('[data-testid="google-login-button"]');
    
    // Should redirect to hub dashboard
    await expect(page).toHaveURL('/hub/dashboard');
    
    // Should show welcome message
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome back, Google Hub User');
  });

  test('User receives appropriate error messages for invalid login credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Try to login with invalid credentials
    await page.fill('[data-testid="email-input"]', 'invalid@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    
    // Submit login
    await page.click('[data-testid="login-button"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid email or password');
    
    // Should stay on login page
    await expect(page).toHaveURL('/login');
  });

  test('User receives appropriate error messages for duplicate email registration', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/signup');
    
    // Try to register with existing email
    await page.fill('[data-testid="email-input"]', 'existing@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.fill('[data-testid="confirm-password-input"]', 'password123');
    await page.fill('[data-testid="name-input"]', 'Test User');
    
    // Submit registration
    await page.click('[data-testid="register-button"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('User already exists with this email');
    
    // Should stay on signup page
    await expect(page).toHaveURL('/signup');
  });

  test('User can reset password via email link', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Click forgot password link
    await page.click('[data-testid="forgot-password-link"]');
    
    // Should navigate to password reset page
    await expect(page).toHaveURL('/forgot-password');
    
    // Enter email for password reset
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.click('[data-testid="reset-password-button"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Password reset email sent');
  });

  test('User session persists across browser refreshes', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'existing@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Should be on dashboard
    await expect(page).toHaveURL('/professional/dashboard');
    
    // Refresh the page
    await page.reload();
    
    // Should still be on dashboard (session persisted)
    await expect(page).toHaveURL('/professional/dashboard');
    
    // Should still show user info
    await expect(page.locator('[data-testid="user-name"]')).toContainText('Existing User');
  });

  test('User can logout successfully and is redirected to landing page', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'existing@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Should be on dashboard
    await expect(page).toHaveURL('/professional/dashboard');
    
    // Click logout
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to landing page
    await expect(page).toHaveURL('/');
    
    // Should not show user info
    await expect(page.locator('[data-testid="user-name"]')).not.toBeVisible();
  });

  test('User session expires after appropriate timeout period', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'existing@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Should be on dashboard
    await expect(page).toHaveURL('/professional/dashboard');
    
    // Mock session expiration by clearing session storage
    await page.evaluate(() => {
      // Simulate session expiration
      localStorage.removeItem('currentUser');
    });
    
    // Try to access protected route
    await page.goto('/professional/dashboard');
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login');
    
    // Should show session expired message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Session expired');
  });
});
