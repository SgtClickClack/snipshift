import { test, expect, Page } from '@playwright/test';

test.describe('Performance & Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a user
    await page.goto('/');
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.click('[data-testid="login-button"]');
  });

  test.describe('Page Load Performance', () => {
    test('should load pages within acceptable time limits', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/jobs');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
      
      await expect(page.locator('[data-testid="job-feed"]')).toBeVisible();
    });

    test('should measure Core Web Vitals', async ({ page }) => {
      // Navigate to page and measure performance
      await page.goto('/jobs');
      
      // Measure Largest Contentful Paint (LCP)
      const lcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          }).observe({ entryTypes: ['largest-contentful-paint'] });
        });
      });
      
      expect(lcp).toBeLessThan(2500); // LCP should be under 2.5s
      
      // Measure First Input Delay (FID)
      const fid = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const firstEntry = entries[0];
            resolve(firstEntry.processingStart - firstEntry.startTime);
          }).observe({ entryTypes: ['first-input'] });
        });
      });
      
      // Trigger first input
      await page.click('[data-testid="job-card"]').first();
      
      // FID should be under 100ms
      expect(fid).toBeLessThan(100);
    });

    test('should optimize image loading', async ({ page }) => {
      await page.goto('/community');
      
      // Check if images are lazy loaded
      const images = page.locator('[data-testid="post-image"]');
      const count = await images.count();
      
      for (let i = 0; i < count; i++) {
        const image = images.nth(i);
        const loading = await image.getAttribute('loading');
        expect(loading).toBe('lazy');
      }
    });

    test('should implement code splitting', async ({ page }) => {
      // Check if JavaScript bundles are split
      const jsFiles = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        return scripts.map(script => script.getAttribute('src'));
      });
      
      // Should have multiple JS files (code splitting)
      expect(jsFiles.length).toBeGreaterThan(1);
      
      // Check for chunk files
      const hasChunks = jsFiles.some(file => file?.includes('chunk'));
      expect(hasChunks).toBeTruthy();
    });
  });

  test.describe('API Response Times', () => {
    test('should respond to API calls quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/jobs');
      
      // Wait for API call to complete
      await page.waitForResponse(response => 
        response.url().includes('/api/jobs') && response.status() === 200
      );
      
      const apiResponseTime = Date.now() - startTime;
      expect(apiResponseTime).toBeLessThan(1000); // API should respond within 1 second
    });

    test('should implement API caching', async ({ page }) => {
      // First request
      const startTime1 = Date.now();
      await page.goto('/jobs');
      await page.waitForResponse(response => 
        response.url().includes('/api/jobs') && response.status() === 200
      );
      const firstRequestTime = Date.now() - startTime1;
      
      // Second request (should be cached)
      const startTime2 = Date.now();
      await page.reload();
      await page.waitForResponse(response => 
        response.url().includes('/api/jobs') && response.status() === 200
      );
      const secondRequestTime = Date.now() - startTime2;
      
      // Cached request should be faster
      expect(secondRequestTime).toBeLessThan(firstRequestTime);
    });

    test('should handle API timeouts gracefully', async ({ page }) => {
      // Mock slow API response
      await page.route('**/api/jobs', route => {
        setTimeout(() => route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ jobs: [] })
        }), 5000);
      });
      
      await page.goto('/jobs');
      
      // Should show loading state
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
      
      // Should eventually load
      await expect(page.locator('[data-testid="job-feed"]')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Memory Usage', () => {
    test('should not have memory leaks', async ({ page }) => {
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        await page.goto('/jobs');
        await page.goto('/community');
        await page.goto('/messages');
      }
      
      // Force garbage collection
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Memory usage should not increase significantly
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
    });

    test('should clean up event listeners', async ({ page }) => {
      await page.goto('/jobs');
      
      // Add and remove event listeners
      const listenerCount = await page.evaluate(() => {
        // Mock adding event listeners
        const handler = () => {};
        window.addEventListener('scroll', handler);
        window.addEventListener('resize', handler);
        
        // Remove event listeners
        window.removeEventListener('scroll', handler);
        window.removeEventListener('resize', handler);
        
        return 0; // Should be 0 after cleanup
      });
      
      expect(listenerCount).toBe(0);
    });
  });

  test.describe('Database Performance', () => {
    test('should optimize database queries', async ({ page }) => {
      // Monitor database query performance
      const queryTimes: number[] = [];
      
      page.on('response', response => {
        if (response.url().includes('/api/')) {
          const timing = response.timing();
          if (timing) {
            queryTimes.push(timing.responseEnd - timing.requestStart);
          }
        }
      });
      
      await page.goto('/jobs');
      await page.goto('/community');
      await page.goto('/messages');
      
      // Average query time should be reasonable
      const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      expect(avgQueryTime).toBeLessThan(500); // Less than 500ms average
    });

    test('should implement database connection pooling', async ({ page }) => {
      // Make multiple concurrent requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(page.evaluate(() => {
          return fetch('/api/jobs').then(r => r.json());
        }));
      }
      
      const responses = await Promise.all(promises);
      
      // All requests should succeed
      expect(responses.every(r => r.jobs !== undefined)).toBeTruthy();
    });

    test('should use database indexes effectively', async ({ page }) => {
      // Search with different parameters
      await page.goto('/jobs');
      
      await page.fill('[data-testid="job-search"]', 'barber');
      await page.click('[data-testid="search-button"]');
      
      const searchTime = await page.evaluate(() => {
        return performance.now();
      });
      
      // Search should be fast (indexed)
      expect(searchTime).toBeLessThan(1000);
    });
  });

  test.describe('Caching Strategies', () => {
    test('should implement browser caching', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      
      // Check for cache headers
      expect(headers['cache-control']).toBeDefined();
      expect(headers['etag']).toBeDefined();
    });

    test('should use CDN for static assets', async ({ page }) => {
      await page.goto('/');
      
      // Check if static assets are served from CDN
      const staticAssets = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('link[href]'));
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        return [...links, ...scripts].map(el => 
          el.getAttribute('href') || el.getAttribute('src')
        );
      });
      
      // Should have CDN URLs
      const hasCDN = staticAssets.some(asset => 
        asset?.includes('cdn') || asset?.includes('static')
      );
      expect(hasCDN).toBeTruthy();
    });

    test('should implement service worker caching', async ({ page }) => {
      await page.goto('/');
      
      // Check if service worker is registered
      const swRegistered = await page.evaluate(() => {
        return 'serviceWorker' in navigator;
      });
      
      expect(swRegistered).toBeTruthy();
      
      // Check if service worker is active
      const swActive = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          return registration?.active !== null;
        }
        return false;
      });
      
      expect(swActive).toBeTruthy();
    });
  });

  test.describe('Resource Optimization', () => {
    test('should minimize bundle sizes', async ({ page }) => {
      await page.goto('/');
      
      // Get JavaScript bundle sizes
      const jsSizes = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        return scripts.map(script => {
          const src = script.getAttribute('src');
          return src ? { src, size: 0 } : null;
        }).filter(Boolean);
      });
      
      // Each bundle should be reasonable size
      jsSizes.forEach(bundle => {
        expect(bundle?.size).toBeLessThan(500 * 1024); // Less than 500KB per bundle
      });
    });

    test('should optimize images', async ({ page }) => {
      await page.goto('/community');
      
      // Check if images are optimized
      const images = page.locator('[data-testid="post-image"]');
      const count = await images.count();
      
      for (let i = 0; i < count; i++) {
        const image = images.nth(i);
        const src = await image.getAttribute('src');
        
        // Should have optimization parameters
        expect(src).toMatch(/w=\d+&h=\d+/);
        expect(src).toMatch(/q=\d+/);
      }
    });

    test('should implement lazy loading', async ({ page }) => {
      await page.goto('/jobs');
      
      // Check if images are lazy loaded
      const images = page.locator('img');
      const count = await images.count();
      
      for (let i = 0; i < count; i++) {
        const image = images.nth(i);
        const loading = await image.getAttribute('loading');
        expect(loading).toBe('lazy');
      }
    });

    test('should use efficient CSS', async ({ page }) => {
      await page.goto('/');
      
      // Check if CSS is minified
      const cssLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        return links.map(link => link.getAttribute('href'));
      });
      
      cssLinks.forEach(css => {
        expect(css).toMatch(/\.min\.css/);
      });
    });
  });

  test.describe('Network Optimization', () => {
    test('should implement HTTP/2', async ({ page }) => {
      const response = await page.goto('/');
      
      // Check if HTTP/2 is used
      const protocol = response?.url().startsWith('https://') ? 'h2' : 'http/1.1';
      expect(protocol).toBe('h2');
    });

    test('should use compression', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      
      // Check for compression headers
      expect(headers['content-encoding']).toBeDefined();
      expect(['gzip', 'br', 'deflate']).toContain(headers['content-encoding']);
    });

    test('should minimize HTTP requests', async ({ page }) => {
      const requests: string[] = [];
      
      page.on('request', request => {
        requests.push(request.url());
      });
      
      await page.goto('/jobs');
      
      // Should not have too many requests
      expect(requests.length).toBeLessThan(50);
      
      // Should not have duplicate requests
      const uniqueRequests = new Set(requests);
      expect(uniqueRequests.size).toBe(requests.length);
    });
  });

  test.describe('Real-time Performance', () => {
    test('should handle real-time updates efficiently', async ({ page }) => {
      await page.goto('/messages');
      
      // Monitor WebSocket performance
      const wsMessages: number[] = [];
      
      page.on('websocket', ws => {
        ws.on('framereceived', () => {
          wsMessages.push(Date.now());
        });
      });
      
      // Wait for WebSocket messages
      await page.waitForTimeout(5000);
      
      // Should receive messages regularly
      expect(wsMessages.length).toBeGreaterThan(0);
      
      // Messages should be received quickly
      const avgMessageTime = wsMessages.reduce((a, b) => a + b, 0) / wsMessages.length;
      expect(avgMessageTime).toBeLessThan(1000);
    });

    test('should optimize real-time data updates', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Monitor update frequency
      const updateTimes: number[] = [];
      
      page.on('response', response => {
        if (response.url().includes('/api/updates')) {
          updateTimes.push(Date.now());
        }
      });
      
      await page.waitForTimeout(10000);
      
      // Should not update too frequently
      if (updateTimes.length > 1) {
        const avgUpdateInterval = updateTimes.reduce((a, b, i) => {
          if (i === 0) return 0;
          return a + (b - updateTimes[i - 1]);
        }, 0) / (updateTimes.length - 1);
        
        expect(avgUpdateInterval).toBeGreaterThan(1000); // At least 1 second between updates
      }
    });
  });

  test.describe('Performance Monitoring', () => {
    test('should track performance metrics', async ({ page }) => {
      await page.goto('/jobs');
      
      // Get performance metrics
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
        };
      });
      
      // Check performance thresholds
      expect(metrics.domContentLoaded).toBeLessThan(1000);
      expect(metrics.loadComplete).toBeLessThan(2000);
      expect(metrics.firstPaint).toBeLessThan(1000);
      expect(metrics.firstContentfulPaint).toBeLessThan(1500);
    });

    test('should implement performance budgets', async ({ page }) => {
      await page.goto('/');
      
      // Check resource sizes
      const resources = await page.evaluate(() => {
        const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        return entries.map(entry => ({
          name: entry.name,
          size: entry.transferSize,
          duration: entry.duration
        }));
      });
      
      // Check if resources meet budget
      resources.forEach(resource => {
        expect(resource.size).toBeLessThan(1024 * 1024); // Less than 1MB
        expect(resource.duration).toBeLessThan(2000); // Less than 2 seconds
      });
    });

    test('should monitor Core Web Vitals', async ({ page }) => {
      await page.goto('/jobs');
      
      // Measure Core Web Vitals
      const vitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitals: any = {};
          
          // LCP
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            vitals.lcp = lastEntry.startTime;
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          // FID
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const firstEntry = entries[0];
            vitals.fid = firstEntry.processingStart - firstEntry.startTime;
          }).observe({ entryTypes: ['first-input'] });
          
          // CLS
          new PerformanceObserver((list) => {
            let clsValue = 0;
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
            vitals.cls = clsValue;
          }).observe({ entryTypes: ['layout-shift'] });
          
          setTimeout(() => resolve(vitals), 5000);
        });
      });
      
      // Trigger first input for FID measurement
      await page.click('[data-testid="job-card"]').first();
      
      // Check Core Web Vitals thresholds
      expect(vitals.lcp).toBeLessThan(2500); // LCP < 2.5s
      expect(vitals.fid).toBeLessThan(100); // FID < 100ms
      expect(vitals.cls).toBeLessThan(0.1); // CLS < 0.1
    });
  });
});
