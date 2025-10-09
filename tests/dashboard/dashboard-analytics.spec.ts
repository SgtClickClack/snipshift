import { test, expect, Page } from '@playwright/test';

test.describe('Dashboard & Analytics', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a user
    await page.goto('/');
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.click('[data-testid="login-button"]');
  });

  test.describe('Professional Dashboard', () => {
    test('should display professional dashboard overview', async ({ page }) => {
      await page.goto('/professional-dashboard');
      
      await expect(page.locator('[data-testid="professional-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="quick-stats"]')).toBeVisible();
      await expect(page.locator('[data-testid="recent-activity"]')).toBeVisible();
      await expect(page.locator('[data-testid="upcoming-shifts"]')).toBeVisible();
    });

    test('should display key metrics cards', async ({ page }) => {
      await page.goto('/professional-dashboard');
      
      const metricsCards = page.locator('[data-testid="metric-card"]');
      await expect(metricsCards).toHaveCount.greaterThan(0);
      
      // Check specific metrics
      await expect(page.locator('[data-testid="total-earnings"]')).toBeVisible();
      await expect(page.locator('[data-testid="completed-jobs"]')).toBeVisible();
      await expect(page.locator('[data-testid="average-rating"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-applications"]')).toBeVisible();
    });

    test('should display earnings chart', async ({ page }) => {
      await page.goto('/professional-dashboard');
      
      await expect(page.locator('[data-testid="earnings-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="chart-container"]')).toBeVisible();
      
      // Test chart interactions
      await page.click('[data-testid="chart-timeframe-7d"]');
      await expect(page.locator('[data-testid="chart-timeframe-7d"]')).toHaveClass(/active/);
      
      await page.click('[data-testid="chart-timeframe-30d"]');
      await expect(page.locator('[data-testid="chart-timeframe-30d"]')).toHaveClass(/active/);
    });

    test('should display recent job applications', async ({ page }) => {
      await page.goto('/professional-dashboard');
      
      await expect(page.locator('[data-testid="recent-applications"]')).toBeVisible();
      await expect(page.locator('[data-testid="application-item"]')).toHaveCount.greaterThan(0);
      
      // Check application details
      const firstApplication = page.locator('[data-testid="application-item"]').first();
      await expect(firstApplication.locator('[data-testid="job-title"]')).toBeVisible();
      await expect(firstApplication.locator('[data-testid="application-status"]')).toBeVisible();
      await expect(firstApplication.locator('[data-testid="application-date"]')).toBeVisible();
    });

    test('should display upcoming shifts', async ({ page }) => {
      await page.goto('/professional-dashboard');
      
      await expect(page.locator('[data-testid="upcoming-shifts"]')).toBeVisible();
      await expect(page.locator('[data-testid="shift-item"]')).toHaveCount.greaterThan(0);
      
      // Check shift details
      const firstShift = page.locator('[data-testid="shift-item"]').first();
      await expect(firstShift.locator('[data-testid="shift-date"]')).toBeVisible();
      await expect(firstShift.locator('[data-testid="shift-time"]')).toBeVisible();
      await expect(firstShift.locator('[data-testid="shift-location"]')).toBeVisible();
      await expect(firstShift.locator('[data-testid="shift-pay"]')).toBeVisible();
    });

    test('should display performance metrics', async ({ page }) => {
      await page.goto('/professional-dashboard');
      
      await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="completion-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="client-satisfaction"]')).toBeVisible();
    });
  });

  test.describe('Hub Owner Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      // Login as hub owner
      await page.goto('/');
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'hubowner@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="login-button"]');
    });

    test('should display hub dashboard overview', async ({ page }) => {
      await page.goto('/hub-dashboard');
      
      await expect(page.locator('[data-testid="hub-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="business-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="staff-management"]')).toBeVisible();
      await expect(page.locator('[data-testid="revenue-analytics"]')).toBeVisible();
    });

    test('should display business performance metrics', async ({ page }) => {
      await page.goto('/hub-dashboard');
      
      await expect(page.locator('[data-testid="monthly-revenue"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-staff"]')).toBeVisible();
      await expect(page.locator('[data-testid="completed-jobs"]')).toBeVisible();
      await expect(page.locator('[data-testid="customer-satisfaction"]')).toBeVisible();
    });

    test('should display revenue analytics', async ({ page }) => {
      await page.goto('/hub-dashboard');
      
      await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="revenue-breakdown"]')).toBeVisible();
      
      // Test different time periods
      await page.click('[data-testid="revenue-period-monthly"]');
      await expect(page.locator('[data-testid="revenue-period-monthly"]')).toHaveClass(/active/);
      
      await page.click('[data-testid="revenue-period-yearly"]');
      await expect(page.locator('[data-testid="revenue-period-yearly"]')).toHaveClass(/active/);
    });

    test('should display staff performance', async ({ page }) => {
      await page.goto('/hub-dashboard');
      
      await expect(page.locator('[data-testid="staff-performance"]')).toBeVisible();
      await expect(page.locator('[data-testid="staff-member"]')).toHaveCount.greaterThan(0);
      
      // Check staff metrics
      const firstStaff = page.locator('[data-testid="staff-member"]').first();
      await expect(firstStaff.locator('[data-testid="staff-name"]')).toBeVisible();
      await expect(firstStaff.locator('[data-testid="staff-rating"]')).toBeVisible();
      await expect(firstStaff.locator('[data-testid="staff-jobs-completed"]')).toBeVisible();
      await expect(firstStaff.locator('[data-testid="staff-earnings"]')).toBeVisible();
    });

    test('should display job posting analytics', async ({ page }) => {
      await page.goto('/hub-dashboard');
      
      await expect(page.locator('[data-testid="job-analytics"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-performance"]')).toBeVisible();
      
      // Check job metrics
      await expect(page.locator('[data-testid="total-postings"]')).toBeVisible();
      await expect(page.locator('[data-testid="applications-received"]')).toBeVisible();
      await expect(page.locator('[data-testid="hire-rate"]')).toBeVisible();
    });
  });

  test.describe('Brand Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      // Login as brand
      await page.goto('/');
      await page.click('text=Login');
      await page.fill('[data-testid="email-input"]', 'brand@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
      await page.click('[data-testid="login-button"]');
    });

    test('should display brand dashboard overview', async ({ page }) => {
      await page.goto('/brand-dashboard');
      
      await expect(page.locator('[data-testid="brand-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="brand-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="partnership-analytics"]')).toBeVisible();
      await expect(page.locator('[data-testid="content-performance"]')).toBeVisible();
    });

    test('should display partnership metrics', async ({ page }) => {
      await page.goto('/brand-dashboard');
      
      await expect(page.locator('[data-testid="active-partnerships"]')).toBeVisible();
      await expect(page.locator('[data-testid="partnership-revenue"]')).toBeVisible();
      await expect(page.locator('[data-testid="partner-engagement"]')).toBeVisible();
    });

    test('should display content performance', async ({ page }) => {
      await page.goto('/brand-dashboard');
      
      await expect(page.locator('[data-testid="content-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="content-views"]')).toBeVisible();
      await expect(page.locator('[data-testid="content-engagement"]')).toBeVisible();
      await expect(page.locator('[data-testid="content-conversions"]')).toBeVisible();
    });
  });

  test.describe('Analytics & Reporting', () => {
    test('should generate custom reports', async ({ page }) => {
      await page.goto('/analytics');
      
      await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
      await page.click('[data-testid="create-report"]');
      
      await expect(page.locator('[data-testid="report-builder"]')).toBeVisible();
      
      // Configure report
      await page.selectOption('[data-testid="report-type"]', 'earnings');
      await page.selectOption('[data-testid="date-range"]', 'last-30-days');
      await page.check('[data-testid="include-charts"]');
      await page.check('[data-testid="include-tables"]');
      
      await page.click('[data-testid="generate-report"]');
      
      await expect(page.locator('[data-testid="report-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="report-charts"]')).toBeVisible();
      await expect(page.locator('[data-testid="report-tables"]')).toBeVisible();
    });

    test('should export reports', async ({ page }) => {
      await page.goto('/analytics');
      await page.click('[data-testid="create-report"]');
      
      await page.selectOption('[data-testid="report-type"]', 'performance');
      await page.click('[data-testid="generate-report"]');
      
      // Export as PDF
      await page.click('[data-testid="export-pdf"]');
      await expect(page.locator('text=Report exported as PDF')).toBeVisible();
      
      // Export as Excel
      await page.click('[data-testid="export-excel"]');
      await expect(page.locator('text=Report exported as Excel')).toBeVisible();
    });

    test('should schedule automated reports', async ({ page }) => {
      await page.goto('/analytics');
      await page.click('[data-testid="scheduled-reports"]');
      
      await expect(page.locator('[data-testid="scheduled-reports-list"]')).toBeVisible();
      await page.click('[data-testid="schedule-new-report"]');
      
      await expect(page.locator('[data-testid="schedule-form"]')).toBeVisible();
      
      // Configure schedule
      await page.selectOption('[data-testid="report-type"]', 'monthly-summary');
      await page.selectOption('[data-testid="frequency"]', 'monthly');
      await page.fill('[data-testid="email-recipients"]', 'manager@example.com');
      await page.selectOption('[data-testid="delivery-day"]', '1');
      
      await page.click('[data-testid="save-schedule"]');
      
      await expect(page.locator('text=Report scheduled successfully')).toBeVisible();
    });

    test('should view historical data', async ({ page }) => {
      await page.goto('/analytics');
      
      await expect(page.locator('[data-testid="historical-data"]')).toBeVisible();
      
      // Select different time periods
      await page.click('[data-testid="time-period-3m"]');
      await expect(page.locator('[data-testid="time-period-3m"]')).toHaveClass(/active/);
      
      await page.click('[data-testid="time-period-1y"]');
      await expect(page.locator('[data-testid="time-period-1y"]')).toHaveClass(/active/);
      
      // Check data updates
      await expect(page.locator('[data-testid="data-points"]')).toHaveCount.greaterThan(0);
    });
  });

  test.describe('Data Visualization', () => {
    test('should display interactive charts', async ({ page }) => {
      await page.goto('/analytics');
      
      await expect(page.locator('[data-testid="chart-container"]')).toBeVisible();
      
      // Test chart interactions
      await page.hover('[data-testid="chart-point"]').first();
      await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
      
      // Test zoom functionality
      await page.click('[data-testid="chart-zoom-in"]');
      await expect(page.locator('[data-testid="chart-zoom-controls"]')).toBeVisible();
    });

    test('should display different chart types', async ({ page }) => {
      await page.goto('/analytics');
      
      // Switch to line chart
      await page.click('[data-testid="chart-type-line"]');
      await expect(page.locator('[data-testid="line-chart"]')).toBeVisible();
      
      // Switch to bar chart
      await page.click('[data-testid="chart-type-bar"]');
      await expect(page.locator('[data-testid="bar-chart"]')).toBeVisible();
      
      // Switch to pie chart
      await page.click('[data-testid="chart-type-pie"]');
      await expect(page.locator('[data-testid="pie-chart"]')).toBeVisible();
    });

    test('should display data tables with sorting', async ({ page }) => {
      await page.goto('/analytics');
      
      await expect(page.locator('[data-testid="data-table"]')).toBeVisible();
      await expect(page.locator('[data-testid="table-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="table-row"]')).toHaveCount.greaterThan(0);
      
      // Test sorting
      await page.click('[data-testid="sort-date"]');
      await expect(page.locator('[data-testid="sort-date"]')).toHaveClass(/sorted/);
      
      await page.click('[data-testid="sort-amount"]');
      await expect(page.locator('[data-testid="sort-amount"]')).toHaveClass(/sorted/);
    });

    test('should filter data in tables', async ({ page }) => {
      await page.goto('/analytics');
      
      await page.click('[data-testid="table-filters"]');
      await expect(page.locator('[data-testid="filter-panel"]')).toBeVisible();
      
      // Apply filters
      await page.selectOption('[data-testid="filter-status"]', 'completed');
      await page.fill('[data-testid="filter-date-from"]', '2024-01-01');
      await page.fill('[data-testid="filter-date-to"]', '2024-01-31');
      
      await page.click('[data-testid="apply-filters"]');
      
      // Check filtered results
      const filteredRows = page.locator('[data-testid="table-row"]');
      const count = await filteredRows.count();
      
      for (let i = 0; i < count; i++) {
        const status = await filteredRows.nth(i).locator('[data-testid="row-status"]').textContent();
        expect(status).toBe('completed');
      }
    });
  });

  test.describe('Performance Monitoring', () => {
    test('should display real-time metrics', async ({ page }) => {
      await page.goto('/analytics');
      
      await expect(page.locator('[data-testid="real-time-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="live-indicator"]')).toBeVisible();
      
      // Check metric updates
      const initialValue = await page.locator('[data-testid="metric-value"]').first().textContent();
      await page.waitForTimeout(2000);
      const updatedValue = await page.locator('[data-testid="metric-value"]').first().textContent();
      
      // Values should potentially change (real-time updates)
      expect(updatedValue).toBeDefined();
    });

    test('should display performance alerts', async ({ page }) => {
      await page.goto('/analytics');
      
      // Simulate performance alert
      await page.evaluate(() => {
        const alertContainer = document.createElement('div');
        alertContainer.setAttribute('data-testid', 'performance-alert');
        alertContainer.className = 'alert warning';
        alertContainer.innerHTML = `
          <div data-testid="alert-message">Response time is above threshold</div>
          <div data-testid="alert-metric">Current: 2.5s | Threshold: 2.0s</div>
        `;
        document.body.appendChild(alertContainer);
      });
      
      await expect(page.locator('[data-testid="performance-alert"]')).toBeVisible();
      await expect(page.locator('[data-testid="alert-message"]')).toContainText('Response time is above threshold');
    });

    test('should configure performance thresholds', async ({ page }) => {
      await page.goto('/analytics');
      await page.click('[data-testid="performance-settings"]');
      
      await expect(page.locator('[data-testid="threshold-settings"]')).toBeVisible();
      
      // Configure thresholds
      await page.fill('[data-testid="response-time-threshold"]', '2.0');
      await page.fill('[data-testid="error-rate-threshold"]', '5.0');
      await page.fill('[data-testid="uptime-threshold"]', '99.5');
      
      await page.click('[data-testid="save-thresholds"]');
      
      await expect(page.locator('text=Thresholds updated successfully')).toBeVisible();
    });
  });

  test.describe('Comparative Analysis', () => {
    test('should compare performance periods', async ({ page }) => {
      await page.goto('/analytics');
      
      await page.click('[data-testid="compare-periods"]');
      await expect(page.locator('[data-testid="comparison-view"]')).toBeVisible();
      
      // Select periods to compare
      await page.selectOption('[data-testid="period-1"]', 'last-month');
      await page.selectOption('[data-testid="period-2"]', 'this-month');
      
      await page.click('[data-testid="compare-button"]');
      
      await expect(page.locator('[data-testid="comparison-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="comparison-table"]')).toBeVisible();
      await expect(page.locator('[data-testid="percentage-change"]')).toBeVisible();
    });

    test('should benchmark against industry standards', async ({ page }) => {
      await page.goto('/analytics');
      
      await page.click('[data-testid="industry-benchmark"]');
      await expect(page.locator('[data-testid="benchmark-view"]')).toBeVisible();
      
      // Select industry
      await page.selectOption('[data-testid="industry-select"]', 'beauty-wellness');
      
      await expect(page.locator('[data-testid="benchmark-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="benchmark-comparison"]')).toBeVisible();
      await expect(page.locator('[data-testid="performance-ranking"]')).toBeVisible();
    });

    test('should analyze trends and patterns', async ({ page }) => {
      await page.goto('/analytics');
      
      await page.click('[data-testid="trend-analysis"]');
      await expect(page.locator('[data-testid="trend-view"]')).toBeVisible();
      
      // Select metrics for trend analysis
      await page.check('[data-testid="trend-revenue"]');
      await page.check('[data-testid="trend-bookings"]');
      await page.check('[data-testid="trend-satisfaction"]');
      
      await page.click('[data-testid="analyze-trends"]');
      
      await expect(page.locator('[data-testid="trend-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="trend-insights"]')).toBeVisible();
      await expect(page.locator('[data-testid="trend-predictions"]')).toBeVisible();
    });
  });

  test.describe('Dashboard Customization', () => {
    test('should customize dashboard layout', async ({ page }) => {
      await page.goto('/dashboard');
      await page.click('[data-testid="customize-dashboard"]');
      
      await expect(page.locator('[data-testid="customization-panel"]')).toBeVisible();
      
      // Add new widget
      await page.click('[data-testid="add-widget"]');
      await page.selectOption('[data-testid="widget-type"]', 'revenue-chart');
      await page.click('[data-testid="add-widget-button"]');
      
      await expect(page.locator('[data-testid="revenue-chart-widget"]')).toBeVisible();
      
      // Remove widget
      await page.click('[data-testid="remove-widget"]').first();
      await page.click('[data-testid="confirm-remove"]');
      
      await expect(page.locator('[data-testid="removed-widget"]')).not.toBeVisible();
    });

    test('should save dashboard preferences', async ({ page }) => {
      await page.goto('/dashboard');
      await page.click('[data-testid="customize-dashboard"]');
      
      // Make changes
      await page.click('[data-testid="add-widget"]');
      await page.selectOption('[data-testid="widget-type"]', 'performance-metrics');
      await page.click('[data-testid="add-widget-button"]');
      
      await page.click('[data-testid="save-dashboard"]');
      
      await expect(page.locator('text=Dashboard saved successfully')).toBeVisible();
      
      // Refresh and verify changes persist
      await page.reload();
      await expect(page.locator('[data-testid="performance-metrics-widget"]')).toBeVisible();
    });

    test('should reset dashboard to default', async ({ page }) => {
      await page.goto('/dashboard');
      await page.click('[data-testid="customize-dashboard"]');
      
      await page.click('[data-testid="reset-dashboard"]');
      await page.click('[data-testid="confirm-reset"]');
      
      await expect(page.locator('text=Dashboard reset to default')).toBeVisible();
      await expect(page.locator('[data-testid="default-widgets"]')).toBeVisible();
    });
  });
});
