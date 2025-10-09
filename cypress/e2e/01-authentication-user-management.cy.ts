describe('Authentication & User Management - SnipShift V2', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  describe('Journey-Based Authentication Tests', () => {
    it('should complete full registration journey: signup -> role selection -> dashboard', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.barber
        
        // Start registration journey
        cy.visit('/signup')
        
        // Fill out registration form
        cy.get('[data-testid="input-email"]').type('newuser@test.com')
        cy.get('[data-testid="input-password"]').type(testUser.password)
        cy.get('[data-testid="input-display-name"]').type('New Test User')
        
        // Select role
        cy.get('[data-testid="select-role"]').click()
        cy.get('[data-testid="option-barber"]').click()
        
        // Submit form
        cy.get('[data-testid="button-signup"]').click()
        
        // Should redirect to role selection or dashboard
        cy.url().should('include', '/role-selection')
        cy.get('[data-testid="success-message"]').should('contain', 'Account created successfully')
        
        // Complete role selection journey
        cy.get('[data-testid="button-select-barber"]').click()
        cy.get('[data-testid="button-continue"]').click()
        
        // Should land on dashboard
        cy.url().should('include', '/barber-dashboard')
        cy.get('[data-testid="barber-dashboard"]').should('be.visible')
        cy.get('[data-testid="user-menu"]').should('be.visible')
      })
    })

    it('should complete login journey: login page -> dashboard -> profile', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.barber
        
        // Start login journey
        cy.visit('/login')
        
        // Fill out login form
        cy.get('[data-testid="input-email"]').type(testUser.email)
        cy.get('[data-testid="input-password"]').type(testUser.password)
        
        // Submit form
        cy.get('[data-testid="button-login"]').click()
        
        // Should redirect to dashboard
        cy.url().should('include', '/barber-dashboard')
        cy.get('[data-testid="user-menu"]').should('be.visible')
        
        // Navigate to profile from dashboard
        cy.navigateToProfile()
        
        // Verify profile information
        cy.get('[data-testid="profile-email"]').should('contain', testUser.email)
        cy.get('[data-testid="profile-display-name"]').should('contain', testUser.displayName)
      })
    })

    it('should complete logout journey: dashboard -> user menu -> logout -> landing page', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.barber
        
        // Login first
        cy.loginWithCredentials(testUser.email, testUser.password)
        cy.url().should('include', '/barber-dashboard')
        
        // Start logout journey from dashboard
        cy.get('[data-testid="user-menu"]').click()
        cy.get('[data-testid="button-logout"]').click()
        
        // Should redirect to landing page
        cy.url().should('eq', '/')
        cy.get('[data-testid="button-login"]').should('be.visible')
      })
    })
  })

  describe('User Registration & Login', () => {
    it('should successfully register for an account with email and password', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.barber
        
        cy.visit('/signup')
        
        // Fill out registration form
        cy.get('[data-testid="input-email"]').type(testUser.email)
        cy.get('[data-testid="input-password"]').type(testUser.password)
        cy.get('[data-testid="input-display-name"]').type(testUser.displayName)
        
        // Select role
        cy.get('[data-testid="select-role"]').click()
        cy.get('[data-testid="option-barber"]').click()
        
        // Submit form
        cy.get('[data-testid="button-signup"]').click()
        
        // Should redirect to role selection or dashboard
        cy.url().should('include', '/role-selection')
        cy.get('[data-testid="success-message"]').should('contain', 'Account created successfully')
      })
    })

    it('should register with Google OAuth authentication', () => {
      cy.visit('/signup')
      
      // Click Google OAuth button
      cy.get('[data-testid="button-google-signup"]').click()
      
      // Mock Google OAuth response
      cy.intercept('POST', '/api/oauth/google/exchange', {
        statusCode: 200,
        body: {
          id: 'google-user-123',
          email: 'test@gmail.com',
          displayName: 'Google Test User',
          roles: [],
          currentRole: null
        }
      }).as('googleOAuth')
      
      // Should handle OAuth flow
      cy.wait('@googleOAuth')
      cy.url().should('include', '/role-selection')
    })

    it('should login with existing email and password credentials', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.barber
        
        cy.visit('/login')
        
        // Fill out login form
        cy.get('[data-testid="input-email"]').type(testUser.email)
        cy.get('[data-testid="input-password"]').type(testUser.password)
        
        // Submit form
        cy.get('[data-testid="button-login"]').click()
        
        // Should redirect to dashboard
        cy.url().should('include', '/barber-dashboard')
        cy.get('[data-testid="user-menu"]').should('be.visible')
      })
    })

    it('should login with Google OAuth', () => {
      cy.visit('/login')
      
      // Click Google OAuth button
      cy.get('[data-testid="button-google-login"]').click()
      
      // Mock Google OAuth response
      cy.intercept('POST', '/api/oauth/google/exchange', {
        statusCode: 200,
        body: {
          id: 'google-user-123',
          email: 'test@gmail.com',
          displayName: 'Google Test User',
          roles: ['barber'],
          currentRole: 'barber'
        }
      }).as('googleOAuth')
      
      cy.wait('@googleOAuth')
      cy.url().should('include', '/barber-dashboard')
    })

    it('should receive appropriate error messages for invalid login credentials', () => {
      cy.visit('/login')
      
      // Try invalid credentials
      cy.get('[data-testid="input-email"]').type('invalid@email.com')
      cy.get('[data-testid="input-password"]').type('wrongpassword')
      cy.get('[data-testid="button-login"]').click()
      
      // Should show error message
      cy.get('[data-testid="error-message"]').should('contain', 'Invalid email or password')
      cy.url().should('include', '/login')
    })

    it('should receive appropriate error messages for duplicate email registration', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.barber
        
        cy.visit('/signup')
        
        // Try to register with existing email
        cy.get('[data-testid="input-email"]').type(testUser.email)
        cy.get('[data-testid="input-password"]').type(testUser.password)
        cy.get('[data-testid="input-display-name"]').type('Another User')
        cy.get('[data-testid="select-role"]').click()
        cy.get('[data-testid="option-barber"]').click()
        cy.get('[data-testid="button-signup"]').click()
        
        // Should show error message
        cy.get('[data-testid="error-message"]').should('contain', 'User already exists with this email')
      })
    })

    it('should reset password via email link', () => {
      cy.visit('/login')
      
      // Click forgot password link
      cy.get('[data-testid="link-forgot-password"]').click()
      cy.url().should('include', '/forgot-password')
      
      // Enter email
      cy.get('[data-testid="input-email"]').type('test@example.com')
      cy.get('[data-testid="button-reset-password"]').click()
      
      // Should show success message
      cy.get('[data-testid="success-message"]').should('contain', 'Password reset email sent')
    })

    it('should persist user session across browser refreshes', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.barber
        
        // Login
        cy.login(testUser.email, testUser.password)
        cy.url().should('include', '/barber-dashboard')
        
        // Refresh page
        cy.reload()
        
        // Should still be logged in
        cy.get('[data-testid="user-menu"]').should('be.visible')
        cy.url().should('include', '/barber-dashboard')
      })
    })

    it('should logout successfully and redirect to landing page', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.barber
        
        // Login first
        cy.login(testUser.email, testUser.password)
        
        // Logout
        cy.get('[data-testid="user-menu"]').click()
        cy.get('[data-testid="button-logout"]').click()
        
        // Should redirect to landing page
        cy.url().should('eq', '/')
        cy.get('[data-testid="button-login"]').should('be.visible')
      })
    })

    it('should expire user session after appropriate timeout period', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.barber
        
        // Login
        cy.login(testUser.email, testUser.password)
        
        // Mock session expiration
        cy.window().then((win) => {
          // Simulate session timeout
          win.localStorage.removeItem('session')
          win.sessionStorage.removeItem('auth')
        })
        
        // Try to access protected route
        cy.visit('/barber-dashboard')
        
        // Should redirect to login
        cy.url().should('include', '/login')
      })
    })
  })

  describe('Multi-Role User System', () => {
    it('should select multiple roles during registration', () => {
      cy.visit('/signup')
      
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.barber
        
        // Fill basic info
        cy.get('[data-testid="input-email"]').type('multirole@test.com')
        cy.get('[data-testid="input-password"]').type(testUser.password)
        cy.get('[data-testid="input-display-name"]').type('Multi Role User')
        
        // Select multiple roles
        cy.get('[data-testid="select-role"]').click()
        cy.get('[data-testid="option-barber"]').click()
        cy.get('[data-testid="option-shop"]').click()
        cy.get('[data-testid="option-trainer"]').click()
        
        cy.get('[data-testid="button-signup"]').click()
        
        // Should show role selection page
        cy.url().should('include', '/role-selection')
        cy.get('[data-testid="role-barber"]').should('be.visible')
        cy.get('[data-testid="role-shop"]').should('be.visible')
        cy.get('[data-testid="role-trainer"]').should('be.visible')
      })
    })

    it('should add additional roles to existing account', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.barber
        
        // Login as barber
        cy.login(testUser.email, testUser.password)
        
        // Go to profile settings
        cy.get('[data-testid="user-menu"]').click()
        cy.get('[data-testid="link-profile"]').click()
        
        // Add shop role
        cy.get('[data-testid="button-add-role"]').click()
        cy.get('[data-testid="option-shop"]').click()
        cy.get('[data-testid="button-save-roles"]').click()
        
        // Should show success message
        cy.get('[data-testid="success-message"]').should('contain', 'Role added successfully')
        
        // Should show both roles in profile
        cy.get('[data-testid="role-barber"]').should('be.visible')
        cy.get('[data-testid="role-shop"]').should('be.visible')
      })
    })

    it('should remove roles from account (except last remaining role)', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.barber
        
        // Login
        cy.login(testUser.email, testUser.password)
        
        // Go to profile settings
        cy.get('[data-testid="user-menu"]').click()
        cy.get('[data-testid="link-profile"]').click()
        
        // Try to remove last role (should be disabled)
        cy.get('[data-testid="button-remove-role-barber"]').should('be.disabled')
        
        // Add another role first
        cy.get('[data-testid="button-add-role"]').click()
        cy.get('[data-testid="option-shop"]').click()
        cy.get('[data-testid="button-save-roles"]').click()
        
        // Now should be able to remove barber role
        cy.get('[data-testid="button-remove-role-barber"]').click()
        cy.get('[data-testid="button-confirm-remove"]').click()
        
        // Should show success message
        cy.get('[data-testid="success-message"]').should('contain', 'Role removed successfully')
      })
    })

    it('should switch between active roles using role switcher', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.barber
        
        // Login
        cy.login(testUser.email, testUser.password)
        
        // Add shop role
        cy.get('[data-testid="user-menu"]').click()
        cy.get('[data-testid="link-profile"]').click()
        cy.get('[data-testid="button-add-role"]').click()
        cy.get('[data-testid="option-shop"]').click()
        cy.get('[data-testid="button-save-roles"]').click()
        
        // Switch to shop role
        cy.get('[data-testid="role-switcher"]').click()
        cy.get('[data-testid="option-shop"]').click()
        
        // Should redirect to shop dashboard
        cy.url().should('include', '/shop-dashboard')
        cy.get('[data-testid="current-role"]').should('contain', 'Shop')
      })
    })

    it('should see role-specific dashboard based on current active role', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.barber
        
        // Login as barber
        cy.login(testUser.email, testUser.password)
        cy.url().should('include', '/barber-dashboard')
        cy.get('[data-testid="barber-dashboard"]').should('be.visible')
        
        // Add and switch to shop role
        cy.get('[data-testid="user-menu"]').click()
        cy.get('[data-testid="link-profile"]').click()
        cy.get('[data-testid="button-add-role"]').click()
        cy.get('[data-testid="option-shop"]').click()
        cy.get('[data-testid="button-save-roles"]').click()
        
        cy.get('[data-testid="role-switcher"]').click()
        cy.get('[data-testid="option-shop"]').click()
        
        // Should see shop dashboard
        cy.url().should('include', '/shop-dashboard')
        cy.get('[data-testid="shop-dashboard"]').should('be.visible')
      })
    })

    it('should not access role-specific features without having that role', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.barber
        
        // Start from homepage and navigate to login
        cy.visit('/')
        cy.get('[data-testid="button-login"]').click()
        
        // Login as barber only
        cy.get('[data-testid="input-email"]').type(testUser.email)
        cy.get('[data-testid="input-password"]').type(testUser.password)
        cy.get('[data-testid="button-login"]').click()
        
        // Should land on barber dashboard
        cy.url().should('include', '/barber-dashboard')
        
        // Try to access shop features via URL
        cy.visit('/shop-dashboard')
        
        // Should redirect back to barber dashboard or show error
        cy.url().should('include', '/barber-dashboard')
        cy.get('[data-testid="error-message"]').should('contain', 'Access denied')
      })
    })

    it('should receive appropriate error when trying to access unauthorized role features', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.barber
        
        // Login as barber
        cy.login(testUser.email, testUser.password)
        
        // Try to access admin features
        cy.visit('/admin')
        
        // Should show access denied
        cy.get('[data-testid="error-message"]').should('contain', 'Access denied')
        cy.url().should('not.include', '/admin')
      })
    })
  })

  describe('Profile Management', () => {
    it('should view profile information', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.barber
        
        // Login
        cy.login(testUser.email, testUser.password)
        
        // Go to profile
        cy.get('[data-testid="user-menu"]').click()
        cy.get('[data-testid="link-profile"]').click()
        
        // Should display profile information
        cy.get('[data-testid="profile-email"]').should('contain', testUser.email)
        cy.get('[data-testid="profile-display-name"]').should('contain', testUser.displayName)
        cy.get('[data-testid="profile-role"]').should('contain', 'Barber')
      })
    })

    it('should edit basic profile information', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.barber
        
        // Login
        cy.login(testUser.email, testUser.password)
        
        // Go to profile
        cy.get('[data-testid="user-menu"]').click()
        cy.get('[data-testid="link-profile"]').click()
        
        // Edit display name
        cy.get('[data-testid="button-edit-profile"]').click()
        cy.get('[data-testid="input-display-name"]').clear().type('Updated Name')
        cy.get('[data-testid="button-save-profile"]').click()
        
        // Should show updated information
        cy.get('[data-testid="success-message"]').should('contain', 'Profile updated successfully')
        cy.get('[data-testid="profile-display-name"]').should('contain', 'Updated Name')
      })
    })

    it('should update role-specific profile information', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.barber
        
        // Login
        cy.login(testUser.email, testUser.password)
        
        // Go to profile
        cy.get('[data-testid="user-menu"]').click()
        cy.get('[data-testid="link-profile"]').click()
        
        // Edit barber-specific information
        cy.get('[data-testid="button-edit-barber-profile"]').click()
        cy.get('[data-testid="input-experience"]').clear().type('7+ years')
        cy.get('[data-testid="input-skills"]').clear().type('Advanced Fade Techniques, Beard Styling')
        cy.get('[data-testid="button-save-barber-profile"]').click()
        
        // Should show updated information
        cy.get('[data-testid="success-message"]').should('contain', 'Barber profile updated successfully')
        cy.get('[data-testid="barber-experience"]').should('contain', '7+ years')
      })
    })

    it('should upload and update profile pictures', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.barber
        
        // Login
        cy.login(testUser.email, testUser.password)
        
        // Go to profile
        cy.get('[data-testid="user-menu"]').click()
        cy.get('[data-testid="link-profile"]').click()
        
        // Upload profile picture
        cy.get('[data-testid="button-edit-profile"]').click()
        cy.get('[data-testid="input-profile-picture"]').selectFile('cypress/fixtures/test-profile-image.jpg')
        cy.get('[data-testid="button-save-profile"]').click()
        
        // Should show success message
        cy.get('[data-testid="success-message"]').should('contain', 'Profile picture updated successfully')
        cy.get('[data-testid="profile-picture"]').should('be.visible')
      })
    })

    it('should receive validation errors for invalid profile data', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.barber
        
        // Login
        cy.login(testUser.email, testUser.password)
        
        // Go to profile
        cy.get('[data-testid="user-menu"]').click()
        cy.get('[data-testid="link-profile"]').click()
        
        // Try to save invalid data
        cy.get('[data-testid="button-edit-profile"]').click()
        cy.get('[data-testid="input-email"]').clear().type('invalid-email')
        cy.get('[data-testid="button-save-profile"]').click()
        
        // Should show validation error
        cy.get('[data-testid="error-email"]').should('contain', 'Please enter a valid email address')
      })
    })
  })

  describe('Manual Approval Flow (Brand/Coach Accounts)', () => {
    it('should keep new Brand/Coach account in pending review state', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.brand
        
        // Register as brand
        cy.visit('/signup')
        cy.get('[data-testid="input-email"]').type(testUser.email)
        cy.get('[data-testid="input-password"]').type(testUser.password)
        cy.get('[data-testid="input-display-name"]').type(testUser.displayName)
        cy.get('[data-testid="select-role"]').click()
        cy.get('[data-testid="option-brand"]').click()
        cy.get('[data-testid="button-signup"]').click()
        
        // Should show pending approval message
        cy.get('[data-testid="pending-approval-message"]').should('contain', 'Your account is under review')
        cy.get('[data-testid="approval-status"]').should('contain', 'Pending Review')
      })
    })

    it('should prevent access to dashboard until admin approval', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.brand
        
        // Try to access brand dashboard without approval
        cy.login(testUser.email, testUser.password)
        cy.visit('/brand-dashboard')
        
        // Should redirect to pending approval page
        cy.url().should('include', '/pending-approval')
        cy.get('[data-testid="pending-approval-message"]').should('be.visible')
      })
    })

    it('should allow admin to view pending Brand/Coach applications', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const adminUser = data.users.admin
        
        // Login as admin
        cy.login(adminUser.email, adminUser.password)
        
        // Go to admin panel
        cy.visit('/admin')
        cy.get('[data-testid="tab-pending-applications"]').click()
        
        // Should see pending applications
        cy.get('[data-testid="pending-application"]').should('have.length.at.least', 1)
        cy.get('[data-testid="application-email"]').should('contain', data.users.brand.email)
      })
    })

    it('should allow admin to approve Brand/Coach accounts', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const adminUser = data.users.admin
        
        // Login as admin
        cy.login(adminUser.email, adminUser.password)
        
        // Go to admin panel
        cy.visit('/admin')
        cy.get('[data-testid="tab-pending-applications"]').click()
        
        // Approve application
        cy.get('[data-testid="button-approve-application"]').first().click()
        cy.get('[data-testid="button-confirm-approval"]').click()
        
        // Should show success message
        cy.get('[data-testid="success-message"]').should('contain', 'Application approved successfully')
      })
    })

    it('should allow admin to reject Brand/Coach accounts with reasons', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const adminUser = data.users.admin
        
        // Login as admin
        cy.login(adminUser.email, adminUser.password)
        
        // Go to admin panel
        cy.visit('/admin')
        cy.get('[data-testid="tab-pending-applications"]').click()
        
        // Reject application
        cy.get('[data-testid="button-reject-application"]').first().click()
        cy.get('[data-testid="textarea-rejection-reason"]').type('Incomplete business information')
        cy.get('[data-testid="button-confirm-rejection"]').click()
        
        // Should show success message
        cy.get('[data-testid="success-message"]').should('contain', 'Application rejected successfully')
      })
    })

    it('should notify approved Brand/Coach users', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.brand
        
        // Login as brand (after approval)
        cy.login(testUser.email, testUser.password)
        
        // Should see approval notification
        cy.get('[data-testid="approval-notification"]').should('contain', 'Your account has been approved')
        cy.get('[data-testid="button-dismiss-notification"]').click()
        
        // Should be able to access dashboard
        cy.visit('/brand-dashboard')
        cy.url().should('include', '/brand-dashboard')
      })
    })

    it('should notify rejected Brand/Coach users with feedback', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.brand
        
        // Login as brand (after rejection)
        cy.login(testUser.email, testUser.password)
        
        // Should see rejection notification
        cy.get('[data-testid="rejection-notification"]').should('contain', 'Your application was rejected')
        cy.get('[data-testid="rejection-reason"]').should('contain', 'Incomplete business information')
        cy.get('[data-testid="button-resubmit-application"]').should('be.visible')
      })
    })

    it('should maintain audit trail of approval/rejection decisions', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const adminUser = data.users.admin
        
        // Login as admin
        cy.login(adminUser.email, adminUser.password)
        
        // Go to admin audit log
        cy.visit('/admin')
        cy.get('[data-testid="tab-audit-log"]').click()
        
        // Should see approval/rejection history
        cy.get('[data-testid="audit-log-entry"]').should('have.length.at.least', 1)
        cy.get('[data-testid="audit-action"]').should('contain', 'Application')
        cy.get('[data-testid="audit-admin"]').should('contain', adminUser.displayName)
        cy.get('[data-testid="audit-timestamp"]').should('be.visible')
      })
    })
  })
})
