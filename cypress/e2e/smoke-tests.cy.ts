describe('Smoke Tests - SnipShift V2 Journey-Based Testing', () => {
  beforeEach(() => {
    // Login once at the beginning of each test
    cy.login()
  })

  describe('Core Navigation Journeys', () => {
    it('should navigate from dashboard to shift feed and back', () => {
      // Start from dashboard (where cy.login() leaves us)
      cy.get('[data-testid="barber-dashboard"]').should('be.visible')
      
      // Navigate to shift feed
      cy.navigateToShiftFeed()
      
      // Verify shift feed content
      cy.get('[data-testid="shift-card"]').should('have.length.at.least', 1)
      
      // Navigate back to dashboard
      cy.get('[data-testid="nav-dashboard"]').click()
      cy.url().should('include', '/barber-dashboard')
      cy.get('[data-testid="barber-dashboard"]').should('be.visible')
    })

    it('should navigate from dashboard to tournaments page', () => {
      // Start from dashboard
      cy.get('[data-testid="barber-dashboard"]').should('be.visible')
      
      // Navigate to tournaments
      cy.navigateToTournaments()
      
      // Verify tournaments page content
      cy.get('[data-testid="tournament-card"]').should('have.length.at.least', 1)
      cy.get('[data-testid="tournament-name"]').should('be.visible')
    })

    it('should navigate from dashboard to profile page', () => {
      // Start from dashboard
      cy.get('[data-testid="barber-dashboard"]').should('be.visible')
      
      // Navigate to profile
      cy.navigateToProfile()
      
      // Verify profile page content
      cy.get('[data-testid="profile-email"]').should('be.visible')
      cy.get('[data-testid="profile-display-name"]').should('be.visible')
    })

    it('should navigate from dashboard to applications page', () => {
      // Start from dashboard
      cy.get('[data-testid="barber-dashboard"]').should('be.visible')
      
      // Navigate to applications
      cy.navigateToApplications()
      
      // Verify applications page content
      cy.get('[data-testid="application-card"]').should('have.length.at.least', 0) // May be empty for new users
    })

    it('should verify all navigation elements are present on dashboard', () => {
      // Start from dashboard
      cy.get('[data-testid="barber-dashboard"]').should('be.visible')
      
      // Verify navigation elements
      cy.verifyNavigationElements()
    })
  })

  describe('Shift Feed Journey', () => {
    it('should navigate to shift feed and view shift details', () => {
      // Navigate to shift feed
      cy.navigateToShiftFeed()
      
      // Click on first shift to view details
      cy.get('[data-testid="shift-card"]').first().click()
      cy.get('[data-testid="modal-shift-details"]').should('be.visible')
      
      // Verify shift details
      cy.get('[data-testid="shift-detail-title"]').should('be.visible')
      cy.get('[data-testid="shift-detail-description"]').should('be.visible')
      cy.get('[data-testid="shift-detail-location"]').should('be.visible')
      cy.get('[data-testid="shift-detail-pay"]').should('be.visible')
      
      // Close modal
      cy.get('[data-testid="button-close-modal"]').click()
      cy.get('[data-testid="modal-shift-details"]').should('not.exist')
    })

    it('should navigate to shift feed and apply for a shift', () => {
      // Navigate to shift feed
      cy.navigateToShiftFeed()
      
      // Apply for first shift
      cy.get('[data-testid="button-apply-shift"]').first().click()
      cy.get('[data-testid="modal-shift-application"]').should('be.visible')
      
      // Fill cover letter
      cy.get('[data-testid="textarea-cover-letter"]').type('I am very interested in this shift opportunity.')
      
      // Submit application
      cy.get('[data-testid="button-submit-application"]').click()
      
      // Verify success message
      cy.get('[data-testid="toast-success"]').should('contain', 'Application submitted successfully')
    })

    it('should navigate to shift feed and filter shifts', () => {
      // Navigate to shift feed
      cy.navigateToShiftFeed()
      
      // Apply location filter
      cy.get('[data-testid="filter-location"]').click()
      cy.get('[data-testid="input-location-filter"]').type('Sydney')
      cy.get('[data-testid="button-apply-location-filter"]').click()
      
      // Verify filtered results
      cy.get('[data-testid="shift-results"]').should('contain', 'Sydney')
      
      // Clear filters
      cy.get('[data-testid="button-clear-filters"]').click()
      cy.get('[data-testid="input-location-filter"]').should('have.value', '')
    })
  })

  describe('Tournament Journey', () => {
    it('should navigate to tournaments and view tournament details', () => {
      // Navigate to tournaments
      cy.navigateToTournaments()
      
      // Click on first tournament
      cy.get('[data-testid="tournament-card"]').first().click()
      cy.get('[data-testid="tournament-details"]').should('be.visible')
      
      // Verify tournament details
      cy.get('[data-testid="tournament-name"]').should('be.visible')
      cy.get('[data-testid="tournament-date"]').should('be.visible')
      cy.get('[data-testid="tournament-prize"]').should('be.visible')
      cy.get('[data-testid="tournament-participants"]').should('be.visible')
    })

    it('should navigate to tournaments and register for a tournament', () => {
      // Navigate to tournaments
      cy.navigateToTournaments()
      
      // Register for first tournament
      cy.get('[data-testid="button-register-tournament"]').first().click()
      cy.get('[data-testid="modal-register-tournament"]').should('be.visible')
      
      // Fill registration details
      cy.get('[data-testid="textarea-why-participate"]').type('I want to showcase my skills and learn from other professionals.')
      cy.get('[data-testid="input-specialization"]').type('Fade Techniques and Beard Styling')
      cy.get('[data-testid="input-years-experience"]').type('7')
      
      // Submit registration
      cy.get('[data-testid="button-submit-registration"]').click()
      
      // Verify success message
      cy.get('[data-testid="toast-success"]').should('contain', 'Tournament registration submitted successfully')
    })
  })

  describe('Profile Management Journey', () => {
    it('should navigate to profile and view profile information', () => {
      // Navigate to profile
      cy.navigateToProfile()
      
      // Verify profile information
      cy.get('[data-testid="profile-email"]').should('be.visible')
      cy.get('[data-testid="profile-display-name"]').should('be.visible')
      cy.get('[data-testid="profile-role"]').should('contain', 'Barber')
    })

    it('should navigate to profile and edit profile information', () => {
      // Navigate to profile
      cy.navigateToProfile()
      
      // Edit profile
      cy.get('[data-testid="button-edit-profile"]').click()
      cy.get('[data-testid="input-display-name"]').clear().type('Updated Test Name')
      cy.get('[data-testid="button-save-profile"]').click()
      
      // Verify success message
      cy.get('[data-testid="toast-success"]').should('contain', 'Profile updated successfully')
      cy.get('[data-testid="profile-display-name"]').should('contain', 'Updated Test Name')
    })

    it('should navigate to profile and view qualifications', () => {
      // Navigate to profile
      cy.navigateToProfile()
      
      // Go to qualifications tab
      cy.get('[data-testid="tab-qualifications"]').click()
      cy.get('[data-testid="qualifications-section"]').should('be.visible')
      
      // Verify qualifications interface
      cy.get('[data-testid="input-qualification-document"]').should('be.visible')
      cy.get('[data-testid="button-upload-qualification"]').should('be.visible')
    })
  })

  describe('Application Management Journey', () => {
    it('should navigate to applications and view application status', () => {
      // Navigate to applications
      cy.navigateToApplications()
      
      // Verify applications page
      cy.get('[data-testid="applications-page"]').should('be.visible')
      
      // Check if there are any applications
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="application-card"]').length > 0) {
          // If applications exist, verify their structure
          cy.get('[data-testid="application-card"]').first().within(() => {
            cy.get('[data-testid="application-status"]').should('be.visible')
            cy.get('[data-testid="application-shift-title"]').should('be.visible')
            cy.get('[data-testid="application-date"]').should('be.visible')
          })
        } else {
          // If no applications, verify empty state
          cy.get('[data-testid="empty-applications"]').should('be.visible')
        }
      })
    })
  })

  describe('Cross-Feature Navigation Journey', () => {
    it('should complete a full user journey: dashboard -> shift feed -> apply -> applications', () => {
      // Start from dashboard
      cy.get('[data-testid="barber-dashboard"]').should('be.visible')
      
      // Navigate to shift feed
      cy.navigateToShiftFeed()
      
      // Apply for a shift
      cy.get('[data-testid="button-apply-shift"]').first().click()
      cy.get('[data-testid="modal-shift-application"]').should('be.visible')
      cy.get('[data-testid="textarea-cover-letter"]').type('I am very interested in this shift opportunity.')
      cy.get('[data-testid="button-submit-application"]').click()
      cy.get('[data-testid="toast-success"]').should('contain', 'Application submitted successfully')
      
      // Navigate to applications to verify
      cy.navigateToApplications()
      
      // Verify application appears
      cy.get('[data-testid="application-card"]').should('have.length.at.least', 1)
      cy.get('[data-testid="application-status"]').should('contain', 'Pending')
    })

    it('should complete a tournament journey: dashboard -> tournaments -> register -> profile', () => {
      // Start from dashboard
      cy.get('[data-testid="barber-dashboard"]').should('be.visible')
      
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

  describe('Error Handling and Edge Cases', () => {
    it('should handle navigation to non-existent pages gracefully', () => {
      // Inject a broken link the way a user might encounter it and click through
      cy.document().then((doc) => {
        const brokenLink = doc.createElement('a')
        brokenLink.href = '/non-existent-page'
        brokenLink.innerText = 'Broken Link Test'
        brokenLink.setAttribute('data-testid', 'broken-link')
        doc.body.appendChild(brokenLink)
      })

      cy.get('[data-testid="broken-link"]').click()

      // Should redirect to dashboard or show 404
      cy.location('pathname').should((pathname) => {
        expect(pathname.includes('/barber-dashboard') || pathname.includes('/404')).to.be.true
      })
    })

    it('should maintain session across page refreshes', () => {
      // Verify we're logged in
      cy.get('[data-testid="user-menu"]').should('be.visible')
      
      // Refresh page
      cy.reload()
      
      // Should still be logged in
      cy.get('[data-testid="user-menu"]').should('be.visible')
      cy.get('[data-testid="barber-dashboard"]').should('be.visible')
    })
  })
})
