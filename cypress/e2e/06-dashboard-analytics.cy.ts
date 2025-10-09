describe('Dashboard & Analytics - SnipShift V2', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  describe('Role-Specific Dashboards', () => {
    it('should show shop users job posting analytics and application metrics', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const shopUser = data.users.shop
        
        // Login as shop user
        cy.login(shopUser.email, shopUser.password)
        
        // Should redirect to shop dashboard
        cy.url().should('include', '/shop-dashboard')
        cy.get('[data-testid="shop-dashboard"]').should('be.visible')
        
        // Should show job posting analytics
        cy.get('[data-testid="job-analytics"]').should('be.visible')
        cy.get('[data-testid="total-jobs-posted"]').should('be.visible')
        cy.get('[data-testid="active-jobs"]').should('be.visible')
        cy.get('[data-testid="total-applications"]').should('be.visible')
        cy.get('[data-testid="application-rate"]').should('be.visible')
        cy.get('[data-testid="hire-rate"]').should('be.visible')
        
        // Should show application metrics
        cy.get('[data-testid="application-metrics"]').should('be.visible')
        cy.get('[data-testid="pending-applications"]').should('be.visible')
        cy.get('[data-testid="approved-applications"]').should('be.visible')
        cy.get('[data-testid="rejected-applications"]').should('be.visible')
        cy.get('[data-testid="average-response-time"]').should('be.visible')
        
        // Should show charts and graphs
        cy.get('[data-testid="applications-chart"]').should('be.visible')
        cy.get('[data-testid="hire-rate-chart"]').should('be.visible')
        cy.get('[data-testid="job-performance-chart"]').should('be.visible')
        
        // Should show recent activity
        cy.get('[data-testid="recent-activity"]').should('be.visible')
        cy.get('[data-testid="activity-item"]').should('have.length.at.least', 1)
      })
    })

    it('should show barber users job recommendations and application status', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Should redirect to barber dashboard
        cy.url().should('include', '/barber-dashboard')
        cy.get('[data-testid="barber-dashboard"]').should('be.visible')
        
        // Should show job recommendations
        cy.get('[data-testid="job-recommendations"]').should('be.visible')
        cy.get('[data-testid="recommended-job"]').should('have.length.at.least', 1)
        cy.get('[data-testid="recommended-job"]').first().within(() => {
          cy.get('[data-testid="job-title"]').should('be.visible')
          cy.get('[data-testid="job-location"]').should('be.visible')
          cy.get('[data-testid="job-pay-rate"]').should('be.visible')
          cy.get('[data-testid="job-match-score"]').should('be.visible')
          cy.get('[data-testid="button-apply-job"]').should('be.visible')
        })
        
        // Should show application status
        cy.get('[data-testid="application-status"]').should('be.visible')
        cy.get('[data-testid="pending-applications"]').should('be.visible')
        cy.get('[data-testid="approved-applications"]').should('be.visible')
        cy.get('[data-testid="rejected-applications"]').should('be.visible')
        cy.get('[data-testid="application-success-rate"]').should('be.visible')
        
        // Should show application timeline
        cy.get('[data-testid="application-timeline"]').should('be.visible')
        cy.get('[data-testid="timeline-item"]').should('have.length.at.least', 1)
        
        // Should show earnings summary
        cy.get('[data-testid="earnings-summary"]').should('be.visible')
        cy.get('[data-testid="total-earnings"]').should('be.visible')
        cy.get('[data-testid="monthly-earnings"]').should('be.visible')
        cy.get('[data-testid="pending-payments"]').should('be.visible')
      })
    })

    it('should show brand users post engagement and reach analytics', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const brandUser = data.users.brand
        
        // Login as brand user
        cy.login(brandUser.email, brandUser.password)
        
        // Should redirect to brand dashboard
        cy.url().should('include', '/brand-dashboard')
        cy.get('[data-testid="brand-dashboard"]').should('be.visible')
        
        // Should show post engagement analytics
        cy.get('[data-testid="post-analytics"]').should('be.visible')
        cy.get('[data-testid="total-posts"]').should('be.visible')
        cy.get('[data-testid="total-engagement"]').should('be.visible')
        cy.get('[data-testid="average-engagement-rate"]').should('be.visible')
        cy.get('[data-testid="total-reach"]').should('be.visible')
        cy.get('[data-testid="impression-count"]').should('be.visible')
        
        // Should show reach analytics
        cy.get('[data-testid="reach-analytics"]').should('be.visible')
        cy.get('[data-testid="unique-reach"]').should('be.visible')
        cy.get('[data-testid="demographic-breakdown"]').should('be.visible')
        cy.get('[data-testid="geographic-reach"]').should('be.visible')
        cy.get('[data-testid="engagement-by-post-type"]').should('be.visible')
        
        // Should show charts and graphs
        cy.get('[data-testid="engagement-chart"]').should('be.visible')
        cy.get('[data-testid="reach-chart"]').should('be.visible')
        cy.get('[data-testid="demographic-chart"]').should('be.visible')
        cy.get('[data-testid="post-performance-chart"]').should('be.visible')
        
        // Should show top performing posts
        cy.get('[data-testid="top-posts"]').should('be.visible')
        cy.get('[data-testid="top-post"]').should('have.length.at.least', 1)
        cy.get('[data-testid="top-post"]').first().within(() => {
          cy.get('[data-testid="post-title"]').should('be.visible')
          cy.get('[data-testid="post-engagement"]').should('be.visible')
          cy.get('[data-testid="post-reach"]').should('be.visible')
          cy.get('[data-testid="post-ctr"]').should('be.visible')
        })
      })
    })

    it('should show trainer users content performance and earnings analytics', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const trainerUser = data.users.trainer
        
        // Login as trainer user
        cy.login(trainerUser.email, trainerUser.password)
        
        // Should redirect to trainer dashboard
        cy.url().should('include', '/trainer-dashboard')
        cy.get('[data-testid="trainer-dashboard"]').should('be.visible')
        
        // Should show content performance analytics
        cy.get('[data-testid="content-analytics"]').should('be.visible')
        cy.get('[data-testid="total-content"]').should('be.visible')
        cy.get('[data-testid="total-views"]').should('be.visible')
        cy.get('[data-testid="total-purchases"]').should('be.visible')
        cy.get('[data-testid="average-rating"]').should('be.visible')
        cy.get('[data-testid="completion-rate"]').should('be.visible')
        
        // Should show earnings analytics
        cy.get('[data-testid="earnings-analytics"]').should('be.visible')
        cy.get('[data-testid="total-earnings"]').should('be.visible')
        cy.get('[data-testid="monthly-earnings"]').should('be.visible')
        cy.get('[data-testid="pending-payouts"]').should('be.visible')
        cy.get('[data-testid="commission-rate"]').should('be.visible')
        cy.get('[data-testid="average-sale-value"]').should('be.visible')
        
        // Should show charts and graphs
        cy.get('[data-testid="earnings-chart"]').should('be.visible')
        cy.get('[data-testid="views-chart"]').should('be.visible')
        cy.get('[data-testid="purchases-chart"]').should('be.visible')
        cy.get('[data-testid="rating-chart"]').should('be.visible')
        
        // Should show top performing content
        cy.get('[data-testid="top-content"]').should('be.visible')
        cy.get('[data-testid="top-content-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="top-content-item"]').first().within(() => {
          cy.get('[data-testid="content-title"]').should('be.visible')
          cy.get('[data-testid="content-views"]').should('be.visible')
          cy.get('[data-testid="content-purchases"]').should('be.visible')
          cy.get('[data-testid="content-revenue"]').should('be.visible')
          cy.get('[data-testid="content-rating"]').should('be.visible')
        })
      })
    })

    it('should show all users personalized activity feeds and notifications', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Should show personalized activity feed
        cy.get('[data-testid="activity-feed"]').should('be.visible')
        cy.get('[data-testid="activity-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="activity-item"]').first().within(() => {
          cy.get('[data-testid="activity-type"]').should('be.visible')
          cy.get('[data-testid="activity-description"]').should('be.visible')
          cy.get('[data-testid="activity-timestamp"]').should('be.visible')
          cy.get('[data-testid="activity-avatar"]').should('be.visible')
        })
        
        // Should show notifications
        cy.get('[data-testid="notifications-panel"]').should('be.visible')
        cy.get('[data-testid="notification-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="notification-item"]').first().within(() => {
          cy.get('[data-testid="notification-type"]').should('be.visible')
          cy.get('[data-testid="notification-message"]').should('be.visible')
          cy.get('[data-testid="notification-timestamp"]').should('be.visible')
          cy.get('[data-testid="notification-read-status"]').should('be.visible')
        })
        
        // Should show personalized recommendations
        cy.get('[data-testid="personalized-recommendations"]').should('be.visible')
        cy.get('[data-testid="recommendation-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="recommendation-item"]').first().within(() => {
          cy.get('[data-testid="recommendation-title"]').should('be.visible')
          cy.get('[data-testid="recommendation-description"]').should('be.visible')
          cy.get('[data-testid="recommendation-reason"]').should('be.visible')
          cy.get('[data-testid="button-view-recommendation"]').should('be.visible')
        })
      })
    })

    it('should allow users to customize dashboard layout and widgets', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Enter dashboard customization mode
        cy.get('[data-testid="button-customize-dashboard"]').click()
        cy.get('[data-testid="dashboard-customization"]').should('be.visible')
        
        // Should show available widgets
        cy.get('[data-testid="available-widgets"]').should('be.visible')
        cy.get('[data-testid="widget-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="widget-item"]').first().within(() => {
          cy.get('[data-testid="widget-name"]').should('be.visible')
          cy.get('[data-testid="widget-description"]').should('be.visible')
          cy.get('[data-testid="button-add-widget"]').should('be.visible')
        })
        
        // Add widget to dashboard
        cy.get('[data-testid="button-add-widget"]').first().click()
        cy.get('[data-testid="widget-added"]').should('be.visible')
        
        // Should show dashboard layout
        cy.get('[data-testid="dashboard-layout"]').should('be.visible')
        cy.get('[data-testid="layout-grid"]').should('be.visible')
        cy.get('[data-testid="widget-slot"]').should('have.length.at.least', 1)
        
        // Drag and drop widgets
        cy.get('[data-testid="widget-item"]').first().trigger('dragstart')
        cy.get('[data-testid="widget-slot"]').first().trigger('drop')
        cy.get('[data-testid="widget-placed"]').should('be.visible')
        
        // Save dashboard layout
        cy.get('[data-testid="button-save-layout"]').click()
        cy.get('[data-testid="toast-success"]').should('contain', 'Dashboard layout saved successfully')
        
        // Should show updated dashboard
        cy.get('[data-testid="custom-dashboard"]').should('be.visible')
        cy.get('[data-testid="custom-widget"]').should('be.visible')
      })
    })

    it('should allow users to export dashboard data and reports', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Go to analytics section
        cy.get('[data-testid="nav-analytics"]').click()
        
        // Should show export options
        cy.get('[data-testid="export-options"]').should('be.visible')
        cy.get('[data-testid="button-export-data"]').should('be.visible')
        
        // Export dashboard data
        cy.get('[data-testid="button-export-data"]').click()
        cy.get('[data-testid="modal-export-data"]').should('be.visible')
        
        // Select export format
        cy.get('[data-testid="select-export-format"]').click()
        cy.get('[data-testid="option-csv"]').click()
        
        // Select date range
        cy.get('[data-testid="select-date-range"]').click()
        cy.get('[data-testid="option-last-30-days"]').click()
        
        // Select data to export
        cy.get('[data-testid="checkbox-export-applications"]').click()
        cy.get('[data-testid="checkbox-export-earnings"]').click()
        cy.get('[data-testid="checkbox-export-performance"]').click()
        
        // Export data
        cy.get('[data-testid="button-export"]').click()
        
        // Should show export progress
        cy.get('[data-testid="export-progress"]').should('be.visible')
        cy.get('[data-testid="export-status"]').should('contain', 'Exporting')
        
        // Should show download link
        cy.get('[data-testid="export-complete"]').should('be.visible')
        cy.get('[data-testid="button-download-export"]').should('be.visible')
        cy.get('[data-testid="export-filename"]').should('contain', 'dashboard-data')
        
        // Download export
        cy.get('[data-testid="button-download-export"]').click()
        cy.get('[data-testid="toast-success"]').should('contain', 'Export downloaded successfully')
      })
    })

    it('should allow users to set up automated reports and alerts', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Go to analytics section
        cy.get('[data-testid="nav-analytics"]').click()
        
        // Go to reports section
        cy.get('[data-testid="tab-reports"]').click()
        
        // Set up automated report
        cy.get('[data-testid="button-setup-report"]').click()
        cy.get('[data-testid="modal-setup-report"]').should('be.visible')
        
        // Configure report
        cy.get('[data-testid="input-report-name"]').type('Weekly Performance Report')
        cy.get('[data-testid="select-report-frequency"]').click()
        cy.get('[data-testid="option-weekly"]').click()
        cy.get('[data-testid="select-report-day"]').click()
        cy.get('[data-testid="option-monday"]').click()
        cy.get('[data-testid="select-report-time"]').type('09:00')
        
        // Select report content
        cy.get('[data-testid="checkbox-include-applications"]').click()
        cy.get('[data-testid="checkbox-include-earnings"]').click()
        cy.get('[data-testid="checkbox-include-performance"]').click()
        
        // Set up alerts
        cy.get('[data-testid="button-setup-alerts"]').click()
        cy.get('[data-testid="modal-setup-alerts"]').should('be.visible')
        
        // Configure alert
        cy.get('[data-testid="input-alert-name"]').type('High Application Rate Alert')
        cy.get('[data-testid="select-alert-metric"]').click()
        cy.get('[data-testid="option-application-rate"]').click()
        cy.get('[data-testid="select-alert-condition"]').click()
        cy.get('[data-testid="option-greater-than"]').click()
        cy.get('[data-testid="input-alert-threshold"]').type('80')
        cy.get('[data-testid="select-alert-frequency"]').click()
        cy.get('[data-testid="option-daily"]').click()
        
        // Save report and alerts
        cy.get('[data-testid="button-save-report"]').click()
        cy.get('[data-testid="toast-success"]').should('contain', 'Automated report set up successfully')
        
        // Should show configured reports
        cy.get('[data-testid="configured-reports"]').should('be.visible')
        cy.get('[data-testid="report-item"]').should('contain', 'Weekly Performance Report')
        cy.get('[data-testid="report-status"]').should('contain', 'Active')
        cy.get('[data-testid="report-next-run"]').should('be.visible')
        
        // Should show configured alerts
        cy.get('[data-testid="configured-alerts"]').should('be.visible')
        cy.get('[data-testid="alert-item"]').should('contain', 'High Application Rate Alert')
        cy.get('[data-testid="alert-status"]').should('contain', 'Active')
        cy.get('[data-testid="alert-threshold"]').should('contain', '80%')
      })
    })

    it('should update dashboards in real-time with new data', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Should show real-time updates
        cy.get('[data-testid="real-time-indicator"]').should('be.visible')
        cy.get('[data-testid="last-updated"]').should('be.visible')
        cy.get('[data-testid="auto-refresh"]').should('be.visible')
        
        // Should show live data
        cy.get('[data-testid="live-metrics"]').should('be.visible')
        cy.get('[data-testid="live-counter"]').should('be.visible')
        cy.get('[data-testid="live-chart"]').should('be.visible')
        
        // Should show real-time notifications
        cy.get('[data-testid="real-time-notifications"]').should('be.visible')
        cy.get('[data-testid="live-notification"]').should('have.length.at.least', 1)
        cy.get('[data-testid="live-notification"]').first().within(() => {
          cy.get('[data-testid="notification-type"]').should('be.visible')
          cy.get('[data-testid="notification-message"]').should('be.visible')
          cy.get('[data-testid="notification-timestamp"]').should('be.visible')
        })
        
        // Should show connection status
        cy.get('[data-testid="connection-status"]').should('be.visible')
        cy.get('[data-testid="connection-indicator"]').should('contain', 'Connected')
        cy.get('[data-testid="sync-status"]').should('contain', 'Synced')
      })
    })

    it('should allow users to access dashboards on mobile devices', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Switch to mobile viewport
        cy.viewport(375, 667)
        
        // Should show mobile-optimized dashboard
        cy.get('[data-testid="mobile-dashboard"]').should('be.visible')
        cy.get('[data-testid="mobile-navigation"]').should('be.visible')
        cy.get('[data-testid="mobile-menu"]').should('be.visible')
        
        // Should show mobile-friendly widgets
        cy.get('[data-testid="mobile-widget"]').should('be.visible')
        cy.get('[data-testid="mobile-widget"]').first().within(() => {
          cy.get('[data-testid="widget-title"]').should('be.visible')
          cy.get('[data-testid="widget-content"]').should('be.visible')
          cy.get('[data-testid="widget-action"]').should('be.visible')
        })
        
        // Should show mobile navigation
        cy.get('[data-testid="mobile-nav"]').should('be.visible')
        cy.get('[data-testid="mobile-nav-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="mobile-nav-item"]').first().within(() => {
          cy.get('[data-testid="nav-icon"]').should('be.visible')
          cy.get('[data-testid="nav-label"]').should('be.visible')
          cy.get('[data-testid="nav-badge"]').should('be.visible')
        })
        
        // Should show mobile-friendly charts
        cy.get('[data-testid="mobile-chart"]').should('be.visible')
        cy.get('[data-testid="chart-container"]').should('be.visible')
        cy.get('[data-testid="chart-legend"]').should('be.visible')
        cy.get('[data-testid="chart-controls"]').should('be.visible')
      })
    })
  })

  describe('Business Intelligence', () => {
    it('should allow shop users to track hiring success rates and costs', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const shopUser = data.users.shop
        
        // Login as shop user
        cy.login(shopUser.email, shopUser.password)
        
        // Go to business intelligence
        cy.get('[data-testid="nav-business-intelligence"]').click()
        
        // Should show hiring success metrics
        cy.get('[data-testid="hiring-success-metrics"]').should('be.visible')
        cy.get('[data-testid="hiring-success-rate"]').should('be.visible')
        cy.get('[data-testid="average-hiring-time"]').should('be.visible')
        cy.get('[data-testid="cost-per-hire"]').should('be.visible')
        cy.get('[data-testid="retention-rate"]').should('be.visible')
        cy.get('[data-testid="quality-of-hire"]').should('be.visible')
        
        // Should show hiring cost analysis
        cy.get('[data-testid="hiring-cost-analysis"]').should('be.visible')
        cy.get('[data-testid="total-hiring-cost"]').should('be.visible')
        cy.get('[data-testid="cost-breakdown"]').should('be.visible')
        cy.get('[data-testid="cost-by-source"]').should('be.visible')
        cy.get('[data-testid="cost-by-role"]').should('be.visible')
        cy.get('[data-testid="cost-trends"]').should('be.visible')
        
        // Should show hiring funnel
        cy.get('[data-testid="hiring-funnel"]').should('be.visible')
        cy.get('[data-testid="funnel-stage"]').should('have.length.at.least', 1)
        cy.get('[data-testid="funnel-stage"]').first().within(() => {
          cy.get('[data-testid="stage-name"]').should('be.visible')
          cy.get('[data-testid="stage-count"]').should('be.visible')
          cy.get('[data-testid="stage-conversion-rate"]').should('be.visible')
          cy.get('[data-testid="stage-drop-off"]').should('be.visible')
        })
        
        // Should show hiring performance charts
        cy.get('[data-testid="hiring-performance-chart"]').should('be.visible')
        cy.get('[data-testid="cost-trend-chart"]').should('be.visible')
        cy.get('[data-testid="success-rate-chart"]').should('be.visible')
        cy.get('[data-testid="retention-chart"]').should('be.visible')
      })
    })

    it('should allow barber users to track application success and earnings', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Go to business intelligence
        cy.get('[data-testid="nav-business-intelligence"]').click()
        
        // Should show application success metrics
        cy.get('[data-testid="application-success-metrics"]').should('be.visible')
        cy.get('[data-testid="application-success-rate"]').should('be.visible')
        cy.get('[data-testid="average-response-time"]').should('be.visible')
        cy.get('[data-testid="interview-rate"]').should('be.visible')
        cy.get('[data-testid="offer-rate"]').should('be.visible')
        cy.get('[data-testid="acceptance-rate"]').should('be.visible')
        
        // Should show earnings tracking
        cy.get('[data-testid="earnings-tracking"]').should('be.visible')
        cy.get('[data-testid="total-earnings"]').should('be.visible')
        cy.get('[data-testid="monthly-earnings"]').should('be.visible')
        cy.get('[data-testid="hourly-rate-trend"]').should('be.visible')
        cy.get('[data-testid="earnings-by-shop"]').should('be.visible')
        cy.get('[data-testid="earnings-by-skill"]').should('be.visible')
        
        // Should show application performance
        cy.get('[data-testid="application-performance"]').should('be.visible')
        cy.get('[data-testid="performance-metric"]').should('have.length.at.least', 1)
        cy.get('[data-testid="performance-metric"]').first().within(() => {
          cy.get('[data-testid="metric-name"]').should('be.visible')
          cy.get('[data-testid="metric-value"]').should('be.visible')
          cy.get('[data-testid="metric-trend"]').should('be.visible')
          cy.get('[data-testid="metric-comparison"]').should('be.visible')
        })
        
        // Should show earnings charts
        cy.get('[data-testid="earnings-chart"]').should('be.visible')
        cy.get('[data-testid="application-success-chart"]').should('be.visible')
        cy.get('[data-testid="hourly-rate-chart"]').should('be.visible')
        cy.get('[data-testid="earnings-breakdown-chart"]').should('be.visible')
      })
    })

    it('should allow brand users to measure campaign ROI and engagement', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const brandUser = data.users.brand
        
        // Login as brand user
        cy.login(brandUser.email, brandUser.password)
        
        // Go to business intelligence
        cy.get('[data-testid="nav-business-intelligence"]').click()
        
        // Should show campaign ROI metrics
        cy.get('[data-testid="campaign-roi-metrics"]').should('be.visible')
        cy.get('[data-testid="total-roi"]').should('be.visible')
        cy.get('[data-testid="campaign-cost"]').should('be.visible')
        cy.get('[data-testid="campaign-revenue"]').should('be.visible')
        cy.get('[data-testid="cost-per-acquisition"]').should('be.visible')
        cy.get('[data-testid="lifetime-value"]').should('be.visible')
        
        // Should show engagement metrics
        cy.get('[data-testid="engagement-metrics"]').should('be.visible')
        cy.get('[data-testid="total-engagement"]').should('be.visible')
        cy.get('[data-testid="engagement-rate"]').should('be.visible')
        cy.get('[data-testid="click-through-rate"]').should('be.visible')
        cy.get('[data-testid="conversion-rate"]').should('be.visible')
        cy.get('[data-testid="bounce-rate"]').should('be.visible')
        
        // Should show campaign performance
        cy.get('[data-testid="campaign-performance"]').should('be.visible')
        cy.get('[data-testid="campaign-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="campaign-item"]').first().within(() => {
          cy.get('[data-testid="campaign-name"]').should('be.visible')
          cy.get('[data-testid="campaign-roi"]').should('be.visible')
          cy.get('[data-testid="campaign-engagement"]').should('be.visible')
          cy.get('[data-testid="campaign-reach"]').should('be.visible')
          cy.get('[data-testid="campaign-conversions"]').should('be.visible')
        })
        
        // Should show ROI charts
        cy.get('[data-testid="roi-chart"]').should('be.visible')
        cy.get('[data-testid="engagement-chart"]').should('be.visible')
        cy.get('[data-testid="conversion-chart"]').should('be.visible')
        cy.get('[data-testid="campaign-comparison-chart"]').should('be.visible')
      })
    })

    it('should allow trainer users to analyze content performance and student feedback', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const trainerUser = data.users.trainer
        
        // Login as trainer user
        cy.login(trainerUser.email, trainerUser.password)
        
        // Go to business intelligence
        cy.get('[data-testid="nav-business-intelligence"]').click()
        
        // Should show content performance metrics
        cy.get('[data-testid="content-performance-metrics"]').should('be.visible')
        cy.get('[data-testid="total-views"]').should('be.visible')
        cy.get('[data-testid="total-purchases"]').should('be.visible')
        cy.get('[data-testid="average-rating"]').should('be.visible')
        cy.get('[data-testid="completion-rate"]').should('be.visible')
        cy.get('[data-testid="refund-rate"]').should('be.visible')
        cy.get('[data-testid="student-satisfaction"]').should('be.visible')
        
        // Should show student feedback analysis
        cy.get('[data-testid="student-feedback-analysis"]').should('be.visible')
        cy.get('[data-testid="feedback-summary"]').should('be.visible')
        cy.get('[data-testid="sentiment-analysis"]').should('be.visible')
        cy.get('[data-testid="common-themes"]').should('be.visible')
        cy.get('[data-testid="improvement-suggestions"]').should('be.visible')
        cy.get('[data-testid="student-retention"]').should('be.visible')
        
        // Should show content performance breakdown
        cy.get('[data-testid="content-performance-breakdown"]').should('be.visible')
        cy.get('[data-testid="content-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="content-item"]').first().within(() => {
          cy.get('[data-testid="content-title"]').should('be.visible')
          cy.get('[data-testid="content-views"]').should('be.visible')
          cy.get('[data-testid="content-purchases"]').should('be.visible')
          cy.get('[data-testid="content-rating"]').should('be.visible')
          cy.get('[data-testid="content-revenue"]').should('be.visible')
          cy.get('[data-testid="content-feedback"]').should('be.visible')
        })
        
        // Should show performance charts
        cy.get('[data-testid="content-performance-chart"]').should('be.visible')
        cy.get('[data-testid="student-feedback-chart"]').should('be.visible')
        cy.get('[data-testid="rating-trend-chart"]').should('be.visible')
        cy.get('[data-testid="completion-rate-chart"]').should('be.visible')
      })
    })

    it('should provide industry benchmarking and insights', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Go to business intelligence
        cy.get('[data-testid="nav-business-intelligence"]').click()
        
        // Should show industry benchmarking
        cy.get('[data-testid="industry-benchmarking"]').should('be.visible')
        cy.get('[data-testid="benchmark-metrics"]').should('be.visible')
        cy.get('[data-testid="industry-average"]').should('be.visible')
        cy.get('[data-testid="your-performance"]').should('be.visible')
        cy.get('[data-testid="performance-comparison"]').should('be.visible')
        cy.get('[data-testid="percentile-ranking"]').should('be.visible')
        
        // Should show industry insights
        cy.get('[data-testid="industry-insights"]').should('be.visible')
        cy.get('[data-testid="insight-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="insight-item"]').first().within(() => {
          cy.get('[data-testid="insight-title"]').should('be.visible')
          cy.get('[data-testid="insight-description"]').should('be.visible')
          cy.get('[data-testid="insight-impact"]').should('be.visible')
          cy.get('[data-testid="insight-recommendation"]').should('be.visible')
        })
        
        // Should show market trends
        cy.get('[data-testid="market-trends"]').should('be.visible')
        cy.get('[data-testid="trend-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="trend-item"]').first().within(() => {
          cy.get('[data-testid="trend-name"]').should('be.visible')
          cy.get('[data-testid="trend-direction"]').should('be.visible')
          cy.get('[data-testid="trend-magnitude"]').should('be.visible')
          cy.get('[data-testid="trend-impact"]').should('be.visible')
        })
        
        // Should show benchmarking charts
        cy.get('[data-testid="benchmarking-chart"]').should('be.visible')
        cy.get('[data-testid="industry-comparison-chart"]').should('be.visible')
        cy.get('[data-testid="trend-analysis-chart"]').should('be.visible')
        cy.get('[data-testid="performance-distribution-chart"]').should('be.visible')
      })
    })

    it('should allow users to compare performance across different time periods', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Go to business intelligence
        cy.get('[data-testid="nav-business-intelligence"]').click()
        
        // Should show time period comparison
        cy.get('[data-testid="time-period-comparison"]').should('be.visible')
        cy.get('[data-testid="period-selector"]').should('be.visible')
        
        // Select comparison periods
        cy.get('[data-testid="select-period-1"]').click()
        cy.get('[data-testid="option-last-month"]').click()
        cy.get('[data-testid="select-period-2"]').click()
        cy.get('[data-testid="option-this-month"]').click()
        
        // Should show comparison metrics
        cy.get('[data-testid="comparison-metrics"]').should('be.visible')
        cy.get('[data-testid="metric-comparison"]').should('have.length.at.least', 1)
        cy.get('[data-testid="metric-comparison"]').first().within(() => {
          cy.get('[data-testid="metric-name"]').should('be.visible')
          cy.get('[data-testid="period-1-value"]').should('be.visible')
          cy.get('[data-testid="period-2-value"]').should('be.visible')
          cy.get('[data-testid="change-percentage"]').should('be.visible')
          cy.get('[data-testid="change-direction"]').should('be.visible')
        })
        
        // Should show comparison charts
        cy.get('[data-testid="comparison-chart"]').should('be.visible')
        cy.get('[data-testid="period-1-line"]').should('be.visible')
        cy.get('[data-testid="period-2-line"]').should('be.visible')
        cy.get('[data-testid="chart-legend"]').should('be.visible')
        cy.get('[data-testid="chart-controls"]').should('be.visible')
        
        // Should show detailed comparison
        cy.get('[data-testid="detailed-comparison"]').should('be.visible')
        cy.get('[data-testid="comparison-table"]').should('be.visible')
        cy.get('[data-testid="comparison-row"]').should('have.length.at.least', 1)
        cy.get('[data-testid="comparison-row"]').first().within(() => {
          cy.get('[data-testid="row-metric"]').should('be.visible')
          cy.get('[data-testid="row-period-1"]').should('be.visible')
          cy.get('[data-testid="row-period-2"]').should('be.visible')
          cy.get('[data-testid="row-change"]').should('be.visible')
          cy.get('[data-testid="row-trend"]').should('be.visible')
        })
      })
    })

    it('should generate actionable recommendations for improvement', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Go to business intelligence
        cy.get('[data-testid="nav-business-intelligence"]').click()
        
        // Should show recommendations
        cy.get('[data-testid="recommendations"]').should('be.visible')
        cy.get('[data-testid="recommendation-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="recommendation-item"]').first().within(() => {
          cy.get('[data-testid="recommendation-title"]').should('be.visible')
          cy.get('[data-testid="recommendation-description"]').should('be.visible')
          cy.get('[data-testid="recommendation-impact"]').should('be.visible')
          cy.get('[data-testid="recommendation-priority"]').should('be.visible')
          cy.get('[data-testid="recommendation-action"]').should('be.visible')
        })
        
        // Should show recommendation categories
        cy.get('[data-testid="recommendation-categories"]').should('be.visible')
        cy.get('[data-testid="category-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="category-item"]').first().within(() => {
          cy.get('[data-testid="category-name"]').should('be.visible')
          cy.get('[data-testid="category-count"]').should('be.visible')
          cy.get('[data-testid="category-priority"]').should('be.visible')
        })
        
        // Should show recommendation implementation
        cy.get('[data-testid="recommendation-implementation"]').should('be.visible')
        cy.get('[data-testid="implementation-step"]').should('have.length.at.least', 1)
        cy.get('[data-testid="implementation-step"]').first().within(() => {
          cy.get('[data-testid="step-number"]').should('be.visible')
          cy.get('[data-testid="step-description"]').should('be.visible')
          cy.get('[data-testid="step-duration"]').should('be.visible')
          cy.get('[data-testid="step-resources"]').should('be.visible')
        })
        
        // Should show recommendation tracking
        cy.get('[data-testid="recommendation-tracking"]').should('be.visible')
        cy.get('[data-testid="tracking-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="tracking-item"]').first().within(() => {
          cy.get('[data-testid="tracking-recommendation"]').should('be.visible')
          cy.get('[data-testid="tracking-status"]').should('be.visible')
          cy.get('[data-testid="tracking-progress"]').should('be.visible')
          cy.get('[data-testid="tracking-impact"]').should('be.visible')
        })
      })
    })

    it('should allow users to set goals and track progress', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Go to business intelligence
        cy.get('[data-testid="nav-business-intelligence"]').click()
        
        // Go to goals section
        cy.get('[data-testid="tab-goals"]').click()
        
        // Set new goal
        cy.get('[data-testid="button-set-goal"]').click()
        cy.get('[data-testid="modal-set-goal"]').should('be.visible')
        
        // Configure goal
        cy.get('[data-testid="input-goal-name"]').type('Increase Application Success Rate')
        cy.get('[data-testid="select-goal-metric"]').click()
        cy.get('[data-testid="option-application-success-rate"]').click()
        cy.get('[data-testid="input-goal-target"]').type('80')
        cy.get('[data-testid="select-goal-period"]').click()
        cy.get('[data-testid="option-3-months"]').click()
        cy.get('[data-testid="input-goal-description"]').type('Improve application success rate by focusing on better job matches and improving application quality')
        
        // Set goal
        cy.get('[data-testid="button-set-goal"]').click()
        cy.get('[data-testid="toast-success"]').should('contain', 'Goal set successfully')
        
        // Should show goal tracking
        cy.get('[data-testid="goal-tracking"]').should('be.visible')
        cy.get('[data-testid="goal-item"]').should('contain', 'Increase Application Success Rate')
        cy.get('[data-testid="goal-progress"]').should('be.visible')
        cy.get('[data-testid="goal-target"]').should('contain', '80%')
        cy.get('[data-testid="goal-deadline"]').should('be.visible')
        cy.get('[data-testid="goal-status"]').should('contain', 'In Progress')
        
        // Should show goal progress chart
        cy.get('[data-testid="goal-progress-chart"]').should('be.visible')
        cy.get('[data-testid="progress-line"]').should('be.visible')
        cy.get('[data-testid="target-line"]').should('be.visible')
        cy.get('[data-testid="milestone-marker"]').should('be.visible')
        
        // Should show goal milestones
        cy.get('[data-testid="goal-milestones"]').should('be.visible')
        cy.get('[data-testid="milestone-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="milestone-item"]').first().within(() => {
          cy.get('[data-testid="milestone-name"]').should('be.visible')
          cy.get('[data-testid="milestone-target"]').should('be.visible')
          cy.get('[data-testid="milestone-status"]').should('be.visible')
          cy.get('[data-testid="milestone-date"]').should('be.visible')
        })
      })
    })

    it('should provide predictive analytics for future trends', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Go to business intelligence
        cy.get('[data-testid="nav-business-intelligence"]').click()
        
        // Go to predictive analytics
        cy.get('[data-testid="tab-predictive-analytics"]').click()
        
        // Should show predictive models
        cy.get('[data-testid="predictive-models"]').should('be.visible')
        cy.get('[data-testid="model-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="model-item"]').first().within(() => {
          cy.get('[data-testid="model-name"]').should('be.visible')
          cy.get('[data-testid="model-accuracy"]').should('be.visible')
          cy.get('[data-testid="model-confidence"]').should('be.visible')
          cy.get('[data-testid="model-prediction"]').should('be.visible')
        })
        
        // Should show trend predictions
        cy.get('[data-testid="trend-predictions"]').should('be.visible')
        cy.get('[data-testid="prediction-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="prediction-item"]').first().within(() => {
          cy.get('[data-testid="prediction-metric"]').should('be.visible')
          cy.get('[data-testid="prediction-trend"]').should('be.visible')
          cy.get('[data-testid="prediction-confidence"]').should('be.visible')
          cy.get('[data-testid="prediction-timeframe"]').should('be.visible')
        })
        
        // Should show predictive charts
        cy.get('[data-testid="predictive-chart"]').should('be.visible')
        cy.get('[data-testid="historical-data"]').should('be.visible')
        cy.get('[data-testid="prediction-line"]').should('be.visible')
        cy.get('[data-testid="confidence-interval"]').should('be.visible')
        cy.get('[data-testid="prediction-points"]').should('be.visible')
        
        // Should show scenario analysis
        cy.get('[data-testid="scenario-analysis"]').should('be.visible')
        cy.get('[data-testid="scenario-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="scenario-item"]').first().within(() => {
          cy.get('[data-testid="scenario-name"]').should('be.visible')
          cy.get('[data-testid="scenario-probability"]').should('be.visible')
          cy.get('[data-testid="scenario-impact"]').should('be.visible')
          cy.get('[data-testid="scenario-recommendation"]').should('be.visible')
        })
      })
    })

    it('should allow users to share analytics with team members', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Go to business intelligence
        cy.get('[data-testid="nav-business-intelligence"]').click()
        
        // Share analytics
        cy.get('[data-testid="button-share-analytics"]').click()
        cy.get('[data-testid="modal-share-analytics"]').should('be.visible')
        
        // Configure sharing
        cy.get('[data-testid="input-share-title"]').type('Monthly Performance Report')
        cy.get('[data-testid="textarea-share-description"]').type('Monthly performance analysis and insights')
        cy.get('[data-testid="select-share-format"]').click()
        cy.get('[data-testid="option-pdf"]').click()
        cy.get('[data-testid="select-share-frequency"]').click()
        cy.get('[data-testid="option-monthly"]').click()
        
        // Add recipients
        cy.get('[data-testid="input-add-recipient"]').type('manager@example.com')
        cy.get('[data-testid="button-add-recipient"]').click()
        cy.get('[data-testid="recipient-list"]').should('contain', 'manager@example.com')
        
        // Set sharing permissions
        cy.get('[data-testid="select-sharing-permissions"]').click()
        cy.get('[data-testid="option-view-only"]').click()
        cy.get('[data-testid="toggle-allow-comments"]').click()
        cy.get('[data-testid="toggle-allow-download"]').click()
        
        // Share analytics
        cy.get('[data-testid="button-share"]').click()
        cy.get('[data-testid="toast-success"]').should('contain', 'Analytics shared successfully')
        
        // Should show shared analytics
        cy.get('[data-testid="shared-analytics"]').should('be.visible')
        cy.get('[data-testid="shared-item"]').should('contain', 'Monthly Performance Report')
        cy.get('[data-testid="shared-status"]').should('contain', 'Shared')
        cy.get('[data-testid="shared-recipients"]').should('contain', '1 recipient')
        cy.get('[data-testid="shared-permissions"]').should('contain', 'View Only')
      })
    })
  })
})
