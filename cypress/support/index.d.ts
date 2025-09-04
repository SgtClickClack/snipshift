/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to login with email and password
     * @example cy.login('user@example.com', 'password123')
     */
    login(email: string, password: string): Chainable<void>

    /**
     * Custom command to login with specific role via test endpoint
     * @example cy.loginWithRole('user@example.com', 'professional')
     */
    loginWithRole(email: string, role: string): Chainable<void>

    /**
     * Custom command to logout user
     * @example cy.logout()
     */
    logout(): Chainable<void>

    /**
     * Custom command to verify dashboard access for specific role
     * @example cy.verifyDashboardAccess('professional')
     */
    verifyDashboardAccess(role: string): Chainable<void>

    /**
     * Custom command to verify protected route redirect
     * @example cy.verifyProtectedRouteRedirect('/admin', '/professional-dashboard')
     */
    verifyProtectedRouteRedirect(route: string, expectedRedirect: string): Chainable<void>

    /**
     * Custom command to complete role selection
     * @example cy.selectRole('professional')
     */
    selectRole(role: string): Chainable<void>

    /**
     * Custom command to verify authentication state
     * @example cy.verifyAuthenticated(true)
     */
    verifyAuthenticated(shouldBeAuthenticated: boolean): Chainable<void>

    /**
     * Custom command to wait for a route to load
     * @example cy.waitForRoute('/professional-dashboard')
     */
    waitForRoute(route: string): Chainable<void>

    /**
     * Custom command to quick login via demo system
     * @example cy.quickLogin('professional')
     */
    quickLogin(role: 'hub' | 'professional' | 'trainer' | 'brand'): Chainable<void>
  }
}
