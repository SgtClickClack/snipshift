describe('Journey-Based Test Runner - SnipShift V2', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  describe('Complete User Journey Tests', () => {
    it('should complete full barber user journey: registration -> login -> dashboard -> shift feed -> apply -> profile', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const testUser = data.users.barber
        
        // 1. Registration Journey
        cy.visit('/signup')
        cy.get('[data-testid="input-email"]').type('journey-test@example.com')
        cy.get('[data-testid="input-password"]').type(testUser.password)
        cy.get('[data-testid="input-display-name"]').type('Journey Test User')
        cy.get('[data-testid="select-role"]').click()
        cy.get('[data-testid="option-barber"]').click()
        cy.get('[data-testid="button-signup"]').click()
        
        // Complete role selection
        cy.url().should('include', '/role-selection')
        cy.get('[data-testid="button-select-professional"]').click()
        cy.get('[data-testid="button-continue"]').click()
        
        // 2. Dashboard Journey
        cy.url().should('include', '/professional-dashboard')
        cy.get('[data-testid="professional-dashboard"]').should('be.visible')
        cy.get('[data-testid="user-menu"]').should('be.visible')
        
        // 3. Shift Feed Journey
        cy.navigateToShiftFeed()
        cy.get('[data-testid="shift-card"]').should('have.length.at.least', 1)
        
        // 4. Application Journey
        cy.get('[data-testid="button-apply-shift"]').first().click()
        cy.get('[data-testid="modal-shift-application"]').should('be.visible')
        cy.get('[data-testid="textarea-cover-letter"]').type('I am very interested in this shift opportunity.')
        cy.get('[data-testid="button-submit-application"]').click()
        cy.get('[data-testid="toast-success"]').should('contain', 'Application submitted successfully')
        
        // 5. Profile Journey
        cy.navigateToProfile()
        cy.get('[data-testid="profile-email"]').should('contain', 'journey-test@example.com')
        cy.get('[data-testid="profile-display-name"]').should('contain', 'Journey Test User')
        
        // 6. Applications Journey
        cy.navigateToApplications()
        cy.get('[data-testid="application-card"]').should('have.length.at.least', 1)
        cy.get('[data-testid="application-status"]').should('contain', 'Pending')
      })
    })

    it('should complete full shop user journey: login -> dashboard -> post shift -> manage applications', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const shopUser = data.users.shop
        const shiftData = data.shifts.seniorBarberWeekend
        
        // 1. Login Journey
        cy.loginAsUser('shop')
        cy.get('[data-testid="shop-dashboard"]').should('be.visible')
        
        // 2. Shift Posting Journey
        cy.get('[data-testid="button-post-shift"]').click()
        cy.get('[data-testid="modal-shift-posting"]').should('be.visible')
        cy.get('[data-testid="input-shift-title"]').type(shiftData.title)
        cy.get('[data-testid="textarea-shift-description"]').type(shiftData.description)
        cy.get('[data-testid="input-hourly-rate"]').type(shiftData.payRate.toString())
        cy.get('[data-testid="input-shift-location"]').type(shiftData.location.city)
        cy.get('[data-testid="button-submit-shift"]').click()
        cy.get('[data-testid="toast-success"]').should('contain', 'Shift posted successfully')
        
        // 3. Application Management Journey
        cy.get('[data-testid="tab-applications"]').click()
        cy.get('[data-testid="applications-section"]').should('be.visible')
        
        // 4. Profile Journey
        cy.navigateToProfile()
        cy.get('[data-testid="profile-email"]').should('contain', shopUser.email)
      })
    })

    it('should complete full admin user journey: login -> dashboard -> tournaments -> create -> manage', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const adminUser = data.users.admin
        
        // 1. Login Journey
        cy.loginAsUser('admin')
        cy.get('[data-testid="admin-dashboard"]').should('be.visible')
        
        // 2. Tournament Creation Journey
        cy.navigateToTournaments()
        cy.get('[data-testid="button-create-tournament"]').click()
        cy.get('[data-testid="modal-create-tournament"]').should('be.visible')
        cy.get('[data-testid="input-tournament-name"]').type('Journey Test Tournament')
        cy.get('[data-testid="textarea-tournament-description"]').type('Test tournament for journey-based testing')
        cy.get('[data-testid="select-tournament-type"]').click()
        cy.get('[data-testid="option-skill-competition"]').click()
        cy.get('[data-testid="input-registration-deadline"]').type('2025-02-01')
        cy.get('[data-testid="input-tournament-date"]').type('2025-02-15')
        cy.get('[data-testid="input-max-participants"]').type('20')
        cy.get('[data-testid="input-entry-fee"]').type('50')
        cy.get('[data-testid="button-submit-tournament"]').click()
        cy.get('[data-testid="toast-success"]').should('contain', 'Tournament created successfully')
        
        // 3. Tournament Management Journey
        cy.get('[data-testid="tournament-card"]').first().click()
        cy.get('[data-testid="tournament-management"]').should('be.visible')
        
        // 4. Profile Journey
        cy.navigateToProfile()
        cy.get('[data-testid="profile-email"]').should('contain', adminUser.email)
      })
    })
  })

  describe('Cross-Feature Integration Tests', () => {
    it('should test integration between shift marketplace and social features', () => {
      // Login as barber
      cy.loginAsUser('barber')
      
      // Navigate to shift feed
      cy.navigateToShiftFeed()
      
      // Apply for a shift
      cy.get('[data-testid="button-apply-shift"]').first().click()
      cy.get('[data-testid="modal-shift-application"]').should('be.visible')
      cy.get('[data-testid="textarea-cover-letter"]').type('I am very interested in this shift opportunity.')
      cy.get('[data-testid="button-submit-application"]').click()
      cy.get('[data-testid="toast-success"]').should('contain', 'Application submitted successfully')
      
      // Navigate to social feed
      cy.get('[data-testid="nav-social-feed"]').click()
      cy.url().should('include', '/social-feed')
      cy.get('[data-testid="social-feed"]').should('be.visible')
      
      // Verify social feed is accessible
      cy.get('[data-testid="social-post"]').should('have.length.at.least', 0)
    })

    it('should test integration between tournaments and profile management', () => {
      // Login as barber
      cy.loginAsUser('barber')
      
      // Navigate to tournaments
      cy.navigateToTournaments()
      
      // Register for tournament
      cy.get('[data-testid="button-register-tournament"]').first().click()
      cy.get('[data-testid="modal-register-tournament"]').should('be.visible')
      cy.get('[data-testid="textarea-why-participate"]').type('I want to showcase my skills.')
      cy.get('[data-testid="input-specialization"]').type('Fade Techniques')
      cy.get('[data-testid="input-years-experience"]').type('5')
      cy.get('[data-testid="button-submit-registration"]').click()
      cy.get('[data-testid="toast-success"]').should('contain', 'Tournament registration submitted successfully')
      
      // Navigate to profile to verify registration
      cy.navigateToProfile()
      cy.get('[data-testid="tab-tournament-registrations"]').click()
      cy.get('[data-testid="tournament-registration"]').should('have.length.at.least', 1)
    })
  })

  describe('Navigation Flow Tests', () => {
    it('should test complete navigation flow through all major sections', () => {
      // Login as barber
      cy.loginAsUser('barber')
      
      // Start from dashboard
      cy.get('[data-testid="barber-dashboard"]').should('be.visible')
      
      // Navigate through all major sections
      cy.navigateToShiftFeed()
      cy.get('[data-testid="shift-feed"]').should('be.visible')
      
      cy.navigateToTournaments()
      cy.get('[data-testid="tournaments-page"]').should('be.visible')
      
      cy.navigateToApplications()
      cy.get('[data-testid="applications-page"]').should('be.visible')
      
      cy.navigateToProfile()
      cy.get('[data-testid="profile-page"]').should('be.visible')
      
      // Navigate back to dashboard
      cy.get('[data-testid="nav-dashboard"]').click()
      cy.url().should('include', '/professional-dashboard')
      cy.get('[data-testid="professional-dashboard"]').should('be.visible')
    })

    it('should test navigation persistence and session management', () => {
      // Login as barber
      cy.loginAsUser('barber')
      
      // Navigate to shift feed
      cy.navigateToShiftFeed()
      
      // Refresh page
      cy.reload()
      
      // Should still be on shift feed
      cy.url().should('include', '/shift-feed')
      cy.get('[data-testid="shift-feed"]').should('be.visible')
      
      // Navigate to tournaments
      cy.navigateToTournaments()
      
      // Refresh page
      cy.reload()
      
      // Should still be on tournaments
      cy.url().should('include', '/tournaments')
      cy.get('[data-testid="tournaments-page"]').should('be.visible')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle navigation errors gracefully', () => {
      // Login as barber
      cy.loginAsUser('barber')
      
      // Try to navigate to non-existent page
      cy.visit('/non-existent-page')
      
      // Should redirect to dashboard or show 404
      cy.url().should('satisfy', (url) => {
        return url.includes('/barber-dashboard') || url.includes('/404')
      })
    })

    it('should handle session expiration during navigation', () => {
      // Login as barber
      cy.loginAsUser('barber')
      
      // Navigate to shift feed
      cy.navigateToShiftFeed()
      
      // Simulate session expiration
      cy.window().then((win) => {
        win.localStorage.removeItem('session')
        win.sessionStorage.removeItem('auth')
      })
      
      // Try to navigate to another page
      cy.navigateToTournaments()
      
      // Should redirect to login
      cy.url().should('include', '/login')
    })
  })
})
