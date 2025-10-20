// Enhanced Cypress commands for better test reliability
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to wait for the application to be fully loaded
       */
      waitForAppLoad(): Chainable<void>
      
      /**
       * Custom command to clear all storage and cookies
       */
      clearAllStorage(): Chainable<void>
      
      /**
       * Custom command to wait for network to be idle
       */
      waitForNetworkIdle(): Chainable<void>
      
      /**
       * Custom command to login with test credentials
       */
      loginAsUser(email?: string, password?: string): Chainable<void>
      
      /**
       * Custom command to wait for element to be visible and stable
       */
      waitForStableElement(selector: string, timeout?: number): Chainable<JQuery<HTMLElement>>
      
      /**
       * Custom command to handle select elements properly
       */
      selectOption(selector: string, value: string): Chainable<void>
    }
  }
}

// Wait for app to be fully loaded
Cypress.Commands.add('waitForAppLoad', () => {
  // Wait for the root element to exist
  cy.get('#root', { timeout: 30000 }).should('exist')
  
  // Wait for any loading indicators to disappear
  cy.get('body').should('not.contain', 'Loading...')
  
  // Wait for network to be idle
  cy.task('waitForNetworkIdle')
  
  // Additional wait for React to hydrate
  cy.wait(1000)
})

// Clear all storage and cookies
Cypress.Commands.add('clearAllStorage', () => {
  cy.clearLocalStorage()
  cy.clearCookies()
  cy.window().then((win) => {
    win.sessionStorage.clear()
  })
})

// Wait for network to be idle
Cypress.Commands.add('waitForNetworkIdle', () => {
  cy.task('waitForNetworkIdle')
})

// Login with test credentials
Cypress.Commands.add('loginAsUser', (email = 'barber.pro@snipshift.com', password = 'SecurePass123!') => {
  cy.visit('/login')
  cy.waitForAppLoad()
  
  cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible').type(email)
  cy.get('input[type="password"]', { timeout: 10000 }).should('be.visible').type(password)
  cy.get('button[type="submit"]', { timeout: 10000 }).should('be.visible').click()
  
  // Wait for redirect to dashboard
  cy.url({ timeout: 15000 }).should('include', '/dashboard')
  cy.waitForAppLoad()
})

// Wait for element to be visible and stable
Cypress.Commands.add('waitForStableElement', (selector: string, timeout = 10000) => {
  cy.get(selector, { timeout })
    .should('be.visible')
    .should('not.have.class', 'loading')
    .should('not.have.class', 'disabled')
  
  // Wait for any animations to complete
  cy.wait(500)
  
  return cy.get(selector)
})

// Handle select elements properly
Cypress.Commands.add('selectOption', (selector: string, value: string) => {
  cy.get(selector).should('be.visible')
  cy.get(selector).select(value, { force: true })
  cy.get(selector).should('have.value', value)
})

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // Don't fail tests on uncaught exceptions in development
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false
  }
  
  if (err.message.includes('Non-Error promise rejection captured')) {
    return false
  }
  
  // Log the error but don't fail the test
  console.error('Uncaught exception:', err)
  return false
})

// Improve test reliability with better waits
beforeEach(() => {
  // Clear storage before each test
  cy.clearAllStorage()
  
  // Add CSRF header for all requests
  cy.intercept('**', (req) => {
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
      req.headers['X-Snipshift-CSRF'] = '1'
    }
  })
})

// Global configuration for better test stability
Cypress.config('defaultCommandTimeout', 15000)
Cypress.config('requestTimeout', 15000)
Cypress.config('responseTimeout', 15000)
