// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to log in via the demo system
Cypress.Commands.add('quickLogin', (role: 'hub' | 'professional' | 'trainer' | 'brand') => {
  cy.visit('/demo')
  
  const roleSelectors = {
    hub: '[data-testid="demo-login-hub"]',
    professional: '[data-testid="demo-login-professional"]', 
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

// Custom command for standard login
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login')
  cy.get('[data-testid="input-email"]').type(email)
  cy.get('[data-testid="input-password"]').type(password)
  cy.get('[data-testid="button-login"]').click()
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