// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to log in via the demo system (Updated for V2 terminology)
Cypress.Commands.add('quickLogin', (role: 'shop' | 'barber' | 'trainer' | 'brand') => {
  cy.visit('/demo')
  
  const roleSelectors = {
    shop: '[data-testid="demo-login-shop"]',
    barber: '[data-testid="demo-login-barber"]', 
    trainer: '[data-testid="demo-login-trainer"]',
    brand: '[data-testid="demo-login-brand"]'
  }
  
  cy.get(roleSelectors[role]).click()
  cy.waitForRoute(`/${role}-dashboard`)
})

// Custom command to wait for a route to load
Cypress.Commands.add('waitForRoute', (route: string) => {
  cy.url().should('include', route)
  cy.get('body').should('be.visible')
})

// Custom command for standard login with credentials
Cypress.Commands.add('loginWithCredentials', (email: string, password: string) => {
  cy.visit('/login')
  cy.get('[data-testid="input-email"]').type(email)
  cy.get('[data-testid="input-password"]').type(password)
  cy.get('[data-testid="button-login"]').click()
})

// Enhanced login command for journey-based testing
Cypress.Commands.add('loginAsUser', (userType: 'barber' | 'shop' | 'trainer' | 'brand' | 'admin' = 'barber') => {
  cy.fixture('snipshift-v2-test-data').then((data) => {
    const user = data.users[userType]
    
    // Clear any existing session
    cy.clearLocalStorage()
    cy.clearCookies()
    
    // Perform login
    cy.visit('/login')
    cy.get('[data-testid="input-email"]').should('be.visible').type(user.email)
    cy.get('[data-testid="input-password"]').should('be.visible').type(user.password)
    cy.get('[data-testid="button-login"]').should('be.visible').click()
    
    // Wait for successful login and redirect to dashboard
    cy.url().should('include', `/${userType}-dashboard`)
    cy.get('[data-testid="user-menu"]').should('be.visible')
    
    // Verify we're on the correct dashboard
    cy.get(`[data-testid="${userType}-dashboard"]`).should('be.visible')
  })
})

// Simplified login command that defaults to barber user for most tests
Cypress.Commands.add('login', () => {
  cy.loginAsUser('barber')
})

// Custom command to login with specific role via test endpoint
Cypress.Commands.add('loginWithRole', (email: string, role: string) => {
  cy.request({
    method: 'POST',
    url: '/api/test/login',
    headers: { 
      'X-Test-Key': Cypress.env('E2E_TEST_KEY') || 'test', 
      'X-Snipshift-CSRF': '1' 
    },
    body: { email, role },
    failOnStatusCode: false,
  }).its('status').should('eq', 200)
})

// Custom command to logout user
Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="button-logout"]').click()
  cy.location('pathname').should('eq', '/')
})

// Custom command to verify dashboard access
Cypress.Commands.add('verifyDashboardAccess', (role: string) => {
  const expectedDashboard = `/${role}-dashboard`
  cy.location('pathname').should('eq', expectedDashboard)
  cy.get(`[data-testid="${role}-dashboard"]`).should('be.visible')
})

// Custom command to verify protected route redirect
Cypress.Commands.add('verifyProtectedRouteRedirect', (route: string, expectedRedirect: string) => {
  cy.visit(route)
  cy.location('pathname').should('eq', expectedRedirect)
})

// Custom command to complete role selection
Cypress.Commands.add('selectRole', (role: string) => {
  cy.get(`[data-testid="button-select-${role}"]`).click()
  cy.get('[data-testid="button-continue"]').click()
})

// Custom command to verify authentication state
Cypress.Commands.add('verifyAuthenticated', (shouldBeAuthenticated: boolean) => {
  if (shouldBeAuthenticated) {
    cy.get('[data-testid="user-menu"]').should('be.visible')
  } else {
    cy.get('[data-testid="button-login"]').should('be.visible')
  }
})

// Assert page has no horizontal overflow beyond viewport width
Cypress.Commands.add('assertNoHorizontalOverflow', () => {
  cy.window().then((win) => {
    const doc = win.document.documentElement
    const scrollWidth = doc.scrollWidth
    const viewportWidth = win.innerWidth
    expect(scrollWidth, 'no horizontal overflow').to.be.lte(viewportWidth + 1)
  })
})

// Custom command to create a shift posting
Cypress.Commands.add('createShift', (shiftData: any) => {
  cy.get('[data-testid="button-post-shift"]').click()
  cy.get('[data-testid="modal-shift-posting"]').should('be.visible')
  
  cy.get('[data-testid="input-shift-title"]').type(shiftData.title)
  cy.get('[data-testid="textarea-shift-description"]').type(shiftData.description)
  cy.get('[data-testid="input-hourly-rate"]').type(shiftData.hourlyRate.toString())
  cy.get('[data-testid="input-shift-location"]').type(shiftData.location)
  
  // Select skills
  cy.get('[data-testid="select-skills"]').click()
  shiftData.skills.forEach((skill: string) => {
    cy.get(`[data-testid="skill-${skill.toLowerCase().replace(' ', '-')}"]`).click()
  })
  
  // Select schedule
  cy.get('[data-testid="select-schedule"]').click()
  cy.get(`[data-testid="schedule-${shiftData.schedule.toLowerCase().replace(' ', '-')}"]`).click()
  
  cy.get('[data-testid="button-submit-shift"]').click()
})

