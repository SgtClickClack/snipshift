describe('Social Features & Community - SnipShift V2', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  describe('Journey-Based Social Features Tests', () => {
    it('should complete brand user social journey: login -> social feed -> create post -> view engagement', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const brandUser = data.users.brand
        const postData = data.socialPosts.brandPromotion
        
        // Login as brand user
        cy.loginAsUser('brand')
        
        // Start from brand dashboard
        cy.get('[data-testid="brand-dashboard"]').should('be.visible')
        
        // Navigate to social feed
        cy.get('[data-testid="nav-social-feed"]').click()
        cy.url().should('include', '/social-feed')
        cy.get('[data-testid="social-feed"]').should('be.visible')
        
        // Create new post
        cy.get('[data-testid="button-create-post"]').click()
        cy.get('[data-testid="modal-create-post"]').should('be.visible')
        
        // Fill post content
        cy.get('[data-testid="textarea-post-content"]').type(postData.content)
        cy.get('[data-testid="input-post-link"]').type(postData.linkUrl)
        
        // Submit post
        cy.get('[data-testid="button-submit-post"]').click()
        
        // Verify success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Post submitted for review')
        
        // Navigate to view post engagement
        cy.get('[data-testid="tab-my-posts"]').click()
        cy.get('[data-testid="my-post"]').should('have.length.at.least', 1)
      })
    })

    it('should complete barber user social journey: login -> social feed -> view posts -> interact', () => {
      // Login as barber
      cy.loginAsUser('barber')
      
      // Start from barber dashboard
      cy.get('[data-testid="barber-dashboard"]').should('be.visible')
      
      // Navigate to social feed
      cy.get('[data-testid="nav-social-feed"]').click()
      cy.url().should('include', '/social-feed')
      cy.get('[data-testid="social-feed"]').should('be.visible')
      
      // View posts
      cy.get('[data-testid="social-post"]').should('have.length.at.least', 1)
      
      // Interact with first post
      cy.get('[data-testid="button-like-post"]').first().click()
      cy.get('[data-testid="like-count"]').should('contain', '1')
      
      // Add comment
      cy.get('[data-testid="button-comment"]').first().click()
      cy.get('[data-testid="textarea-comment"]').type('Great post!')
      cy.get('[data-testid="button-submit-comment"]').click()
      
      // Verify comment appears
      cy.get('[data-testid="comment"]').should('contain', 'Great post!')
    })

    it('should complete community discovery journey: dashboard -> social feed -> discover -> follow', () => {
      // Login as barber
      cy.loginAsUser('barber')
      
      // Start from dashboard
      cy.get('[data-testid="barber-dashboard"]').should('be.visible')
      
      // Navigate to social feed
      cy.get('[data-testid="nav-social-feed"]').click()
      
      // Navigate to discover section
      cy.get('[data-testid="tab-discover"]').click()
      cy.get('[data-testid="discover-section"]').should('be.visible')
      
      // Follow a brand
      cy.get('[data-testid="brand-card"]').first().within(() => {
        cy.get('[data-testid="button-follow-brand"]').click()
      })
      
      // Verify follow success
      cy.get('[data-testid="toast-success"]').should('contain', 'Following')
      
      // Navigate to following section
      cy.get('[data-testid="tab-following"]').click()
      cy.get('[data-testid="following-list"]').should('be.visible')
    })
  })

  describe('Social Feed', () => {
    it('should allow brand users to create promotional posts with images and links', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const brandUser = data.users.brand
        const postData = data.socialPosts.brandPromotion
        
        // Login as brand user
        cy.login(brandUser.email, brandUser.password)
        
        // Navigate to social feed
        cy.get('[data-testid="nav-social-feed"]').click()
        
        // Create new post
        cy.get('[data-testid="button-create-post"]').click()
        cy.get('[data-testid="modal-create-post"]').should('be.visible')
        
        // Select post type
        cy.get('[data-testid="select-post-type"]').click()
        cy.get('[data-testid="option-discount"]').click()
        
        // Fill post content
        cy.get('[data-testid="textarea-post-content"]').type(postData.content)
        
        // Upload image
        cy.get('[data-testid="input-post-image"]').selectFile('cypress/fixtures/promotional-image.jpg')
        cy.get('[data-testid="image-preview"]').should('be.visible')
        
        // Add link
        cy.get('[data-testid="input-post-link"]').type(postData.linkUrl)
        
        // Add discount details
        cy.get('[data-testid="input-discount-code"]').type(postData.discountCode)
        cy.get('[data-testid="input-discount-percentage"]').type(postData.discountPercentage.toString())
        cy.get('[data-testid="input-valid-until"]').type('2025-02-01')
        
        // Submit post
        cy.get('[data-testid="button-submit-post"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Post submitted for review')
        cy.get('[data-testid="post-status"]').should('contain', 'Pending Approval')
      })
    })

    it('should allow trainer users to create educational content and event announcements', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const trainerUser = data.users.trainer
        const postData = data.socialPosts.trainingEvent
        
        // Login as trainer user
        cy.login(trainerUser.email, trainerUser.password)
        
        // Navigate to social feed
        cy.get('[data-testid="nav-social-feed"]').click()
        
        // Create new post
        cy.get('[data-testid="button-create-post"]').click()
        
        // Select event post type
        cy.get('[data-testid="select-post-type"]').click()
        cy.get('[data-testid="option-event"]').click()
        
        // Fill post content
        cy.get('[data-testid="textarea-post-content"]').type(postData.content)
        
        // Upload image
        cy.get('[data-testid="input-post-image"]').selectFile('cypress/fixtures/training-event-image.jpg')
        
        // Add event details
        cy.get('[data-testid="input-event-date"]').type('2025-02-15')
        cy.get('[data-testid="input-event-time"]').type('09:00')
        cy.get('[data-testid="input-event-location"]').type(postData.location)
        
        // Submit post
        cy.get('[data-testid="button-submit-post"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Event post submitted for review')
      })
    })

    it('should allow all users to view social feed with relevant content', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to social feed
        cy.get('[data-testid="nav-social-feed"]').click()
        
        // Should see social feed
        cy.get('[data-testid="social-feed"]').should('be.visible')
        cy.get('[data-testid="post-card"]').should('have.length.at.least', 1)
        
        // Each post should display key information
        cy.get('[data-testid="post-card"]').first().within(() => {
          cy.get('[data-testid="post-author"]').should('be.visible')
          cy.get('[data-testid="post-content"]').should('be.visible')
          cy.get('[data-testid="post-timestamp"]').should('be.visible')
          cy.get('[data-testid="post-type"]').should('be.visible')
          cy.get('[data-testid="button-like"]').should('be.visible')
          cy.get('[data-testid="button-comment"]').should('be.visible')
        })
      })
    })

    it('should allow users to like and comment on social posts', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to social feed
        cy.get('[data-testid="nav-social-feed"]').click()
        
        // Like first post
        cy.get('[data-testid="button-like"]').first().click()
        cy.get('[data-testid="like-count"]').should('contain', '1')
        cy.get('[data-testid="button-like"]').should('have.class', 'liked')
        
        // Comment on first post
        cy.get('[data-testid="button-comment"]').first().click()
        cy.get('[data-testid="comment-input"]').type('Great offer! Looking forward to trying these products.')
        cy.get('[data-testid="button-submit-comment"]').click()
        
        // Should show comment
        cy.get('[data-testid="comment-item"]').should('contain', 'Great offer! Looking forward to trying these products.')
        cy.get('[data-testid="comment-count"]').should('contain', '1')
      })
    })

    it('should allow users to share posts with other users', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to social feed
        cy.get('[data-testid="nav-social-feed"]').click()
        
        // Share first post
        cy.get('[data-testid="button-share"]').first().click()
        cy.get('[data-testid="modal-share-post"]').should('be.visible')
        
        // Add share message
        cy.get('[data-testid="textarea-share-message"]').type('Check out this great deal!')
        
        // Select recipients
        cy.get('[data-testid="input-recipients"]').type('test@example.com')
        cy.get('[data-testid="button-add-recipient"]').click()
        
        // Send share
        cy.get('[data-testid="button-send-share"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Post shared successfully')
      })
    })

    it('should allow users to filter feed by content type', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to social feed
        cy.get('[data-testid="nav-social-feed"]').click()
        
        // Filter by offers
        cy.get('[data-testid="filter-offers"]').click()
        cy.get('[data-testid="post-card"]').each(($post) => {
          cy.wrap($post).within(() => {
            cy.get('[data-testid="post-type"]').should('contain', 'Offer')
          })
        })
        
        // Filter by events
        cy.get('[data-testid="filter-events"]').click()
        cy.get('[data-testid="post-card"]').each(($post) => {
          cy.wrap($post).within(() => {
            cy.get('[data-testid="post-type"]').should('contain', 'Event')
          })
        })
        
        // Show all posts
        cy.get('[data-testid="filter-all"]').click()
        cy.get('[data-testid="post-card"]').should('have.length.at.least', 1)
      })
    })

    it('should allow users to follow/unfollow brands and trainers', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to social feed
        cy.get('[data-testid="nav-social-feed"]').click()
        
        // Follow first brand/trainer
        cy.get('[data-testid="button-follow"]').first().click()
        cy.get('[data-testid="follow-status"]').should('contain', 'Following')
        cy.get('[data-testid="button-follow"]').should('contain', 'Unfollow')
        
        // Unfollow
        cy.get('[data-testid="button-follow"]').first().click()
        cy.get('[data-testid="follow-status"]').should('contain', 'Not Following')
        cy.get('[data-testid="button-follow"]').should('contain', 'Follow')
      })
    })

    it('should notify users of new posts from followed accounts', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Follow a brand
        cy.get('[data-testid="nav-social-feed"]').click()
        cy.get('[data-testid="button-follow"]').first().click()
        
        // Check notifications
        cy.get('[data-testid="notification-bell"]').click()
        cy.get('[data-testid="notification-dropdown"]').should('be.visible')
        
        // Should see new post notification
        cy.get('[data-testid="notification-item"]').should('contain', 'New Post')
        cy.get('[data-testid="notification-message"]').should('contain', 'posted a new')
        
        // Click notification to view post
        cy.get('[data-testid="notification-item"]').first().click()
        cy.get('[data-testid="post-card"]').should('be.visible')
      })
    })

    it('should display brand posts with discount codes and promotional offers', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to social feed
        cy.get('[data-testid="nav-social-feed"]').click()
        
        // Filter by offers
        cy.get('[data-testid="filter-offers"]').click()
        
        // Should see promotional posts
        cy.get('[data-testid="post-card"]').first().within(() => {
          cy.get('[data-testid="post-type"]').should('contain', 'Offer')
          cy.get('[data-testid="discount-code"]').should('be.visible')
          cy.get('[data-testid="discount-percentage"]').should('be.visible')
          cy.get('[data-testid="valid-until"]').should('be.visible')
          cy.get('[data-testid="button-use-discount"]').should('be.visible')
        })
        
        // Click discount code
        cy.get('[data-testid="button-copy-discount"]').click()
        cy.get('[data-testid="toast-success"]').should('contain', 'Discount code copied')
      })
    })

    it('should display trainer posts with event dates and registration links', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to social feed
        cy.get('[data-testid="nav-social-feed"]').click()
        
        // Filter by events
        cy.get('[data-testid="filter-events"]').click()
        
        // Should see event posts
        cy.get('[data-testid="post-card"]').first().within(() => {
          cy.get('[data-testid="post-type"]').should('contain', 'Event')
          cy.get('[data-testid="event-date"]').should('be.visible')
          cy.get('[data-testid="event-time"]').should('be.visible')
          cy.get('[data-testid="event-location"]').should('be.visible')
          cy.get('[data-testid="button-register"]').should('be.visible')
        })
        
        // Register for event
        cy.get('[data-testid="button-register"]').click()
        cy.get('[data-testid="modal-event-registration"]').should('be.visible')
        cy.get('[data-testid="button-confirm-registration"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Registered for event successfully')
      })
    })
  })

  describe('Content Moderation', () => {
    it('should require admin approval for all social posts before publication', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const brandUser = data.users.brand
        
        // Login as brand user
        cy.login(brandUser.email, brandUser.password)
        
        // Create post
        cy.get('[data-testid="nav-social-feed"]').click()
        cy.get('[data-testid="button-create-post"]').click()
        cy.get('[data-testid="textarea-post-content"]').type('Test promotional post')
        cy.get('[data-testid="button-submit-post"]').click()
        
        // Should show pending status
        cy.get('[data-testid="post-status"]').should('contain', 'Pending Approval')
        cy.get('[data-testid="pending-message"]').should('contain', 'Your post is under review')
        
        // Should not appear in public feed yet
        cy.get('[data-testid="nav-social-feed"]').click()
        cy.get('[data-testid="post-card"]').should('not.contain', 'Test promotional post')
      })
    })

    it('should allow admin users to view pending posts in moderation queue', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const adminUser = data.users.admin
        
        // Login as admin
        cy.login(adminUser.email, adminUser.password)
        
        // Go to admin panel
        cy.visit('/admin')
        cy.get('[data-testid="tab-content-moderation"]').click()
        
        // Should see pending posts
        cy.get('[data-testid="pending-post"]').should('have.length.at.least', 1)
        
        // Each pending post should show details
        cy.get('[data-testid="pending-post"]').first().within(() => {
          cy.get('[data-testid="post-content"]').should('be.visible')
          cy.get('[data-testid="post-author"]').should('be.visible')
          cy.get('[data-testid="post-type"]').should('be.visible')
          cy.get('[data-testid="submission-date"]').should('be.visible')
          cy.get('[data-testid="button-approve"]').should('be.visible')
          cy.get('[data-testid="button-reject"]').should('be.visible')
        })
      })
    })

    it('should allow admin users to approve or reject posts with reasons', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const adminUser = data.users.admin
        
        // Login as admin
        cy.login(adminUser.email, adminUser.password)
        
        // Go to admin panel
        cy.visit('/admin')
        cy.get('[data-testid="tab-content-moderation"]').click()
        
        // Approve first post
        cy.get('[data-testid="button-approve"]').first().click()
        cy.get('[data-testid="modal-approve-post"]').should('be.visible')
        cy.get('[data-testid="textarea-approval-notes"]').type('Content approved - follows community guidelines')
        cy.get('[data-testid="button-confirm-approval"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Post approved successfully')
        
        // Reject second post
        cy.get('[data-testid="button-reject"]').first().click()
        cy.get('[data-testid="modal-reject-post"]').should('be.visible')
        cy.get('[data-testid="textarea-rejection-reason"]').type('Content violates community guidelines - inappropriate language')
        cy.get('[data-testid="button-confirm-rejection"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Post rejected successfully')
      })
    })

    it('should allow admin users to edit posts before approval', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const adminUser = data.users.admin
        
        // Login as admin
        cy.login(adminUser.email, adminUser.password)
        
        // Go to admin panel
        cy.visit('/admin')
        cy.get('[data-testid="tab-content-moderation"]').click()
        
        // Edit first post
        cy.get('[data-testid="button-edit-post"]').first().click()
        cy.get('[data-testid="modal-edit-post"]').should('be.visible')
        
        // Modify content
        cy.get('[data-testid="textarea-post-content"]').clear().type('Edited content - approved by admin')
        
        // Save changes
        cy.get('[data-testid="button-save-edits"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Post edited successfully')
        
        // Should show edited content
        cy.get('[data-testid="post-content"]').should('contain', 'Edited content - approved by admin')
      })
    })

    it('should notify users when posts are approved or rejected', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const brandUser = data.users.brand
        
        // Login as brand user
        cy.login(brandUser.email, brandUser.password)
        
        // Check notifications
        cy.get('[data-testid="notification-bell"]').click()
        cy.get('[data-testid="notification-dropdown"]').should('be.visible')
        
        // Should see post approval/rejection notifications
        cy.get('[data-testid="notification-item"]').should('contain', 'Post Update')
        cy.get('[data-testid="notification-message"]').should('contain', 'Your post has been')
        
        // Click notification to view details
        cy.get('[data-testid="notification-item"]').first().click()
        cy.get('[data-testid="post-status"]').should('be.visible')
      })
    })

    it('should automatically flag inappropriate content', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const brandUser = data.users.brand
        
        // Login as brand user
        cy.login(brandUser.email, brandUser.password)
        
        // Create post with inappropriate content
        cy.get('[data-testid="nav-social-feed"]').click()
        cy.get('[data-testid="button-create-post"]').click()
        cy.get('[data-testid="textarea-post-content"]').type('This post contains inappropriate language and should be flagged')
        cy.get('[data-testid="button-submit-post"]').click()
        
        // Should show flagged status
        cy.get('[data-testid="post-status"]').should('contain', 'Flagged for Review')
        cy.get('[data-testid="flagged-message"]').should('contain', 'Content flagged for manual review')
        
        // Should appear in admin flagged queue
        cy.login(data.users.admin.email, data.users.admin.password)
        cy.visit('/admin')
        cy.get('[data-testid="tab-flagged-content"]').click()
        cy.get('[data-testid="flagged-post"]').should('contain', 'inappropriate language')
      })
    })

    it('should allow users to report inappropriate posts', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to social feed
        cy.get('[data-testid="nav-social-feed"]').click()
        
        // Report first post
        cy.get('[data-testid="button-report"]').first().click()
        cy.get('[data-testid="modal-report-post"]').should('be.visible')
        
        // Select reason
        cy.get('[data-testid="select-report-reason"]').click()
        cy.get('[data-testid="option-inappropriate-content"]').click()
        
        // Add details
        cy.get('[data-testid="textarea-report-details"]').type('This post contains content that violates community guidelines')
        
        // Submit report
        cy.get('[data-testid="button-submit-report"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Report submitted successfully')
      })
    })

    it('should allow admin users to remove posts and ban users', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const adminUser = data.users.admin
        
        // Login as admin
        cy.login(adminUser.email, adminUser.password)
        
        // Go to admin panel
        cy.visit('/admin')
        cy.get('[data-testid="tab-content-moderation"]').click()
        
        // Remove first post
        cy.get('[data-testid="button-remove-post"]').first().click()
        cy.get('[data-testid="modal-remove-post"]').should('be.visible')
        cy.get('[data-testid="textarea-removal-reason"]').type('Post violates community guidelines')
        cy.get('[data-testid="button-confirm-removal"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Post removed successfully')
        
        // Ban user
        cy.get('[data-testid="button-ban-user"]').first().click()
        cy.get('[data-testid="modal-ban-user"]').should('be.visible')
        cy.get('[data-testid="select-ban-duration"]').click()
        cy.get('[data-testid="option-7-days"]').click()
        cy.get('[data-testid="textarea-ban-reason"]').type('Repeated violations of community guidelines')
        cy.get('[data-testid="button-confirm-ban"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'User banned successfully')
      })
    })

    it('should maintain moderation statistics and reports', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const adminUser = data.users.admin
        
        // Login as admin
        cy.login(adminUser.email, adminUser.password)
        
        // Go to admin panel
        cy.visit('/admin')
        cy.get('[data-testid="tab-moderation-stats"]').click()
        
        // Should show moderation statistics
        cy.get('[data-testid="moderation-dashboard"]').should('be.visible')
        cy.get('[data-testid="total-posts-reviewed"]').should('be.visible')
        cy.get('[data-testid="approval-rate"]').should('be.visible')
        cy.get('[data-testid="rejection-rate"]').should('be.visible')
        cy.get('[data-testid="flagged-content-count"]').should('be.visible')
        
        // Should show charts and graphs
        cy.get('[data-testid="moderation-trends-chart"]').should('be.visible')
        cy.get('[data-testid="content-types-chart"]').should('be.visible')
        cy.get('[data-testid="violation-types-chart"]').should('be.visible')
        
        // Should show time-based statistics
        cy.get('[data-testid="time-filter"]').click()
        cy.get('[data-testid="option-last-30-days"]').click()
        cy.get('[data-testid="stats-data"]').should('be.visible')
      })
    })
  })

  describe('Community Engagement', () => {
    it('should allow users to create and join industry-specific groups', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to community
        cy.get('[data-testid="nav-community"]').click()
        
        // Create new group
        cy.get('[data-testid="button-create-group"]').click()
        cy.get('[data-testid="modal-create-group"]').should('be.visible')
        
        // Fill group details
        cy.get('[data-testid="input-group-name"]').type('Sydney Barbers Network')
        cy.get('[data-testid="textarea-group-description"]').type('A community for barbers in the Sydney area to share tips and connect')
        cy.get('[data-testid="select-group-category"]').click()
        cy.get('[data-testid="option-local-community"]').click()
        cy.get('[data-testid="select-privacy"]').click()
        cy.get('[data-testid="option-public"]').click()
        
        // Create group
        cy.get('[data-testid="button-create-group"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Group created successfully')
        
        // Should redirect to group page
        cy.url().should('include', '/group/')
        cy.get('[data-testid="group-name"]').should('contain', 'Sydney Barbers Network')
      })
    })

    it('should allow users to participate in community discussions', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to community
        cy.get('[data-testid="nav-community"]').click()
        
        // Join first group
        cy.get('[data-testid="button-join-group"]').first().click()
        cy.get('[data-testid="group-status"]').should('contain', 'Member')
        
        // Start new discussion
        cy.get('[data-testid="button-start-discussion"]').click()
        cy.get('[data-testid="modal-start-discussion"]').should('be.visible')
        
        // Fill discussion details
        cy.get('[data-testid="input-discussion-title"]').type('Best fade techniques for beginners')
        cy.get('[data-testid="textarea-discussion-content"]').type('What are your go-to fade techniques for someone just starting out? Looking for tips and advice.')
        cy.get('[data-testid="select-discussion-category"]').click()
        cy.get('[data-testid="option-techniques"]').click()
        
        // Start discussion
        cy.get('[data-testid="button-start-discussion"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Discussion started successfully')
        
        // Should see discussion in group
        cy.get('[data-testid="discussion-item"]').should('contain', 'Best fade techniques for beginners')
      })
    })

    it('should allow users to share industry tips and best practices', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to community
        cy.get('[data-testid="nav-community"]').click()
        
        // Go to tips section
        cy.get('[data-testid="tab-tips"]').click()
        
        // Share a tip
        cy.get('[data-testid="button-share-tip"]').click()
        cy.get('[data-testid="modal-share-tip"]').should('be.visible')
        
        // Fill tip details
        cy.get('[data-testid="input-tip-title"]').type('Pro tip: Use a comb to guide your clippers')
        cy.get('[data-testid="textarea-tip-content"]').type('When doing fades, always use a comb to guide your clippers. This helps maintain consistent length and prevents uneven cuts.')
        cy.get('[data-testid="select-tip-category"]').click()
        cy.get('[data-testid="option-fade-techniques"]').click()
        
        // Add tags
        cy.get('[data-testid="input-tip-tags"]').type('fade, clippers, technique, beginner')
        
        // Share tip
        cy.get('[data-testid="button-share-tip"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Tip shared successfully')
        
        // Should appear in tips feed
        cy.get('[data-testid="tip-item"]').should('contain', 'Pro tip: Use a comb to guide your clippers')
      })
    })

    it('should allow users to ask questions and receive community answers', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to community
        cy.get('[data-testid="nav-community"]').click()
        
        // Go to Q&A section
        cy.get('[data-testid="tab-qa"]').click()
        
        // Ask a question
        cy.get('[data-testid="button-ask-question"]').click()
        cy.get('[data-testid="modal-ask-question"]').should('be.visible')
        
        // Fill question details
        cy.get('[data-testid="input-question-title"]').type('How do I handle difficult customers?')
        cy.get('[data-testid="textarea-question-content"]').type('I have a customer who is never satisfied with their cut. How do you handle situations like this?')
        cy.get('[data-testid="select-question-category"]').click()
        cy.get('[data-testid="option-customer-service"]').click()
        
        // Ask question
        cy.get('[data-testid="button-ask-question"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Question posted successfully')
        
        // Should appear in Q&A feed
        cy.get('[data-testid="question-item"]').should('contain', 'How do I handle difficult customers?')
        
        // Answer a question
        cy.get('[data-testid="button-answer"]').first().click()
        cy.get('[data-testid="textarea-answer"]').type('I always try to listen to their concerns and offer solutions. Sometimes offering a free touch-up can help resolve the situation.')
        cy.get('[data-testid="button-submit-answer"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Answer posted successfully')
      })
    })

    it('should allow users to showcase their work in community galleries', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to community
        cy.get('[data-testid="nav-community"]').click()
        
        // Go to gallery section
        cy.get('[data-testid="tab-gallery"]').click()
        
        // Upload work sample
        cy.get('[data-testid="button-upload-work"]').click()
        cy.get('[data-testid="modal-upload-work"]').should('be.visible')
        
        // Fill work details
        cy.get('[data-testid="input-work-title"]').type('High Fade with Beard Trim')
        cy.get('[data-testid="textarea-work-description"]').type('A clean high fade with a well-groomed beard. Used #2 guard on top, skin fade on sides.')
        cy.get('[data-testid="select-work-category"]').click()
        cy.get('[data-testid="option-fade"]').click()
        
        // Upload images
        cy.get('[data-testid="input-work-images"]').selectFile('cypress/fixtures/work-sample-1.jpg')
        cy.get('[data-testid="input-work-images"]').selectFile('cypress/fixtures/work-sample-2.jpg')
        
        // Add tags
        cy.get('[data-testid="input-work-tags"]').type('fade, beard, high-fade, professional')
        
        // Upload work
        cy.get('[data-testid="button-upload-work"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Work uploaded successfully')
        
        // Should appear in gallery
        cy.get('[data-testid="gallery-item"]').should('contain', 'High Fade with Beard Trim')
      })
    })

    it('should allow users to participate in community challenges and contests', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to community
        cy.get('[data-testid="nav-community"]').click()
        
        // Go to challenges section
        cy.get('[data-testid="tab-challenges"]').click()
        
        // Join first challenge
        cy.get('[data-testid="button-join-challenge"]').first().click()
        cy.get('[data-testid="modal-join-challenge"]').should('be.visible')
        cy.get('[data-testid="button-confirm-join"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Joined challenge successfully')
        
        // Should see challenge details
        cy.get('[data-testid="challenge-status"]').should('contain', 'Participating')
        cy.get('[data-testid="challenge-deadline"]').should('be.visible')
        cy.get('[data-testid="challenge-prize"]').should('be.visible')
        
        // Submit entry
        cy.get('[data-testid="button-submit-entry"]').click()
        cy.get('[data-testid="modal-submit-entry"]').should('be.visible')
        
        // Upload entry
        cy.get('[data-testid="input-entry-image"]').selectFile('cypress/fixtures/challenge-entry.jpg')
        cy.get('[data-testid="textarea-entry-description"]').type('My entry for the fade challenge. Used a combination of techniques to create this look.')
        cy.get('[data-testid="button-submit-entry"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Entry submitted successfully')
      })
    })

    it('should allow users to connect with other professionals in their area', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to community
        cy.get('[data-testid="nav-community"]').click()
        
        // Go to local connections
        cy.get('[data-testid="tab-local-connections"]').click()
        
        // Should see nearby professionals
        cy.get('[data-testid="professional-card"]').should('have.length.at.least', 1)
        
        // Connect with first professional
        cy.get('[data-testid="button-connect"]').first().click()
        cy.get('[data-testid="modal-connect"]').should('be.visible')
        cy.get('[data-testid="textarea-connection-message"]').type('Hi! I saw your work and would love to connect. Maybe we can collaborate on some projects.')
        cy.get('[data-testid="button-send-connection"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Connection request sent successfully')
        
        // Should show pending connection
        cy.get('[data-testid="connection-status"]').should('contain', 'Pending')
      })
    })

    it('should allow users to share success stories and testimonials', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to community
        cy.get('[data-testid="nav-community"]').click()
        
        // Go to success stories
        cy.get('[data-testid="tab-success-stories"]').click()
        
        // Share success story
        cy.get('[data-testid="button-share-story"]').click()
        cy.get('[data-testid="modal-share-story"]').should('be.visible')
        
        // Fill story details
        cy.get('[data-testid="input-story-title"]').type('From Apprentice to Shop Owner in 2 Years')
        cy.get('[data-testid="textarea-story-content"]').type('Started as an apprentice at a local shop, learned everything I could, and now I own my own barbershop. The key was never giving up and always learning new techniques.')
        cy.get('[data-testid="select-story-category"]').click()
        cy.get('[data-testid="option-career-growth"]').click()
        
        // Add images
        cy.get('[data-testid="input-story-images"]').selectFile('cypress/fixtures/success-story-1.jpg')
        
        // Share story
        cy.get('[data-testid="button-share-story"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Success story shared successfully')
        
        // Should appear in success stories feed
        cy.get('[data-testid="story-item"]').should('contain', 'From Apprentice to Shop Owner in 2 Years')
      })
    })
  })
})
