import { test, expect, Page } from '@playwright/test';

/**
 * Full Roster Lifecycle: Business Invite to Professional Accept
 * 
 * This test covers the complete booking workflow:
 * 1. Business creates a shift (Ghost Slot)
 * 2. Business invites a professional (Smart Fill / Invite Sarah)
 * 3. Professional accepts the offer
 * 4. Business sees the confirmed shift
 */

// Mock data
const BUSINESS_USER = {
  id: 'business-user-1',
  email: 'business@test.com',
  role: 'business',
  currentRole: 'business', // Dashboard checks currentRole
  displayName: 'Test Business',
};

const PROFESSIONAL_USER = {
  id: 'professional-user-1',
  email: 'sarah@test.com',
  role: 'professional',
  displayName: 'Sarah Johnson',
  name: 'Sarah Johnson',
};

let createdShiftId: string | null = null;
let shiftStatus = 'draft';
let assignedStaff: any = null;
// Calculate next Saturday for the shift date (visible in calendar)
const getNextSaturday = () => {
  const date = new Date();
  const dayOfWeek = date.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
  const nextSaturday = new Date(date);
  nextSaturday.setDate(date.getDate() + daysUntilSaturday);
  nextSaturday.setHours(9, 0, 0, 0);
  return nextSaturday;
};