// Custom command to apply for a shift
Cypress.Commands.add('applyForShift', (shiftTitle: string, coverLetter?: string) => {
  cy.get('[data-testid="shift-card"]')
    .contains(shiftTitle)
    .should('be.visible')
    .click()
  
  cy.get('[data-testid="button-apply-shift"]').click()
  cy.get('[data-testid="modal-shift-application"]').should('be.visible')
  
  if (coverLetter) {
    cy.get('[data-testid="textarea-cover-letter"]').type(coverLetter)
  }
  
  cy.get('[data-testid="button-submit-application"]').click()
})

// Custom command to upload qualification document
Cypress.Commands.add('uploadQualificationDocument', (filePath: string) => {
  cy.get('[data-testid="input-qualification-document"]').selectFile(filePath)
  cy.get('[data-testid="button-upload-qualification"]').click()
})

// Custom command to verify accessibility compliance
Cypress.Commands.add('verifyAccessibility', () => {
  cy.injectAxe()
  cy.checkA11y()
})

// Custom command to measure page load performance
Cypress.Commands.add('measurePageLoadPerformance', (maxLoadTime: number = 3000) => {
  cy.window().then((win) => {
    const loadTime = win.performance.timing.loadEventEnd - win.performance.timing.navigationStart
    expect(loadTime).to.be.lessThan(maxLoadTime)
  })
})

// Custom command to test keyboard navigation
Cypress.Commands.add('testKeyboardNavigation', () => {
  cy.get('body').tab()
  cy.focused().should('be.visible')
  
  // Test tab order through main navigation
  cy.get('[data-testid="nav-home"]').should('be.focused')
  cy.focused().tab()
  cy.get('[data-testid="nav-shifts"]').should('be.focused')
  cy.focused().tab()
  cy.get('[data-testid="nav-community"]').should('be.focused')
})

// Custom command to verify security headers
Cypress.Commands.add('verifySecurityHeaders', () => {
  cy.request('/').then((response) => {
    expect(response.headers).to.have.property('x-content-type-options', 'nosniff')
    expect(response.headers).to.have.property('x-frame-options', 'DENY')
    expect(response.headers).to.have.property('x-xss-protection', '1; mode=block')
  })
})

// Custom command to test offline functionality
Cypress.Commands.add('testOfflineFunctionality', () => {
  cy.window().then((win) => {
    // Simulate offline mode
    cy.intercept('GET', '**/*', { forceNetworkError: true }).as('offlineRequest')
    
    // Try to access cached content
    cy.get('[data-testid="cached-content"]').should('be.visible')
    
    // Restore network
    cy.intercept('GET', '**/*').as('onlineRequest')
  })
})

// Navigation helper commands for journey-based testing
Cypress.Commands.add('navigateToShiftFeed', () => {
  cy.get('[data-testid="nav-shift-feed"]').should('be.visible').click()
  cy.url().should('include', '/shift-feed')
  cy.get('[data-testid="shift-feed"]').should('be.visible')
})

Cypress.Commands.add('navigateToTournaments', () => {
  cy.get('[data-testid="nav-tournaments"]').should('be.visible').click()
  cy.url().should('include', '/tournaments')
  cy.get('[data-testid="tournaments-page"]').should('be.visible')
})

Cypress.Commands.add('navigateToProfile', () => {
  cy.get('[data-testid="user-menu"]').should('be.visible').click()
  cy.get('[data-testid="link-profile"]').should('be.visible').click()
  cy.url().should('include', '/profile')
  cy.get('[data-testid="profile-page"]').should('be.visible')
})

Cypress.Commands.add('navigateToApplications', () => {
  cy.get('[data-testid="nav-my-applications"]').should('be.visible').click()
  cy.url().should('include', '/applications')
  cy.get('[data-testid="applications-page"]').should('be.visible')
})

Cypress.Commands.add('navigateToAnalytics', () => {
  cy.get('[data-testid="nav-analytics"]').should('be.visible').click()
  cy.url().should('include', '/analytics')
  cy.get('[data-testid="analytics-page"]').should('be.visible')
})

// Command to verify navigation elements are present
Cypress.Commands.add('verifyNavigationElements', () => {
  cy.get('[data-testid="nav-shift-feed"]').should('be.visible')
  cy.get('[data-testid="nav-tournaments"]').should('be.visible')
  cy.get('[data-testid="nav-my-applications"]').should('be.visible')
  cy.get('[data-testid="user-menu"]').should('be.visible')
})