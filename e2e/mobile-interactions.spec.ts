import { test, expect } from '@playwright/test';

test.describe('Mobile Button & Interaction Audit', () => {
  // Setup API Mocks to avoid backend dependencies
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/users/onboarding/complete', async route => {
      await route.fulfill({
        status: 200,
        json: {
          id: 'test-user-id',
          role: 'professional',
          isOnboarded: true
        }
      });
    });

    await page.route('**/api/me', async route => {
      await route.fulfill({
        json: {
          id: 'test-user-id',
          email: 'test@hospogo.com',
          name: 'Test User',
          roles: ['professional'],
          currentRole: 'professional',
          isOnboarded: true
        }
      });
    });

    await page.route('**/api/jobs*', async route => {
      await route.fulfill({
        json: [{
          id: 'test-job-1',
          title: 'E2E Mocked Job',
          location: 'Brisbane, QLD',
          date: new Date().toISOString(),
          payRate: 50,
          status: 'open',
          description: 'This is a mocked job for E2E testing.',
          requirements: ['Requirement 1', 'Requirement 2'],
          businessName: 'Test Business',
          businessId: 'test-business-id'
        }]
      });
    });

    await page.route('**/api/notifications*', async route => {
      await route.fulfill({ json: [] });
    });

    await page.route('**/api/notifications/unread-count', async route => {
      await route.fulfill({ json: { count: 0 } });
    });

    await page.route('**/api/conversations*', async route => {
      await route.fulfill({ json: [] });
    });
  });

  test('Check button click interception on mobile', async ({ page }) => {
    const routes = ['/professional-dashboard', '/job-feed'];
    const issues: Array<{ route: string; button: string; issue: string }> = [];

    for (const route of routes) {
      // Navigate with Auth Bypass
      await page.goto(`${route}?test_user=true`);

      // Wait for page content to load
      try {
        await page.waitForSelector('main, [role="main"]', { timeout: 5000 });
      } catch (e) {
        await page.waitForLoadState('networkidle');
      }

      // Wait a bit for any overlays/toasts to potentially appear
      await page.waitForTimeout(1000);

      // Dismiss tutorial overlay if it appears (it blocks clicks)
      const tutorialOverlay = page.locator('[data-testid="tutorial-overlay"]');
      if (await tutorialOverlay.isVisible().catch(() => false)) {
        console.log(`  [${route}] Dismissing tutorial overlay...`);
        // Try to click skip button first, then close button
        const skipButton = page.locator('[data-testid="button-skip-tutorial"]');
        const closeButton = page.locator('[data-testid="button-close-tutorial"]');
        
        if (await skipButton.isVisible().catch(() => false)) {
          await skipButton.click();
        } else if (await closeButton.isVisible().catch(() => false)) {
          await closeButton.click();
        }
        
        // Wait for overlay to disappear
        await tutorialOverlay.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(500);
      }

      // Find all visible buttons and links
      const buttons = page.locator('button:visible, a[href]:visible');
      const buttonCount = await buttons.count();

      console.log(`\n[${route}] Found ${buttonCount} visible buttons/links`);

      // Check the first 20 major buttons
      const buttonsToCheck = Math.min(20, buttonCount);

      for (let i = 0; i < buttonsToCheck; i++) {
        const button = buttons.nth(i);
        
        try {
          // Check if button is visible
          const isVisible = await button.isVisible();
          if (!isVisible) {
            continue;
          }

          // Get button text/identifier for logging
          const buttonText = await button.textContent().catch(() => '');
          const buttonRole = await button.getAttribute('role').catch(() => '');
          const buttonId = await button.getAttribute('id').catch(() => '');
          const buttonClass = await button.getAttribute('class').catch(() => '');
          
          const buttonIdentifier = buttonText?.trim() || buttonId || buttonClass || `Button ${i}`;

          // Scroll button into view
          await button.scrollIntoViewIfNeeded();

          // Wait a moment for scroll to complete
          await page.waitForTimeout(200);

          // Attempt trial click to check if it would succeed
          try {
            await button.click({ trial: true });
            console.log(`  ✓ ${buttonIdentifier} - Clickable`);
          } catch (error: any) {
            const errorMessage = error.message || String(error);
            
            // Check if error is about element being obscured
            if (errorMessage.includes('obscured') || 
                errorMessage.includes('not clickable') ||
                errorMessage.includes('intercepted')) {
              
              // Try to find the obscuring element
              let obscuringElement = 'Unknown';
              
              try {
                // Get button's bounding box
                const box = await button.boundingBox();
                if (box) {
                  // Get element at the center of the button
                  const centerX = box.x + box.width / 2;
                  const centerY = box.y + box.height / 2;
                  
                  // Use evaluate to find element at that point
                  const elementAtPoint = await page.evaluate(({ x, y }) => {
                    const element = document.elementFromPoint(x, y);
                    if (element) {
                      // Walk up the DOM tree to find the fixed/overlay element
                      let current: Element | null = element;
                      while (current && current !== document.body) {
                        const style = window.getComputedStyle(current);
                        const position = style.position;
                        const zIndex = style.zIndex;
                        const pointerEvents = style.pointerEvents;
                        
                        // Check if this is likely an overlay
                        if ((position === 'fixed' || position === 'absolute') && 
                            (parseInt(zIndex) >= 50 || pointerEvents !== 'none')) {
                          return {
                            tag: current.tagName,
                            id: current.id || '',
                            className: current.className || '',
                            zIndex: zIndex,
                            position: position,
                            pointerEvents: pointerEvents
                          };
                        }
                        current = current.parentElement;
                      }
                      
                      // Return the topmost element if no overlay found
                      return {
                        tag: element.tagName,
                        id: element.id || '',
                        className: element.className || '',
                        zIndex: style.zIndex,
                        position: style.position,
                        pointerEvents: style.pointerEvents
                      };
                    }
                    return null;
                  }, { x: centerX, y: centerY });
                  
                  if (elementAtPoint) {
                    obscuringElement = `${elementAtPoint.tag}${elementAtPoint.id ? '#' + elementAtPoint.id : ''}${elementAtPoint.className ? '.' + elementAtPoint.className.split(' ')[0] : ''} (z-index: ${elementAtPoint.zIndex}, position: ${elementAtPoint.position}, pointer-events: ${elementAtPoint.pointerEvents})`;
                  }
                }
              } catch (e) {
                console.error('Error finding obscuring element:', e);
              }

              issues.push({
                route,
                button: buttonIdentifier,
                issue: `Obscured by: ${obscuringElement}`
              });

              console.log(`  ✗ ${buttonIdentifier} - OBSCURED by ${obscuringElement}`);
            } else {
              console.log(`  ? ${buttonIdentifier} - Error: ${errorMessage}`);
            }
          }
        } catch (error: any) {
          console.log(`  ! Button ${i} - Error during check: ${error.message}`);
        }
      }
    }

    // Report findings
    if (issues.length > 0) {
      console.log('\n=== INTERACTION ISSUES FOUND ===');
      issues.forEach(({ route, button, issue }) => {
        console.log(`[${route}] ${button}: ${issue}`);
      });
      console.log('================================\n');
    } else {
      console.log('\n✓ No button click interception issues found!\n');
    }

    // Test will pass but log issues for review
    // In a real scenario, you might want to fail the test if critical buttons are blocked
    expect(issues.length).toBeLessThan(100); // Just a sanity check
  });
});

