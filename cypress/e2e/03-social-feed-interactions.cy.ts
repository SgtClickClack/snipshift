describe('Social Feed and Brand Interactions', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
  })

  it('Brand user should be able to create a promotional post', () => {
    cy.fixture('users').then((users) => {
      const testPost = users.testPost
      
      // Login as Brand user
      cy.quickLogin('brand')
      
      // Navigate to social post creation
      cy.get('[data-testid="button-create-post"]').click()
      cy.get('[data-testid="modal-create-post"]').should('be.visible')
      
      // Fill out post form
      cy.get('[data-testid="input-post-title"]').type(testPost.title)
      cy.get('[data-testid="textarea-post-content"]').type(testPost.content)
      
      // Add discount code
      cy.get('[data-testid="input-discount-code"]').type(testPost.discount)
      cy.get('[data-testid="input-discount-amount"]').type(testPost.discountAmount.toString())
      
      // Select post type
      cy.get('[data-testid="select-post-type"]').click()
      cy.get('[data-testid="option-product-launch"]').click()
      
      // Submit post
      cy.get('[data-testid="button-submit-post"]').click()
      
      // Verify post was created
      cy.get('[data-testid="toast-success"]').should('contain', 'Post created successfully')
      
      // Post should appear in pending posts (awaiting moderation)
      cy.get('[data-testid="tab-pending-posts"]').click()
      cy.get('[data-testid="post-card"]').should('contain', testPost.title)
    })
  })

  it('Admin should be able to review and approve brand posts', () => {
    // Login as admin first
    cy.quickLogin('admin')
    
    // Navigate to content moderation from admin dashboard
    cy.get('[data-testid="admin-dashboard"]').should('be.visible')
    cy.get('[data-testid="nav-content-moderation"]').click()
    
    // Should see pending posts
    cy.get('[data-testid="pending-posts"]').should('be.visible')
    cy.get('[data-testid="post-card"]').should('have.length.at.least', 1)
    
    // Review the first pending post
    cy.get('[data-testid="post-card"]').first().within(() => {
      cy.get('[data-testid="button-review-post"]').click()
    })
    
    // Post review modal should open
    cy.get('[data-testid="modal-review-post"]').should('be.visible')
    cy.get('[data-testid="post-preview"]').should('be.visible')
    
    // Approve the post
    cy.get('[data-testid="button-approve-post"]').click()
    cy.get('[data-testid="toast-success"]').should('contain', 'Post approved')
  })

  it('Users should be able to view approved posts in social feed', () => {
    cy.fixture('users').then((users) => {
      const testPost = users.testPost
      
      // Login as any user
      cy.quickLogin('professional')
      
      // Navigate to social feed
      cy.get('[data-testid="nav-social-feed"]').click()
      cy.waitForRoute('/social-feed')
      
      // Should see the approved post
      cy.get('[data-testid="post-card"]').should('contain', testPost.title)
      cy.get('[data-testid="post-card"]').should('contain', testPost.discount)
    })
  })

  it('Users should be able to interact with posts (like, comment)', () => {
    cy.fixture('users').then((users) => {
      const testPost = users.testPost
      
      // Login as Professional user
      cy.quickLogin('professional')
      cy.get('[data-testid="nav-social-feed"]').click()
      
      // Find the test post
      cy.get('[data-testid="post-card"]')
        .contains(testPost.title)
        .parent('[data-testid="post-card"]')
        .as('testPost')
      
      // Like the post
      cy.get('@testPost').within(() => {
        cy.get('[data-testid="button-like-post"]').click()
        cy.get('[data-testid="like-count"]').should('contain', '1')
      })
      
      // Comment on the post
      cy.get('@testPost').within(() => {
        cy.get('[data-testid="button-comment-post"]').click()
      })
      
      // Comment modal should open
      cy.get('[data-testid="modal-comment"]').should('be.visible')
      cy.get('[data-testid="textarea-comment"]').type('Great product! Looking forward to trying it.')
      cy.get('[data-testid="button-submit-comment"]').click()
      
      // Comment should appear
      cy.get('[data-testid="comment-card"]').should('contain', 'Great product!')
      cy.get('[data-testid="toast-success"]').should('contain', 'Comment added')
    })
  })

  it('Users should be able to filter social feed by post type', () => {
    cy.quickLogin('professional')
    cy.get('[data-testid="nav-social-feed"]').click()
    
    // Test filtering options
    cy.get('[data-testid="filter-post-type"]').should('be.visible')
    cy.get('[data-testid="filter-post-type"]').click()
    
    // Filter by product launches
    cy.get('[data-testid="option-product-launch"]').click()
    cy.get('[data-testid="button-apply-filter"]').click()
    
    // Should only show product launch posts
    cy.get('[data-testid="post-card"]').each(($post) => {
      cy.wrap($post).should('contain.data', 'post-type', 'product-launch')
    })
  })

  it('Brand users should be able to view post analytics', () => {
    cy.quickLogin('brand')
    
    // Navigate to analytics
    cy.get('[data-testid="tab-analytics"]').click()
    
    // Should see post performance metrics
    cy.get('[data-testid="analytics-dashboard"]').should('be.visible')
    cy.get('[data-testid="metric-total-likes"]').should('be.visible')
    cy.get('[data-testid="metric-total-comments"]').should('be.visible')
    cy.get('[data-testid="metric-discount-redemptions"]').should('be.visible')
    
    // Should show individual post performance
    cy.get('[data-testid="post-analytics-card"]').should('have.length.at.least', 1)
  })
})