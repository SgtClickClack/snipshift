import { test, expect, Page } from '@playwright/test';

test.describe('Training Hub & Content Monetization', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a user
    await page.goto('/');
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.click('[data-testid="login-button"]');
  });

  test.describe('Training Hub Overview', () => {
    test('should display training hub dashboard', async ({ page }) => {
      await page.goto('/training');
      
      await expect(page.locator('[data-testid="training-hub"]')).toBeVisible();
      await expect(page.locator('[data-testid="featured-courses"]')).toBeVisible();
      await expect(page.locator('[data-testid="course-categories"]')).toBeVisible();
      await expect(page.locator('[data-testid="learning-progress"]')).toBeVisible();
    });

    test('should display course categories', async ({ page }) => {
      await page.goto('/training');
      
      const categories = page.locator('[data-testid="course-category"]');
      await expect(categories).toHaveCount.greaterThan(0);
      
      // Check category elements
      const firstCategory = categories.first();
      await expect(firstCategory.locator('[data-testid="category-name"]')).toBeVisible();
      await expect(firstCategory.locator('[data-testid="category-count"]')).toBeVisible();
      await expect(firstCategory.locator('[data-testid="category-image"]')).toBeVisible();
    });

    test('should filter courses by category', async ({ page }) => {
      await page.goto('/training');
      
      await page.click('[data-testid="course-category"]').first();
      
      await expect(page.locator('[data-testid="category-courses"]')).toBeVisible();
      await expect(page.locator('[data-testid="course-card"]')).toHaveCount.greaterThan(0);
      
      // All courses should belong to selected category
      const courseCards = page.locator('[data-testid="course-card"]');
      const count = await courseCards.count();
      
      for (let i = 0; i < count; i++) {
        const category = courseCards.nth(i).locator('[data-testid="course-category"]');
        await expect(category).toBeVisible();
      }
    });

    test('should search courses by keywords', async ({ page }) => {
      await page.goto('/training');
      
      await page.fill('[data-testid="course-search"]', 'hair cutting');
      await page.click('[data-testid="search-button"]');
      
      // Courses should contain the keyword
      const courseCards = page.locator('[data-testid="course-card"]');
      const count = await courseCards.count();
      
      for (let i = 0; i < count; i++) {
        const title = await courseCards.nth(i).locator('[data-testid="course-title"]').textContent();
        expect(title?.toLowerCase()).toMatch(/hair|cutting/);
      }
    });

    test('should sort courses by different criteria', async ({ page }) => {
      await page.goto('/training');
      
      // Sort by popularity
      await page.click('[data-testid="sort-dropdown"]');
      await page.click('text=Most Popular');
      
      await expect(page.locator('[data-testid="sort-indicator"]')).toContainText('Most Popular');
      
      // Sort by newest
      await page.click('[data-testid="sort-dropdown"]');
      await page.click('text=Newest');
      
      await expect(page.locator('[data-testid="sort-indicator"]')).toContainText('Newest');
      
      // Sort by price
      await page.click('[data-testid="sort-dropdown"]');
      await page.click('text=Price: Low to High');
      
      await expect(page.locator('[data-testid="sort-indicator"]')).toContainText('Price: Low to High');
    });
  });

  test.describe('Course Discovery & Details', () => {
    test('should display course details', async ({ page }) => {
      await page.goto('/training');
      await page.click('[data-testid="course-card"]').first();
      
      await expect(page.locator('[data-testid="course-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="course-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="course-instructor"]')).toBeVisible();
      await expect(page.locator('[data-testid="course-description"]')).toBeVisible();
      await expect(page.locator('[data-testid="course-curriculum"]')).toBeVisible();
      await expect(page.locator('[data-testid="course-reviews"]')).toBeVisible();
      await expect(page.locator('[data-testid="course-price"]')).toBeVisible();
    });

    test('should display course curriculum', async ({ page }) => {
      await page.goto('/training');
      await page.click('[data-testid="course-card"]').first();
      
      await expect(page.locator('[data-testid="course-curriculum"]')).toBeVisible();
      await expect(page.locator('[data-testid="lesson-item"]')).toHaveCount.greaterThan(0);
      
      // Check lesson elements
      const firstLesson = page.locator('[data-testid="lesson-item"]').first();
      await expect(firstLesson.locator('[data-testid="lesson-title"]')).toBeVisible();
      await expect(firstLesson.locator('[data-testid="lesson-duration"]')).toBeVisible();
      await expect(firstLesson.locator('[data-testid="lesson-type"]')).toBeVisible();
    });

    test('should display course reviews and ratings', async ({ page }) => {
      await page.goto('/training');
      await page.click('[data-testid="course-card"]').first();
      
      await expect(page.locator('[data-testid="course-reviews"]')).toBeVisible();
      await expect(page.locator('[data-testid="average-rating"]')).toBeVisible();
      await expect(page.locator('[data-testid="review-item"]')).toHaveCount.greaterThan(0);
      
      // Check review elements
      const firstReview = page.locator('[data-testid="review-item"]').first();
      await expect(firstReview.locator('[data-testid="reviewer-name"]')).toBeVisible();
      await expect(firstReview.locator('[data-testid="review-rating"]')).toBeVisible();
      await expect(firstReview.locator('[data-testid="review-text"]')).toBeVisible();
    });

    test('should show course prerequisites', async ({ page }) => {
      await page.goto('/training');
      await page.click('[data-testid="course-card"]').first();
      
      const prerequisites = page.locator('[data-testid="course-prerequisites"]');
      if (await prerequisites.isVisible()) {
        await expect(prerequisites.locator('[data-testid="prerequisite-item"]')).toHaveCount.greaterThan(0);
      }
    });

    test('should display instructor information', async ({ page }) => {
      await page.goto('/training');
      await page.click('[data-testid="course-card"]').first();
      
      await expect(page.locator('[data-testid="instructor-info"]')).toBeVisible();
      await expect(page.locator('[data-testid="instructor-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="instructor-bio"]')).toBeVisible();
      await expect(page.locator('[data-testid="instructor-rating"]')).toBeVisible();
      await expect(page.locator('[data-testid="instructor-courses"]')).toBeVisible();
    });
  });

  test.describe('Course Enrollment & Learning', () => {
    test('should enroll in a free course', async ({ page }) => {
      await page.goto('/training');
      await page.click('[data-testid="course-card"]').first();
      
      // Check if course is free
      const price = page.locator('[data-testid="course-price"]');
      if (await price.textContent() === 'Free') {
        await page.click('[data-testid="enroll-button"]');
        
        await expect(page.locator('text=Enrolled successfully')).toBeVisible();
        await expect(page).toHaveURL(/.*course.*learn/);
      }
    });

    test('should purchase a paid course', async ({ page }) => {
      await page.goto('/training');
      await page.click('[data-testid="course-card"]').first();
      
      // Check if course is paid
      const price = page.locator('[data-testid="course-price"]');
      const priceText = await price.textContent();
      
      if (priceText && priceText !== 'Free') {
        await page.click('[data-testid="purchase-button"]');
        
        await expect(page.locator('[data-testid="purchase-modal"]')).toBeVisible();
        await expect(page.locator('[data-testid="course-summary"]')).toBeVisible();
        await expect(page.locator('[data-testid="total-price"]')).toBeVisible();
        
        // Proceed to payment
        await page.click('[data-testid="proceed-payment"]');
        
        // Mock payment process
        await page.fill('[data-testid="card-number"]', '4242424242424242');
        await page.fill('[data-testid="expiry-date"]', '12/25');
        await page.fill('[data-testid="cvv"]', '123');
        await page.click('[data-testid="complete-payment"]');
        
        await expect(page.locator('text=Payment successful')).toBeVisible();
        await expect(page).toHaveURL(/.*course.*learn/);
      }
    });

    test('should access enrolled course content', async ({ page }) => {
      await page.goto('/my-courses');
      
      await expect(page.locator('[data-testid="enrolled-courses"]')).toBeVisible();
      await expect(page.locator('[data-testid="enrolled-course-card"]')).toHaveCount.greaterThan(0);
      
      // Click on enrolled course
      await page.click('[data-testid="enrolled-course-card"]').first();
      
      await expect(page.locator('[data-testid="course-player"]')).toBeVisible();
      await expect(page.locator('[data-testid="lesson-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
    });

    test('should track learning progress', async ({ page }) => {
      await page.goto('/my-courses');
      await page.click('[data-testid="enrolled-course-card"]').first();
      
      // Start first lesson
      await page.click('[data-testid="lesson-item"]').first();
      
      await expect(page.locator('[data-testid="video-player"]')).toBeVisible();
      await expect(page.locator('[data-testid="lesson-progress"]')).toBeVisible();
      
      // Mark lesson as complete
      await page.click('[data-testid="mark-complete"]');
      
      await expect(page.locator('text=Lesson completed')).toBeVisible();
      await expect(page.locator('[data-testid="completed-indicator"]')).toBeVisible();
      
      // Check overall progress
      await expect(page.locator('[data-testid="course-progress"]')).toContainText(/^\d+%/);
    });

    test('should take course quizzes', async ({ page }) => {
      await page.goto('/my-courses');
      await page.click('[data-testid="enrolled-course-card"]').first();
      
      // Find quiz lesson
      const quizLesson = page.locator('[data-testid="lesson-type-quiz"]').first();
      if (await quizLesson.isVisible()) {
        await quizLesson.click();
        
        await expect(page.locator('[data-testid="quiz-container"]')).toBeVisible();
        await expect(page.locator('[data-testid="quiz-question"]')).toBeVisible();
        await expect(page.locator('[data-testid="quiz-options"]')).toBeVisible();
        
        // Answer quiz questions
        await page.click('[data-testid="quiz-option"]').first();
        await page.click('[data-testid="next-question"]');
        
        // Complete quiz
        await page.click('[data-testid="submit-quiz"]');
        
        await expect(page.locator('[data-testid="quiz-results"]')).toBeVisible();
        await expect(page.locator('[data-testid="quiz-score"]')).toBeVisible();
      }
    });

    test('should download course materials', async ({ page }) => {
      await page.goto('/my-courses');
      await page.click('[data-testid="enrolled-course-card"]').first();
      
      // Check for downloadable materials
      const downloadButton = page.locator('[data-testid="download-materials"]');
      if (await downloadButton.isVisible()) {
        await downloadButton.click();
        
        await expect(page.locator('text=Download started')).toBeVisible();
      }
    });
  });

  test.describe('Content Creation (Trainer)', () => {
    test.beforeEach(async ({ page }) => {
      // Login as trainer
      await page.goto('/');
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'trainer@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="login-button"]');
    });

    test('should create a new course', async ({ page }) => {
      await page.goto('/trainer-dashboard');
      await page.click('[data-testid="create-course"]');
      
      await expect(page.locator('[data-testid="course-creation-form"]')).toBeVisible();
      
      // Fill course details
      await page.fill('[data-testid="course-title"]', 'Advanced Hair Cutting Techniques');
      await page.fill('[data-testid="course-description"]', 'Learn advanced techniques for professional hair cutting');
      await page.selectOption('[data-testid="course-category"]', 'hair-cutting');
      await page.selectOption('[data-testid="course-level"]', 'advanced');
      await page.fill('[data-testid="course-price"]', '99.99');
      
      // Upload course thumbnail
      const fileInput = page.locator('[data-testid="course-thumbnail"]');
      await fileInput.setInputFiles({
        name: 'course-thumbnail.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      });
      
      await page.click('[data-testid="save-course"]');
      
      await expect(page.locator('text=Course created successfully')).toBeVisible();
      await expect(page).toHaveURL(/.*course.*edit/);
    });

    test('should add lessons to course', async ({ page }) => {
      await page.goto('/trainer-dashboard');
      await page.click('[data-testid="manage-courses"]');
      await page.click('[data-testid="edit-course"]').first();
      
      await page.click('[data-testid="add-lesson"]');
      
      await expect(page.locator('[data-testid="lesson-form"]')).toBeVisible();
      
      // Fill lesson details
      await page.fill('[data-testid="lesson-title"]', 'Introduction to Advanced Techniques');
      await page.fill('[data-testid="lesson-description"]', 'Overview of advanced cutting methods');
      await page.selectOption('[data-testid="lesson-type"]', 'video');
      
      // Upload lesson video
      const videoInput = page.locator('[data-testid="lesson-video"]');
      await videoInput.setInputFiles({
        name: 'lesson-video.mp4',
        mimeType: 'video/mp4',
        buffer: Buffer.from('fake-video-data')
      });
      
      await page.fill('[data-testid="lesson-duration"]', '15');
      await page.click('[data-testid="save-lesson"]');
      
      await expect(page.locator('text=Lesson added successfully')).toBeVisible();
      await expect(page.locator('[data-testid="lesson-item"]')).toContainText('Introduction to Advanced Techniques');
    });

    test('should create quiz lessons', async ({ page }) => {
      await page.goto('/trainer-dashboard');
      await page.click('[data-testid="manage-courses"]');
      await page.click('[data-testid="edit-course"]').first();
      
      await page.click('[data-testid="add-lesson"]');
      
      await page.fill('[data-testid="lesson-title"]', 'Knowledge Check Quiz');
      await page.selectOption('[data-testid="lesson-type"]', 'quiz');
      
      // Add quiz questions
      await page.click('[data-testid="add-question"]');
      
      await page.fill('[data-testid="question-text"]', 'What is the most important factor in hair cutting?');
      await page.fill('[data-testid="option-a"]', 'Speed');
      await page.fill('[data-testid="option-b"]', 'Precision');
      await page.fill('[data-testid="option-c"]', 'Style');
      await page.fill('[data-testid="option-d"]', 'Tools');
      
      await page.click('[data-testid="correct-option-b"]');
      
      await page.click('[data-testid="save-lesson"]');
      
      await expect(page.locator('text=Quiz lesson created successfully')).toBeVisible();
    });

    test('should set course pricing', async ({ page }) => {
      await page.goto('/trainer-dashboard');
      await page.click('[data-testid="manage-courses"]');
      await page.click('[data-testid="edit-course"]').first();
      
      await page.click('[data-testid="pricing-tab"]');
      
      await expect(page.locator('[data-testid="pricing-form"]')).toBeVisible();
      
      // Set course price
      await page.fill('[data-testid="course-price"]', '149.99');
      await page.check('[data-testid="enable-discount"]');
      await page.fill('[data-testid="discount-percentage"]', '20');
      await page.fill('[data-testid="discount-end-date"]', '2024-12-31');
      
      await page.click('[data-testid="save-pricing"]');
      
      await expect(page.locator('text=Pricing updated successfully')).toBeVisible();
      await expect(page.locator('[data-testid="discounted-price"]')).toContainText('$119.99');
    });

    test('should publish course', async ({ page }) => {
      await page.goto('/trainer-dashboard');
      await page.click('[data-testid="manage-courses"]');
      await page.click('[data-testid="edit-course"]').first();
      
      await page.click('[data-testid="publish-course"]');
      
      await expect(page.locator('[data-testid="publish-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="publish-checklist"]')).toBeVisible();
      
      // Confirm publication
      await page.click('[data-testid="confirm-publish"]');
      
      await expect(page.locator('text=Course published successfully')).toBeVisible();
      await expect(page.locator('[data-testid="course-status"]')).toContainText('Published');
    });
  });

  test.describe('Revenue & Analytics', () => {
    test.beforeEach(async ({ page }) => {
      // Login as trainer
      await page.goto('/');
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'trainer@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="login-button"]');
    });

    test('should view revenue dashboard', async ({ page }) => {
      await page.goto('/trainer-dashboard');
      await page.click('[data-testid="revenue-tab"]');
      
      await expect(page.locator('[data-testid="revenue-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-revenue"]')).toBeVisible();
      await expect(page.locator('[data-testid="monthly-revenue"]')).toBeVisible();
      await expect(page.locator('[data-testid="course-sales"]')).toBeVisible();
    });

    test('should view course performance metrics', async ({ page }) => {
      await page.goto('/trainer-dashboard');
      await page.click('[data-testid="analytics-tab"]');
      
      await expect(page.locator('[data-testid="course-analytics"]')).toBeVisible();
      await expect(page.locator('[data-testid="enrollment-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="completion-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="student-feedback"]')).toBeVisible();
    });

    test('should view student progress', async ({ page }) => {
      await page.goto('/trainer-dashboard');
      await page.click('[data-testid="students-tab"]');
      
      await expect(page.locator('[data-testid="students-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="student-item"]')).toHaveCount.greaterThan(0);
      
      // Check student details
      const firstStudent = page.locator('[data-testid="student-item"]').first();
      await expect(firstStudent.locator('[data-testid="student-name"]')).toBeVisible();
      await expect(firstStudent.locator('[data-testid="student-progress"]')).toBeVisible();
      await expect(firstStudent.locator('[data-testid="student-enrolled-date"]')).toBeVisible();
    });

    test('should generate revenue reports', async ({ page }) => {
      await page.goto('/trainer-dashboard');
      await page.click('[data-testid="reports-tab"]');
      
      await expect(page.locator('[data-testid="reports-section"]')).toBeVisible();
      
      // Generate monthly report
      await page.selectOption('[data-testid="report-type"]', 'monthly');
      await page.selectOption('[data-testid="report-month"]', '2024-01');
      await page.click('[data-testid="generate-report"]');
      
      await expect(page.locator('[data-testid="report-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="report-download"]')).toBeVisible();
    });

    test('should view payment history', async ({ page }) => {
      await page.goto('/trainer-dashboard');
      await page.click('[data-testid="payments-tab"]');
      
      await expect(page.locator('[data-testid="payment-history"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-item"]')).toHaveCount.greaterThan(0);
      
      // Check payment details
      const firstPayment = page.locator('[data-testid="payment-item"]').first();
      await expect(firstPayment.locator('[data-testid="payment-date"]')).toBeVisible();
      await expect(firstPayment.locator('[data-testid="payment-amount"]')).toBeVisible();
      await expect(firstPayment.locator('[data-testid="payment-status"]')).toBeVisible();
      await expect(firstPayment.locator('[data-testid="course-name"]')).toBeVisible();
    });
  });

  test.describe('Certificates & Achievements', () => {
    test('should earn course completion certificate', async ({ page }) => {
      await page.goto('/my-courses');
      await page.click('[data-testid="enrolled-course-card"]').first();
      
      // Complete all lessons
      const lessons = page.locator('[data-testid="lesson-item"]');
      const lessonCount = await lessons.count();
      
      for (let i = 0; i < lessonCount; i++) {
        await lessons.nth(i).click();
        await page.click('[data-testid="mark-complete"]');
        await page.goBack();
      }
      
      // Should show certificate option
      await expect(page.locator('[data-testid="certificate-available"]')).toBeVisible();
      await page.click('[data-testid="download-certificate"]');
      
      await expect(page.locator('text=Certificate downloaded')).toBeVisible();
    });

    test('should view earned certificates', async ({ page }) => {
      await page.goto('/certificates');
      
      await expect(page.locator('[data-testid="certificates-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="certificate-item"]')).toHaveCount.greaterThan(0);
      
      // Check certificate details
      const firstCertificate = page.locator('[data-testid="certificate-item"]').first();
      await expect(firstCertificate.locator('[data-testid="certificate-name"]')).toBeVisible();
      await expect(firstCertificate.locator('[data-testid="certificate-date"]')).toBeVisible();
      await expect(firstCertificate.locator('[data-testid="certificate-download"]')).toBeVisible();
    });

    test('should view learning achievements', async ({ page }) => {
      await page.goto('/achievements');
      
      await expect(page.locator('[data-testid="achievements-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="achievement-item"]')).toHaveCount.greaterThan(0);
      
      // Check achievement types
      const achievements = page.locator('[data-testid="achievement-item"]');
      const count = await achievements.count();
      
      for (let i = 0; i < count; i++) {
        const achievement = achievements.nth(i);
        await expect(achievement.locator('[data-testid="achievement-name"]')).toBeVisible();
        await expect(achievement.locator('[data-testid="achievement-description"]')).toBeVisible();
        await expect(achievement.locator('[data-testid="achievement-date"]')).toBeVisible();
      }
    });
  });

  test.describe('Live Training Sessions', () => {
    test('should schedule live training session', async ({ page }) => {
      // Login as trainer
      await page.goto('/');
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'trainer@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="login-button"]');
      
      await page.goto('/trainer-dashboard');
      await page.click('[data-testid="live-sessions"]');
      await page.click('[data-testid="schedule-session"]');
      
      await expect(page.locator('[data-testid="session-form"]')).toBeVisible();
      
      // Fill session details
      await page.fill('[data-testid="session-title"]', 'Live Hair Cutting Workshop');
      await page.fill('[data-testid="session-description"]', 'Interactive workshop on advanced cutting techniques');
      await page.fill('[data-testid="session-date"]', '2024-02-15');
      await page.fill('[data-testid="session-time"]', '14:00');
      await page.fill('[data-testid="session-duration"]', '120');
      await page.fill('[data-testid="session-price"]', '49.99');
      await page.fill('[data-testid="max-participants"]', '20');
      
      await page.click('[data-testid="schedule-session-button"]');
      
      await expect(page.locator('text=Live session scheduled successfully')).toBeVisible();
    });

    test('should join live training session', async ({ page }) => {
      await page.goto('/training');
      await page.click('[data-testid="live-sessions-tab"]');
      
      await expect(page.locator('[data-testid="live-sessions-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="live-session-card"]')).toHaveCount.greaterThan(0);
      
      // Join upcoming session
      await page.click('[data-testid="join-session"]').first();
      
      // If paid session, show payment modal
      const paymentModal = page.locator('[data-testid="payment-modal"]');
      if (await paymentModal.isVisible()) {
        await page.click('[data-testid="proceed-payment"]');
        await page.fill('[data-testid="card-number"]', '4242424242424242');
        await page.fill('[data-testid="expiry-date"]', '12/25');
        await page.fill('[data-testid="cvv"]', '123');
        await page.click('[data-testid="complete-payment"]');
      }
      
      await expect(page.locator('text=Joined session successfully')).toBeVisible();
    });

    test('should participate in live session', async ({ page }) => {
      await page.goto('/my-sessions');
      await page.click('[data-testid="upcoming-session"]').first();
      
      // Join session when it starts
      await page.click('[data-testid="join-now"]');
      
      await expect(page.locator('[data-testid="live-session-room"]')).toBeVisible();
      await expect(page.locator('[data-testid="video-player"]')).toBeVisible();
      await expect(page.locator('[data-testid="chat-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="participants-list"]')).toBeVisible();
    });
  });
});
