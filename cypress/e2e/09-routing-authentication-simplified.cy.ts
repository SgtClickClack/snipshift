describe('Snipshift: E2E Routing and Authentication System (Simplified)', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  describe('Sign-Up and Role Selection Flow', () => {
    it('should complete new user sign-up and role selection flow', () => {
      cy.visit('/')
      cy.get('[data-testid="button-signup"]').click()
      
      // Fill out sign-up form
      cy.get('[data-testid="input-email"]').type('newuser@snipshift.test')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="input-confirm-password"]').type('TestPass123!')
      cy.get('[data-testid="input-display-name"]').type('New Test User')
      cy.get('[data-testid="button-signup-submit"]').click()
      
      // Should be redirected to role selection
      cy.location('pathname').should('eq', '/role-selection')
      cy.get('[data-testid="role-selection-title"]').should('be.visible')
      
      // Select professional role and verify dashboard access
      cy.selectRole('professional')
      cy.verifyDashboardAccess('professional')
    })

    it('should handle role selection for all user types', () => {
      const roles = ['hub', 'professional', 'brand', 'trainer']
      
      roles.forEach((role) => {
        cy.loginWithRole(`test-${role}@snipshift.com`, role)
        cy.visit('/role-selection')
        cy.location('pathname').should('eq', '/role-selection')
        
        cy.selectRole(role)
        cy.verifyDashboardAccess(role)
        
        cy.logout()
      })
    })
  })

  describe('Protected Routes (Unauthenticated User)', () => {
    it('should redirect unauthenticated users to login when accessing protected routes', () => {
      const protectedRoutes = [
        '/hub-dashboard',
        '/professional-dashboard', 
        '/brand-dashboard',
        '/trainer-dashboard',
        '/community',
        '/social-feed',
        '/training-hub',
        '/profile'
      ]
      
      protectedRoutes.forEach((route) => {
        cy.verifyProtectedRouteRedirect(route, '/login')
        cy.get('[data-testid="login-form"]').should('be.visible')
      })
    })

    it('should preserve intended destination in login redirect', () => {
      cy.visit('/hub-dashboard')
      cy.location('pathname').should('eq', '/login')
      
      cy.login('test-hub@snipshift.com', 'TestPass123!')
      cy.verifyDashboardAccess('hub')
    })
  })

  describe('Role-Based Access Control', () => {
    it('should allow users to access their own dashboard', () => {
      const roleTests = [
        { role: 'hub', email: 'test-hub@snipshift.com' },
        { role: 'professional', email: 'test-pro@snipshift.com' },
        { role: 'brand', email: 'test-brand@snipshift.com' },
        { role: 'trainer', email: 'test-trainer@snipshift.com' }
      ]
      
      roleTests.forEach(({ role, email }) => {
        cy.login(email, 'TestPass123!')
        cy.verifyDashboardAccess(role)
        cy.logout()
      })
    })

    it('should prevent users from accessing other role dashboards', () => {
      cy.login('test-pro@snipshift.com', 'TestPass123!')
      cy.verifyDashboardAccess('professional')
      
      // Try to access other dashboards - should be redirected back
      cy.verifyProtectedRouteRedirect('/hub-dashboard', '/professional-dashboard')
      cy.verifyProtectedRouteRedirect('/brand-dashboard', '/professional-dashboard')
      cy.verifyProtectedRouteRedirect('/trainer-dashboard', '/professional-dashboard')
    })

    it('should handle admin-only routes correctly', () => {
      cy.login('test-pro@snipshift.com', 'TestPass123!')
      cy.verifyProtectedRouteRedirect('/admin', '/professional-dashboard')
    })
  })

  describe('Authentication State Management', () => {
    it('should redirect authenticated users away from login/signup pages', () => {
      cy.login('test-pro@snipshift.com', 'TestPass123!')
      cy.verifyDashboardAccess('professional')
      
      // Try to visit login/signup pages
      cy.verifyProtectedRouteRedirect('/login', '/professional-dashboard')
      cy.verifyProtectedRouteRedirect('/signup', '/professional-dashboard')
    })

    it('should handle users without role assignment', () => {
      cy.loginWithRole('e2e@snipshift.test', 'client')
      cy.verifyProtectedRouteRedirect('/professional-dashboard', '/role-selection')
    })
  })

  describe('Logout Flow', () => {
    it('should properly logout user and redirect to homepage', () => {
      cy.login('test-pro@snipshift.com', 'TestPass123!')
      cy.verifyDashboardAccess('professional')
      
      cy.logout()
      cy.get('[data-testid="landing-page"]').should('be.visible')
      
      // Verify we can't access protected routes
      cy.verifyProtectedRouteRedirect('/professional-dashboard', '/login')
    })

    it('should clear session data on logout', () => {
      cy.login('test-pro@snipshift.com', 'TestPass123!')
      cy.verifyDashboardAccess('professional')
      
      cy.logout()
      
      // Check that session is cleared
      cy.window().then((win) => {
        expect(win.localStorage.getItem('authToken')).to.be.null
      })
      
      cy.verifyProtectedRouteRedirect('/professional-dashboard', '/login')
    })
  })

  describe('OAuth Authentication Flow', () => {
    it('should handle OAuth callback and role assignment', () => {
      cy.request({
        method: 'POST',
        url: '/api/test/oauth-callback',
        headers: { 
          'X-Test-Key': Cypress.env('E2E_TEST_KEY') || 'test', 
          'X-Snipshift-CSRF': '1' 
        },
        body: { 
          email: 'oauth-user@snipshift.test',
          displayName: 'OAuth Test User',
          provider: 'google'
        },
        failOnStatusCode: false,
      }).its('status').should('eq', 200)

      cy.visit('/oauth/callback?code=test-code&state=test-state')
      cy.location('pathname').should('eq', '/role-selection')
      cy.get('[data-testid="role-selection-title"]').should('be.visible')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid authentication tokens gracefully', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('authToken', 'invalid-token')
      })
      
      cy.verifyProtectedRouteRedirect('/professional-dashboard', '/login')
    })

    it('should handle network errors during authentication', () => {
      cy.intercept('POST', '/api/auth/login', { forceNetworkError: true })
      
      cy.visit('/login')
      cy.get('[data-testid="input-email"]').type('test-pro@snipshift.com')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="button-login"]').click()
      
      cy.get('[data-testid="error-message"]').should('be.visible')
      cy.location('pathname').should('eq', '/login')
    })

    it('should handle malformed role data', () => {
      cy.loginWithRole('e2e@snipshift.test', 'invalid-role')
      cy.visit('/professional-dashboard')
      cy.location('pathname').should('match', /\/role-selection|\/home/)
    })
  })

  describe('Performance and Loading States', () => {
    it('should show loading states during authentication', () => {
      cy.visit('/login')
      cy.get('[data-testid="input-email"]').type('test-pro@snipshift.com')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="button-login"]').click()
      
      cy.get('[data-testid="loading-spinner"]').should('be.visible')
      cy.location('pathname', { timeout: 10000 }).should('eq', '/professional-dashboard')
    })

    it('should handle slow network conditions', () => {
      cy.intercept('POST', '/api/auth/login', (req) => {
        req.reply({ delay: 2000, body: { success: true } })
      })
      
      cy.visit('/login')
      cy.get('[data-testid="input-email"]').type('test-pro@snipshift.com')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="button-login"]').click()
      
      cy.get('[data-testid="loading-spinner"]').should('be.visible')
      cy.wait(1000)
      cy.get('[data-testid="loading-spinner"]').should('be.visible')
    })
  })
})
