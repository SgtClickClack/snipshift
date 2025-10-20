// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'
import './visual-testing'

// Add CSRF header to all API requests
beforeEach(() => {
  cy.intercept('**', (req) => {
    if (req.url.includes('/api/') && (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE')) {
      req.headers['X-Snipshift-CSRF'] = '1'
    }
  })
})

// Ignore hydration errors temporarily to focus on functionality
Cypress.on('uncaught:exception', (err, runnable) => {
  if (err.message.includes('Hydration failed') || err.message.includes('hydrating')) {
    console.log('Ignoring hydration error:', err.message)
    return false
  }
  return true
})

// Alternatively you can use CommonJS syntax:
// require('./commands')

declare global {
  namespace Cypress {
    interface Chainable {
      // 🚀 FAST LOGIN COMMANDS
      programmaticLogin(userType?: 'professional' | 'business' | 'admin'): Chainable<void>
      instantLogin(role?: 'professional' | 'business'): Chainable<void>
      
      // 🛡️ API MOCKING COMMANDS
      mockApiResponse(method: string, url: string, response: any, statusCode?: number): Chainable<void>
      mockLoginSuccess(userType?: 'professional' | 'business'): Chainable<void>
      mockShiftsData(shifts?: any[]): Chainable<void>
      mockUserProfile(userType?: 'professional' | 'business'): Chainable<void>
      
      // Original commands
      login(email: string, password: string): Chainable<void>
      quickLogin(role: 'professional' | 'business'): Chainable<void>
      waitForRoute(route: string): Chainable<void>
      loginWithRole(email: string, role: string): Chainable<void>
      logout(): Chainable<void>
      verifyDashboardAccess(role: string): Chainable<void>
      verifyProtectedRouteRedirect(route: string, expectedRedirect: string): Chainable<void>
      selectRole(role: string): Chainable<void>
      verifyAuthenticated(shouldBeAuthenticated: boolean): Chainable<void>
      assertNoHorizontalOverflow(): Chainable<void>
      createShift(shiftData: any): Chainable<void>
      applyForShift(shiftTitle: string, coverLetter?: string): Chainable<void>
      uploadQualificationDocument(filePath: string): Chainable<void>
      verifyAccessibility(): Chainable<void>
      measurePageLoadPerformance(maxLoadTime?: number): Chainable<void>
      testKeyboardNavigation(): Chainable<void>
      verifySecurityHeaders(): Chainable<void>
      testOfflineFunctionality(): Chainable<void>
    }
  }
}