import { test, expect } from '@playwright/test';

test.describe('Complete User Onboarding Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication - simulate logged in user
    await page.goto('/role-selection');
    
    // Mock API responses
    await page.route('**/api/users/*/roles', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.route('**/api/users/*/current-role', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ currentRole: 'professional' })
      });
    });

    await page.route('**/api/users/*/profile', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
  });

  test('Complete Barber Onboarding Journey', async ({ page }) => {
    // Step 1: Role Selection
    await expect(page.getByText('Welcome to Snipshift!')).toBeVisible();
    await expect(page.getByText('Select one or more roles to personalize your experience.')).toBeVisible();
    
    // Select Professional role
    await page.getByTestId('button-select-professional').click();
    await expect(page.getByTestId('button-select-professional')).toHaveClass(/ring-2/);
    
    // Continue to onboarding
    await page.getByTestId('button-continue').click();
    
    // Step 2: Barber Onboarding Flow
    await expect(page.getByText('Professional Barber Onboarding')).toBeVisible();
    await expect(page.getByText('Complete your profile to start finding opportunities')).toBeVisible();
    
    // Basic Information Step
    await expect(page.getByText('Basic Information')).toBeVisible();
    await expect(page.getByText('Step 1 of 7')).toBeVisible();
    
    // Fill basic information
    await page.getByLabel('Full Name').fill('John Barber');
    await page.getByLabel('Email Address').fill('john@barber.com');
    await page.getByLabel('Phone Number').fill('0412345678');
    await page.getByLabel('Location').fill('Sydney, NSW');
    
    // Navigate to next step
    await page.getByRole('button', { name: 'Next' }).click();
    
    // ABN & Business Step
    await expect(page.getByText('ABN & Business')).toBeVisible();
    await expect(page.getByText('Step 2 of 7')).toBeVisible();
    
    await page.getByLabel('ABN Number').fill('12345678901');
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Insurance Step
    await expect(page.getByText('Insurance')).toBeVisible();
    await expect(page.getByText('Step 3 of 7')).toBeVisible();
    
    // Upload insurance file
    const insuranceFile = await page.getByLabel('Click to upload');
    await insuranceFile.setInputFiles({
      name: 'insurance.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake insurance content')
    });
    
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Qualifications Step
    await expect(page.getByText('Qualifications')).toBeVisible();
    await expect(page.getByText('Step 4 of 7')).toBeVisible();
    
    // Upload qualification file
    const qualificationFile = await page.getByLabel('Click to upload');
    await qualificationFile.setInputFiles({
      name: 'qualification.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake qualification content')
    });
    
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Skills & Portfolio Step
    await expect(page.getByText('Skills & Portfolio')).toBeVisible();
    await expect(page.getByText('Step 5 of 7')).toBeVisible();
    
    // Select skills
    await page.getByLabel('Fades').check();
    await page.getByLabel('Beard Trim').check();
    await page.getByLabel('Hair Cutting').check();
    
    // Add Instagram link
    await page.getByLabel('Instagram Link (Optional)').fill('https://instagram.com/johnbarber');
    
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Availability Step
    await expect(page.getByText('Availability')).toBeVisible();
    await expect(page.getByText('Step 6 of 7')).toBeVisible();
    
    // Select travel preferences
    await page.getByLabel('I prefer to work at the shop').check();
    await page.getByLabel('I can travel to client locations').check();
    
    // Select availability days
    await page.getByLabel('Monday').check();
    await page.getByLabel('Tuesday').check();
    await page.getByLabel('Wednesday').check();
    await page.getByLabel('Thursday').check();
    await page.getByLabel('Friday').check();
    
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Payment Setup Step
    await expect(page.getByText('Payment Setup')).toBeVisible();
    await expect(page.getByText('Step 7 of 7')).toBeVisible();
    
    // Connect with Stripe
    await page.getByRole('button', { name: 'Connect with Stripe' }).click();
    
    // Wait for connection to complete
    await expect(page.getByText('Stripe Connected Successfully!')).toBeVisible();
    
    // Complete onboarding
    await page.getByRole('button', { name: 'Complete Setup' }).click();
    
    // Should redirect to professional dashboard
    await expect(page).toHaveURL(/.*professional-dashboard/);
  });

  test('Complete Shop Onboarding Journey', async ({ page }) => {
    // Step 1: Role Selection
    await page.getByTestId('button-select-hub').click();
    await page.getByTestId('button-continue').click();
    
    // Step 2: Shop Onboarding Flow
    await expect(page.getByText('Shop Owner Onboarding')).toBeVisible();
    await expect(page.getByText('Set up your barbershop profile to start hiring professionals')).toBeVisible();
    
    // Shop Details Step
    await expect(page.getByText('Shop Details')).toBeVisible();
    await expect(page.getByText('Step 1 of 3')).toBeVisible();
    
    // Fill shop details
    await page.getByLabel('Shop Name').fill('Elite Barbershop');
    await page.getByLabel('Address').fill('123 Main Street, Sydney, NSW');
    await page.getByLabel('Phone Number').fill('0298765432');
    await page.getByLabel('Website (Optional)').fill('https://elitebarbershop.com');
    
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Shop Vibe & Details Step
    await expect(page.getByText('Shop Vibe & Details')).toBeVisible();
    await expect(page.getByText('Step 2 of 3')).toBeVisible();
    
    // Select vibe tags
    await page.getByLabel('Modern').check();
    await page.getByLabel('High-end').check();
    await page.getByLabel('Professional').check();
    
    // Select chair capacity
    await page.getByLabel('Chair Capacity').click();
    await page.getByText('5-6 chairs').click();
    
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Verification Step
    await expect(page.getByText('Verification')).toBeVisible();
    await expect(page.getByText('Step 3 of 3')).toBeVisible();
    
    // Fill ABN
    await page.getByLabel('ABN Number').fill('98765432109');
    
    // Upload business insurance
    const insuranceFile = await page.getByLabel('Click to upload').first();
    await insuranceFile.setInputFiles({
      name: 'business-insurance.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake business insurance content')
    });
    
    // Upload shop photos
    const photoFile = await page.getByLabel('Click to upload').nth(1);
    await photoFile.setInputFiles([
      {
        name: 'shop-photo-1.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake photo content 1')
      },
      {
        name: 'shop-photo-2.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake photo content 2')
      }
    ]);
    
    // Complete onboarding
    await page.getByRole('button', { name: 'Complete Setup' }).click();
    
    // Should redirect to hub dashboard
    await expect(page).toHaveURL(/.*hub-dashboard/);
  });

  test('Complete Brand Onboarding Journey', async ({ page }) => {
    // Step 1: Role Selection
    await page.getByTestId('button-select-brand').click();
    await page.getByTestId('button-continue').click();
    
    // Step 2: Brand Onboarding Flow
    await expect(page.getByText('Brand & Trainer Onboarding')).toBeVisible();
    await expect(page.getByText('Set up your profile to connect with the barbering community')).toBeVisible();
    
    // Brand Information Step
    await expect(page.getByText('Brand Information')).toBeVisible();
    await expect(page.getByText('Step 1 of 4')).toBeVisible();
    
    // Fill brand information
    await page.getByLabel('Company Name').fill('Premium Hair Products');
    await page.getByLabel('Contact Name').fill('Sarah Johnson');
    await page.getByLabel('Email Address').fill('sarah@premiumhair.com');
    await page.getByLabel('Phone Number').fill('0398765432');
    await page.getByLabel('Location').fill('Melbourne, VIC');
    await page.getByLabel('Website').fill('https://premiumhair.com');
    
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Business Type Step
    await expect(page.getByText('Business Type')).toBeVisible();
    await expect(page.getByText('Step 2 of 4')).toBeVisible();
    
    // Select business type
    await page.getByLabel('Product Brand').check();
    
    // Fill description
    await page.getByLabel('Business Description').fill('We create premium hair care products specifically designed for professional barbers and stylists.');
    
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Content & Products Step
    await expect(page.getByText('Content & Products')).toBeVisible();
    await expect(page.getByText('Step 3 of 4')).toBeVisible();
    
    // Select product categories
    await page.getByLabel('Hair Care Products').check();
    await page.getByLabel('Styling Tools').check();
    await page.getByLabel('Barber Tools').check();
    await page.getByLabel('Beard Care').check();
    
    // Add social media links
    await page.getByLabel('Instagram').fill('https://instagram.com/premiumhair');
    await page.getByLabel('Facebook').fill('https://facebook.com/premiumhair');
    await page.getByLabel('YouTube').fill('https://youtube.com/premiumhair');
    
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Partnership Goals Step
    await expect(page.getByText('Partnership Goals')).toBeVisible();
    await expect(page.getByText('Step 4 of 4')).toBeVisible();
    
    // Select partnership goals
    await page.getByLabel('Product Trials').check();
    await page.getByLabel('Brand Ambassadors').check();
    await page.getByLabel('Event Sponsorship').check();
    await page.getByLabel('Content Collaboration').check();
    
    // Select target audience
    await page.getByLabel('Professional Barbers').check();
    await page.getByLabel('Barbershop Owners').check();
    await page.getByLabel('Hair Stylists').check();
    await page.getByLabel('Beauty Professionals').check();
    
    // Complete onboarding
    await page.getByRole('button', { name: 'Complete Setup' }).click();
    
    // Should redirect to brand dashboard
    await expect(page).toHaveURL(/.*brand-dashboard/);
  });

  test('Complete Trainer Onboarding Journey', async ({ page }) => {
    // Step 1: Role Selection
    await page.getByTestId('button-select-trainer').click();
    await page.getByTestId('button-continue').click();
    
    // Step 2: Trainer Onboarding Flow (same as brand but different business type)
    await expect(page.getByText('Brand & Trainer Onboarding')).toBeVisible();
    
    // Brand Information Step
    await page.getByLabel('Company Name').fill('Barber Academy');
    await page.getByLabel('Contact Name').fill('Mike Trainer');
    await page.getByLabel('Email Address').fill('mike@barberacademy.com');
    await page.getByLabel('Location').fill('Brisbane, QLD');
    
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Business Type Step - Select Education/Training
    await page.getByLabel('Education/Training').check();
    await page.getByLabel('Business Description').fill('We provide comprehensive barbering education and training programs for aspiring professionals.');
    
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Content & Products Step
    await page.getByLabel('Educational Content').check();
    await page.getByLabel('Training Materials').check();
    
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Partnership Goals Step
    await page.getByLabel('Educational Partnerships').check();
    await page.getByLabel('Workshop Sponsorship').check();
    await page.getByLabel('Community Building').check();
    
    await page.getByLabel('Students/Trainees').check();
    await page.getByLabel('Industry Influencers').check();
    
    // Complete onboarding
    await page.getByRole('button', { name: 'Complete Setup' }).click();
    
    // Should redirect to trainer dashboard
    await expect(page).toHaveURL(/.*trainer-dashboard/);
  });

  test('Multiple Role Selection Journey', async ({ page }) => {
    // Select multiple roles
    await page.getByTestId('button-select-professional').click();
    await page.getByTestId('button-select-hub').click();
    
    // Verify both are selected
    await expect(page.getByTestId('button-select-professional')).toHaveClass(/ring-2/);
    await expect(page.getByTestId('button-select-hub')).toHaveClass(/ring-2/);
    
    // Button text should reflect multiple selection
    await expect(page.getByTestId('button-continue')).toHaveText('Continue with selected roles');
    
    await page.getByTestId('button-continue').click();
    
    // Should start with professional onboarding (first selected role)
    await expect(page.getByText('Professional Barber Onboarding')).toBeVisible();
  });

  test('Onboarding Navigation and Progress', async ({ page }) => {
    // Start barber onboarding
    await page.getByTestId('button-select-professional').click();
    await page.getByTestId('button-continue').click();
    
    // Fill first step
    await page.getByLabel('Full Name').fill('John Barber');
    await page.getByLabel('Email Address').fill('john@barber.com');
    await page.getByLabel('Phone Number').fill('0412345678');
    await page.getByLabel('Location').fill('Sydney, NSW');
    
    // Check progress
    await expect(page.getByText('Step 1 of 7')).toBeVisible();
    await expect(page.getByText('14% Complete')).toBeVisible();
    
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Check progress updated
    await expect(page.getByText('Step 2 of 7')).toBeVisible();
    await expect(page.getByText('29% Complete')).toBeVisible();
    
    // Test going back
    await page.getByRole('button', { name: 'Previous' }).click();
    await expect(page.getByText('Step 1 of 7')).toBeVisible();
    
    // Test step navigation dots
    await page.getByRole('button', { name: '2' }).click();
    await expect(page.getByText('Step 2 of 7')).toBeVisible();
  });

  test('Form Validation and Error Handling', async ({ page }) => {
    // Start barber onboarding
    await page.getByTestId('button-select-professional').click();
    await page.getByTestId('button-continue').click();
    
    // Try to proceed without filling required fields
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Should stay on first step
    await expect(page.getByText('Step 1 of 7')).toBeVisible();
    
    // Fill only some fields
    await page.getByLabel('Full Name').fill('John Barber');
    await page.getByLabel('Email Address').fill('john@barber.com');
    
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Should still stay on first step
    await expect(page.getByText('Step 1 of 7')).toBeVisible();
    
    // Fill all required fields
    await page.getByLabel('Phone Number').fill('0412345678');
    await page.getByLabel('Location').fill('Sydney, NSW');
    
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Should proceed to next step
    await expect(page.getByText('Step 2 of 7')).toBeVisible();
  });

  test('Cancel Onboarding Flow', async ({ page }) => {
    // Start barber onboarding
    await page.getByTestId('button-select-professional').click();
    await page.getByTestId('button-continue').click();
    
    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    // Should return to role selection
    await expect(page.getByText('Welcome to Snipshift!')).toBeVisible();
  });

  test('File Upload Functionality', async ({ page }) => {
    // Start barber onboarding
    await page.getByTestId('button-select-professional').click();
    await page.getByTestId('button-continue').click();
    
    // Navigate to insurance step
    await page.getByLabel('Full Name').fill('John Barber');
    await page.getByLabel('Email Address').fill('john@barber.com');
    await page.getByLabel('Phone Number').fill('0412345678');
    await page.getByLabel('Location').fill('Sydney, NSW');
    await page.getByRole('button', { name: 'Next' }).click();
    
    await page.getByLabel('ABN Number').fill('12345678901');
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Test file upload
    const fileInput = await page.getByLabel('Click to upload');
    await fileInput.setInputFiles({
      name: 'insurance.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake insurance content')
    });
    
    // Verify file upload success message
    await expect(page.getByText('✓ insurance.pdf uploaded successfully')).toBeVisible();
    
    // Should be able to proceed
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Step 4 of 7')).toBeVisible();
  });
});
