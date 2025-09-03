import { test, expect } from '@playwright/test';

test.describe('Design System Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/design-showcase');
  });

  test('should display all chrome button variants', async ({ page }) => {
    // Check chrome button variants are rendered
    await expect(page.getByTestId('chrome-button')).toBeVisible();
    await expect(page.getByTestId('accent-button')).toBeVisible();
    await expect(page.getByTestId('charcoal-button')).toBeVisible();
    await expect(page.getByTestId('steel-button')).toBeVisible();
    
    // Test button interactions
    await page.getByTestId('chrome-button').hover();
    await page.getByTestId('accent-button').hover();
  });

  test('should display chrome cards with proper styling', async ({ page }) => {
    // Check different card types are present
    const cards = page.locator('.card-chrome, .card-floating, .charcoal-mirror');
    await expect(cards.first()).toBeVisible();
    
    // Verify cards have proper styling classes
    const chromeCard = page.locator('.card-chrome').first();
    await expect(chromeCard).toBeVisible();
  });

  test('should be responsive across different screen sizes', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByTestId('design-showcase')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByTestId('button-grid')).toBeVisible();
    
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.getByTestId('button-grid')).toBeVisible();
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    // Check button accessibility
    const chromeButton = page.getByTestId('chrome-button');
    await expect(chromeButton).toHaveAttribute('type', 'button');
    await expect(chromeButton).toBeEnabled();
    
    // Check heading hierarchy
    const h1 = page.locator('h1');
    const h2 = page.locator('h2');
    
    await expect(h1).toBeVisible();
    await expect(h2.first()).toBeVisible();
  });

  test('should display typography with chrome styling', async ({ page }) => {
    // Check typography variants are visible
    const headings = page.locator('h1, h2');
    await expect(headings.first()).toBeVisible();
    
    // Check color gradient text is present
    const gradientText = page.locator('.text-steel-gradient, .text-accent-gradient').first();
    await expect(gradientText).toBeVisible();
  });
});