describe('Snipshift: E2E Routing and Authentication System', () => {
  beforeEach(() => {
    // Clear any existing session data
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  describe('Sign-Up and Role Selection Flow', () => {
    it('should complete new user sign-up and role selection flow', () => {
      // Start from landing page
      cy.visit('/')
      cy.get('[data-testid="button-get-started"]').click()
      
      // Fill out sign-up form
      cy.get('[data-testid="input-email"]').type('newuser@snipshift.test')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="input-confirm-password"]').type('TestPass123!')
      cy.get('[data-testid="input-display-name"]').type('New Test User')
      cy.get('[data-testid="button-signup-submit"]').click()
      
      // Should be redirected to role selection
      cy.location('pathname').should('eq', '/role-selection')
      cy.get('[data-testid="role-selection-title"]').should('be.visible')
      
      // Select professional role
      cy.get('[data-testid="button-select-professional"]').click()
      cy.get('[data-testid="confirm-roles-button"]').click()
      
      // Should be redirected to professional dashboard
      cy.location('pathname').should('eq', '/professional-dashboard')
      cy.get('[data-testid="professional-dashboard"]').should('be.visible')
    })

    it('should handle role selection for different user types', () => {
      // Test login via test endpoint for different roles
      const roles = ['hub', 'professional', 'brand', 'trainer']
      
      roles.forEach((role) => {
        cy.request({
          method: 'POST',
          url: '/api/test/login',
          headers: { 
            'X-Test-Key': Cypress.env('E2E_TEST_KEY') || 'test', 
            'X-Snipshift-CSRF': '1' 
          },
          body: { 
            email: `test-${role}@snipshift.com`, 
            role: role 
          },
          failOnStatusCode: false,
        }).its('status').should('eq', 200)

        // Navigate to role selection from dashboard
        cy.visit('/')
        cy.get('[data-testid="button-login"]').click()
        cy.get('[data-testid="input-email"]').type(`test-${role}@snipshift.com`)
        cy.get('[data-testid="input-password"]').type('TestPass123!')
        cy.get('[data-testid="button-login"]').click()
        
        // Should be redirected to role selection
        cy.location('pathname').should('eq', '/role-selection')
        
        // Select the role
        cy.get(`[data-testid="button-select-${role}"]`).click()
        cy.get('[data-testid="confirm-roles-button"]').click()
        
        // Should be redirected to correct dashboard
        const expectedDashboard = `/${role}-dashboard`
        cy.location('pathname').should('eq', expectedDashboard)
        cy.get(`[data-testid="${role}-dashboard"]`).should('be.visible')
        
        // Logout for next iteration
        cy.get('[data-testid="button-logout"]').click()
        cy.location('pathname').should('eq', '/')
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
        cy.visit(route)
        cy.location('pathname').should('eq', '/login')
        cy.get('[data-testid="login-form"]').should('be.visible')
      })
    })

    it('should preserve intended destination in login redirect', () => {
      // Start from homepage and navigate to protected route
      cy.visit('/')
      cy.get('[data-testid="button-login"]').click()
      
      // Try to access a protected route while on login page
      cy.visit('/hub-dashboard')
      cy.location('pathname').should('eq', '/login')
      
      // Login should redirect back to intended destination
      cy.get('[data-testid="input-email"]').type('test-hub@snipshift.com')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="button-login"]').click()
      
      // Should be redirected to hub dashboard
      cy.location('pathname').should('eq', '/hub-dashboard')
    })
  })

  describe('Role-Based Access Control', () => {
    it('should allow users to access their own dashboard', () => {
      const roleTests = [
        { role: 'professional', email: 'user@example.com' }
      ]
      
      roleTests.forEach(({ role, email }) => {
        // Start from homepage and navigate to login
        cy.visit('/')
        cy.get('[data-testid="button-login"]').click()
        
        // Login using API with CSRF header
        cy.request({
          method: 'POST',
          url: '/api/login',
          headers: { 'X-Snipshift-CSRF': '1' },
          body: { email, password: 'SecurePassword123!' }
        }).then((response) => {
          expect(response.status).to.eq(200)
          // Set user data in localStorage to simulate login
          cy.window().then((win) => {
            win.localStorage.setItem('currentUser', JSON.stringify(response.body))
          })
        })
        
        // Navigate to dashboard
        cy.visit('/')
        
        // Should land on correct dashboard
        const expectedDashboard = `/${role}-dashboard`
        cy.location('pathname').should('eq', expectedDashboard)
        cy.get(`[data-testid="${role}-dashboard"]`).should('be.visible')
        
        // Logout for next test
        cy.get('[data-testid="button-logout"]').click()
      })
    })

    it('should prevent users from accessing other role dashboards', () => {
      // Start from homepage and navigate to login
      cy.visit('/')
      cy.get('[data-testid="button-login"]').click()
      
      // Login as professional
      cy.get('[data-testid="input-email"]').type('test-pro@snipshift.com')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="button-login"]').click()
      
      // Should be on professional dashboard
      cy.location('pathname').should('eq', '/professional-dashboard')
      
      // Try to access hub dashboard via URL
      cy.visit('/hub-dashboard')
      // Should be redirected back to professional dashboard
      cy.location('pathname').should('eq', '/professional-dashboard')
      
      // Try to access brand dashboard via URL
      cy.visit('/brand-dashboard')
      // Should be redirected back to professional dashboard
      cy.location('pathname').should('eq', '/professional-dashboard')
      
      // Try to access trainer dashboard via URL
      cy.visit('/trainer-dashboard')
      // Should be redirected back to professional dashboard
      cy.location('pathname').should('eq', '/professional-dashboard')
    })

    it('should handle admin-only routes correctly', () => {
      // Start from homepage and navigate to login
      cy.visit('/')
      cy.get('[data-testid="button-login"]').click()
      
      // Login as non-admin user
      cy.get('[data-testid="input-email"]').type('test-pro@snipshift.com')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="button-login"]').click()
      
      // Try to access admin route via URL
      cy.visit('/admin')
      // Should be redirected to user's dashboard
      cy.location('pathname').should('eq', '/professional-dashboard')
    })
  })

  describe('Authentication State Management', () => {
    it('should redirect authenticated users away from login/signup pages', () => {
      // Start from homepage and navigate to login
      cy.visit('/')
      cy.get('[data-testid="button-login"]').click()
      
      // Login first
      cy.get('[data-testid="input-email"]').type('test-pro@snipshift.com')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="button-login"]').click()
      
      // Should be on professional dashboard
      cy.location('pathname').should('eq', '/professional-dashboard')
      
      // Try to visit login page via URL
      cy.visit('/login')
      // Should be redirected back to dashboard
      cy.location('pathname').should('eq', '/professional-dashboard')
      
      // Try to visit signup page via URL
      cy.visit('/signup')
      // Should be redirected back to dashboard
      cy.location('pathname').should('eq', '/professional-dashboard')
    })

    it('should handle users without role assignment', () => {
      // Login user without role via test endpoint
      cy.request({
        method: 'POST',
        url: '/api/test/login',
        headers: { 
          'X-Test-Key': Cypress.env('E2E_TEST_KEY') || 'test', 
          'X-Snipshift-CSRF': '1' 
        },
        body: { 
          email: 'e2e@snipshift.test', 
          role: 'client' // No specific role
        },
        failOnStatusCode: false,
      }).its('status').should('eq', 200)

      // Start from homepage and navigate to login
      cy.visit('/')
      cy.get('[data-testid="button-login"]').click()
      
      // Login with user without role
      cy.get('[data-testid="input-email"]').type('e2e@snipshift.test')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="button-login"]').click()
      
      // Should be redirected to role selection
      cy.location('pathname').should('eq', '/role-selection')
    })
  })

  describe('Logout Flow', () => {
    it('should properly logout user and redirect to homepage', () => {
      // Start from homepage and navigate to login
      cy.visit('/')
      cy.get('[data-testid="button-login"]').click()
      
      // Login first
      cy.get('[data-testid="input-email"]').type('test-pro@snipshift.com')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="button-login"]').click()
      
      // Should be on professional dashboard
      cy.location('pathname').should('eq', '/professional-dashboard')
      
      // Click logout
      cy.get('[data-testid="button-logout"]').click()
      
      // Should be redirected to homepage
      cy.location('pathname').should('eq', '/')
      cy.get('[data-testid="landing-page"]').should('be.visible')
      
      // Try to access protected route via URL
      cy.visit('/professional-dashboard')
      // Should be redirected to login
      cy.location('pathname').should('eq', '/login')
    })

    it('should clear session data on logout', () => {
      // Start from homepage and navigate to login
      cy.visit('/')
      cy.get('[data-testid="button-login"]').click()
      
      // Login first
      cy.get('[data-testid="input-email"]').type('test-pro@snipshift.com')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="button-login"]').click()
      
      // Verify we're logged in
      cy.location('pathname').should('eq', '/professional-dashboard')
      
      // Logout
      cy.get('[data-testid="button-logout"]').click()
      
      // Check that session is cleared
      cy.window().then((win) => {
        expect(win.localStorage.getItem('authToken')).to.be.null
      })
      
      // Verify we can't access protected routes via URL
      cy.visit('/professional-dashboard')
      cy.location('pathname').should('eq', '/login')
    })
  })

  describe('OAuth Authentication Flow', () => {
    it('should handle OAuth callback and role assignment', () => {
      // Simulate OAuth callback with user data
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

      // Visit OAuth callback page
      cy.visit('/oauth/callback?code=test-code&state=test-state')
      
      // Should be redirected to role selection
      cy.location('pathname').should('eq', '/role-selection')
      cy.get('[data-testid="role-selection-title"]').should('be.visible')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid authentication tokens gracefully', () => {
      // Start from homepage
      cy.visit('/')
      
      // Set invalid token
      cy.window().then((win) => {
        win.localStorage.setItem('authToken', 'invalid-token')
      })
      
      // Try to access protected route via URL
      cy.visit('/professional-dashboard')
      // Should be redirected to login
      cy.location('pathname').should('eq', '/login')
    })

    it('should handle network errors during authentication', () => {
      // Intercept auth request and force error
      cy.intercept('POST', '/api/auth/login', { forceNetworkError: true })
      
      // Start from homepage and navigate to login
      cy.visit('/')
      cy.get('[data-testid="button-login"]').click()
      
      cy.get('[data-testid="input-email"]').type('test-pro@snipshift.com')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="button-login"]').click()
      
      // Should show error message
      cy.get('[data-testid="error-message"]').should('be.visible')
      cy.location('pathname').should('eq', '/login')
    })

    it('should handle malformed role data', () => {
      // Login user with invalid role via test endpoint
      cy.request({
        method: 'POST',
        url: '/api/test/login',
        headers: { 
          'X-Test-Key': Cypress.env('E2E_TEST_KEY') || 'test', 
          'X-Snipshift-CSRF': '1' 
        },
        body: { 
          email: 'e2e@snipshift.test', 
          role: 'invalid-role'
        },
        failOnStatusCode: false,
      }).its('status').should('eq', 200)

      // Start from homepage and navigate to login
      cy.visit('/')
      cy.get('[data-testid="button-login"]').click()
      
      // Login with user with invalid role
      cy.get('[data-testid="input-email"]').type('e2e@snipshift.test')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="button-login"]').click()
      
      // Should be redirected to role selection or home
      cy.location('pathname').should('match', /\/role-selection|\/home/)
    })
  })

  describe('Performance and Loading States', () => {
    it('should show loading states during authentication', () => {
      // Start from homepage and navigate to login
      cy.visit('/')
      cy.get('[data-testid="button-login"]').click()
      
      cy.get('[data-testid="input-email"]').type('test-pro@snipshift.com')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="button-login"]').click()
      
      // Should show loading state (button text changes to "Signing In...")
      cy.get('[data-testid="button-login"]').should('contain', 'Signing In...')
      
      // Should eventually land on dashboard
      cy.location('pathname', { timeout: 10000 }).should('eq', '/professional-dashboard')
    })

    it('should handle slow network conditions', () => {
      // Intercept auth request and delay response
      cy.intercept('POST', '/api/auth/login', (req) => {
        req.reply({ delay: 2000, body: { success: true } })
      })
      
      // Start from homepage and navigate to login
      cy.visit('/')
      cy.get('[data-testid="button-login"]').click()
      
      cy.get('[data-testid="input-email"]').type('test-pro@snipshift.com')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="button-login"]').click()
      
      // Should show loading state for extended period (button text changes to "Signing In...")
      cy.get('[data-testid="button-login"]').should('contain', 'Signing In...')
      cy.wait(1000)
      cy.get('[data-testid="button-login"]').should('contain', 'Signing In...')
    })
  })
})
