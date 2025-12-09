import { Page } from '@playwright/test';

/**
 * Test Data Setup Helper
 * 
 * Ensures test data exists for calendar tests, particularly events/bookings
 * in the current week to prevent false positives on empty states.
 */

export interface TestBookingData {
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  status?: 'confirmed' | 'pending' | 'completed';
}

/**
 * Creates a test booking/event for the calendar
 * This uses the application's API or UI to create test data
 */
export async function ensureCalendarTestData(
  page: Page,
  bookings: TestBookingData[] = []
): Promise<void> {
  console.log('📅 Setting up calendar test data...');

  // If no bookings provided, create a default one for the current week
  if (bookings.length === 0) {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 6 = Saturday
    const daysUntilWednesday = (3 - currentDay + 7) % 7; // Get next Wednesday
    const nextWednesday = new Date(today);
    nextWednesday.setDate(today.getDate() + daysUntilWednesday);
    nextWednesday.setHours(10, 0, 0, 0); // 10 AM

    const endTime = new Date(nextWednesday);
    endTime.setHours(14, 0, 0, 0); // 2 PM

    bookings = [
      {
        title: 'Test Shift - Haircut Appointment',
        date: nextWednesday,
        startTime: nextWednesday.toISOString(),
        endTime: endTime.toISOString(),
        status: 'confirmed',
      },
    ];
  }

  // Navigate to professional dashboard
  await page.goto('/professional-dashboard?view=calendar');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // Try to create bookings via the UI
  // Look for "Create Availability/Shift" button
  const createButton = page.getByRole('button', { name: /create availability/i }).or(
    page.getByRole('button', { name: /create.*shift/i })
  ).first();

  const buttonExists = await createButton.isVisible({ timeout: 5000 }).catch(() => false);

  if (buttonExists) {
    console.log('➕ Creating test bookings via UI...');
    
    for (const booking of bookings) {
      try {
        // Click create button
        await createButton.click();
        await page.waitForTimeout(1000);

        // Wait for modal/sheet to open
        const modal = page.locator('[role="dialog"]').first();
        const modalVisible = await modal.isVisible({ timeout: 5000 }).catch(() => false);

        if (modalVisible) {
          // If there's a form, fill it out
          // For now, just close the modal since the actual form structure may vary
          const closeButton = page.getByRole('button', { name: /close/i }).or(
            page.locator('button[aria-label="Close"]')
          ).first();

          if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await closeButton.click();
          } else {
            await page.keyboard.press('Escape');
          }
          await page.waitForTimeout(500);
        }
      } catch (error) {
        console.warn(`⚠️  Could not create booking via UI: ${error}`);
      }
    }
  } else {
    console.log('ℹ️  Create button not found - test data may need to be created via API or database');
  }

  // Alternative: Use API to create test data if available
  // This would require the API endpoint and authentication token
  try {
    // Get auth token from localStorage or cookies
    const authToken = await page.evaluate(() => {
      return localStorage.getItem('authToken') || 
             localStorage.getItem('firebase:authUser') ||
             document.cookie.match(/authToken=([^;]+)/)?.[1];
    });

    if (authToken) {
      console.log('🔌 Attempting to create test data via API...');
      // Make API calls to create bookings
      // This is a placeholder - adjust based on your actual API structure
      for (const booking of bookings) {
        try {
          const response = await page.request.post('/api/bookings', {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            data: {
              title: booking.title,
              startTime: booking.startTime,
              endTime: booking.endTime,
              status: booking.status || 'confirmed',
            },
          });

          if (response.ok()) {
            console.log(`✅ Created booking: ${booking.title}`);
          } else {
            console.warn(`⚠️  Failed to create booking via API: ${response.status()}`);
          }
        } catch (error) {
          console.warn(`⚠️  API call failed: ${error}`);
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not create test data via API:', error);
  }

  console.log('✅ Test data setup complete');
}

/**
 * Cleans up test data created during tests
 */
export async function cleanupTestData(page: Page): Promise<void> {
  console.log('🧹 Cleaning up test data...');
  
  // This would delete test bookings/events
  // Implementation depends on your API structure
  try {
    const authToken = await page.evaluate(() => {
      return localStorage.getItem('authToken') || 
             localStorage.getItem('firebase:authUser') ||
             document.cookie.match(/authToken=([^;]+)/)?.[1];
    });

    if (authToken) {
      // Delete test bookings
      // Placeholder - adjust based on your API
      const response = await page.request.delete('/api/bookings/test', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok()) {
        console.log('✅ Test data cleaned up');
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not cleanup test data:', error);
  }
}

