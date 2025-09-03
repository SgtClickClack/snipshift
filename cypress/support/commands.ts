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