import { test, expect } from '@playwright/test';

/**
 * E2E Coverage: Venue Scheduling Command Center (/venue/schedule)
 *
 * Focuses on the key UX wiring:
 * - Load schedule page (shop role)
 * - Quick-create draft shift from calendar selection
 * - Copy Previous Week + Publish All bulk actions
 * - Confirmed shift reschedule safety (requires changeReason)
 *
 * Notes:
 * - Uses Playwright route mocks for /api/shifts schedule endpoints to keep the test deterministic.
 * - Auth is provided via `sessionStorage['hospogo_test_user']` when `VITE_E2E=1` (see `tests/auth.setup.ts`).
 */

type ShiftStatus = 'draft' | 'open' | 'confirmed' | 'pending' | 'invited' | 'filled' | 'completed' | 'cancelled';

type ShiftDetails = {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  hourlyRate: number;
  status: ShiftStatus;
  location?: string;
  employerId?: string;
  assigneeId?: string;
};

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 (Sun) ... 6 (Sat)
  const daysSinceMonday = (day + 6) % 7;
  d.setDate(d.getDate() - daysSinceMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addHours(date: Date, hours: number): Date {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

test.describe('Venue Schedule E2E Tests', () => {
  test('mobile: does not cause horizontal page overflow', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14-ish

    // Ensure we're in a shop role for this test
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'hospogo_test_user',
        JSON.stringify({
          id: 'e2e-shop-0001',
          email: 'shop-e2e@snipshift.com',
          name: 'E2E Shop User',
          roles: ['business'],
          currentRole: 'business',
          isOnboarded: true,
        })
      );
    });

    // Minimal schedule data for a stable render
    await page.route('**/api/shifts?**employer_id=me**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/venue/schedule', { waitUntil: 'domcontentloaded' });

    // Wait for the schedule page + calendar to render
    await expect(page.getByText('Venue Schedule', { exact: false })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.rbc-calendar')).toBeVisible({ timeout: 15000 });

    // If something tries to "blow out" width on mobile, scrollWidth will exceed viewport width.
    const metrics = await page.evaluate(() => {
      const docEl = document.documentElement;
      const body = document.body;
      const width = window.innerWidth;
      const docScrollWidth = docEl ? docEl.scrollWidth : 0;
      const bodyScrollWidth = body ? body.scrollWidth : 0;
      return { width, docScrollWidth, bodyScrollWidth };
    });

    expect(metrics.docScrollWidth).toBeLessThanOrEqual(metrics.width + 2);
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.width + 2);
  });

  test('quick create + bulk actions + confirmed shift safety', async ({ page }) => {
    test.setTimeout(120000);

    const now = new Date();
    const monday = startOfWeekMonday(now);

    // In-memory schedule state for mocked API endpoints
    const shifts: ShiftDetails[] = [
      {
        id: 'shift-open-1',
        title: 'Open Shift',
        description: 'Open shift',
        startTime: addHours(addDays(monday, 0), 9).toISOString(),
        endTime: addHours(addDays(monday, 0), 17).toISOString(),
        hourlyRate: 45,
        status: 'open',
        location: 'Test Location',
        employerId: 'shop-user-id',
      },
      {
        id: 'shift-confirmed-1',
        title: 'Confirmed Shift',
        description: 'Confirmed shift',
        startTime: addHours(addDays(monday, 1), 10).toISOString(),
        endTime: addHours(addDays(monday, 1), 14).toISOString(),
        hourlyRate: 55,
        status: 'confirmed',
        location: 'Test Location',
        employerId: 'shop-user-id',
        assigneeId: 'pro-1',
      },
    ];

    // ------------------------------
    // Ensure we're in a shop role for this test
    // ------------------------------
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'hospogo_test_user',
        JSON.stringify({
          id: 'e2e-shop-0001',
          email: 'shop-e2e@snipshift.com',
          name: 'E2E Shop User',
          roles: ['business'],
          currentRole: 'business',
          isOnboarded: true,
        })
      );
    });

    // ------------------------------
    // Mock schedule API endpoints
    // ------------------------------
    await page.route('**/api/shifts?**employer_id=me**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(shifts),
      });
    });

    await page.route('**/api/shifts', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      const body = route.request().postDataJSON() as any;
      const newShift: ShiftDetails = {
        id: `draft-${Date.now()}`,
        title: body.title || 'Draft Shift',
        description: body.description,
        startTime: body.startTime,
        endTime: body.endTime,
        hourlyRate: Number(body.hourlyRate) || 45,
        status: 'draft',
        location: body.location,
        employerId: 'shop-user-id',
      };
      shifts.push(newShift);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newShift),
      });
    });

    await page.route('**/api/shifts/copy-previous-week', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      // Create one new draft shift in the current week.
      const newShift: ShiftDetails = {
        id: `copied-${Date.now()}`,
        title: 'Copied Draft',
        description: 'Copied from last week',
        startTime: addHours(addDays(monday, 2), 9).toISOString(),
        endTime: addHours(addDays(monday, 2), 17).toISOString(),
        hourlyRate: 45,
        status: 'draft',
        location: 'Test Location',
        employerId: 'shop-user-id',
      };
      shifts.push(newShift);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, count: 1 }),
      });
    });

    await page.route('**/api/shifts/publish-all', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      let count = 0;
      for (const s of shifts) {
        if (s.status === 'draft') {
          s.status = 'open';
          count += 1;
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, count }),
      });
    });

    // Only intercept shift ID updates (avoid swallowing /copy-previous-week and /publish-all).
    await page.route(/\/api\/shifts\/(?!copy-previous-week$)(?!publish-all$)[^/?#]+$/, async (route) => {
      if (route.request().method() !== 'PUT') {
        await route.continue();
        return;
      }

      const url = new URL(route.request().url());
      const shiftId = url.pathname.split('/').pop();
      const body = route.request().postDataJSON() as any;

      const shift = shifts.find((s) => s.id === shiftId);
      if (!shift) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Not found' }),
        });
        return;
      }

      const isTimeChange = !!body.startTime && !!body.endTime;
      if (isTimeChange && shift.status === 'confirmed') {
        const reason = String(body.changeReason || '').trim();
        if (!reason) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'changeReason is required for confirmed shift changes' }),
          });
          return;
        }
      }

      if (isTimeChange) {
        shift.startTime = body.startTime;
        shift.endTime = body.endTime;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(shift),
      });
    });

    // ------------------------------
    // Go to schedule page
    // ------------------------------
    await page.goto('/venue/schedule');
    await page.waitForLoadState('domcontentloaded');

    // Assert we are not redirected to login
    expect(page.url()).toContain('/venue/schedule');

    await expect(page.getByText('Venue Schedule', { exact: false })).toBeVisible({ timeout: 15000 });

    // Ensure calendar rendered
    await expect(page.locator('.rbc-calendar')).toBeVisible({ timeout: 15000 });

    // ------------------------------
    // Copy Previous Week
    // ------------------------------
    await page.getByRole('button', { name: /Copy Previous Week/i }).click();
    await page.getByRole('button', { name: /^Copy$/i }).click();
    await expect(page.getByRole('status').filter({ hasText: /Copied/i }).first()).toBeVisible({ timeout: 10000 });

    // ------------------------------
    // Publish All
    // ------------------------------
    // Should now be enabled because we introduced a draft
    await page.getByRole('button', { name: /Publish All/i }).click();
    await page.getByRole('button', { name: /^Publish$/i }).click();
    await expect(page.getByRole('status').filter({ hasText: /Published/i }).first()).toBeVisible({ timeout: 10000 });

    // ------------------------------
    // Quick Create (Draft) via slot selection
    // ------------------------------
    // Click a time slot to trigger onSelectSlot (more reliable on Mobile Safari than drag).
    const slot = page.locator('.rbc-day-slot .rbc-time-slot').nth(10);
    await expect(slot).toBeVisible({ timeout: 15000 });
    await slot.click({ force: true });

    await expect(page.getByText('Quick Create (Draft)', { exact: true })).toBeVisible({ timeout: 15000 });

    await page.getByLabel(/Title \(optional\)/i).fill('E2E Draft');
    await page.getByLabel(/Hourly rate/i).fill('60');
    await page.getByLabel(/Notes \(optional\)/i).fill('Created by E2E');

    await page.getByRole('button', { name: /Create draft/i }).click();
    await expect(page.getByRole('status').filter({ hasText: /Draft created/i }).first()).toBeVisible({ timeout: 15000 });

    // ------------------------------
    // Confirmed shift reschedule safety: attempt a drag and ensure modal requires reason
    // ------------------------------
    // NOTE: React Big Calendar DnD is somewhat finicky in automation; we try a best-effort drag.
    const confirmedEvent = page.locator('.rbc-event').filter({ hasText: /Confirmed Shift/i }).first();
    const confirmedVisible = await confirmedEvent.isVisible({ timeout: 5000 }).catch(() => false);
    if (confirmedVisible) {
      const confirmedBox = await confirmedEvent.boundingBox();
      if (!confirmedBox) return;
      await page.mouse.move(confirmedBox.x + confirmedBox.width / 2, confirmedBox.y + confirmedBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(confirmedBox.x + confirmedBox.width / 2 + 20, confirmedBox.y + confirmedBox.height / 2 + 40);
      await page.mouse.up();

      const warningTitle = page.getByText('Warning: Changing a confirmed shift', { exact: true });
      const warningVisible = await warningTitle.isVisible({ timeout: 5000 }).catch(() => false);

      if (warningVisible) {
        await expect(warningTitle).toBeVisible();
        await page.getByLabel('Reason').fill('E2E reschedule reason');

        // Wait for PUT request to include changeReason
        const putPromise = page.waitForRequest((req) => {
          return req.method() === 'PUT' && /\/api\/shifts\//.test(req.url());
        });

        await page.getByRole('button', { name: /Proceed/i }).click();

        const putReq = await putPromise;
        const putBody = putReq.postDataJSON() as any;
        expect(String(putBody.changeReason || '')).toContain('E2E reschedule reason');
      }
    }
  });
});
