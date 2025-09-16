import { test, expect } from '@playwright/test';

test.describe('Dashboard Access and Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for dashboard data
    await page.route('**/api/users/*/profile', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profileType: 'professional',
          data: JSON.stringify({
            skills: ['Fades', 'Beard Trim', 'Hair Cutting'],
            experience: '5+ years',
            homeLocation: { city: 'Sydney', state: 'NSW', country: 'Australia' },
            isRoamingNomad: true,
            stripeConnected: true
          })
        })
      });
    });

    await page.route('**/api/jobs**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jobs: [
            {
              id: '1',
              title: 'Barber Needed - Weekend Shift',
              shopName: 'Elite Barbershop',
              location: 'Sydney, NSW',
              pay: '$35/hour',
              duration: '8 hours',
              date: '2024-01-15',
              description: 'Looking for experienced barber for weekend shift'
            }
          ]
        })
      });
    });

    await page.route('**/api/professionals**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          professionals: [
            {
              id: '1',
              name: 'John Barber',
              skills: ['Fades', 'Beard Trim'],
              experience: '3+ years',
              location: 'Sydney, NSW',
              rating: 4.8,
              availability: ['Monday', 'Tuesday', 'Wednesday']
            }
          ]
        })
      });
    });
  });

  test('Professional Dashboard Access After Onboarding', async ({ page }) => {
    // Complete barber onboarding first
    await page.goto('/role-selection');
    
    await page.getByTestId('button-select-professional').click();
    await page.getByTestId('button-continue').click();
    
    // Complete onboarding quickly
    await page.getByLabel('Full Name').fill('John Barber');
    await page.getByLabel('Email Address').fill('john@barber.com');
    await page.getByLabel('Phone Number').fill('0412345678');
    await page.getByLabel('Location').fill('Sydney, NSW');
    await page.getByRole('button', { name: 'Next' }).click();
    
    await page.getByLabel('ABN Number').fill('12345678901');
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Mock file uploads
    const insuranceFile = await page.getByLabel('Click to upload');
    await insuranceFile.setInputFiles({
      name: 'insurance.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake content')
    });
    await page.getByRole('button', { name: 'Next' }).click();
    
    const qualificationFile = await page.getByLabel('Click to upload');
    await qualificationFile.setInputFiles({
      name: 'qualification.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake content')
    });
    await page.getByRole('button', { name: 'Next' }).click();
    
    await page.getByLabel('Fades').check();
    await page.getByRole('button', { name: 'Next' }).click();
    
    await page.getByLabel('I prefer to work at the shop').check();
    await page.getByRole('button', { name: 'Next' }).click();
    
    await page.getByRole('button', { name: 'Connect with Stripe' }).click();
    await page.getByRole('button', { name: 'Complete Setup' }).click();
    
    // Should redirect to professional dashboard
    await expect(page).toHaveURL(/.*professional-dashboard/);
    
    // Verify dashboard content
    await expect(page.getByText('Professional Dashboard')).toBeVisible();
    await expect(page.getByText('Find Shifts')).toBeVisible();
    await expect(page.getByText('My Profile')).toBeVisible();
    await expect(page.getByText('Earnings')).toBeVisible();
  });

  test('Hub Dashboard Access After Onboarding', async ({ page }) => {
    // Complete shop onboarding first
    await page.goto('/role-selection');
    
    await page.getByTestId('button-select-hub').click();
    await page.getByTestId('button-continue').click();
    
    // Complete onboarding quickly
    await page.getByLabel('Shop Name').fill('Elite Barbershop');
    await page.getByLabel('Address').fill('123 Main Street, Sydney, NSW');
    await page.getByLabel('Phone Number').fill('0298765432');
    await page.getByRole('button', { name: 'Next' }).click();
    
    await page.getByLabel('Modern').check();
    await page.getByLabel('Chair Capacity').click();
    await page.getByText('3-4 chairs').click();
    await page.getByRole('button', { name: 'Next' }).click();
    
    await page.getByLabel('ABN Number').fill('98765432109');
    const insuranceFile = await page.getByLabel('Click to upload');
    await insuranceFile.setInputFiles({
      name: 'insurance.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake content')
    });
    await page.getByRole('button', { name: 'Complete Setup' }).click();
    
    // Should redirect to hub dashboard
    await expect(page).toHaveURL(/.*hub-dashboard/);
    
    // Verify dashboard content
    await expect(page.getByText('Hub Dashboard')).toBeVisible();
    await expect(page.getByText('Post Jobs')).toBeVisible();
    await expect(page.getByText('Find Professionals')).toBeVisible();
    await expect(page.getByText('Manage Bookings')).toBeVisible();
  });

  test('Brand Dashboard Access After Onboarding', async ({ page }) => {
    // Complete brand onboarding first
    await page.goto('/role-selection');
    
    await page.getByTestId('button-select-brand').click();
    await page.getByTestId('button-continue').click();
    
    // Complete onboarding quickly
    await page.getByLabel('Company Name').fill('Premium Hair Products');
    await page.getByLabel('Contact Name').fill('Sarah Johnson');
    await page.getByLabel('Email Address').fill('sarah@premiumhair.com');
    await page.getByLabel('Location').fill('Melbourne, VIC');
    await page.getByRole('button', { name: 'Next' }).click();
    
    await page.getByLabel('Product Brand').check();
    await page.getByLabel('Business Description').fill('Premium hair care products for professionals');
    await page.getByRole('button', { name: 'Next' }).click();
    
    await page.getByLabel('Hair Care Products').check();
    await page.getByRole('button', { name: 'Next' }).click();
    
    await page.getByLabel('Product Trials').check();
    await page.getByLabel('Professional Barbers').check();
    await page.getByRole('button', { name: 'Complete Setup' }).click();
    
    // Should redirect to brand dashboard
    await expect(page).toHaveURL(/.*brand-dashboard/);
    
    // Verify dashboard content
    await expect(page.getByText('Brand Dashboard')).toBeVisible();
    await expect(page.getByText('Content Management')).toBeVisible();
    await expect(page.getByText('Partnership Opportunities')).toBeVisible();
    await expect(page.getByText('Analytics')).toBeVisible();
  });

  test('Trainer Dashboard Access After Onboarding', async ({ page }) => {
    // Complete trainer onboarding first
    await page.goto('/role-selection');
    
    await page.getByTestId('button-select-trainer').click();
    await page.getByTestId('button-continue').click();
    
    // Complete onboarding quickly
    await page.getByLabel('Company Name').fill('Barber Academy');
    await page.getByLabel('Contact Name').fill('Mike Trainer');
    await page.getByLabel('Email Address').fill('mike@barberacademy.com');
    await page.getByLabel('Location').fill('Brisbane, QLD');
    await page.getByRole('button', { name: 'Next' }).click();
    
    await page.getByLabel('Education/Training').check();
    await page.getByLabel('Business Description').fill('Professional barbering education');
    await page.getByRole('button', { name: 'Next' }).click();
    
    await page.getByLabel('Educational Content').check();
    await page.getByRole('button', { name: 'Next' }).click();
    
    await page.getByLabel('Educational Partnerships').check();
    await page.getByLabel('Students/Trainees').check();
    await page.getByRole('button', { name: 'Complete Setup' }).click();
    
    // Should redirect to trainer dashboard
    await expect(page).toHaveURL(/.*trainer-dashboard/);
    
    // Verify dashboard content
    await expect(page.getByText('Trainer Dashboard')).toBeVisible();
    await expect(page.getByText('Course Management')).toBeVisible();
    await expect(page.getByText('Student Progress')).toBeVisible();
    await expect(page.getByText('Training Materials')).toBeVisible();
  });

  test('Role Switching After Multiple Role Selection', async ({ page }) => {
    // Select multiple roles
    await page.goto('/role-selection');
    
    await page.getByTestId('button-select-professional').click();
    await page.getByTestId('button-select-hub').click();
    await page.getByTestId('button-continue').click();
    
    // Complete professional onboarding
    await page.getByLabel('Full Name').fill('John Barber');
    await page.getByLabel('Email Address').fill('john@barber.com');
    await page.getByLabel('Phone Number').fill('0412345678');
    await page.getByLabel('Location').fill('Sydney, NSW');
    await page.getByRole('button', { name: 'Next' }).click();
    
    await page.getByLabel('ABN Number').fill('12345678901');
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Mock file uploads
    const insuranceFile = await page.getByLabel('Click to upload');
    await insuranceFile.setInputFiles({
      name: 'insurance.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake content')
    });
    await page.getByRole('button', { name: 'Next' }).click();
    
    const qualificationFile = await page.getByLabel('Click to upload');
    await qualificationFile.setInputFiles({
      name: 'qualification.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake content')
    });
    await page.getByRole('button', { name: 'Next' }).click();
    
    await page.getByLabel('Fades').check();
    await page.getByRole('button', { name: 'Next' }).click();
    
    await page.getByLabel('I prefer to work at the shop').check();
    await page.getByRole('button', { name: 'Next' }).click();
    
    await page.getByRole('button', { name: 'Connect with Stripe' }).click();
    await page.getByRole('button', { name: 'Complete Setup' }).click();
    
    // Should be on professional dashboard
    await expect(page).toHaveURL(/.*professional-dashboard/);
    
    // Look for role switcher in navigation
    await expect(page.getByText('Professional')).toBeVisible();
    
    // Test role switching (this would depend on your navigation implementation)
    // await page.getByRole('button', { name: 'Switch Role' }).click();
    // await page.getByText('Hub Owner').click();
    // await expect(page).toHaveURL(/.*hub-dashboard/);
  });

  test('Dashboard Data Loading and Display', async ({ page }) => {
    // Go directly to professional dashboard
    await page.goto('/professional-dashboard');
    
    // Verify dashboard loads with data
    await expect(page.getByText('Professional Dashboard')).toBeVisible();
    
    // Check if job listings are displayed
    await expect(page.getByText('Barber Needed - Weekend Shift')).toBeVisible();
    await expect(page.getByText('Elite Barbershop')).toBeVisible();
    await expect(page.getByText('$35/hour')).toBeVisible();
    
    // Check if profile information is displayed
    await expect(page.getByText('John Barber')).toBeVisible();
    await expect(page.getByText('5+ years')).toBeVisible();
    await expect(page.getByText('Sydney, NSW')).toBeVisible();
  });

  test('Dashboard Navigation and Functionality', async ({ page }) => {
    // Go to professional dashboard
    await page.goto('/professional-dashboard');
    
    // Test navigation between dashboard sections
    await page.getByText('Find Shifts').click();
    await expect(page.getByText('Available Shifts')).toBeVisible();
    
    await page.getByText('My Profile').click();
    await expect(page.getByText('Profile Settings')).toBeVisible();
    
    await page.getByText('Earnings').click();
    await expect(page.getByText('Earnings Overview')).toBeVisible();
    
    // Test job application functionality
    await page.getByText('Find Shifts').click();
    await page.getByRole('button', { name: 'Apply' }).first().click();
    
    // Should show application confirmation or modal
    await expect(page.getByText('Application Submitted')).toBeVisible();
  });

  test('Dashboard Error Handling', async ({ page }) => {
    // Mock API error
    await page.route('**/api/jobs**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    await page.goto('/professional-dashboard');
    
    // Should handle error gracefully
    await expect(page.getByText('Error loading jobs')).toBeVisible();
    await expect(page.getByText('Please try again later')).toBeVisible();
  });

  test('Dashboard Responsive Design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/professional-dashboard');
    
    // Verify mobile layout
    await expect(page.getByText('Professional Dashboard')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/professional-dashboard');
    
    // Verify tablet layout
    await expect(page.getByText('Professional Dashboard')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/professional-dashboard');
    
    // Verify desktop layout
    await expect(page.getByText('Professional Dashboard')).toBeVisible();
  });

  test('Dashboard Authentication and Access Control', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/professional-dashboard');
    
    // Should redirect to login or show access denied
    await expect(page).toHaveURL(/.*login/);
    
    // Mock authentication
    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'test-user', roles: ['professional'] }
        })
      });
    });
    
    await page.goto('/professional-dashboard');
    
    // Should now have access
    await expect(page.getByText('Professional Dashboard')).toBeVisible();
  });
});
