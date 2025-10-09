import { test, expect } from '@playwright/test';

test.describe('Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('User can view their profile information', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'existing@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to profile
    await page.goto('/profile');
    
    // Should display profile information
    await expect(page.locator('[data-testid="profile-email"]')).toContainText('existing@example.com');
    await expect(page.locator('[data-testid="profile-name"]')).toContainText('Existing User');
    await expect(page.locator('[data-testid="profile-roles"]')).toContainText('Professional');
  });

  test('User can edit basic profile information (name, email, profile picture)', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'existing@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to profile
    await page.goto('/profile');
    
    // Click edit profile button
    await page.click('[data-testid="edit-profile-button"]');
    
    // Update name
    await page.fill('[data-testid="profile-name-input"]', 'Updated Name');
    
    // Update email
    await page.fill('[data-testid="profile-email-input"]', 'updated@example.com');
    
    // Upload profile picture
    await page.setInputFiles('[data-testid="profile-picture-input"]', 'test-assets/profile-pic.jpg');
    
    // Save changes
    await page.click('[data-testid="save-profile-button"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Profile updated successfully');
    
    // Should reflect changes
    await expect(page.locator('[data-testid="profile-name"]')).toContainText('Updated Name');
    await expect(page.locator('[data-testid="profile-email"]')).toContainText('updated@example.com');
  });

  test('User can update role-specific profile information', async ({ page }) => {
    // Login with multi-role user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'multirole@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to profile
    await page.goto('/profile');
    
    // Switch to professional role
    await page.click('[data-testid="role-switcher-button"]');
    await page.click('[data-testid="role-option-professional"]');
    
    // Click edit professional profile
    await page.click('[data-testid="edit-role-profile-button"]');
    
    // Update professional-specific information
    await page.fill('[data-testid="skills-input"]', 'Hair Cutting, Beard Trimming, Customer Service');
    await page.fill('[data-testid="experience-input"]', '5 years');
    await page.fill('[data-testid="certifications-input"]', 'Barber License, First Aid');
    
    // Save changes
    await page.click('[data-testid="save-role-profile-button"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Professional profile updated');
    
    // Should reflect changes
    await expect(page.locator('[data-testid="professional-skills"]')).toContainText('Hair Cutting, Beard Trimming, Customer Service');
    await expect(page.locator('[data-testid="professional-experience"]')).toContainText('5 years');
  });

  test('Professional can update skills, certifications, and experience', async ({ page }) => {
    // Login as professional
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'professional@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to professional profile
    await page.goto('/professional/profile');
    
    // Click edit skills
    await page.click('[data-testid="edit-skills-button"]');
    await page.fill('[data-testid="skills-textarea"]', 'Advanced Fade Techniques, Beard Styling, Hot Towel Shaves');
    await page.click('[data-testid="save-skills-button"]');
    
    // Click edit certifications
    await page.click('[data-testid="edit-certifications-button"]');
    await page.fill('[data-testid="certifications-textarea"]', 'Master Barber Certification, OSHA Safety Training');
    await page.click('[data-testid="save-certifications-button"]');
    
    // Click edit experience
    await page.click('[data-testid="edit-experience-button"]');
    await page.fill('[data-testid="experience-input"]', '8 years in high-end barbershops');
    await page.click('[data-testid="save-experience-button"]');
    
    // Verify all updates
    await expect(page.locator('[data-testid="skills-display"]')).toContainText('Advanced Fade Techniques');
    await expect(page.locator('[data-testid="certifications-display"]')).toContainText('Master Barber Certification');
    await expect(page.locator('[data-testid="experience-display"]')).toContainText('8 years');
  });

  test('Hub can update business information, address, and operating hours', async ({ page }) => {
    // Login as hub
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'hub@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to hub profile
    await page.goto('/hub/profile');
    
    // Update business information
    await page.click('[data-testid="edit-business-info-button"]');
    await page.fill('[data-testid="business-name-input"]', 'Elite Barbershop');
    await page.fill('[data-testid="business-description-input"]', 'Premium barbershop offering modern cuts and traditional services');
    await page.fill('[data-testid="phone-input"]', '+61 2 1234 5678');
    
    // Update address
    await page.fill('[data-testid="address-input"]', '123 Collins Street');
    await page.fill('[data-testid="city-input"]', 'Sydney');
    await page.fill('[data-testid="state-input"]', 'NSW');
    await page.fill('[data-testid="postcode-input"]', '2000');
    
    // Update operating hours
    await page.fill('[data-testid="monday-hours-input"]', '9:00 AM - 6:00 PM');
    await page.fill('[data-testid="tuesday-hours-input"]', '9:00 AM - 6:00 PM');
    await page.fill('[data-testid="saturday-hours-input"]', '8:00 AM - 4:00 PM');
    
    // Save changes
    await page.click('[data-testid="save-business-profile-button"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Business profile updated');
    
    // Should reflect changes
    await expect(page.locator('[data-testid="business-name-display"]')).toContainText('Elite Barbershop');
    await expect(page.locator('[data-testid="business-address-display"]')).toContainText('123 Collins Street, Sydney NSW 2000');
  });

  test('Brand can update company information and product categories', async ({ page }) => {
    // Login as brand
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'brand@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to brand profile
    await page.goto('/brand/profile');
    
    // Update company information
    await page.click('[data-testid="edit-company-info-button"]');
    await page.fill('[data-testid="company-name-input"]', 'Premium Hair Products Co.');
    await page.fill('[data-testid="company-description-input"]', 'Leading manufacturer of professional hair care products');
    await page.fill('[data-testid="website-input"]', 'https://premiumhair.com.au');
    await page.fill('[data-testid="contact-email-input"]', 'info@premiumhair.com.au');
    
    // Update product categories
    await page.check('[data-testid="category-checkbox-shampoos"]');
    await page.check('[data-testid="category-checkbox-styling-products"]');
    await page.check('[data-testid="category-checkbox-tools"]');
    
    // Save changes
    await page.click('[data-testid="save-company-profile-button"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Company profile updated');
    
    // Should reflect changes
    await expect(page.locator('[data-testid="company-name-display"]')).toContainText('Premium Hair Products Co.');
    await expect(page.locator('[data-testid="product-categories-display"]')).toContainText('Shampoos, Styling Products, Tools');
  });

  test('Trainer can update qualifications and specializations', async ({ page }) => {
    // Login as trainer
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'trainer@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to trainer profile
    await page.goto('/trainer/profile');
    
    // Update qualifications
    await page.click('[data-testid="edit-qualifications-button"]');
    await page.fill('[data-testid="qualifications-textarea"]', 'Master Barber Certification, Teaching Certificate, 15+ years experience');
    await page.click('[data-testid="save-qualifications-button"]');
    
    // Update specializations
    await page.click('[data-testid="edit-specializations-button"]');
    await page.check('[data-testid="specialization-checkbox-fade-techniques"]');
    await page.check('[data-testid="specialization-checkbox-beard-styling"]');
    await page.check('[data-testid="specialization-checkbox-business-skills"]');
    await page.click('[data-testid="save-specializations-button"]');
    
    // Verify updates
    await expect(page.locator('[data-testid="qualifications-display"]')).toContainText('Master Barber Certification');
    await expect(page.locator('[data-testid="specializations-display"]')).toContainText('Fade Techniques, Beard Styling, Business Skills');
  });

  test('User can upload and update profile pictures', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'existing@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to profile
    await page.goto('/profile');
    
    // Click change profile picture
    await page.click('[data-testid="change-profile-picture-button"]');
    
    // Upload new profile picture
    await page.setInputFiles('[data-testid="profile-picture-upload"]', 'test-assets/new-profile-pic.jpg');
    
    // Confirm upload
    await page.click('[data-testid="confirm-upload-button"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Profile picture updated');
    
    // Should show new profile picture
    await expect(page.locator('[data-testid="profile-picture"]')).toHaveAttribute('src', /new-profile-pic/);
  });

  test('User profile changes are saved and reflected immediately', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'existing@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to profile
    await page.goto('/profile');
    
    // Make a change
    await page.click('[data-testid="edit-profile-button"]');
    await page.fill('[data-testid="profile-name-input"]', 'Immediate Update Test');
    await page.click('[data-testid="save-profile-button"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Profile updated successfully');
    
    // Should immediately reflect the change
    await expect(page.locator('[data-testid="profile-name"]')).toContainText('Immediate Update Test');
    
    // Navigate away and back to verify persistence
    await page.goto('/professional/dashboard');
    await page.goto('/profile');
    
    // Should still show the updated name
    await expect(page.locator('[data-testid="profile-name"]')).toContainText('Immediate Update Test');
  });

  test('User receives validation errors for invalid profile data', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'existing@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to profile
    await page.goto('/profile');
    
    // Try to update with invalid email
    await page.click('[data-testid="edit-profile-button"]');
    await page.fill('[data-testid="profile-email-input"]', 'invalid-email');
    await page.click('[data-testid="save-profile-button"]');
    
    // Should show validation error
    await expect(page.locator('[data-testid="validation-error-email"]')).toContainText('Please enter a valid email address');
    
    // Try to update with empty name
    await page.fill('[data-testid="profile-name-input"]', '');
    await page.click('[data-testid="save-profile-button"]');
    
    // Should show validation error
    await expect(page.locator('[data-testid="validation-error-name"]')).toContainText('Name is required');
    
    // Should not save changes
    await expect(page.locator('[data-testid="success-message"]')).not.toBeVisible();
  });
});
