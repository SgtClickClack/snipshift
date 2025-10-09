import { test, expect, Page } from '@playwright/test';

test.describe('Shift Marketplace', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a professional user
    await page.goto('/');
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'professional@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.click('[data-testid="login-button"]');
  });

  test.describe('Job Feed & Browsing', () => {
    test('should display job feed with available shifts', async ({ page }) => {
      await page.goto('/jobs');
      
      await expect(page.locator('[data-testid="job-feed"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-card"]')).toHaveCount.greaterThan(0);
      
      // Check job card elements
      const firstJobCard = page.locator('[data-testid="job-card"]').first();
      await expect(firstJobCard.locator('[data-testid="job-title"]')).toBeVisible();
      await expect(firstJobCard.locator('[data-testid="job-location"]')).toBeVisible();
      await expect(firstJobCard.locator('[data-testid="job-pay"]')).toBeVisible();
      await expect(firstJobCard.locator('[data-testid="job-date"]')).toBeVisible();
    });

    test('should filter jobs by location', async ({ page }) => {
      await page.goto('/jobs');
      
      await page.click('[data-testid="location-filter"]');
      await page.fill('[data-testid="location-search"]', 'Sydney');
      await page.click('[data-testid="apply-location-filter"]');
      
      // All visible jobs should be in Sydney
      const jobCards = page.locator('[data-testid="job-card"]');
      const count = await jobCards.count();
      
      for (let i = 0; i < count; i++) {
        const location = await jobCards.nth(i).locator('[data-testid="job-location"]').textContent();
        expect(location).toContain('Sydney');
      }
    });

    test('should filter jobs by date range', async ({ page }) => {
      await page.goto('/jobs');
      
      await page.click('[data-testid="date-filter"]');
      await page.fill('[data-testid="start-date"]', '2024-01-01');
      await page.fill('[data-testid="end-date"]', '2024-01-31');
      await page.click('[data-testid="apply-date-filter"]');
      
      // Jobs should be within the date range
      const jobCards = page.locator('[data-testid="job-card"]');
      const count = await jobCards.count();
      
      for (let i = 0; i < count; i++) {
        const dateText = await jobCards.nth(i).locator('[data-testid="job-date"]').textContent();
        expect(dateText).toMatch(/Jan|January/);
      }
    });

    test('should filter jobs by pay range', async ({ page }) => {
      await page.goto('/jobs');
      
      await page.click('[data-testid="pay-filter"]');
      await page.fill('[data-testid="min-pay"]', '25');
      await page.fill('[data-testid="max-pay"]', '50');
      await page.click('[data-testid="apply-pay-filter"]');
      
      // Jobs should be within pay range
      const jobCards = page.locator('[data-testid="job-card"]');
      const count = await jobCards.count();
      
      for (let i = 0; i < count; i++) {
        const payText = await jobCards.nth(i).locator('[data-testid="job-pay"]').textContent();
        const payMatch = payText?.match(/\$(\d+)/);
        if (payMatch) {
          const pay = parseInt(payMatch[1]);
          expect(pay).toBeGreaterThanOrEqual(25);
          expect(pay).toBeLessThanOrEqual(50);
        }
      }
    });

    test('should search jobs by keywords', async ({ page }) => {
      await page.goto('/jobs');
      
      await page.fill('[data-testid="job-search"]', 'haircut');
      await page.click('[data-testid="search-button"]');
      
      // Jobs should contain the keyword
      const jobCards = page.locator('[data-testid="job-card"]');
      const count = await jobCards.count();
      
      for (let i = 0; i < count; i++) {
        const title = await jobCards.nth(i).locator('[data-testid="job-title"]').textContent();
        expect(title?.toLowerCase()).toContain('haircut');
      }
    });

    test('should sort jobs by different criteria', async ({ page }) => {
      await page.goto('/jobs');
      
      // Sort by pay (highest first)
      await page.click('[data-testid="sort-dropdown"]');
      await page.click('text=Pay (Highest)');
      
      const jobCards = page.locator('[data-testid="job-card"]');
      const firstPay = await jobCards.first().locator('[data-testid="job-pay"]').textContent();
      const lastPay = await jobCards.last().locator('[data-testid="job-pay"]').textContent();
      
      // First job should have higher pay than last
      const firstPayValue = parseInt(firstPay?.match(/\$(\d+)/)?.[1] || '0');
      const lastPayValue = parseInt(lastPay?.match(/\$(\d+)/)?.[1] || '0');
      expect(firstPayValue).toBeGreaterThanOrEqual(lastPayValue);
      
      // Sort by date (soonest first)
      await page.click('[data-testid="sort-dropdown"]');
      await page.click('text=Date (Soonest)');
      
      // Verify sorting changed
      await expect(page.locator('[data-testid="sort-indicator"]')).toContainText('Date (Soonest)');
    });
  });

  test.describe('Job Details & Application', () => {
    test('should display detailed job information', async ({ page }) => {
      await page.goto('/jobs');
      
      // Click on first job card
      await page.click('[data-testid="job-card"]').first();
      
      await expect(page.locator('[data-testid="job-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-description"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-requirements"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-location"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-pay"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-schedule"]')).toBeVisible();
      await expect(page.locator('[data-testid="employer-info"]')).toBeVisible();
    });

    test('should apply for a job', async ({ page }) => {
      await page.goto('/jobs');
      await page.click('[data-testid="job-card"]').first();
      
      await page.click('[data-testid="apply-button"]');
      
      // Application modal should open
      await expect(page.locator('[data-testid="application-modal"]')).toBeVisible();
      
      // Fill application form
      await page.fill('[data-testid="cover-letter"]', 'I am very interested in this position and have relevant experience.');
      await page.fill('[data-testid="availability-notes"]', 'Available for the full shift duration.');
      
      // Upload portfolio/resume if required
      const fileInput = page.locator('[data-testid="portfolio-upload"]');
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles({
          name: 'portfolio.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('fake-portfolio-data')
        });
      }
      
      await page.click('[data-testid="submit-application"]');
      
      await expect(page.locator('text=Application submitted successfully')).toBeVisible();
      await expect(page.locator('[data-testid="application-status"]')).toContainText('Applied');
    });

    test('should show application status', async ({ page }) => {
      await page.goto('/jobs');
      await page.click('[data-testid="job-card"]').first();
      
      // If already applied, should show status
      const applicationStatus = page.locator('[data-testid="application-status"]');
      if (await applicationStatus.isVisible()) {
        const status = await applicationStatus.textContent();
        expect(['Applied', 'Under Review', 'Accepted', 'Rejected']).toContain(status);
      }
    });

    test('should withdraw application', async ({ page }) => {
      await page.goto('/jobs');
      await page.click('[data-testid="job-card"]').first();
      
      // If application exists, should show withdraw option
      const withdrawButton = page.locator('[data-testid="withdraw-application"]');
      if (await withdrawButton.isVisible()) {
        await withdrawButton.click();
        await page.click('[data-testid="confirm-withdraw"]');
        
        await expect(page.locator('text=Application withdrawn')).toBeVisible();
        await expect(page.locator('[data-testid="apply-button"]')).toBeVisible();
      }
    });

    test('should save job for later', async ({ page }) => {
      await page.goto('/jobs');
      await page.click('[data-testid="job-card"]').first();
      
      await page.click('[data-testid="save-job-button"]');
      
      await expect(page.locator('text=Job saved')).toBeVisible();
      await expect(page.locator('[data-testid="saved-indicator"]')).toBeVisible();
      
      // Verify job appears in saved jobs
      await page.goto('/saved-jobs');
      await expect(page.locator('[data-testid="saved-job"]')).toHaveCount.greaterThan(0);
    });

    test('should share job with others', async ({ page }) => {
      await page.goto('/jobs');
      await page.click('[data-testid="job-card"]').first();
      
      await page.click('[data-testid="share-job-button"]');
      
      await expect(page.locator('[data-testid="share-modal"]')).toBeVisible();
      
      // Test copy link
      await page.click('[data-testid="copy-link-button"]');
      await expect(page.locator('text=Link copied to clipboard')).toBeVisible();
      
      // Test social sharing
      await page.click('[data-testid="share-facebook"]');
      // Should open Facebook share dialog (mocked)
    });
  });

  test.describe('Job Posting (Hub Owner)', () => {
    test.beforeEach(async ({ page }) => {
      // Login as hub owner
      await page.goto('/');
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'hubowner@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="login-button"]');
    });

    test('should create a new job posting', async ({ page }) => {
      await page.goto('/hub-dashboard');
      await page.click('[data-testid="post-job-button"]');
      
      await expect(page.locator('[data-testid="job-posting-form"]')).toBeVisible();
      
      // Fill job details
      await page.fill('[data-testid="job-title"]', 'Senior Barber Needed');
      await page.fill('[data-testid="job-description"]', 'Looking for an experienced barber to join our team for weekend shifts.');
      await page.selectOption('[data-testid="job-type"]', 'part-time');
      await page.fill('[data-testid="hourly-rate"]', '35');
      await page.fill('[data-testid="shift-duration"]', '8');
      
      // Set location
      await page.fill('[data-testid="job-location"]', '123 Main St, Sydney NSW 2000');
      
      // Set schedule
      await page.click('[data-testid="schedule-saturday"]');
      await page.fill('[data-testid="start-time"]', '09:00');
      await page.fill('[data-testid="end-time"]', '17:00');
      
      // Set requirements
      await page.check('[data-testid="requirement-experience"]');
      await page.check('[data-testid="requirement-license"]');
      await page.fill('[data-testid="additional-requirements"]', 'Must have own tools');
      
      await page.click('[data-testid="publish-job"]');
      
      await expect(page.locator('text=Job posted successfully')).toBeVisible();
      await expect(page).toHaveURL(/.*jobs.*/);
    });

    test('should edit existing job posting', async ({ page }) => {
      await page.goto('/hub-dashboard');
      await page.click('[data-testid="manage-jobs"]');
      
      // Click edit on first job
      await page.click('[data-testid="edit-job"]').first();
      
      await expect(page.locator('[data-testid="job-posting-form"]')).toBeVisible();
      
      // Update job details
      await page.fill('[data-testid="job-title"]', 'Updated Job Title');
      await page.fill('[data-testid="hourly-rate"]', '40');
      
      await page.click('[data-testid="update-job"]');
      
      await expect(page.locator('text=Job updated successfully')).toBeVisible();
    });

    test('should manage job applications', async ({ page }) => {
      await page.goto('/hub-dashboard');
      await page.click('[data-testid="manage-jobs"]');
      await page.click('[data-testid="view-applications"]').first();
      
      await expect(page.locator('[data-testid="applications-list"]')).toBeVisible();
      
      // View application details
      await page.click('[data-testid="view-application"]').first();
      
      await expect(page.locator('[data-testid="application-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="applicant-profile"]')).toBeVisible();
      await expect(page.locator('[data-testid="cover-letter"]')).toBeVisible();
      
      // Accept application
      await page.click('[data-testid="accept-application"]');
      await page.click('[data-testid="confirm-accept"]');
      
      await expect(page.locator('text=Application accepted')).toBeVisible();
      await expect(page.locator('[data-testid="application-status"]')).toContainText('Accepted');
    });

    test('should reject job application', async ({ page }) => {
      await page.goto('/hub-dashboard');
      await page.click('[data-testid="manage-jobs"]');
      await page.click('[data-testid="view-applications"]').first();
      await page.click('[data-testid="view-application"]').first();
      
      await page.click('[data-testid="reject-application"]');
      await page.fill('[data-testid="rejection-reason"]', 'Not enough experience for this role');
      await page.click('[data-testid="confirm-reject"]');
      
      await expect(page.locator('text=Application rejected')).toBeVisible();
      await expect(page.locator('[data-testid="application-status"]')).toContainText('Rejected');
    });

    test('should close job posting', async ({ page }) => {
      await page.goto('/hub-dashboard');
      await page.click('[data-testid="manage-jobs"]');
      
      await page.click('[data-testid="close-job"]').first();
      await page.click('[data-testid="confirm-close"]');
      
      await expect(page.locator('text=Job closed successfully')).toBeVisible();
      await expect(page.locator('[data-testid="job-status"]')).toContainText('Closed');
    });
  });

  test.describe('Smart Matching & Recommendations', () => {
    test('should display personalized job recommendations', async ({ page }) => {
      await page.goto('/jobs');
      
      await expect(page.locator('[data-testid="recommended-jobs"]')).toBeVisible();
      await expect(page.locator('[data-testid="recommendation-reason"]')).toBeVisible();
      
      // Check recommendation reasons
      const reasons = page.locator('[data-testid="recommendation-reason"]');
      const count = await reasons.count();
      
      for (let i = 0; i < count; i++) {
        const reason = await reasons.nth(i).textContent();
        expect(reason).toMatch(/Matches your skills|Near your location|Similar to previous jobs/);
      }
    });

    test('should show job match score', async ({ page }) => {
      await page.goto('/jobs');
      await page.click('[data-testid="job-card"]').first();
      
      const matchScore = page.locator('[data-testid="match-score"]');
      if (await matchScore.isVisible()) {
        const score = await matchScore.textContent();
        expect(score).toMatch(/\d+%/);
      }
    });

    test('should filter by match score', async ({ page }) => {
      await page.goto('/jobs');
      
      await page.click('[data-testid="match-filter"]');
      await page.selectOption('[data-testid="min-match-score"]', '80');
      await page.click('[data-testid="apply-match-filter"]');
      
      // All jobs should have match score >= 80%
      const jobCards = page.locator('[data-testid="job-card"]');
      const count = await jobCards.count();
      
      for (let i = 0; i < count; i++) {
        const matchScore = jobCards.nth(i).locator('[data-testid="match-score"]');
        if (await matchScore.isVisible()) {
          const score = await matchScore.textContent();
          const scoreValue = parseInt(score?.match(/(\d+)%/)?.[1] || '0');
          expect(scoreValue).toBeGreaterThanOrEqual(80);
        }
      }
    });
  });

  test.describe('Payment & Billing', () => {
    test('should display payment information for jobs', async ({ page }) => {
      await page.goto('/jobs');
      await page.click('[data-testid="job-card"]').first();
      
      await expect(page.locator('[data-testid="payment-info"]')).toBeVisible();
      await expect(page.locator('[data-testid="hourly-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-pay"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-method"]')).toBeVisible();
    });

    test('should show payment history', async ({ page }) => {
      await page.goto('/payments');
      
      await expect(page.locator('[data-testid="payment-history"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-item"]')).toHaveCount.greaterThan(0);
      
      // Check payment details
      const firstPayment = page.locator('[data-testid="payment-item"]').first();
      await expect(firstPayment.locator('[data-testid="payment-date"]')).toBeVisible();
      await expect(firstPayment.locator('[data-testid="payment-amount"]')).toBeVisible();
      await expect(firstPayment.locator('[data-testid="payment-status"]')).toBeVisible();
    });

    test('should set up payment method', async ({ page }) => {
      await page.goto('/payments');
      await page.click('[data-testid="add-payment-method"]');
      
      await expect(page.locator('[data-testid="payment-setup-form"]')).toBeVisible();
      
      // Fill payment details (mocked)
      await page.fill('[data-testid="card-number"]', '4242424242424242');
      await page.fill('[data-testid="expiry-date"]', '12/25');
      await page.fill('[data-testid="cvv"]', '123');
      await page.fill('[data-testid="cardholder-name"]', 'John Doe');
      
      await page.click('[data-testid="save-payment-method"]');
      
      await expect(page.locator('text=Payment method added successfully')).toBeVisible();
    });
  });

  test.describe('Reviews & Ratings', () => {
    test('should display job reviews', async ({ page }) => {
      await page.goto('/jobs');
      await page.click('[data-testid="job-card"]').first();
      
      await expect(page.locator('[data-testid="job-reviews"]')).toBeVisible();
      await expect(page.locator('[data-testid="average-rating"]')).toBeVisible();
      await expect(page.locator('[data-testid="review-item"]')).toHaveCount.greaterThan(0);
    });

    test('should leave a review after job completion', async ({ page }) => {
      await page.goto('/completed-jobs');
      await page.click('[data-testid="leave-review"]').first();
      
      await expect(page.locator('[data-testid="review-form"]')).toBeVisible();
      
      // Fill review
      await page.click('[data-testid="rating-5"]');
      await page.fill('[data-testid="review-text"]', 'Great experience working with this hub. Professional and friendly environment.');
      await page.check('[data-testid="recommend-hub"]');
      
      await page.click('[data-testid="submit-review"]');
      
      await expect(page.locator('text=Review submitted successfully')).toBeVisible();
    });

    test('should view employer reviews', async ({ page }) => {
      await page.goto('/jobs');
      await page.click('[data-testid="job-card"]').first();
      
      await page.click('[data-testid="view-employer-reviews"]');
      
      await expect(page.locator('[data-testid="employer-reviews"]')).toBeVisible();
      await expect(page.locator('[data-testid="employer-rating"]')).toBeVisible();
    });
  });
});
