describe('Snipshift: E2E Routing and Authentication System (Working)', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  describe('Sign-Up and Role Selection Flow', () => {
    it('renders mobile without horizontal overflow', () => {
      cy.viewport('iphone-6')
      cy.navigateToLanding()
      cy.get('[data-testid="button-login"]').should('be.visible')
      cy.assertNoHorizontalOverflow()
    })
    it('should complete new user sign-up and role selection flow', () => {
      // Start from landing page
      cy.navigateToLanding()
      cy.get('[data-testid="button-get-started"]').click()
      
      // Fill out sign-up form
      cy.get('[data-testid="input-email"]').type('newuser@snipshift.test')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="input-confirm-password"]').type('TestPass123!')
      cy.get('[data-testid="input-display-name"]').type('New Test User')
      cy.get('[data-testid="button-signup"]').click()
      
      // Should be redirected to role selection
      cy.location('pathname').should('eq', '/role-selection')
      
      // Select professional role
      cy.get('[data-testid="button-select-professional"]').click()
      cy.get('[data-testid="button-continue"]').click()
      
      // Should be redirected to professional dashboard
      cy.location('pathname').should('eq', '/professional-dashboard')
      cy.get('[data-testid="button-browse-jobs"]').should('be.visible')
    })

    it('should handle role selection for all user types', () => {
      const roles = ['hub', 'professional', 'brand', 'trainer']
      
      roles.forEach((role) => {
        // Login via role helper (bypass for test env) and land on role selection
        cy.loginWithRole(`test-${role}@snipshift.com`, role)
        cy.url().should('include', '/role-selection')

        // Complete role selection for target role
        cy.get(`[data-testid="button-select-${role}"]`).click()
        cy.get('[data-testid="button-continue"]').click()

        // Expect onboarding or dashboard depending on role
        if (role === 'professional') {
          cy.url().should('include', '/professional-dashboard')
        } else if (role === 'hub') {
          cy.url().should('include', '/hub-dashboard')
        } else if (role === 'brand') {
          cy.url().should('include', '/brand-dashboard')
        } else if (role === 'trainer') {
          cy.url().should('include', '/trainer-dashboard')
        }

        // Verify dashboard-specific elements are visible (placeholder assertions)
        if (role === 'hub') {
          cy.get('[data-testid="button-post-job"]').should('be.visible')
        } else if (role === 'professional') {
          cy.get('[data-testid="button-browse-jobs"]').should('be.visible')
        } else if (role === 'trainer') {
          cy.get('[data-testid="button-upload-content"]').should('be.visible')
        }

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
        cy.navigateToLanding()
        cy.visit(route)
        cy.location('pathname').should('eq', '/login')
        cy.get('[data-testid="button-signin"]').should('be.visible')
      })
    })

    it('should preserve intended destination in login redirect', () => {
      // Try to access a protected route
      cy.navigateToLanding()
      cy.visit('/hub-dashboard')
      cy.location('pathname').should('eq', '/login')

      // Login should redirect back to intended destination
      cy.get('[data-testid="input-email"]').type('test-hub@snipshift.com')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="button-signin"]').click()

      // Should be redirected to role selection first, then continue to hub dashboard
      cy.url().should('include', '/role-selection')
      cy.get('[data-testid="button-select-hub"]').click()
      cy.get('[data-testid="button-continue"]').click()
      cy.location('pathname').should('eq', '/hub-dashboard')
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
        // Login
        cy.navigateToLanding()
        cy.get('[data-testid="link-login"]').click()
        cy.get('[data-testid="input-email"]').type(email)
        cy.get('[data-testid="input-password"]').type('TestPass123!')
        cy.get('[data-testid="button-signin"]').click()

        // Should land on role selection
        cy.url().should('include', '/role-selection')
        cy.get(`[data-testid="button-select-${role}"]`).click()
        cy.get('[data-testid="button-continue"]').click()

        // Verify dashboard-specific elements
        if (role === 'hub') {
          cy.get('[data-testid="button-post-job"]').should('be.visible')
        } else if (role === 'professional') {
          cy.get('[data-testid="button-browse-jobs"]').should('be.visible')
        } else if (role === 'trainer') {
          cy.get('[data-testid="button-upload-content"]').should('be.visible')
        }

        // Logout for next test
        cy.get('[data-testid="button-logout"]').click()
      })
    })

    it('should prevent users from accessing other role dashboards', () => {
      // Login as professional
      cy.navigateToLanding()
      cy.get('[data-testid="link-login"]').click()
      cy.get('[data-testid="input-email"]').type('test-pro@snipshift.com')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="button-signin"]').click()

      cy.url().should('include', '/role-selection')
      cy.get('[data-testid="button-select-professional"]').click()
      cy.get('[data-testid="button-continue"]').click()

      // Should be on professional dashboard
      cy.location('pathname').should('eq', '/professional-dashboard')

      // Try to access hub dashboard
      cy.navigateToLanding()
      cy.visit('/hub-dashboard')
      cy.location('pathname').should('eq', '/professional-dashboard')

      // Try to access brand dashboard
      cy.navigateToLanding()
      cy.visit('/brand-dashboard')
      cy.location('pathname').should('eq', '/professional-dashboard')

      // Try to access trainer dashboard
      cy.navigateToLanding()
      cy.visit('/trainer-dashboard')
      cy.location('pathname').should('eq', '/professional-dashboard')
    })

    it('should handle admin-only routes correctly', () => {
      // Login as non-admin user
      cy.navigateToLanding()
      cy.get('[data-testid="link-login"]').click()
      cy.get('[data-testid="input-email"]').type('test-pro@snipshift.com')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="button-signin"]').click()

      cy.url().should('include', '/role-selection')
      cy.get('[data-testid="button-select-professional"]').click()
      cy.get('[data-testid="button-continue"]').click()

      // Try to access admin route
      cy.navigateToLanding()
      cy.visit('/admin')
      // Should be redirected to user's dashboard
      cy.location('pathname').should('eq', '/professional-dashboard')
    })
  })

  describe('Authentication State Management', () => {
    it('should redirect authenticated users away from login/signup pages', () => {
      // Login first
      cy.navigateToLanding()
      cy.get('[data-testid="link-login"]').click()
      cy.get('[data-testid="input-email"]').type('test-pro@snipshift.com')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="button-signin"]').click()

      cy.url().should('include', '/role-selection')
      cy.get('[data-testid="button-select-professional"]').click()
      cy.get('[data-testid="button-continue"]').click()
      cy.location('pathname').should('eq', '/professional-dashboard')

      // Try to visit login page
      cy.navigateToLanding()
      cy.visit('/login')
      cy.location('pathname').should('eq', '/professional-dashboard')

      // Try to visit signup page
      cy.navigateToLanding()
      cy.visit('/signup')
      cy.location('pathname').should('eq', '/professional-dashboard')
    })

    it('should handle users without role assignment', () => {
      // Login user without role via test endpoint
      cy.loginWithRole('e2e@snipshift.test', 'client')
      cy.visit('/professional-dashboard')
      // Should be redirected to role selection
      cy.location('pathname').should('eq', '/role-selection')
    })
  })

  describe('Logout Flow', () => {
    it('should properly logout user and redirect to homepage', () => {
      // Login first
      cy.visit('/login')
      cy.get('[data-testid="input-email"]').type('test-pro@snipshift.com')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="button-signin"]').click()
      
      // Should be on professional dashboard
      cy.location('pathname').should('eq', '/professional-dashboard')
      
      // Click logout
      cy.get('[data-testid="button-logout"]').click()
      
      // Should be redirected to homepage
      cy.location('pathname').should('eq', '/')
      cy.get('[data-testid="button-get-started"]').should('be.visible')
      
      // Try to access protected route
      cy.visit('/professional-dashboard')
      // Should be redirected to login
      cy.location('pathname').should('eq', '/login')
    })

    it('should clear session data on logout', () => {
      // Login first
      cy.visit('/login')
      cy.get('[data-testid="input-email"]').type('test-pro@snipshift.com')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="button-signin"]').click()
      
      // Verify we're logged in
      cy.location('pathname').should('eq', '/professional-dashboard')
      
      // Logout
      cy.get('[data-testid="button-logout"]').click()
      
      // Check that session is cleared
      cy.window().then((win) => {
        expect(win.localStorage.getItem('authToken')).to.be.null
      })
      
      // Verify we can't access protected routes
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

      cy.visit('/oauth/callback?code=test-code&state=test-state')
      cy.location('pathname').should('eq', '/role-selection')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid authentication tokens gracefully', () => {
      // Set invalid token
      cy.window().then((win) => {
        win.localStorage.setItem('authToken', 'invalid-token')
      })
      
      // Try to access protected route
      cy.visit('/professional-dashboard')
      // Should be redirected to login
      cy.location('pathname').should('eq', '/login')
    })

    it('should handle network errors during authentication', () => {
      // Intercept auth request and force error
      cy.intercept('POST', '/api/auth/login', { forceNetworkError: true })
      
      cy.visit('/login')
      cy.get('[data-testid="input-email"]').type('test-pro@snipshift.com')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="button-signin"]').click()
      
      // Should show error message or stay on login page
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
      cy.get('[data-testid="button-signin"]').click()
      
      // Should eventually land on dashboard
      cy.location('pathname', { timeout: 10000 }).should('eq', '/professional-dashboard')
    })

    it('should handle slow network conditions', () => {
      // Intercept auth request and delay response
      cy.intercept('POST', '/api/auth/login', (req) => {
        req.reply({ delay: 2000, body: { success: true } })
      })
      
      cy.visit('/login')
      cy.get('[data-testid="input-email"]').type('test-pro@snipshift.com')
      cy.get('[data-testid="input-password"]').type('TestPass123!')
      cy.get('[data-testid="button-signin"]').click()
      
      // Should handle the delay gracefully
      cy.location('pathname', { timeout: 15000 }).should('eq', '/professional-dashboard')
    })
  })
})
