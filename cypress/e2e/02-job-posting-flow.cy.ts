describe('Job Posting and Application Flow', () => {
  before(() => {
    // Clear any existing data
    cy.clearLocalStorage()
  })

  it('Hub user should be able to post a job', () => {
    cy.fixture('users').then((users) => {
      const testJob = users.testJob
      
      // Login as Hub user
      cy.quickLogin('hub')
      
      // Navigate to job posting
      cy.get('[data-testid="button-post-job"]').click()
      cy.get('[data-testid="modal-job-posting"]').should('be.visible')
      
      // Fill out job posting form
      cy.get('[data-testid="input-job-title"]').type(testJob.title)
      cy.get('[data-testid="textarea-job-description"]').type(testJob.description)
      cy.get('[data-testid="input-hourly-rate"]').type(testJob.hourlyRate.toString())
      cy.get('[data-testid="input-job-location"]').type(testJob.location)
      
      // Select skills
      cy.get('[data-testid="select-skills"]').click()
      testJob.skills.forEach(skill => {
        cy.get(`[data-testid="skill-${skill.toLowerCase().replace(' ', '-')}"]`).click()
      })
      
      // Select schedule
      cy.get('[data-testid="select-schedule"]').click()
      cy.get(`[data-testid="schedule-${testJob.schedule.toLowerCase().replace(' ', '-')}"]`).click()
      
      // Submit job posting
      cy.get('[data-testid="button-submit-job"]').click()
      
      // Verify job was created
      cy.get('[data-testid="toast-success"]').should('contain', 'Job posted successfully')
      cy.get('[data-testid="job-card"]').should('contain', testJob.title)
    })
  })

  it('Professional user should be able to view and apply for jobs', () => {
    cy.fixture('users').then((users) => {
      const testJob = users.testJob
      
      // Login as Professional user
      cy.quickLogin('professional')
      
      // Navigate to job feed
      cy.get('[data-testid="nav-job-feed"]').click()
      cy.waitForRoute('/job-feed')
      
      // Search for the test job
      cy.get('[data-testid="input-job-search"]').type(testJob.title)
      cy.get('[data-testid="button-search-jobs"]').click()
      
      // Find and click on the test job
      cy.get('[data-testid="job-card"]')
        .contains(testJob.title)
        .should('be.visible')
        .click()
      
      // Apply for the job
      cy.get('[data-testid="button-apply-job"]').click()
      cy.get('[data-testid="modal-job-application"]').should('be.visible')
      
      // Fill out application
      cy.get('[data-testid="textarea-cover-letter"]').type(
        'I am very interested in this position and believe my skills align perfectly with your requirements.'
      )
      
      // Submit application
      cy.get('[data-testid="button-submit-application"]').click()
      
      // Verify application was submitted
      cy.get('[data-testid="toast-success"]').should('contain', 'Application submitted')
      cy.get('[data-testid="button-apply-job"]').should('contain', 'Applied')
    })
  })

  it('Hub user should be able to view and manage applications', () => {
    // Login as Hub user
    cy.quickLogin('hub')
    
    // Navigate to applications
    cy.get('[data-testid="tab-applications"]').click()
    
    // Should see the application from Professional user
    cy.get('[data-testid="application-card"]').should('have.length.at.least', 1)
    cy.get('[data-testid="application-card"]').first().should('contain', 'Test Professional')
    
    // View application details
    cy.get('[data-testid="application-card"]').first().click()
    cy.get('[data-testid="modal-application-details"]').should('be.visible')
    
    // Approve the application
    cy.get('[data-testid="button-approve-application"]').click()
    cy.get('[data-testid="modal-approve-application"]').should('be.visible')
    cy.get('[data-testid="button-confirm-approval"]').click()
    
    // Verify application status updated
    cy.get('[data-testid="toast-success"]').should('contain', 'Application approved')
  })

  it('should display job filtering options', () => {
    cy.quickLogin('professional')
    cy.get('[data-testid="nav-job-feed"]').click()
    
    // Check filter options are available
    cy.get('[data-testid="filter-location"]').should('be.visible')
    cy.get('[data-testid="filter-pay-range"]').should('be.visible')
    cy.get('[data-testid="filter-skills"]').should('be.visible')
    cy.get('[data-testid="filter-schedule"]').should('be.visible')
    
    // Test location filter
    cy.get('[data-testid="input-location-filter"]').type('Sydney')
    cy.get('[data-testid="button-apply-filters"]').click()
    
    // Jobs should be filtered
    cy.get('[data-testid="job-results"]').should('contain', 'Sydney')
  })
})