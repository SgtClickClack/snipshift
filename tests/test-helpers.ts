import { Page, expect } from '@playwright/test';

export class TestHelpers {
  constructor(private page: Page) {}

  async waitForElementOrEmptyState(
    selector: string, 
    emptyStateSelector: string, 
    timeout = 10000
  ) {
    await this.page.waitForSelector(
      `${selector}, ${emptyStateSelector}`, 
      { timeout }
    );
  }

  async expectElementOrSkip(
    selector: string, 
    condition: () => Promise<boolean>,
    skipMessage = 'Element not found, skipping test'
  ) {
    const element = this.page.locator(selector);
    const isVisible = await element.isVisible();
    
    if (!isVisible) {
      console.log(skipMessage);
      return false;
    }
    
    await condition();
    return true;
  }

  async handleApiError(
    routePattern: string,
    errorResponse: { status: number; body: any },
    testAction: () => Promise<void>
  ) {
    await this.page.route(routePattern, route => {
      route.fulfill({
        status: errorResponse.status,
        contentType: 'application/json',
        body: JSON.stringify(errorResponse.body)
      });
    });

    await testAction();
  }

  async simulateNetworkCondition(condition: 'offline' | 'slow' | 'normal') {
    switch (condition) {
      case 'offline':
        await this.page.context().setOffline(true);
        break;
      case 'slow':
        await this.page.route('**/*', route => {
          setTimeout(() => route.continue(), 2000);
        });
        break;
      case 'normal':
        await this.page.context().setOffline(false);
        break;
    }
  }

  async waitForApiCall(apiPattern: string, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`API call to ${apiPattern} timed out`));
      }, timeout);

      this.page.route(apiPattern, route => {
        clearTimeout(timeoutId);
        resolve(route);
        route.continue();
      });
    });
  }

  async mockApiResponse(
    pattern: string, 
    response: { status: number; body: any },
    delay = 0
  ) {
    await this.page.route(pattern, route => {
      setTimeout(() => {
        route.fulfill({
          status: response.status,
          contentType: 'application/json',
          body: JSON.stringify(response.body)
        });
      }, delay);
    });
  }

  async expectErrorState(
    errorSelectors: string[],
    retrySelector?: string
  ) {
    // Wait for any error indicator to appear
    await this.page.waitForSelector(
      errorSelectors.join(', '), 
      { timeout: 10000 }
    );

    // Check if any error selector is visible
    for (const selector of errorSelectors) {
      const element = this.page.locator(selector);
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
        break;
      }
    }

    // Check for retry button if provided
    if (retrySelector) {
      const retryButton = this.page.locator(retrySelector);
      if (await retryButton.isVisible()) {
        await expect(retryButton).toBeVisible();
      }
    }
  }

  async expectSuccessState(successSelectors: string[]) {
    await this.page.waitForSelector(
      successSelectors.join(', '), 
      { timeout: 10000 }
    );

    for (const selector of successSelectors) {
      const element = this.page.locator(selector);
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
        return;
      }
    }
  }

  async fillForm(formData: Record<string, string>) {
    for (const [field, value] of Object.entries(formData)) {
      const input = this.page.locator(`[data-testid="${field}"]`);
      await input.fill(value);
    }
  }

  async clickAndWaitForNavigation(
    selector: string, 
    expectedUrl?: string,
    timeout = 10000
  ) {
    if (expectedUrl) {
      await Promise.all([
        this.page.waitForURL(expectedUrl, { timeout }),
        this.page.click(selector)
      ]);
    } else {
      await this.page.click(selector);
      await this.page.waitForLoadState('networkidle', { timeout });
    }
  }

  async waitForLoadingToComplete(loadingSelector = '[data-testid="loading"]') {
    // Wait for loading to start
    await this.page.waitForSelector(loadingSelector, { timeout: 5000 });
    
    // Wait for loading to complete
    await this.page.waitForSelector(loadingSelector, { 
      state: 'hidden', 
      timeout: 10000 
    });
  }

  async expectMobileLayout() {
    // Check if mobile-specific elements are present
    const mobileElements = [
      '[data-testid="mobile-menu-button"]',
      '[data-testid="mobile-navigation"]',
      '.mobile-only'
    ];

    for (const selector of mobileElements) {
      const element = this.page.locator(selector);
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
        return true;
      }
    }
    return false;
  }

  async expectDesktopLayout() {
    // Check if desktop-specific elements are present
    const desktopElements = [
      '[data-testid="desktop-navigation"]',
      '.desktop-only',
      '.hidden.md\\:block'
    ];

    for (const selector of desktopElements) {
      const element = this.page.locator(selector);
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
        return true;
      }
    }
    return false;
  }

  async takeScreenshotOnFailure(testName: string) {
    const screenshot = await this.page.screenshot({ 
      fullPage: true,
      path: `test-results/screenshots/${testName}-failure.png`
    });
    return screenshot;
  }

  async logPageInfo() {
    const url = this.page.url();
    const title = await this.page.title();
    const viewport = this.page.viewportSize();
    
    console.log('Page Info:', {
      url,
      title,
      viewport
    });
  }
}

// Utility functions for common test patterns
export async function waitForApiResponse(
  page: Page, 
  apiPattern: string, 
  timeout = 10000
) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`API call to ${apiPattern} timed out`));
    }, timeout);

    page.route(apiPattern, route => {
      clearTimeout(timeoutId);
      resolve(route);
      route.continue();
    });
  });
}

export async function mockApiError(
  page: Page,
  pattern: string,
  status: number,
  message: string
) {
  await page.route(pattern, route => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: message })
    });
  });
}

export async function expectElementWithTimeout(
  page: Page,
  selector: string,
  timeout = 10000
) {
  await page.waitForSelector(selector, { timeout });
  return page.locator(selector);
}

export async function skipTestIfElementNotFound(
  page: Page,
  selector: string,
  message = 'Required element not found, skipping test'
) {
  const element = page.locator(selector);
  const isVisible = await element.isVisible();
  
  if (!isVisible) {
    console.log(message);
    return false;
  }
  
  return true;
}
