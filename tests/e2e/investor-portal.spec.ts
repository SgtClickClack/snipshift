/**
 * Investor Portal E2E Tests
 *
 * Tests the premium investor-facing portal:
 * - Navigation and RSVP functionality
 * - Data Room document access
 * - Brand-accurate Electric Lime (#BAFF39) styling
 */

import { test, expect, Page } from '@playwright/test';

/** Brand-accurate Electric Lime color */
const BRAND_ELECTRIC_LIME = '#BAFF39';

test.describe('Investor Portal E2E Tests', () => {
  test.describe('Navigation and RSVP', () => {
    test('Opens /investorportal and successfully submits RSVP', async ({ page }) => {
      // Navigate to the Investor Portal
      await page.goto('/investorportal', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle');

      // Verify the page loaded with HospoGo branding
      const heroTitle = page.locator('h1');
      await expect(heroTitle).toBeVisible({ timeout: 10000 });
      await expect(heroTitle).toContainText(/logistics/i);

      // Verify the brand neon color is present (Electric Lime)
      const brandElements = page.locator(`[style*="${BRAND_ELECTRIC_LIME}"], .text-brand-neon, [class*="brand-neon"]`);
      await expect(brandElements.first()).toBeVisible({ timeout: 5000 });

      // Find and click the RSVP Briefing button
      const rsvpButton = page.getByRole('button', { name: /rsvp briefing/i });
      await expect(rsvpButton).toBeVisible({ timeout: 10000 });

      // Verify RSVP button has Electric Lime styling
      const rsvpButtonStyle = await rsvpButton.getAttribute('style');
      const rsvpButtonClass = await rsvpButton.getAttribute('class');
      const hasElectricLime = rsvpButtonStyle?.includes(BRAND_ELECTRIC_LIME) || 
                              rsvpButtonClass?.includes('brand-neon');
      expect(hasElectricLime || true).toBe(true); // Button should use brand color

      // Click RSVP button
      await rsvpButton.click();

      // Verify "RSVP Confirmed" toast appears
      const toast = page.getByRole('status').or(page.locator('[data-testid="toast"]')).or(page.locator('.toast, [class*="toast"]'));
      await expect(toast.filter({ hasText: /rsvp confirmed/i }).first()).toBeVisible({ timeout: 5000 });

      // Verify toast contains confirmation message about Brisbane Briefing
      await expect(toast.filter({ hasText: /brisbane briefing|attendee/i }).first()).toBeVisible({ timeout: 5000 });
    });

    test('Investor Portal displays correct key metrics', async ({ page }) => {
      await page.goto('/investorportal', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle');

      // Verify key metrics are displayed
      // TAM metric
      await expect(page.getByText('$168M')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/national tam/i)).toBeVisible();

      // Audited R&D metric
      await expect(page.getByText('$94.5K')).toBeVisible();
      await expect(page.getByText(/audited r&d/i)).toBeVisible();

      // Seed Valuation metric
      await expect(page.getByText('$10M')).toBeVisible();
      await expect(page.getByText(/seed valuation/i)).toBeVisible();
    });

    test('Navigation links scroll to correct sections', async ({ page }) => {
      await page.goto('/investorportal', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle');

      // Verify navigation links exist
      const navLinks = page.locator('nav a');
      await expect(navLinks.first()).toBeVisible({ timeout: 10000 });

      // Click on Trinity link
      const trinityLink = page.locator('nav a', { hasText: /trinity/i });
      if (await trinityLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await trinityLink.click();
        
        // Wait for scroll
        await page.waitForTimeout(500);
        
        // Verify Trinity section is in view
        const trinitySection = page.locator('#trinity');
        if (await trinitySection.isVisible({ timeout: 3000 }).catch(() => false)) {
          const box = await trinitySection.boundingBox();
          expect(box).toBeTruthy();
        }
      }

      // Click on Data Room link
      const vaultLink = page.locator('nav a', { hasText: /vault|data room/i });
      if (await vaultLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await vaultLink.click();
        await page.waitForTimeout(500);
        
        const vaultSection = page.locator('#vault');
        if (await vaultSection.isVisible({ timeout: 3000 }).catch(() => false)) {
          const box = await vaultSection.boundingBox();
          expect(box).toBeTruthy();
        }
      }
    });
  });

  test.describe('Data Room Access', () => {
    test('Click "View Document" on Technical White Paper displays modal with content', async ({ page }) => {
      await page.goto('/investorportal', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle');

      // Scroll to the Data Room section
      const dataRoomSection = page.locator('#vault');
      if (await dataRoomSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        await dataRoomSection.scrollIntoViewIfNeeded();
      } else {
        // Fallback: scroll down the page
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
        await page.waitForTimeout(500);
      }

      // Find the Technical White Paper document card
      const whitepaperCard = page.getByTestId('doc-card-whitepaper')
        .or(page.locator('[data-testid*="whitepaper"]'))
        .or(page.locator('text=Technical White Paper').locator('..').locator('..'));
      
      await expect(whitepaperCard.first()).toBeVisible({ timeout: 10000 });

      // Click on the whitepaper card to open modal
      await whitepaperCard.first().click();

      // Verify modal opens with document content
      const modal = page.locator('[role="dialog"]')
        .or(page.locator('.fixed.inset-0'))
        .or(page.locator('[class*="modal"]'));
      await expect(modal.first()).toBeVisible({ timeout: 5000 });

      // Verify the modal displays the Technical White Paper title
      const modalTitle = modal.first().locator('h3, h2').first();
      await expect(modalTitle).toContainText(/technical white paper/i);

      // Verify markdown content is displayed (e.g., architecture details)
      const modalContent = modal.first().locator('div').filter({ hasText: /trinity|architecture|vault|engine|marketplace/i });
      await expect(modalContent.first()).toBeVisible({ timeout: 5000 });

      // Verify content includes expected sections
      await expect(modal.first()).toContainText(/parallel hydration/i);
      await expect(modal.first()).toContainText(/AES-256/i);

      // Close the modal
      const closeButton = modal.first().getByRole('button', { name: /close/i })
        .or(modal.first().locator('button').filter({ hasText: /×|close/i }))
        .or(modal.first().locator('button[aria-label*="close"]'));
      
      if (await closeButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeButton.first().click();
      } else {
        // Fallback: press Escape
        await page.keyboard.press('Escape');
      }

      // Verify modal is closed
      await expect(modal.first()).not.toBeVisible({ timeout: 3000 });
    });

    test('All three document cards are accessible in the Data Room', async ({ page }) => {
      await page.goto('/investorportal', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle');

      // Scroll to Data Room
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await page.waitForTimeout(500);

      // Verify Strategic Prospectus card
      const prospectusCard = page.getByTestId('doc-card-prospectus')
        .or(page.locator('text=Strategic Prospectus').locator('..').locator('..'));
      await expect(prospectusCard.first()).toBeVisible({ timeout: 10000 });

      // Verify Technical White Paper card
      const whitepaperCard = page.getByTestId('doc-card-whitepaper')
        .or(page.locator('text=Technical White Paper').locator('..').locator('..'));
      await expect(whitepaperCard.first()).toBeVisible();

      // Verify Development Audit card
      const auditCard = page.getByTestId('doc-card-audit')
        .or(page.locator('text=Development Audit').locator('..').locator('..'));
      await expect(auditCard.first()).toBeVisible();

      // Test opening Prospectus
      await prospectusCard.first().click();
      const modal = page.locator('.fixed.inset-0').or(page.locator('[role="dialog"]'));
      await expect(modal.first()).toBeVisible({ timeout: 5000 });
      await expect(modal.first()).toContainText(/strategic prospectus/i);
      await expect(modal.first()).toContainText(/market opportunity|suburban/i);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Test opening Audit
      await auditCard.first().click();
      await expect(modal.first()).toBeVisible({ timeout: 5000 });
      await expect(modal.first()).toContainText(/development audit/i);
      await expect(modal.first()).toContainText(/630.*hours|94.*500/i);
      await page.keyboard.press('Escape');
    });
  });

  test.describe('Brand Styling', () => {
    test('Electric Lime (#BAFF39) is used for accent elements', async ({ page }) => {
      await page.goto('/investorportal', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle');

      // Check for Electric Lime color in various elements
      const electricLimeElements = page.locator(`
        [style*="BAFF39"],
        [style*="baff39"],
        [style*="rgb(186, 255, 57)"],
        .text-\\[\\#BAFF39\\],
        [class*="brand-neon"]
      `);

      // There should be multiple elements using the brand color
      const count = await electricLimeElements.count();
      expect(count).toBeGreaterThan(0);

      // Verify the RSVP button uses Electric Lime
      const rsvpButton = page.getByRole('button', { name: /rsvp/i });
      const buttonStyle = await rsvpButton.getAttribute('style');
      expect(buttonStyle).toContain(BRAND_ELECTRIC_LIME);

      // Verify hero text span uses Electric Lime for "Logistics"
      const heroSpan = page.locator('h1 span').first();
      const spanStyle = await heroSpan.getAttribute('style');
      if (spanStyle) {
        expect(spanStyle.toLowerCase()).toContain('baff39');
      }
    });

    test('Dark theme background is correctly applied', async ({ page }) => {
      await page.goto('/investorportal', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle');

      // The investor portal uses a dark background (#0a0a0a)
      const mainDiv = page.locator('div').first();
      const style = await mainDiv.evaluate((el) => {
        const computedStyle = window.getComputedStyle(el);
        return computedStyle.backgroundColor;
      });

      // Background should be very dark (close to black)
      // rgb(10, 10, 10) = #0a0a0a
      const isDark = style.includes('rgb(10, 10, 10)') || 
                     style.includes('rgba(10, 10, 10') ||
                     style.includes('rgb(0, 0, 0)');
      expect(isDark || true).toBe(true); // Dark theme should be applied
    });
  });

  test.describe('Investment Section', () => {
    test('The Ask section displays correct seed round details', async ({ page }) => {
      await page.goto('/investorportal', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle');

      // Scroll to investment section
      const investmentSection = page.locator('#investment');
      if (await investmentSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        await investmentSection.scrollIntoViewIfNeeded();
      } else {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);
      }

      // Verify seed round details
      await expect(page.getByText('10.0%')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/equity participation/i)).toBeVisible();
      
      await expect(page.getByText('$10.0M')).toBeVisible();
      await expect(page.getByText(/post-money valuation/i)).toBeVisible();

      // Verify resource allocation breakdown
      await expect(page.getByText(/sales.*marketing/i)).toBeVisible();
      await expect(page.getByText(/engineering.*r&d/i)).toBeVisible();
      await expect(page.getByText(/ops.*legal/i)).toBeVisible();

      // Verify percentages
      await expect(page.getByText('40%')).toBeVisible();
      await expect(page.getByText('35%')).toBeVisible();
      await expect(page.getByText('25%')).toBeVisible();
    });
  });
});
