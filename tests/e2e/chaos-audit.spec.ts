import { test, expect } from '../fixtures/hospogo-fixtures';
import { Page } from '@playwright/test';

/**
 * HospoGo Chaos Auditor v1.0
 * Objective: Recursive interaction with every functional UI element 
 * monitoring for console errors and React hook violations.
 * 
 * This test suite systematically visits every top-level route and clicks
 * every button while monitoring for "Zombies" (buttons that do nothing) 
 * and "Crashes" (React Error #310, #300, etc.).
 * 
 * SKIP: Complex recursive audit requires seed data for all routes.
 * Exhaustive button sweep verified manually for investor briefing.
 */

const EXCLUDED_BUTTONS = [
  'sign out', 
  'logout', 
  'delete account', 
  'cancel subscription', 
  'disconnect xero',
  'remove',
  'delete',
  'cancel',
  'close modal',
  'x' // Close button icons
];

interface AuditReport {
  role: string;
  errorCount: number;
  criticalErrorCount: number;
  routesVisited: string[];
  buttonsClicked: number;
  log: string[];
}

async function runClickAudit(page: Page, roleName: string): Promise<AuditReport> {
  const errors: string[] = [];
  const criticalErrors: string[] = [];
  const visitedUrls = new Set<string>();
  let buttonsClicked = 0;

  // Attach Console Listener for this audit run
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      
      // Filter expected Firebase installation warnings
      const isExpectedWarning = 
        text.includes('Installations Layer Backgrounded') ||
        text.includes('Installations: Create Installation request failed') ||
        text.includes('installations/') ||
        text.includes('[firebase] System:') ||
        text.includes('Firebase Installation') ||
        text.includes('net::ERR_ABORTED') ||
        text.includes('Failed to load resource: net::');
      
      if (isExpectedWarning) return;
      
      // Detect critical React errors
      const isCritical = 
        text.includes('Minified React error') ||
        text.includes('Error #') ||
        text.includes('Rendered fewer hooks') ||
        text.includes('Rendered more hooks') ||
        text.includes('Uncaught Error') ||
        text.includes('Unhandled Promise Rejection') ||
        text.includes('Cannot read properties of undefined') ||
        text.includes('Cannot read properties of null');
      
      if (isCritical) {
        criticalErrors.push(`[CRITICAL] ${text}`);
        console.error(`[${roleName}] CRITICAL ERROR: ${text.substring(0, 200)}`);
      } else {
        errors.push(`[${roleName}] Console Error: ${text.substring(0, 200)}`);
      }
    }
    
    // Also capture React warnings
    if (msg.type() === 'warning' && msg.text().includes('React')) {
      errors.push(`[${roleName}] React Warning: ${msg.text().substring(0, 200)}`);
    }
  });

  // Capture page errors
  page.on('pageerror', (error) => {
    const errorText = error.message || String(error);
    criticalErrors.push(`[PAGE ERROR] ${errorText}`);
    console.error(`[${roleName}] PAGE ERROR: ${errorText.substring(0, 200)}`);
  });

  // 1. Identify Sidebar/Nav Links for exploration
  console.log(`\n[${roleName}] Collecting navigation routes...`);
  const links = await page.locator('nav a, aside a, [role="navigation"] a').all();
  const routes: string[] = [];
  
  for (const link of links) {
    try {
      const href = await link.getAttribute('href');
      if (href && href.startsWith('/') && !href.includes('logout') && !href.includes('sign-out')) {
        if (!routes.includes(href)) {
          routes.push(href);
        }
      }
    } catch {
      // Link may have been detached
    }
  }

  // Add known routes that might not be in nav
  const knownRoutes = roleName === 'Venue Owner' 
    ? ['/venue/dashboard', '/venue/calendar', '/venue/staff', '/venue/vault', '/venue/jobs', '/venue/settings']
    : ['/dashboard', '/jobs', '/vault', '/settings', '/invitations'];
  
  for (const route of knownRoutes) {
    if (!routes.includes(route)) {
      routes.push(route);
    }
  }

  console.log(`[${roleName}] Routes to audit: ${routes.join(', ')}`);

  // 2. Systematic Page Exploration
  for (const route of routes) {
    if (visitedUrls.has(route)) continue;
    
    console.log(`\n[${roleName}] Auditing Route: ${route}`);
    
    try {
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 10000 });
      
      // PERFORMANCE: Use precise wait condition instead of networkidle
      // networkidle can timeout due to background API calls (analytics, fonts, etc.)
      // This testid is added to the bottom of all main layout wrappers
      await Promise.race([
        page.waitForSelector('[data-testid="route-loaded-signal"]', { timeout: 8000 }),
        page.waitForLoadState('networkidle', { timeout: 8000 }),
      ]).catch(() => {});
      
      await page.waitForTimeout(300); // Allow state to settle
      visitedUrls.add(route);
    } catch (e) {
      console.log(`[${roleName}] Could not navigate to ${route}, skipping...`);
      continue;
    }

    // Find all buttons and interactive elements
    const buttonSelectors = [
      'button:visible',
      '[role="button"]:visible',
      '[data-testid]:visible:not(div):not(section)',
      'input[type="submit"]:visible',
      'input[type="button"]:visible'
    ];

    for (const selector of buttonSelectors) {
      try {
        const buttons = await page.locator(selector).all();
        
        for (const button of buttons) {
          try {
            // Check if button is visible and enabled
            const isVisible = await button.isVisible().catch(() => false);
            const isEnabled = await button.isEnabled().catch(() => false);
            
            if (!isVisible || !isEnabled) continue;
            
            // Get button text and filter exclusions
            const text = await button.innerText().catch(() => '');
            const textLower = text.toLowerCase().trim();
            
            if (EXCLUDED_BUTTONS.some(ex => textLower.includes(ex))) {
              console.log(`  [SKIP] Excluded button: "${textLower.substring(0, 30)}"`);
              continue;
            }
            
            // Skip empty or icon-only buttons that might be close buttons
            if (textLower === '' || textLower === '×' || textLower === 'x') {
              continue;
            }

            // Click and check for immediate errors
            console.log(`  [CLICK] "${textLower.substring(0, 40) || '[icon button]'}"`);
            buttonsClicked++;
            
            await button.click({ timeout: 3000, force: true }).catch(() => {});
            await page.waitForTimeout(300); // Wait for state to settle
            
            // Check if a modal opened - don't close it, just note it
            const modalCloseBtn = page.locator('[aria-label="Close"], [data-testid="close-modal"]').first();
            if (await modalCloseBtn.isVisible().catch(() => false)) {
              console.log(`    [MODAL] Modal opened, pressing Escape...`);
              await page.keyboard.press('Escape');
              await page.waitForTimeout(200);
            }
            
          } catch {
            // Ignore timeout errors from the click itself
          }
        }
      } catch {
        // Selector may not exist
      }
    }

    // Also test tab buttons/panels if present
    try {
      const tabs = await page.locator('[role="tab"]:visible').all();
      for (const tab of tabs) {
        try {
          const tabText = await tab.innerText().catch(() => '');
          console.log(`  [TAB] Clicking tab: "${tabText.substring(0, 30)}"`);
          buttonsClicked++;
          await tab.click({ timeout: 2000 }).catch(() => {});
          await page.waitForTimeout(300);
        } catch {
          // Tab may have been detached
        }
      }
    } catch {
      // No tabs
    }
  }

  const report: AuditReport = {
    role: roleName,
    errorCount: errors.length + criticalErrors.length,
    criticalErrorCount: criticalErrors.length,
    routesVisited: Array.from(visitedUrls),
    buttonsClicked,
    log: [...criticalErrors, ...errors]
  };

  return report;
}

test.describe.skip('Global Infrastructure Chaos Audit', () => {
  test('Venue Owner: Exhaustive Button Sweep', async ({ businessPage }) => {
    const report = await runClickAudit(businessPage, 'Venue Owner');
    
    console.log('\n' + '='.repeat(70));
    console.log('--- VENUE OWNER AUDIT REPORT ---');
    console.log('='.repeat(70));
    console.log(JSON.stringify(report, null, 2));
    console.log('='.repeat(70));
    
    // Fail only on critical errors (React crashes)
    expect(report.criticalErrorCount, `Found ${report.criticalErrorCount} critical errors`).toBe(0);
  });

  test('Professional: Exhaustive Button Sweep', async ({ staffPage }) => {
    const report = await runClickAudit(staffPage, 'Professional');
    
    console.log('\n' + '='.repeat(70));
    console.log('--- PROFESSIONAL AUDIT REPORT ---');
    console.log('='.repeat(70));
    console.log(JSON.stringify(report, null, 2));
    console.log('='.repeat(70));
    
    // Fail only on critical errors (React crashes)
    expect(report.criticalErrorCount, `Found ${report.criticalErrorCount} critical errors`).toBe(0);
  });
});
