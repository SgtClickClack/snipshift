import { test, expect } from '@playwright/test';

test.describe('Multi-Role User System', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('User can select multiple roles during registration', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/signup');
    
    // Fill out registration form
    await page.fill('[data-testid="email-input"]', 'multirole@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.fill('[data-testid="confirm-password-input"]', 'password123');
    await page.fill('[data-testid="name-input"]', 'Multi Role User');
    
    // Submit registration
    await page.click('[data-testid="register-button"]');
    
    // Should redirect to role selection
    await expect(page).toHaveURL('/role-selection');
    
    // Select multiple roles
    await page.check('[data-testid="role-checkbox-hub"]');
    await page.check('[data-testid="role-checkbox-professional"]');
    await page.check('[data-testid="role-checkbox-brand"]');
    
    // Submit role selection
    await page.click('[data-testid="confirm-roles-button"]');
    
    // Should redirect to onboarding for first role
    await expect(page).toHaveURL('/onboarding/hub');
    
    // Verify user has multiple roles
    await page.goto('/profile');
    await expect(page.locator('[data-testid="user-roles"]')).toContainText('Hub, Professional, Brand');
  });

  test('User can add additional roles to existing account', async ({ page }) => {
    // Login with existing user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'existing@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to profile
    await page.goto('/profile');
    
    // Click add role button
    await page.click('[data-testid="add-role-button"]');
    
    // Select additional role
    await page.check('[data-testid="role-checkbox-trainer"]');
    await page.click('[data-testid="confirm-add-role-button"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Role added successfully');
    
    // Verify role was added
    await expect(page.locator('[data-testid="user-roles"]')).toContainText('Professional, Trainer');
  });

  test('User can remove roles from their account (except last remaining role)', async ({ page }) => {
    // Login with multi-role user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'multirole@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to profile
    await page.goto('/profile');
    
    // Try to remove a role
    await page.click('[data-testid="remove-role-button-brand"]');
    await page.click('[data-testid="confirm-remove-role-button"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Role removed successfully');
    
    // Verify role was removed
    await expect(page.locator('[data-testid="user-roles"]')).toContainText('Hub, Professional');
    await expect(page.locator('[data-testid="user-roles"]')).not.toContainText('Brand');
  });

  test('User cannot remove their last remaining role', async ({ page }) => {
    // Login with single-role user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'single-role@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to profile
    await page.goto('/profile');
    
    // Try to remove the only role
    await page.click('[data-testid="remove-role-button-professional"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Cannot remove your last remaining role');
    
    // Role should still be present
    await expect(page.locator('[data-testid="user-roles"]')).toContainText('Professional');
  });

  test('User can switch between active roles using role switcher', async ({ page }) => {
    // Login with multi-role user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'multirole@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Should be on hub dashboard (first role)
    await expect(page).toHaveURL('/hub/dashboard');
    
    // Open role switcher
    await page.click('[data-testid="role-switcher-button"]');
    
    // Switch to professional role
    await page.click('[data-testid="role-option-professional"]');
    
    // Should redirect to professional dashboard
    await expect(page).toHaveURL('/professional/dashboard');
    
    // Verify role switcher shows professional as active
    await page.click('[data-testid="role-switcher-button"]');
    await expect(page.locator('[data-testid="active-role-indicator"]')).toContainText('Professional');
  });

  test('User sees role-specific dashboard based on current active role', async ({ page }) => {
    // Login with multi-role user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'multirole@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Switch to hub role
    await page.click('[data-testid="role-switcher-button"]');
    await page.click('[data-testid="role-option-hub"]');
    
    // Should see hub-specific dashboard
    await expect(page).toHaveURL('/hub/dashboard');
    await expect(page.locator('[data-testid="dashboard-title"]')).toContainText('Hub Dashboard');
    await expect(page.locator('[data-testid="hub-specific-features"]')).toBeVisible();
    
    // Switch to professional role
    await page.click('[data-testid="role-switcher-button"]');
    await page.click('[data-testid="role-option-professional"]');
    
    // Should see professional-specific dashboard
    await expect(page).toHaveURL('/professional/dashboard');
    await expect(page.locator('[data-testid="dashboard-title"]')).toContainText('Professional Dashboard');
    await expect(page.locator('[data-testid="professional-specific-features"]')).toBeVisible();
  });

  test('User can update their current active role', async ({ page }) => {
    // Login with multi-role user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'multirole@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to profile
    await page.goto('/profile');
    
    // Change current role
    await page.selectOption('[data-testid="current-role-select"]', 'brand');
    await page.click('[data-testid="update-current-role-button"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Current role updated');
    
    // Should redirect to brand dashboard
    await expect(page).toHaveURL('/brand/dashboard');
  });

  test('User profile displays all assigned roles', async ({ page }) => {
    // Login with multi-role user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'multirole@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to profile
    await page.goto('/profile');
    
    // Should display all roles
    await expect(page.locator('[data-testid="user-roles"]')).toContainText('Hub');
    await expect(page.locator('[data-testid="user-roles"]')).toContainText('Professional');
    await expect(page.locator('[data-testid="user-roles"]')).toContainText('Brand');
    
    // Should show current active role
    await expect(page.locator('[data-testid="current-role-display"]')).toContainText('Hub');
  });

  test('User cannot access role-specific features without having that role', async ({ page }) => {
    // Login with single-role user (professional only)
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'single-role@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Try to access hub dashboard
    await page.goto('/hub/dashboard');
    
    // Should redirect to professional dashboard
    await expect(page).toHaveURL('/professional/dashboard');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('You do not have access to this role');
  });

  test('User receives appropriate error when trying to access unauthorized role features', async ({ page }) => {
    // Login with professional user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'single-role@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Try to access hub-specific feature
    await page.goto('/hub/create-job');
    
    // Should show unauthorized error
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Unauthorized access');
    
    // Should redirect to user's dashboard
    await expect(page).toHaveURL('/professional/dashboard');
  });
});
