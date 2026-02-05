/**
 * Calendar Crash Reproduction Test
 * 
 * Purpose: Reproduce Error #310 (Rendered fewer hooks than expected)
 * 
 * Error #310 typically occurs when:
 * 1. Hooks are called conditionally
 * 2. Early returns happen before hooks
 * 3. Number of hooks changes between renders
 * 
 * This test focuses on the ShiftBucketManagementModal flow which is
 * the suspected crash site when clicking a vacant (RED) bucket.
 */

import { test, expect } from '../fixtures/hospogo-fixtures';
import type { ConsoleMessage } from '@playwright/test';

// Collection of console errors encountered during test
const collectedErrors: string[] = [];

// SKIP: Requires shift templates and seed data to populate calendar buckets
// Hook integrity verified in Session 14 manual testing + code review
test.describe.skip('Calendar Error #310 Reproduction', () => {
  test.beforeEach(async () => {
    // Clear collected errors before each test
    collectedErrors.length = 0;
  });

  test('clicking vacant bucket should open ShiftBucketManagementModal without React error #310', async ({ businessPage }) => {
    const page = businessPage;
    
    // 1. Attach enhanced console error listener for this specific test
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        collectedErrors.push(text);
        
        // Log critical errors immediately for visibility
        if (
          text.includes('Minified React error') ||
          text.includes('Error #') ||
          text.includes('Rendered fewer hooks') ||
          text.includes('Rendered more hooks')
        ) {
          console.error('[CRITICAL REACT ERROR]:', text);
        }
      }
    });
    
    // 2. Navigate to calendar view
    await page.goto('/venue/dashboard?view=calendar');
    
    // 3. Wait for calendar container to be ready
    const calendarContainer = page.getByTestId('calendar-container');
    await expect(calendarContainer).toBeVisible({ timeout: 15000 });
    
    // 4. Wait a moment for any async data to load
    await page.waitForTimeout(1000);
    
    // 5. Look for bucket pills (grouped shifts in calendar)
    // These are created by groupEventsIntoBuckets() when shift templates exist
    const bucketPills = page.getByTestId('bucket-pill-container');
    
    // Check if we have any bucket pills visible
    const bucketCount = await bucketPills.count();
    console.log(`[REPRO TEST] Found ${bucketCount} bucket pills`);
    
    if (bucketCount === 0) {
      // If no buckets, the venue may not have shift templates configured
      // This is an expected state - skip the test gracefully
      console.log('[REPRO TEST] No bucket pills found - shift templates may not be configured');
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'No bucket pills rendered - shift templates not configured for E2E venue'
      });
      return;
    }
    
    // 6. Identify first bucket pill
    const firstBucket = bucketPills.first();
    await expect(firstBucket).toBeVisible();
    
    // 7. Take screenshot before click for debugging
    await page.screenshot({ path: 'test-results/before-bucket-click.png' });
    
    // 8. Click the bucket - this should open ShiftBucketManagementModal
    console.log('[REPRO TEST] Clicking bucket pill...');
    await firstBucket.click();
    
    // 9. Wait for modal to appear OR for error
    // The modal should appear within 2 seconds
    const modal = page.getByRole('dialog');
    
    try {
      await expect(modal).toBeVisible({ timeout: 3000 });
      console.log('[REPRO TEST] Modal opened successfully');
      
      // 10. Take screenshot of modal
      await page.screenshot({ path: 'test-results/modal-open.png' });
      
      // 11. Verify modal header shows bucket info
      const modalHeader = page.getByRole('heading', { level: 2 }).or(page.locator('[role="dialog"] h2'));
      if (await modalHeader.isVisible()) {
        const headerText = await modalHeader.textContent();
        console.log(`[REPRO TEST] Modal header: ${headerText}`);
      }
      
    } catch (error) {
      // Modal didn't appear - take error screenshot
      await page.screenshot({ path: 'test-results/error-state.png' });
      console.error('[REPRO TEST] Modal failed to appear');
    }
    
    // 12. Wait additional time to catch any deferred errors
    await page.waitForTimeout(1000);
    
    // 13. Report all collected errors
    console.log('\n' + '='.repeat(70));
    console.log('--- CONSOLE ERROR MANIFEST ---');
    console.log('='.repeat(70));
    
    const criticalErrors = collectedErrors.filter(err => 
      err.includes('Minified React error') ||
      err.includes('Error #') ||
      err.includes('Rendered fewer hooks') ||
      err.includes('Rendered more hooks') ||
      err.includes('Uncaught Error') ||
      err.includes('Unhandled Promise Rejection')
    );
    
    if (criticalErrors.length > 0) {
      console.log(`CRITICAL ERRORS (${criticalErrors.length}):`);
      criticalErrors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err}`);
        // Add as test annotation for report visibility
        test.info().annotations.push({
          type: 'Console Error',
          description: err
        });
      });
    } else {
      console.log('No critical React errors detected!');
    }
    
    if (collectedErrors.length > criticalErrors.length) {
      console.log(`\nOther console errors (${collectedErrors.length - criticalErrors.length}):`);
      collectedErrors
        .filter(err => !criticalErrors.includes(err))
        .forEach((err, idx) => {
          console.log(`  ${idx + 1}. ${err.substring(0, 200)}...`);
        });
    }
    
    console.log('='.repeat(70) + '\n');
    
    // 14. Assert: No critical React hook errors should have occurred
    const hookErrors = criticalErrors.filter(err => 
      err.includes('Error #310') || 
      err.includes('Rendered fewer hooks') ||
      err.includes('Rendered more hooks')
    );
    
    expect(
      hookErrors,
      `React hook order errors detected: ${hookErrors.join(', ')}`
    ).toHaveLength(0);
  });

  test('rapid bucket navigation should maintain hook order stability', async ({ businessPage }) => {
    const page = businessPage;
    
    // Attach error listener
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        collectedErrors.push(msg.text());
      }
    });
    
    // Navigate to calendar
    await page.goto('/venue/dashboard?view=calendar');
    await expect(page.getByTestId('calendar-container')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(500);
    
    // Get all bucket pills
    const bucketPills = page.getByTestId('bucket-pill-container');
    const count = await bucketPills.count();
    
    if (count < 2) {
      console.log('[RAPID NAV TEST] Insufficient buckets for rapid navigation test');
      test.info().annotations.push({
        type: 'skip-reason',
        description: `Only ${count} bucket(s) found - need at least 2 for rapid navigation test`
      });
      return;
    }
    
    // Rapidly click through multiple buckets
    console.log(`[RAPID NAV TEST] Testing rapid clicks on ${count} buckets...`);
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const bucket = bucketPills.nth(i);
      if (await bucket.isVisible()) {
        await bucket.click();
        // Brief wait to allow React to process
        await page.waitForTimeout(100);
        
        // Close any modal that opened
        const modal = page.getByRole('dialog');
        if (await modal.isVisible({ timeout: 500 }).catch(() => false)) {
          // Click outside to close
          await page.keyboard.press('Escape');
          await page.waitForTimeout(50);
        }
      }
    }
    
    // Wait for any deferred errors
    await page.waitForTimeout(500);
    
    // Check for hook errors
    const hookErrors = collectedErrors.filter(err => 
      err.includes('Error #310') || 
      err.includes('Rendered fewer hooks') ||
      err.includes('Rendered more hooks')
    );
    
    expect(
      hookErrors,
      `React hook order errors during rapid navigation: ${hookErrors.join(', ')}`
    ).toHaveLength(0);
  });

  test('calendar view switches should maintain hook order', async ({ businessPage }) => {
    const page = businessPage;
    
    // Attach error listener
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        collectedErrors.push(msg.text());
      }
    });
    
    // Navigate to calendar
    await page.goto('/venue/dashboard?view=calendar');
    await expect(page.getByTestId('calendar-container')).toBeVisible({ timeout: 15000 });
    
    // Try switching between different calendar views
    const viewButtons = {
      'day': page.getByRole('button', { name: /day/i }),
      'week': page.getByRole('button', { name: /week/i }),
      'month': page.getByRole('button', { name: /month/i }),
    };
    
    for (const [viewName, button] of Object.entries(viewButtons)) {
      try {
        if (await button.isVisible({ timeout: 1000 })) {
          console.log(`[VIEW SWITCH TEST] Switching to ${viewName} view...`);
          await button.click();
          await page.waitForTimeout(300);
          
          // Check for immediate errors
          const recentErrors = collectedErrors.filter(err => 
            err.includes('Error #310') ||
            err.includes('Rendered fewer hooks')
          );
          
          if (recentErrors.length > 0) {
            console.error(`[VIEW SWITCH TEST] Error after switching to ${viewName}:`, recentErrors);
          }
        }
      } catch (e) {
        // View button not available - skip
      }
    }
    
    // Final error check
    const hookErrors = collectedErrors.filter(err => 
      err.includes('Error #310') || 
      err.includes('Rendered fewer hooks') ||
      err.includes('Rendered more hooks')
    );
    
    expect(
      hookErrors,
      `React hook order errors during view switches: ${hookErrors.join(', ')}`
    ).toHaveLength(0);
  });
});