test.describe('Full Roster Lifecycle: Business Invite to Professional Accept', () => {
  
  test('Complete booking workflow from business creation to professional acceptance', async ({ page }) => {
    // Reset state
    createdShiftId = null;
    shiftStatus = 'draft';
    assignedStaff = null;

    // ============================================
    // PHASE 1: THE BUSINESS (DEMAND)
    // ============================================
    
    // Setup API route intercepts for business user
    await page.route('**/api/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(BUSINESS_USER),
      });
    });

    // Mock dashboard stats API
    await page.route('**/api/analytics/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          summary: {
            openJobs: 0,
            totalApplications: 0,
            unreadMessages: 0,
            monthlyHires: 0,
          },
        }),
      });
    });

    // Mock applications API
    await page.route('**/api/applications**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/shifts**', async (route) => {
      const method = route.request().method();
      const url = route.request().url();
      
      if (method === 'GET') {
        // Return the shift with current status in the format expected by fetchShopShifts
        const shiftDate = getNextSaturday();
        const shiftEndDate = new Date(shiftDate);
        shiftEndDate.setHours(17, 0, 0, 0);
        
        const shifts = createdShiftId ? [{
          id: createdShiftId,
          title: 'Weekend Barber Needed',
          startTime: shiftDate.toISOString(),
          endTime: shiftEndDate.toISOString(),
          date: shiftDate.toISOString(),
          hourlyRate: '25.00',
          payRate: '25.00', // Also include payRate for compatibility
          location: '123 Main St',
          status: shiftStatus,
          assignedStaff: assignedStaff,
          assignedStaffId: assignedStaff?.id || null,
          _type: 'shift', // Important: calendar checks this
          employerId: BUSINESS_USER.id,
          businessId: BUSINESS_USER.id,
          description: 'Looking for an experienced barber for Saturday shift',
          createdAt: new Date().toISOString(),
          applicationCount: 0,
        }] : [];
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(shifts),
        });
      } else if (method === 'POST') {
        // Create shift
        const requestBody = route.request().postDataJSON();
        createdShiftId = `shift-${Date.now()}`;
        shiftStatus = 'draft';
        
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: createdShiftId,
            ...requestBody,
            status: 'draft',
          }),
        });
      } else if (method === 'PATCH' || method === 'PUT') {
        // Update shift status (e.g., to 'invited' or 'confirmed')
        const requestBody = route.request().postDataJSON();
        if (requestBody.status) {
          shiftStatus = requestBody.status;
        }
        if (requestBody.assignedStaff) {
          assignedStaff = requestBody.assignedStaff;
        }
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: createdShiftId,
            status: shiftStatus,
            assignedStaff: assignedStaff,
            assignedStaffId: assignedStaff?.id || null,
          }),
        });
      }
    });

    // Navigate to a page first to set sessionStorage
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Set sessionStorage to match business user
    await page.evaluate((user) => {
      sessionStorage.setItem('snipshift_test_user', JSON.stringify({
        ...user,
        currentRole: 'business',
        roles: ['business'],
        isOnboarded: true
      }));
    }, BUSINESS_USER);
    
    // Now navigate to dashboard as business
    await page.goto('/hub-dashboard');
    await page.waitForLoadState('networkidle');
    
    // Wait for the page to fully render - check that we're not on an "Access denied" page
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Wait a bit for AuthContext to initialize
    await page.waitForTimeout(2000);

    // Click on the Calendar tab to show the calendar view
    const calendarTab = page.locator('[data-testid="tab-calendar"]');
    await expect(calendarTab).toBeVisible({ timeout: 15000 });
    await calendarTab.click();

    // Wait for calendar to load
    await page.waitForSelector('[data-testid="react-big-calendar-container"]', { timeout: 10000 });

    // Find and click a calendar slot (Saturday 9am)
    // For react-big-calendar, we need to click on an empty time slot
    const calendarContainer = page.locator('[data-testid="react-big-calendar-container"]');
    await expect(calendarContainer).toBeVisible();

    // Wait a bit for calendar to fully render
    await page.waitForTimeout(1000);

    // Try to find and click on an empty calendar slot
    // react-big-calendar uses .rbc-time-slot or .rbc-day-slot for clickable areas
    // We'll look for an empty slot in the calendar grid
    const calendarSlot = page.locator('.rbc-time-slot, .rbc-day-slot').first();
    
    // If we can find a slot, click it; otherwise, we'll use a workaround
    const slotVisible = await calendarSlot.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (slotVisible) {
      // Click on the calendar slot to trigger Create Shift Modal
      await calendarSlot.click({ position: { x: 50, y: 50 } });
    } else {
      // Alternative: Look for a "Create Shift" button or trigger modal directly
      // Some implementations have a "+" button or "Create Shift" button
      const createButton = page.getByRole('button', { name: /create|new shift|add shift/i }).first();
      const buttonVisible = await createButton.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (buttonVisible) {
        await createButton.click();
      } else {
        // Last resort: Try clicking on the calendar container itself
        // This might trigger the onSelectSlot handler
        await calendarContainer.click({ position: { x: 200, y: 300 } });
      }
    }

    // Wait for Create Shift Modal to appear
    // The modal has data-testid="create-shift-modal"
    await page.waitForSelector('[data-testid="create-shift-modal"]', { timeout: 10000 });

    // Fill out the Create Shift modal
    await page.waitForSelector('input[id="title"]', { timeout: 5000 });
    await page.fill('input[id="title"]', 'Weekend Barber Needed');
    await page.fill('textarea[id="description"]', 'Looking for an experienced barber for Saturday shift');
    
    // Set date to next Saturday
    const nextSaturday = new Date();
    nextSaturday.setDate(nextSaturday.getDate() + (6 - nextSaturday.getDay() + 7) % 7 || 7);
    const dateStr = nextSaturday.toISOString().split('T')[0];
    await page.fill('input[id="date"]', dateStr);
    
    await page.fill('input[id="startTime"]', '09:00');
    await page.fill('input[id="endTime"]', '17:00');
    await page.fill('input[id="hourlyRate"]', '25.00');
    await page.fill('input[id="location"]', '123 Main St');

    // Submit the form
    const submitButton = page.locator('[data-testid="create-shift-submit"]');
    await expect(submitButton).toBeVisible();
    
    // Wait for POST request
    const [createResponse] = await Promise.all([
      page.waitForResponse(
        (response) => 
          response.url().includes('/api/shifts') && 
          response.request().method() === 'POST',
        { timeout: 10000 }
      ),
      submitButton.click(),
    ]);

    expect(createResponse.status()).toBe(201);
    const createdShift = await createResponse.json();
    createdShiftId = createdShift.id;

    // Wait for modal to close - use the modal's data-testid instead of text
    await page.waitForSelector('[data-testid="create-shift-modal"]', { state: 'hidden', timeout: 10000 });

    // Wait for the calendar to refetch shifts after creation
    // The query will be invalidated and refetch should happen
    await page.waitForResponse(
      (response) => 
        response.url().includes('/api/shifts') && 
        response.request().method() === 'GET',
      { timeout: 10000 }
    ).catch(() => {
      // If no refetch happens, that's okay - continue
    });

    // Wait a bit for the calendar to render the new shift
    await page.waitForTimeout(2000);
    
    // Debug: Check if calendar has any events at all
    const calendarEvents = page.locator('.rbc-event');
    const eventCount = await calendarEvents.count();
    console.log(`[DEBUG] Calendar has ${eventCount} events`);
    
    // If no events, try navigating to next week to see the shift
    if (eventCount === 0) {
      const nextWeekButton = page.locator('button[aria-label*="Next"], .rbc-btn-next').first();
      const hasNextButton = await nextWeekButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (hasNextButton) {
        await nextWeekButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // Verify Ghost Slot appears on calendar
    const ghostSlot = page.locator('[data-testid="shift-block-ghost-slot"]').first();
    await expect(ghostSlot).toBeVisible({ timeout: 10000 });

    // Click the Ghost Slot
    await ghostSlot.click();

    // Wait for Assign Staff Modal to appear
    // Look for the modal dialog or the title text
    await page.waitForSelector('text=Assign Staff to Shift', { timeout: 5000 });

    // Click "Invite" button for Sarah Johnson
    const inviteSarahButton = page.locator('[data-testid="invite-button-sarah-johnson"]');
    await expect(inviteSarahButton).toBeVisible({ timeout: 5000 });
    
    // Intercept the assign staff API call (PUT /api/shifts/{id})
    // Update the shift status and assigned staff
    await page.route(`**/api/shifts/${createdShiftId}`, async (route) => {
      const method = route.request().method();
      if (method === 'PUT') {
        const requestBody = route.request().postDataJSON();
        shiftStatus = requestBody.status || 'invited';
        assignedStaff = requestBody.assignedStaff || {
          id: PROFESSIONAL_USER.id,
          name: PROFESSIONAL_USER.name,
          email: PROFESSIONAL_USER.email,
        };
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: createdShiftId,
            status: shiftStatus,
            assignedStaffId: PROFESSIONAL_USER.id,
            assignedStaff: assignedStaff,
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Click invite button and wait for API call
    const [assignResponse] = await Promise.all([
      page.waitForResponse(
        (response) => 
          response.url().includes(`/api/shifts/${createdShiftId}`) && 
          response.request().method() === 'PUT',
        { timeout: 10000 }
      ),
      inviteSarahButton.click(),
    ]);

    expect(assignResponse.status()).toBe(200);

    // Wait for modal to close - wait for dialog to be hidden
    // Radix UI Dialog has role="dialog" when open
    try {
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
    } catch {
      // Fallback: wait a bit for modal to close
      await page.waitForTimeout(1000);
    }

    // Wait for the calendar to refetch shifts after the invite
    await page.waitForResponse(
      (response) => 
        response.url().includes('/api/shifts') && 
        response.request().method() === 'GET',
      { timeout: 10000 }
    ).catch(() => {
      // If no refetch happens, that's okay - continue
    });

    // Wait a bit for the calendar to render the updated shift
    await page.waitForTimeout(2000);

    // Verify the slot turns Orange (Pending status)
    const pendingSlot = page.locator('[data-testid="shift-block-pending"]').first();
    await expect(pendingSlot).toBeVisible({ timeout: 10000 });

    // ============================================
    // PHASE 2: THE PROFESSIONAL (SUPPLY)
    // ============================================

    // Clear cookies and storage to simulate logout
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Setup API route intercepts for professional user
    await page.route('**/api/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(PROFESSIONAL_USER),
      });
    });

    await page.route('**/api/shifts/offers**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: `offer-${createdShiftId}`,
          shiftId: createdShiftId,
          title: 'Weekend Barber Needed',
          startTime: new Date('2024-12-14T09:00:00Z').toISOString(),
          endTime: new Date('2024-12-14T17:00:00Z').toISOString(),
          hourlyRate: '25.00',
          location: '123 Main St',
          businessName: 'Test Business',
          businessLogo: null,
          description: 'Looking for an experienced barber for Saturday shift',
        }]),
      });
    });

    // Navigate to dashboard as professional
    await page.goto('/professional-dashboard');
    await page.waitForLoadState('networkidle');

    // Verify OfferInbox is visible
    const offerInbox = page.locator('[data-testid="offer-inbox"]');
    await expect(offerInbox).toBeVisible({ timeout: 10000 });

    // Verify the "Incoming Job Offer" is visible
    await expect(offerInbox.getByText('Weekend Barber Needed')).toBeVisible();

    // Click "Accept" on the Offer Card
    const acceptButton = page.locator('[data-testid="shift-offer-accept-button"]').first();
    await expect(acceptButton).toBeVisible();

    // Intercept the accept API call
    await page.route('**/api/shifts/*/accept**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: createdShiftId,
          status: 'confirmed',
        }),
      });
    });

    // Also intercept PUT requests for accepting
    await page.route('**/api/shifts/accept**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: createdShiftId,
          status: 'confirmed',
        }),
      });
    });

    // Click accept button
    await acceptButton.click();

    // Verify Success toast appears
    await expect(page.getByText(/shift accepted|successfully accepted/i)).toBeVisible({ timeout: 5000 });

    // ============================================
    // PHASE 3: THE CONFIRMATION (LOOP CLOSED)
    // ============================================

    // Clear cookies and storage again
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Setup API route intercepts for business user again
    await page.route('**/api/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(BUSINESS_USER),
      });
    });

    // Mock dashboard stats API again
    await page.route('**/api/analytics/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          summary: {
            openJobs: 0,
            totalApplications: 0,
            unreadMessages: 0,
            monthlyHires: 0,
          },
        }),
      });
    });

    // Mock applications API again
    await page.route('**/api/applications**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Update shift status to confirmed
    shiftStatus = 'confirmed';
    assignedStaff = {
      id: PROFESSIONAL_USER.id,
      name: PROFESSIONAL_USER.name,
      email: PROFESSIONAL_USER.email,
    };

    await page.route('**/api/shifts**', async (route) => {
      const method = route.request().method();
      
      if (method === 'GET') {
        // Return the shift with CONFIRMED status in the format expected by fetchShopShifts
        const shiftDate = getNextSaturday();
        const shiftEndDate = new Date(shiftDate);
        shiftEndDate.setHours(17, 0, 0, 0);
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: createdShiftId,
            title: 'Weekend Barber Needed',
            startTime: shiftDate.toISOString(),
            endTime: shiftEndDate.toISOString(),
            date: shiftDate.toISOString(),
            hourlyRate: '25.00',
            payRate: '25.00',
            location: '123 Main St',
            status: shiftStatus,
            assignedStaff: assignedStaff,
            assignedStaffId: assignedStaff.id,
            _type: 'shift',
            employerId: BUSINESS_USER.id,
            businessId: BUSINESS_USER.id,
            description: 'Looking for an experienced barber for Saturday shift',
            createdAt: new Date().toISOString(),
            applicationCount: 0,
          }]),
        });
      }
    });

    // Set sessionStorage to match business user again
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    await page.evaluate((user) => {
      sessionStorage.setItem('snipshift_test_user', JSON.stringify({
        ...user,
        currentRole: 'business',
        roles: ['business'],
        isOnboarded: true
      }));
    }, BUSINESS_USER);
    
    // Navigate to dashboard as business again
    await page.goto('/hub-dashboard');
    await page.waitForLoadState('networkidle');
    
    // Wait for AuthContext to initialize
    await page.waitForTimeout(2000);

    // Click on the Calendar tab to show the calendar view
    const calendarTab2 = page.locator('[data-testid="tab-calendar"]');
    await expect(calendarTab2).toBeVisible({ timeout: 15000 });
    await calendarTab2.click();

    // Wait for calendar to load
    await page.waitForSelector('[data-testid="react-big-calendar-container"]', { timeout: 10000 });

    // Verify the original slot is now Solid Green (CONFIRMED)
    await page.waitForTimeout(1000); // Wait for calendar to update
    const confirmedSlot = page.locator('[data-testid="shift-block-confirmed"]').first();
    await expect(confirmedSlot).toBeVisible({ timeout: 5000 });

    // Verify it shows Sarah's name
    await expect(confirmedSlot.getByText('Sarah Johnson')).toBeVisible({ timeout: 2000 });
  });
});

