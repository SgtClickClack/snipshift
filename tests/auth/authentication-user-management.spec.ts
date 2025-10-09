import { test, expect, Page } from '@playwright/test';

test.describe('Authentication & User Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test.describe('User Registration', () => {
    test('should register a new user with valid credentials', async ({ page }) => {
      // Navigate to signup page
      await page.click('text=Sign Up');
      await expect(page).toHaveURL('/signup');

      // Fill registration form
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'SecurePassword123!');
      await page.fill('[data-testid="first-name-input"]', 'John');
      await page.fill('[data-testid="last-name-input"]', 'Doe');

      // Submit registration
      await page.click('[data-testid="register-button"]');

      // Should redirect to role selection
      await expect(page).toHaveURL('/role-selection');
      await expect(page.locator('text=Choose Your Role')).toBeVisible();
    });

    test('should show validation errors for invalid registration data', async ({ page }) => {
      await page.click('text=Sign Up');
      
      // Try to submit empty form
      await page.click('[data-testid="register-button"]');
      
      // Check for validation errors
      await expect(page.locator('text=Email is required')).toBeVisible();
      await expect(page.locator('text=Password is required')).toBeVisible();
      await expect(page.locator('text=First name is required')).toBeVisible();
      await expect(page.locator('text=Last name is required')).toBeVisible();

      // Test invalid email format
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.click('[data-testid="register-button"]');
      await expect(page.locator('text=Please enter a valid email')).toBeVisible();

      // Test password mismatch
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'Password123!');
      await page.fill('[data-testid="confirm-password-input"]', 'DifferentPassword123!');
      await page.click('[data-testid="register-button"]');
      await expect(page.locator('text=Passwords do not match')).toBeVisible();

      // Test weak password
      await page.fill('[data-testid="password-input"]', 'weak');
      await page.fill('[data-testid="confirm-password-input"]', 'weak');
      await page.click('[data-testid="register-button"]');
      await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
    });

    test('should handle duplicate email registration', async ({ page }) => {
      await page.click('text=Sign Up');
      
      // Try to register with existing email
      await page.fill('[data-testid="email-input"]', 'existing@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'SecurePassword123!');
      await page.fill('[data-testid="first-name-input"]', 'John');
      await page.fill('[data-testid="last-name-input"]', 'Doe');
      
      await page.click('[data-testid="register-button"]');
      
      // Should show error message
      await expect(page.locator('text=An account with this email already exists')).toBeVisible();
    });
  });

  test.describe('User Login', () => {
    test('should login with valid credentials', async ({ page }) => {
      await page.click('text=Login');
      await expect(page).toHaveURL('/login');

      // Fill login form
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      
      await page.click('[data-testid="login-button"]');

      // Should redirect to dashboard or role selection
      await expect(page).toHaveURL(/.*\/(dashboard|role-selection)/);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.click('text=Login');
      
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'WrongPassword');
      
      await page.click('[data-testid="login-button"]');
      
      await expect(page.locator('text=Invalid email or password')).toBeVisible();
    });

    test('should handle empty login form', async ({ page }) => {
      await page.click('text=Login');
      
      await page.click('[data-testid="login-button"]');
      
      await expect(page.locator('text=Email is required')).toBeVisible();
      await expect(page.locator('text=Password is required')).toBeVisible();
    });

    test('should remember login state after page refresh', async ({ page }) => {
      // Login first
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="login-button"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*\/(dashboard|role-selection)/);
      
      // Refresh page
      await page.reload();
      
      // Should still be logged in
      await expect(page).toHaveURL(/.*\/(dashboard|role-selection)/);
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });
  });

  test.describe('Google OAuth Authentication', () => {
    test('should initiate Google OAuth flow', async ({ page }) => {
      await page.click('text=Sign Up');
      
      // Click Google sign up button
      await page.click('[data-testid="google-signup-button"]');
      
      // Should redirect to Google OAuth
      await expect(page).toHaveURL(/accounts\.google\.com/);
    });

    test('should handle Google OAuth callback', async ({ page }) => {
      // Mock successful OAuth callback
      await page.goto('/oauth-callback?code=mock-code&state=mock-state');
      
      // Should redirect to role selection or dashboard
      await expect(page).toHaveURL(/.*\/(role-selection|dashboard)/);
    });

    test('should handle Google OAuth errors', async ({ page }) => {
      // Mock OAuth error callback
      await page.goto('/oauth-callback?error=access_denied');
      
      // Should show error message and redirect to login
      await expect(page.locator('text=Authentication failed')).toBeVisible();
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Password Reset', () => {
    test('should send password reset email', async ({ page }) => {
      await page.click('text=Login');
      await page.click('text=Forgot Password?');
      
      await expect(page).toHaveURL('/forgot-password');
      
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.click('[data-testid="send-reset-button"]');
      
      await expect(page.locator('text=Password reset email sent')).toBeVisible();
    });

    test('should validate email for password reset', async ({ page }) => {
      await page.goto('/forgot-password');
      
      // Try with invalid email
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.click('[data-testid="send-reset-button"]');
      
      await expect(page.locator('text=Please enter a valid email')).toBeVisible();
      
      // Try with empty email
      await page.fill('[data-testid="email-input"]', '');
      await page.click('[data-testid="send-reset-button"]');
      
      await expect(page.locator('text=Email is required')).toBeVisible();
    });

    test('should handle password reset with valid token', async ({ page }) => {
      // Mock password reset page with valid token
      await page.goto('/reset-password?token=valid-token');
      
      await page.fill('[data-testid="new-password-input"]', 'NewSecurePassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'NewSecurePassword123!');
      await page.click('[data-testid="reset-password-button"]');
      
      await expect(page.locator('text=Password updated successfully')).toBeVisible();
      await expect(page).toHaveURL('/login');
    });

    test('should handle invalid password reset token', async ({ page }) => {
      await page.goto('/reset-password?token=invalid-token');
      
      await expect(page.locator('text=Invalid or expired reset token')).toBeVisible();
      await expect(page).toHaveURL('/forgot-password');
    });
  });

  test.describe('Profile Management', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="login-button"]');
      
      // Navigate to profile
      await page.click('[data-testid="user-menu"]');
      await page.click('text=Profile');
    });

    test('should display current profile information', async ({ page }) => {
      await expect(page.locator('[data-testid="profile-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="first-name-input"]')).toHaveValue('John');
      await expect(page.locator('[data-testid="last-name-input"]')).toHaveValue('Doe');
      await expect(page.locator('[data-testid="email-input"]')).toHaveValue('test@example.com');
    });

    test('should update profile information', async ({ page }) => {
      await page.fill('[data-testid="first-name-input"]', 'Jane');
      await page.fill('[data-testid="last-name-input"]', 'Smith');
      await page.fill('[data-testid="phone-input"]', '+1234567890');
      await page.fill('[data-testid="bio-textarea"]', 'Updated bio information');
      
      await page.click('[data-testid="save-profile-button"]');
      
      await expect(page.locator('text=Profile updated successfully')).toBeVisible();
      
      // Verify changes persisted
      await page.reload();
      await expect(page.locator('[data-testid="first-name-input"]')).toHaveValue('Jane');
      await expect(page.locator('[data-testid="last-name-input"]')).toHaveValue('Smith');
    });

    test('should upload and update profile picture', async ({ page }) => {
      // Mock file upload
      const fileInput = page.locator('[data-testid="profile-picture-input"]');
      await fileInput.setInputFiles({
        name: 'profile.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      });
      
      await page.click('[data-testid="save-profile-button"]');
      
      await expect(page.locator('text=Profile picture updated')).toBeVisible();
      await expect(page.locator('[data-testid="profile-picture"]')).toBeVisible();
    });

    test('should change password', async ({ page }) => {
      await page.click('text=Change Password');
      
      await page.fill('[data-testid="current-password-input"]', 'SecurePassword123!');
      await page.fill('[data-testid="new-password-input"]', 'NewSecurePassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'NewSecurePassword123!');
      
      await page.click('[data-testid="change-password-button"]');
      
      await expect(page.locator('text=Password changed successfully')).toBeVisible();
    });

    test('should validate password change form', async ({ page }) => {
      await page.click('text=Change Password');
      
      // Test empty current password
      await page.click('[data-testid="change-password-button"]');
      await expect(page.locator('text=Current password is required')).toBeVisible();
      
      // Test password mismatch
      await page.fill('[data-testid="current-password-input"]', 'SecurePassword123!');
      await page.fill('[data-testid="new-password-input"]', 'NewPassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'DifferentPassword123!');
      await page.click('[data-testid="change-password-button"]');
      await expect(page.locator('text=New passwords do not match')).toBeVisible();
    });
  });

  test.describe('Role Management', () => {
    test.beforeEach(async ({ page }) => {
      // Login and navigate to role selection
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="login-button"]');
    });

    test('should select single role', async ({ page }) => {
      await page.click('[data-testid="role-barber"]');
      await page.click('[data-testid="continue-button"]');
      
      await expect(page).toHaveURL('/onboarding/barber');
    });

    test('should select multiple roles', async ({ page }) => {
      await page.click('[data-testid="role-barber"]');
      await page.click('[data-testid="role-trainer"]');
      await page.click('[data-testid="continue-button"]');
      
      // Should show role selection modal or dashboard with role switcher
      await expect(page.locator('[data-testid="role-switcher"]')).toBeVisible();
    });

    test('should switch between roles', async ({ page }) => {
      // Setup user with multiple roles
      await page.click('[data-testid="role-barber"]');
      await page.click('[data-testid="role-trainer"]');
      await page.click('[data-testid="continue-button"]');
      
      // Switch to trainer role
      await page.click('[data-testid="role-switcher"]');
      await page.click('text=Trainer');
      
      await expect(page).toHaveURL(/.*trainer.*dashboard/);
      await expect(page.locator('text=Trainer Dashboard')).toBeVisible();
      
      // Switch back to barber role
      await page.click('[data-testid="role-switcher"]');
      await page.click('text=Barber');
      
      await expect(page).toHaveURL(/.*professional.*dashboard/);
      await expect(page.locator('text=Professional Dashboard')).toBeVisible();
    });

    test('should add new role to existing user', async ({ page }) => {
      // User already has barber role, add trainer role
      await page.click('[data-testid="user-menu"]');
      await page.click('text=Add Role');
      
      await page.click('[data-testid="role-trainer"]');
      await page.click('[data-testid="add-role-button"]');
      
      await expect(page.locator('text=Role added successfully')).toBeVisible();
      await expect(page.locator('[data-testid="role-switcher"]')).toBeVisible();
    });
  });

  test.describe('Session Management', () => {
    test('should logout user', async ({ page }) => {
      // Login first
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="login-button"]');
      
      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('text=Logout');
      
      await expect(page).toHaveURL('/');
      await expect(page.locator('text=Login')).toBeVisible();
      await expect(page.locator('text=Sign Up')).toBeVisible();
    });

    test('should handle session timeout', async ({ page }) => {
      // Login first
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="login-button"]');
      
      // Mock session timeout by clearing auth tokens
      await page.evaluate(() => {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('user');
      });
      
      // Try to access protected page
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL('/login');
      await expect(page.locator('text=Session expired. Please login again')).toBeVisible();
    });

    test('should handle concurrent sessions', async ({ page, context }) => {
      // Login in first browser
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="login-button"]');
      
      // Create second browser context and login
      const secondContext = await context.browser()?.newContext();
      const secondPage = await secondContext?.newPage();
      
      if (secondPage) {
        await secondPage.goto('/');
        await secondPage.click('text=Login');
        await secondPage.fill('[data-testid="email-input"]', 'test@example.com');
        await secondPage.fill('[data-testid="password-input"]', 'SecurePassword123!');
        await secondPage.click('[data-testid="login-button"]');
        
        // First session should be invalidated or show warning
        await page.reload();
        await expect(page.locator('text=Another session detected')).toBeVisible();
      }
    });
  });

  test.describe('Account Security', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="login-button"]');
    });

    test('should display security settings', async ({ page }) => {
      await page.click('[data-testid="user-menu"]');
      await page.click('text=Security');
      
      await expect(page.locator('text=Security Settings')).toBeVisible();
      await expect(page.locator('[data-testid="change-password-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="two-factor-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-sessions-section"]')).toBeVisible();
    });

    test('should enable two-factor authentication', async ({ page }) => {
      await page.click('[data-testid="user-menu"]');
      await page.click('text=Security');
      
      await page.click('[data-testid="enable-2fa-button"]');
      
      // Should show QR code or setup instructions
      await expect(page.locator('[data-testid="2fa-setup"]')).toBeVisible();
      
      // Enter verification code
      await page.fill('[data-testid="2fa-code-input"]', '123456');
      await page.click('[data-testid="verify-2fa-button"]');
      
      await expect(page.locator('text=Two-factor authentication enabled')).toBeVisible();
    });

    test('should view active sessions', async ({ page }) => {
      await page.click('[data-testid="user-menu"]');
      await page.click('text=Security');
      
      await expect(page.locator('[data-testid="active-sessions-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="current-session"]')).toBeVisible();
    });

    test('should revoke active sessions', async ({ page }) => {
      await page.click('[data-testid="user-menu"]');
      await page.click('text=Security');
      
      await page.click('[data-testid="revoke-session-button"]');
      await page.click('[data-testid="confirm-revoke-button"]');
      
      await expect(page.locator('text=Session revoked successfully')).toBeVisible();
    });

    test('should delete account', async ({ page }) => {
      await page.click('[data-testid="user-menu"]');
      await page.click('text=Account Settings');
      await page.click('text=Delete Account');
      
      // Should show confirmation dialog
      await expect(page.locator('text=Are you sure you want to delete your account?')).toBeVisible();
      
      await page.fill('[data-testid="delete-confirmation-input"]', 'DELETE');
      await page.click('[data-testid="confirm-delete-button"]');
      
      await expect(page).toHaveURL('/');
      await expect(page.locator('text=Account deleted successfully')).toBeVisible();
    });
  });
});
