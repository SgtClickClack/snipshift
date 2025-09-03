describe('Training Hub and Content Management', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
  })

  it('Trainer should be able to upload training content', () => {
    cy.quickLogin('trainer')
    
    // Navigate to content upload
    cy.get('[data-testid="button-upload-content"]').click()
    cy.get('[data-testid="modal-upload-content"]').should('be.visible')
    
    // Fill out content form
    cy.get('[data-testid="input-content-title"]').type('Advanced Beard Styling Techniques')
    cy.get('[data-testid="textarea-content-description"]').type(
      'Learn professional beard styling and shaping techniques used in top barbershops.'
    )
    
    // Set pricing
    cy.get('[data-testid="select-pricing-type"]').click()
    cy.get('[data-testid="option-paid"]').click()
    cy.get('[data-testid="input-content-price"]').type('49.99')
    
    // Select skill level
    cy.get('[data-testid="select-skill-level"]').click()
    cy.get('[data-testid="option-intermediate"]').click()
    
    // Select category
    cy.get('[data-testid="select-category"]').click()
    cy.get('[data-testid="option-beard-care"]').click()
    
    // Submit content
    cy.get('[data-testid="button-submit-content"]').click()
    
    // Verify content was created
    cy.get('[data-testid="toast-success"]').should('contain', 'Content uploaded successfully')
  })

  it('Users should be able to browse training content', () => {
    cy.quickLogin('professional')
    
    // Navigate to training hub
    cy.get('[data-testid="nav-training-hub"]').click()
    cy.waitForRoute('/training-hub')
    
    // Should see content library
    cy.get('[data-testid="content-library"]').should('be.visible')
    cy.get('[data-testid="content-card"]').should('have.length.at.least', 1)
    
    // Check content card information
    cy.get('[data-testid="content-card"]').first().within(() => {
      cy.get('[data-testid="content-title"]').should('be.visible')
      cy.get('[data-testid="content-price"]').should('be.visible')
      cy.get('[data-testid="content-instructor"]').should('be.visible')
      cy.get('[data-testid="content-rating"]').should('be.visible')
    })
  })

  it('Users should be able to filter training content', () => {
    cy.quickLogin('professional')
    cy.get('[data-testid="nav-training-hub"]').click()
    
    // Test category filter
    cy.get('[data-testid="filter-category"]').click()
    cy.get('[data-testid="option-beard-care"]').click()
    cy.get('[data-testid="button-apply-filters"]').click()
    
    // Should show only beard care content
    cy.get('[data-testid="content-card"]').each(($card) => {
      cy.wrap($card).should('contain.data', 'category', 'beard-care')
    })
    
    // Test skill level filter
    cy.get('[data-testid="filter-skill-level"]').click()
    cy.get('[data-testid="option-beginner"]').click()
    cy.get('[data-testid="button-apply-filters"]').click()
    
    // Test price filter
    cy.get('[data-testid="filter-price"]').click()
    cy.get('[data-testid="option-free"]').click()
    cy.get('[data-testid="button-apply-filters"]').click()
    
    // Should show only free content
    cy.get('[data-testid="content-card"]').each(($card) => {
      cy.wrap($card).within(() => {
        cy.get('[data-testid="content-price"]').should('contain', 'Free')
      })
    })
  })

  it('Users should be able to purchase paid content', () => {
    cy.quickLogin('professional')
    cy.get('[data-testid="nav-training-hub"]').click()
    
    // Find a paid content item
    cy.get('[data-testid="content-card"]').contains('$').first().click()
    
    // Content details modal should open
    cy.get('[data-testid="modal-content-details"]').should('be.visible')
    cy.get('[data-testid="content-preview"]').should('be.visible')
    
    // Click purchase button
    cy.get('[data-testid="button-purchase-content"]').click()
    
    // Mock payment modal should open
    cy.get('[data-testid="modal-payment"]').should('be.visible')
    cy.get('[data-testid="payment-form"]').should('be.visible')
    
    // Fill out mock payment details
    cy.get('[data-testid="input-card-number"]').type('4242424242424242')
    cy.get('[data-testid="input-expiry"]').type('12/25')
    cy.get('[data-testid="input-cvv"]').type('123')
    cy.get('[data-testid="input-cardholder-name"]').type('Test User')
    
    // Submit payment
    cy.get('[data-testid="button-submit-payment"]').click()
    
    // Should see success message
    cy.get('[data-testid="toast-success"]').should('contain', 'Purchase successful')
    
    // Content should now be accessible
    cy.get('[data-testid="button-watch-content"]').should('be.visible')
  })

  it('Users should be able to track their learning progress', () => {
    cy.quickLogin('professional')
    cy.get('[data-testid="nav-training-hub"]').click()
    
    // Go to purchased/enrolled content
    cy.get('[data-testid="tab-my-learning"]').click()
    
    // Should see enrolled courses
    cy.get('[data-testid="enrolled-content"]').should('be.visible')
    cy.get('[data-testid="content-progress-card"]').should('have.length.at.least', 1)
    
    // Check progress information
    cy.get('[data-testid="content-progress-card"]').first().within(() => {
      cy.get('[data-testid="progress-bar"]').should('be.visible')
      cy.get('[data-testid="progress-percentage"]').should('be.visible')
      cy.get('[data-testid="last-watched"]').should('be.visible')
    })
    
    // Continue watching content
    cy.get('[data-testid="button-continue-watching"]').first().click()
    
    // Video player should open
    cy.get('[data-testid="video-player"]').should('be.visible')
    cy.get('[data-testid="video-controls"]').should('be.visible')
  })

  it('Trainers should be able to view content analytics', () => {
    cy.quickLogin('trainer')
    
    // Navigate to trainer analytics
    cy.get('[data-testid="tab-analytics"]').click()
    
    // Should see content performance metrics
    cy.get('[data-testid="analytics-dashboard"]').should('be.visible')
    cy.get('[data-testid="metric-total-students"]').should('be.visible')
    cy.get('[data-testid="metric-total-revenue"]').should('be.visible')
    cy.get('[data-testid="metric-completion-rate"]').should('be.visible')
    
    // Should show individual content performance
    cy.get('[data-testid="content-analytics-card"]').should('have.length.at.least', 1)
    
    // Check detailed analytics for content
    cy.get('[data-testid="content-analytics-card"]').first().click()
    cy.get('[data-testid="modal-detailed-analytics"]').should('be.visible')
    
    // Should show charts and detailed metrics
    cy.get('[data-testid="enrollment-chart"]').should('be.visible')
    cy.get('[data-testid="completion-chart"]').should('be.visible')
    cy.get('[data-testid="revenue-chart"]').should('be.visible')
  })

  it('Admin should be able to review training content', () => {
    cy.visit('/content-moderation')
    
    // Should see pending training content
    cy.get('[data-testid="tab-training-content"]').click()
    cy.get('[data-testid="pending-content-list"]').should('be.visible')
    
    // Review content item
    cy.get('[data-testid="content-review-card"]').first().within(() => {
      cy.get('[data-testid="button-review-content"]').click()
    })
    
    // Content review modal should open
    cy.get('[data-testid="modal-content-review"]').should('be.visible')
    cy.get('[data-testid="content-preview"]').should('be.visible')
    
    // Approve content
    cy.get('[data-testid="button-approve-content"]').click()
    cy.get('[data-testid="toast-success"]').should('contain', 'Content approved')
  })
})