describe('Training Hub & Content Monetization - SnipShift V2', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  describe('Training Content Creation (Trainer Users)', () => {
    it('should allow trainer users to create training content with video uploads', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const trainerUser = data.users.trainer
        const contentData = data.trainingContent.advancedFadeTechniques
        
        // Login as trainer user
        cy.login(trainerUser.email, trainerUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Create new content
        cy.get('[data-testid="button-create-content"]').click()
        cy.get('[data-testid="modal-create-content"]').should('be.visible')
        
        // Fill content details
        cy.get('[data-testid="input-content-title"]').type(contentData.title)
        cy.get('[data-testid="textarea-content-description"]').type(contentData.description)
        
        // Upload video
        cy.get('[data-testid="input-video-upload"]').selectFile('cypress/fixtures/training-video.mp4')
        cy.get('[data-testid="video-preview"]').should('be.visible')
        cy.get('[data-testid="upload-progress"]').should('be.visible')
        
        // Upload thumbnail
        cy.get('[data-testid="input-thumbnail-upload"]').selectFile('cypress/fixtures/training-thumbnail.jpg')
        cy.get('[data-testid="thumbnail-preview"]').should('be.visible')
        
        // Set content details
        cy.get('[data-testid="input-duration"]').type(contentData.duration)
        cy.get('[data-testid="select-level"]').click()
        cy.get('[data-testid="option-advanced"]').click()
        cy.get('[data-testid="select-category"]').click()
        cy.get('[data-testid="option-hair-cutting"]').click()
        
        // Submit content
        cy.get('[data-testid="button-submit-content"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Training content created successfully')
        cy.get('[data-testid="content-status"]').should('contain', 'Pending Review')
      })
    })

    it('should allow trainer users to set content title, description, and category', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const trainerUser = data.users.trainer
        
        // Login as trainer user
        cy.login(trainerUser.email, trainerUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Create new content
        cy.get('[data-testid="button-create-content"]').click()
        
        // Test title field
        cy.get('[data-testid="input-content-title"]').type('Test Training Content')
        cy.get('[data-testid="input-content-title"]').should('have.value', 'Test Training Content')
        
        // Test description field
        cy.get('[data-testid="textarea-content-description"]').type('This is a comprehensive training module covering advanced techniques and best practices.')
        cy.get('[data-testid="textarea-content-description"]').should('contain.value', 'comprehensive training module')
        
        // Test category selection
        cy.get('[data-testid="select-category"]').click()
        cy.get('[data-testid="option-hair-cutting"]').click()
        cy.get('[data-testid="selected-category"]').should('contain', 'Hair Cutting')
        
        // Test subcategory
        cy.get('[data-testid="select-subcategory"]').click()
        cy.get('[data-testid="option-fade-techniques"]').click()
        cy.get('[data-testid="selected-subcategory"]').should('contain', 'Fade Techniques')
      })
    })

    it('should allow trainer users to set content price and duration', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const trainerUser = data.users.trainer
        
        // Login as trainer user
        cy.login(trainerUser.email, trainerUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Create new content
        cy.get('[data-testid="button-create-content"]').click()
        
        // Test pricing options
        cy.get('[data-testid="select-pricing-type"]').click()
        cy.get('[data-testid="option-paid"]').click()
        cy.get('[data-testid="input-price"]').type('199.99')
        cy.get('[data-testid="price-display"]').should('contain', '$199.99')
        
        // Test free content
        cy.get('[data-testid="select-pricing-type"]').click()
        cy.get('[data-testid="option-free"]').click()
        cy.get('[data-testid="price-display"]').should('contain', 'Free')
        
        // Test duration
        cy.get('[data-testid="input-duration"]').type('4h 15m')
        cy.get('[data-testid="duration-display"]').should('contain', '4h 15m')
        
        // Test validation
        cy.get('[data-testid="input-price"]').clear().type('0')
        cy.get('[data-testid="error-price"]').should('contain', 'Price must be greater than 0')
      })
    })

    it('should allow trainer users to specify skill level (beginner, intermediate, advanced)', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const trainerUser = data.users.trainer
        
        // Login as trainer user
        cy.login(trainerUser.email, trainerUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Create new content
        cy.get('[data-testid="button-create-content"]').click()
        
        // Test beginner level
        cy.get('[data-testid="select-level"]').click()
        cy.get('[data-testid="option-beginner"]').click()
        cy.get('[data-testid="level-indicator"]').should('have.class', 'level-beginner')
        cy.get('[data-testid="level-description"]').should('contain', 'Suitable for beginners')
        
        // Test intermediate level
        cy.get('[data-testid="select-level"]').click()
        cy.get('[data-testid="option-intermediate"]').click()
        cy.get('[data-testid="level-indicator"]').should('have.class', 'level-intermediate')
        cy.get('[data-testid="level-description"]').should('contain', 'Some experience required')
        
        // Test advanced level
        cy.get('[data-testid="select-level"]').click()
        cy.get('[data-testid="option-advanced"]').click()
        cy.get('[data-testid="level-indicator"]').should('have.class', 'level-advanced')
        cy.get('[data-testid="level-description"]').should('contain', 'Advanced techniques')
      })
    })

    it('should allow trainer users to add thumbnail images and preview videos', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const trainerUser = data.users.trainer
        
        // Login as trainer user
        cy.login(trainerUser.email, trainerUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Create new content
        cy.get('[data-testid="button-create-content"]').click()
        
        // Upload thumbnail
        cy.get('[data-testid="input-thumbnail-upload"]').selectFile('cypress/fixtures/training-thumbnail.jpg')
        cy.get('[data-testid="thumbnail-preview"]').should('be.visible')
        cy.get('[data-testid="thumbnail-dimensions"]').should('contain', '1280x720')
        
        // Upload preview video
        cy.get('[data-testid="input-preview-video"]').selectFile('cypress/fixtures/preview-video.mp4')
        cy.get('[data-testid="preview-video-player"]').should('be.visible')
        cy.get('[data-testid="preview-duration"]').should('contain', '30 seconds')
        
        // Test image validation
        cy.get('[data-testid="input-thumbnail-upload"]').selectFile('cypress/fixtures/invalid-image.txt')
        cy.get('[data-testid="error-thumbnail"]').should('contain', 'Please upload a valid image file')
      })
    })

    it('should allow trainer users to organize content into courses and series', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const trainerUser = data.users.trainer
        
        // Login as trainer user
        cy.login(trainerUser.email, trainerUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Create new course
        cy.get('[data-testid="button-create-course"]').click()
        cy.get('[data-testid="modal-create-course"]').should('be.visible')
        
        // Fill course details
        cy.get('[data-testid="input-course-title"]').type('Complete Barbering Mastery Course')
        cy.get('[data-testid="textarea-course-description"]').type('A comprehensive course covering all aspects of modern barbering')
        cy.get('[data-testid="input-course-price"]').type('499.99')
        
        // Add content to course
        cy.get('[data-testid="button-add-content"]').click()
        cy.get('[data-testid="content-selector"]').should('be.visible')
        cy.get('[data-testid="content-item"]').first().click()
        cy.get('[data-testid="button-add-selected"]').click()
        
        // Set course structure
        cy.get('[data-testid="input-lesson-order"]').type('1')
        cy.get('[data-testid="button-save-course"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Course created successfully')
        
        // Should appear in courses list
        cy.get('[data-testid="course-item"]').should('contain', 'Complete Barbering Mastery Course')
      })
    })

    it('should allow trainer users to set content availability and access restrictions', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const trainerUser = data.users.trainer
        
        // Login as trainer user
        cy.login(trainerUser.email, trainerUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Create new content
        cy.get('[data-testid="button-create-content"]').click()
        
        // Set availability
        cy.get('[data-testid="select-availability"]').click()
        cy.get('[data-testid="option-scheduled"]').click()
        cy.get('[data-testid="input-release-date"]').type('2025-02-01')
        cy.get('[data-testid="input-expiry-date"]').type('2025-12-31')
        
        // Set access restrictions
        cy.get('[data-testid="select-access-level"]').click()
        cy.get('[data-testid="option-premium"]').click()
        cy.get('[data-testid="input-max-students"]').type('100')
        cy.get('[data-testid="checkbox-certification-required"]').click()
        
        // Set geographic restrictions
        cy.get('[data-testid="select-geographic-restriction"]').click()
        cy.get('[data-testid="option-australia-only"]').click()
        
        // Should show restrictions summary
        cy.get('[data-testid="restrictions-summary"]').should('contain', 'Premium access required')
        cy.get('[data-testid="restrictions-summary"]').should('contain', 'Australia only')
        cy.get('[data-testid="restrictions-summary"]').should('contain', 'Max 100 students')
      })
    })

    it('should allow trainer users to update existing content', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const trainerUser = data.users.trainer
        
        // Login as trainer user
        cy.login(trainerUser.email, trainerUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Go to my content
        cy.get('[data-testid="tab-my-content"]').click()
        
        // Edit first content
        cy.get('[data-testid="button-edit-content"]').first().click()
        cy.get('[data-testid="modal-edit-content"]').should('be.visible')
        
        // Update title
        cy.get('[data-testid="input-content-title"]').clear().type('Updated Training Content Title')
        
        // Update description
        cy.get('[data-testid="textarea-content-description"]').clear().type('Updated description with new information and techniques.')
        
        // Update price
        cy.get('[data-testid="input-price"]').clear().type('249.99')
        
        // Save changes
        cy.get('[data-testid="button-save-changes"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Content updated successfully')
        
        // Should show updated information
        cy.get('[data-testid="content-title"]').should('contain', 'Updated Training Content Title')
        cy.get('[data-testid="content-price"]').should('contain', '$249.99')
      })
    })

    it('should allow trainer users to view content performance analytics', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const trainerUser = data.users.trainer
        
        // Login as trainer user
        cy.login(trainerUser.email, trainerUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Go to analytics
        cy.get('[data-testid="tab-analytics"]').click()
        
        // Should show content performance metrics
        cy.get('[data-testid="analytics-dashboard"]').should('be.visible')
        cy.get('[data-testid="total-views"]').should('be.visible')
        cy.get('[data-testid="total-purchases"]').should('be.visible')
        cy.get('[data-testid="total-revenue"]').should('be.visible')
        cy.get('[data-testid="average-rating"]').should('be.visible')
        cy.get('[data-testid="completion-rate"]').should('be.visible')
        
        // Should show charts and graphs
        cy.get('[data-testid="views-chart"]').should('be.visible')
        cy.get('[data-testid="revenue-chart"]').should('be.visible')
        cy.get('[data-testid="engagement-chart"]').should('be.visible')
        
        // Should show content-specific analytics
        cy.get('[data-testid="content-performance-list"]').should('be.visible')
        cy.get('[data-testid="content-item"]').first().within(() => {
          cy.get('[data-testid="content-views"]').should('be.visible')
          cy.get('[data-testid="content-revenue"]').should('be.visible')
          cy.get('[data-testid="content-rating"]').should('be.visible')
        })
        
        // Should show time-based analytics
        cy.get('[data-testid="time-filter"]').click()
        cy.get('[data-testid="option-last-30-days"]').click()
        cy.get('[data-testid="analytics-data"]').should('be.visible')
      })
    })

    it('should allow trainer users to respond to student questions and feedback', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const trainerUser = data.users.trainer
        
        // Login as trainer user
        cy.login(trainerUser.email, trainerUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Go to student interactions
        cy.get('[data-testid="tab-student-interactions"]').click()
        
        // Should see student questions
        cy.get('[data-testid="student-question"]').should('have.length.at.least', 1)
        
        // Answer first question
        cy.get('[data-testid="button-answer-question"]').first().click()
        cy.get('[data-testid="modal-answer-question"]').should('be.visible')
        cy.get('[data-testid="textarea-answer"]').type('Great question! The key is to start with a longer guard and work your way down gradually.')
        cy.get('[data-testid="button-submit-answer"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Answer posted successfully')
        
        // Should see student feedback
        cy.get('[data-testid="student-feedback"]').should('have.length.at.least', 1)
        
        // Respond to feedback
        cy.get('[data-testid="button-respond-feedback"]').first().click()
        cy.get('[data-testid="modal-respond-feedback"]').should('be.visible')
        cy.get('[data-testid="textarea-response"]').type('Thank you for the feedback! I\'ll consider adding more examples in the next update.')
        cy.get('[data-testid="button-submit-response"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Response posted successfully')
      })
    })
  })

  describe('Training Content Consumption', () => {
    it('should allow all users to browse available training content', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Should see available content
        cy.get('[data-testid="training-content-grid"]').should('be.visible')
        cy.get('[data-testid="content-card"]').should('have.length.at.least', 1)
        
        // Each content card should display key information
        cy.get('[data-testid="content-card"]').first().within(() => {
          cy.get('[data-testid="content-title"]').should('be.visible')
          cy.get('[data-testid="content-trainer"]').should('be.visible')
          cy.get('[data-testid="content-duration"]').should('be.visible')
          cy.get('[data-testid="content-level"]').should('be.visible')
          cy.get('[data-testid="content-price"]').should('be.visible')
          cy.get('[data-testid="content-rating"]').should('be.visible')
          cy.get('[data-testid="content-thumbnail"]').should('be.visible')
        })
      })
    })

    it('should allow users to filter content by category, skill level, and price', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Filter by category
        cy.get('[data-testid="filter-category"]').click()
        cy.get('[data-testid="option-hair-cutting"]').click()
        cy.get('[data-testid="content-card"]').each(($card) => {
          cy.wrap($card).within(() => {
            cy.get('[data-testid="content-category"]').should('contain', 'Hair Cutting')
          })
        })
        
        // Filter by skill level
        cy.get('[data-testid="filter-level"]').click()
        cy.get('[data-testid="option-beginner"]').click()
        cy.get('[data-testid="content-card"]').each(($card) => {
          cy.wrap($card).within(() => {
            cy.get('[data-testid="content-level"]').should('contain', 'Beginner')
          })
        })
        
        // Filter by price
        cy.get('[data-testid="filter-price"]').click()
        cy.get('[data-testid="option-free"]').click()
        cy.get('[data-testid="content-card"]').each(($card) => {
          cy.wrap($card).within(() => {
            cy.get('[data-testid="content-price"]').should('contain', 'Free')
          })
        })
        
        // Clear filters
        cy.get('[data-testid="button-clear-filters"]').click()
        cy.get('[data-testid="content-card"]').should('have.length.at.least', 1)
      })
    })

    it('should allow users to view content previews and detailed descriptions', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Click on first content
        cy.get('[data-testid="content-card"]').first().click()
        cy.get('[data-testid="modal-content-details"]').should('be.visible')
        
        // Should show detailed information
        cy.get('[data-testid="content-detail-title"]').should('be.visible')
        cy.get('[data-testid="content-detail-description"]').should('be.visible')
        cy.get('[data-testid="content-detail-trainer"]').should('be.visible')
        cy.get('[data-testid="content-detail-duration"]').should('be.visible')
        cy.get('[data-testid="content-detail-level"]').should('be.visible')
        cy.get('[data-testid="content-detail-price"]').should('be.visible')
        cy.get('[data-testid="content-detail-rating"]').should('be.visible')
        
        // Should show preview video
        cy.get('[data-testid="preview-video-player"]').should('be.visible')
        cy.get('[data-testid="button-play-preview"]').click()
        cy.get('[data-testid="video-playing"]').should('be.visible')
        
        // Should show content outline
        cy.get('[data-testid="content-outline"]').should('be.visible')
        cy.get('[data-testid="lesson-item"]').should('have.length.at.least', 1)
      })
    })

    it('should allow users to read trainer profiles and credentials', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Click on trainer profile
        cy.get('[data-testid="content-card"]').first().within(() => {
          cy.get('[data-testid="content-trainer"]').click()
        })
        cy.get('[data-testid="modal-trainer-profile"]').should('be.visible')
        
        // Should show trainer information
        cy.get('[data-testid="trainer-name"]').should('be.visible')
        cy.get('[data-testid="trainer-bio"]').should('be.visible')
        cy.get('[data-testid="trainer-experience"]').should('be.visible')
        cy.get('[data-testid="trainer-qualifications"]').should('be.visible')
        cy.get('[data-testid="trainer-specializations"]').should('be.visible')
        cy.get('[data-testid="trainer-rating"]').should('be.visible')
        cy.get('[data-testid="trainer-student-count"]').should('be.visible')
        
        // Should show trainer's other content
        cy.get('[data-testid="trainer-other-content"]').should('be.visible')
        cy.get('[data-testid="other-content-item"]').should('have.length.at.least', 1)
      })
    })

    it('should allow users to view content ratings and reviews', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Click on first content
        cy.get('[data-testid="content-card"]').first().click()
        
        // Should show ratings and reviews
        cy.get('[data-testid="content-ratings"]').should('be.visible')
        cy.get('[data-testid="average-rating"]').should('be.visible')
        cy.get('[data-testid="rating-breakdown"]').should('be.visible')
        cy.get('[data-testid="total-reviews"]').should('be.visible')
        
        // Should show review list
        cy.get('[data-testid="reviews-list"]').should('be.visible')
        cy.get('[data-testid="review-item"]').should('have.length.at.least', 1)
        
        // Each review should show details
        cy.get('[data-testid="review-item"]').first().within(() => {
          cy.get('[data-testid="review-rating"]').should('be.visible')
          cy.get('[data-testid="review-content"]').should('be.visible')
          cy.get('[data-testid="review-author"]').should('be.visible')
          cy.get('[data-testid="review-date"]').should('be.visible')
        })
        
        // Should allow filtering reviews
        cy.get('[data-testid="filter-reviews"]').click()
        cy.get('[data-testid="option-5-stars"]').click()
        cy.get('[data-testid="review-item"]').each(($review) => {
          cy.wrap($review).within(() => {
            cy.get('[data-testid="review-rating"]').should('contain', '5')
          })
        })
      })
    })

    it('should allow users to purchase paid training content', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        const contentData = data.trainingContent.advancedFadeTechniques
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Click on paid content
        cy.get('[data-testid="content-card"]').contains(contentData.title).click()
        
        // Click purchase button
        cy.get('[data-testid="button-purchase-content"]').click()
        cy.get('[data-testid="modal-purchase-content"]').should('be.visible')
        
        // Should show purchase details
        cy.get('[data-testid="purchase-title"]').should('contain', contentData.title)
        cy.get('[data-testid="purchase-price"]').should('contain', `$${contentData.price}`)
        cy.get('[data-testid="purchase-duration"]').should('contain', contentData.duration)
        
        // Proceed to payment
        cy.get('[data-testid="button-proceed-payment"]').click()
        cy.get('[data-testid="payment-form"]').should('be.visible')
        
        // Fill payment details (mock)
        cy.get('[data-testid="input-card-number"]').type('4242424242424242')
        cy.get('[data-testid="input-expiry-date"]').type('12/25')
        cy.get('[data-testid="input-cvv"]').type('123')
        cy.get('[data-testid="input-card-name"]').type('Test User')
        
        // Complete purchase
        cy.get('[data-testid="button-complete-purchase"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Purchase completed successfully')
        cy.get('[data-testid="purchase-confirmation"]').should('be.visible')
      })
    })

    it('should allow users to access purchased content immediately', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to my purchases
        cy.get('[data-testid="nav-my-purchases"]').click()
        
        // Should see purchased content
        cy.get('[data-testid="purchased-content"]').should('have.length.at.least', 1)
        
        // Click on purchased content
        cy.get('[data-testid="purchased-content"]').first().click()
        cy.get('[data-testid="content-player"]').should('be.visible')
        
        // Should be able to play video
        cy.get('[data-testid="button-play-video"]').click()
        cy.get('[data-testid="video-playing"]').should('be.visible')
        
        // Should show progress tracking
        cy.get('[data-testid="progress-bar"]').should('be.visible')
        cy.get('[data-testid="current-time"]').should('be.visible')
        cy.get('[data-testid="total-time"]').should('be.visible')
        
        // Should show content navigation
        cy.get('[data-testid="content-navigation"]').should('be.visible')
        cy.get('[data-testid="lesson-list"]').should('be.visible')
      })
    })

    it('should allow users to track learning progress and completion', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to my purchases
        cy.get('[data-testid="nav-my-purchases"]').click()
        
        // Click on purchased content
        cy.get('[data-testid="purchased-content"]').first().click()
        
        // Should show progress tracking
        cy.get('[data-testid="progress-overview"]').should('be.visible')
        cy.get('[data-testid="completion-percentage"]').should('be.visible')
        cy.get('[data-testid="time-spent"]').should('be.visible')
        cy.get('[data-testid="lessons-completed"]').should('be.visible')
        
        // Watch video for a few seconds
        cy.get('[data-testid="button-play-video"]').click()
        cy.wait(3000)
        cy.get('[data-testid="button-pause-video"]').click()
        
        // Should update progress
        cy.get('[data-testid="progress-bar"]').should('not.have.value', '0')
        cy.get('[data-testid="completion-percentage"]').should('not.contain', '0%')
        
        // Mark lesson as complete
        cy.get('[data-testid="button-mark-complete"]').click()
        cy.get('[data-testid="lesson-completed"]').should('have.class', 'completed')
        
        // Should show completion certificate when finished
        cy.get('[data-testid="button-complete-course"]').click()
        cy.get('[data-testid="completion-certificate"]').should('be.visible')
        cy.get('[data-testid="certificate-download"]').should('be.visible')
      })
    })

    it('should allow users to download content for offline viewing', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to my purchases
        cy.get('[data-testid="nav-my-purchases"]').click()
        
        // Click on purchased content
        cy.get('[data-testid="purchased-content"]').first().click()
        
        // Download for offline viewing
        cy.get('[data-testid="button-download-offline"]').click()
        cy.get('[data-testid="modal-download-options"]').should('be.visible')
        
        // Select download quality
        cy.get('[data-testid="select-download-quality"]').click()
        cy.get('[data-testid="option-hd"]').click()
        
        // Start download
        cy.get('[data-testid="button-start-download"]').click()
        
        // Should show download progress
        cy.get('[data-testid="download-progress"]').should('be.visible')
        cy.get('[data-testid="download-status"]').should('contain', 'Downloading')
        
        // Should show downloaded content
        cy.get('[data-testid="tab-offline-content"]').click()
        cy.get('[data-testid="offline-content"]').should('have.length.at.least', 1)
        cy.get('[data-testid="offline-status"]').should('contain', 'Available Offline')
      })
    })

    it('should allow users to rate and review completed content', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to my purchases
        cy.get('[data-testid="nav-my-purchases"]').click()
        
        // Click on completed content
        cy.get('[data-testid="purchased-content"]').first().click()
        
        // Rate and review content
        cy.get('[data-testid="button-rate-content"]').click()
        cy.get('[data-testid="modal-rate-content"]').should('be.visible')
        
        // Set rating
        cy.get('[data-testid="rating-stars"]').within(() => {
          cy.get('[data-testid="star-5"]').click()
        })
        
        // Write review
        cy.get('[data-testid="textarea-review"]').type('Excellent training content! Very comprehensive and well-structured. Learned a lot of new techniques.')
        
        // Submit review
        cy.get('[data-testid="button-submit-review"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Review submitted successfully')
        
        // Should show review in content details
        cy.get('[data-testid="my-review"]').should('be.visible')
        cy.get('[data-testid="my-rating"]').should('contain', '5')
        cy.get('[data-testid="my-review-content"]').should('contain', 'Excellent training content!')
      })
    })
  })

  describe('Payment Processing', () => {
    it('should allow users to purchase training content using Stripe payment', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        const contentData = data.trainingContent.advancedFadeTechniques
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Click on paid content
        cy.get('[data-testid="content-card"]').contains(contentData.title).click()
        
        // Click purchase button
        cy.get('[data-testid="button-purchase-content"]').click()
        
        // Proceed to payment
        cy.get('[data-testid="button-proceed-payment"]').click()
        
        // Mock Stripe payment
        cy.intercept('POST', '/api/stripe/create-payment-intent', {
          statusCode: 200,
          body: {
            clientSecret: 'pi_test_client_secret',
            paymentIntentId: 'pi_test_123'
          }
        }).as('createPaymentIntent')
        
        cy.intercept('POST', '/api/stripe/confirm-payment', {
          statusCode: 200,
          body: {
            status: 'succeeded',
            paymentIntentId: 'pi_test_123'
          }
        }).as('confirmPayment')
        
        // Fill payment form
        cy.get('[data-testid="stripe-card-element"]').within(() => {
          cy.get('input').type('4242424242424242')
        })
        
        // Complete purchase
        cy.get('[data-testid="button-complete-purchase"]').click()
        cy.wait('@createPaymentIntent')
        cy.wait('@confirmPayment')
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Payment completed successfully')
        cy.get('[data-testid="purchase-confirmation"]').should('be.visible')
      })
    })

    it('should allow users to view purchase history and receipts', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to purchase history
        cy.get('[data-testid="nav-purchase-history"]').click()
        
        // Should see purchase history
        cy.get('[data-testid="purchase-history"]').should('be.visible')
        cy.get('[data-testid="purchase-item"]').should('have.length.at.least', 1)
        
        // Each purchase should show details
        cy.get('[data-testid="purchase-item"]').first().within(() => {
          cy.get('[data-testid="purchase-title"]').should('be.visible')
          cy.get('[data-testid="purchase-date"]').should('be.visible')
          cy.get('[data-testid="purchase-amount"]').should('be.visible')
          cy.get('[data-testid="purchase-status"]').should('be.visible')
          cy.get('[data-testid="button-view-receipt"]').should('be.visible')
        })
        
        // View receipt
        cy.get('[data-testid="button-view-receipt"]').first().click()
        cy.get('[data-testid="modal-receipt"]').should('be.visible')
        
        // Should show receipt details
        cy.get('[data-testid="receipt-number"]').should('be.visible')
        cy.get('[data-testid="receipt-date"]').should('be.visible')
        cy.get('[data-testid="receipt-amount"]').should('be.visible')
        cy.get('[data-testid="receipt-payment-method"]').should('be.visible')
        
        // Download receipt
        cy.get('[data-testid="button-download-receipt"]').click()
        cy.get('[data-testid="toast-success"]').should('contain', 'Receipt downloaded successfully')
      })
    })

    it('should allow users to request refunds for unsatisfactory content', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to purchase history
        cy.get('[data-testid="nav-purchase-history"]').click()
        
        // Request refund for first purchase
        cy.get('[data-testid="button-request-refund"]').first().click()
        cy.get('[data-testid="modal-request-refund"]').should('be.visible')
        
        // Fill refund request
        cy.get('[data-testid="select-refund-reason"]').click()
        cy.get('[data-testid="option-unsatisfactory-content"]').click()
        cy.get('[data-testid="textarea-refund-details"]').type('The content did not meet my expectations. The video quality was poor and the instructions were unclear.')
        
        // Submit refund request
        cy.get('[data-testid="button-submit-refund"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Refund request submitted successfully')
        
        // Should show refund status
        cy.get('[data-testid="refund-status"]').should('contain', 'Pending Review')
        cy.get('[data-testid="refund-request-date"]').should('be.visible')
      })
    })

    it('should allow trainer users to view earnings and payment history', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const trainerUser = data.users.trainer
        
        // Login as trainer user
        cy.login(trainerUser.email, trainerUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Go to earnings
        cy.get('[data-testid="tab-earnings"]').click()
        
        // Should show earnings dashboard
        cy.get('[data-testid="earnings-dashboard"]').should('be.visible')
        cy.get('[data-testid="total-earnings"]').should('be.visible')
        cy.get('[data-testid="monthly-earnings"]').should('be.visible')
        cy.get('[data-testid="pending-payouts"]').should('be.visible')
        cy.get('[data-testid="commission-rate"]').should('be.visible')
        
        // Should show earnings breakdown
        cy.get('[data-testid="earnings-breakdown"]').should('be.visible')
        cy.get('[data-testid="content-earnings"]').should('have.length.at.least', 1)
        
        // Each content should show earnings
        cy.get('[data-testid="content-earnings"]').first().within(() => {
          cy.get('[data-testid="content-title"]').should('be.visible')
          cy.get('[data-testid="content-sales"]').should('be.visible')
          cy.get('[data-testid="content-revenue"]').should('be.visible')
          cy.get('[data-testid="content-commission"]').should('be.visible')
        })
        
        // Should show payment history
        cy.get('[data-testid="tab-payment-history"]').click()
        cy.get('[data-testid="payment-history"]').should('be.visible')
        cy.get('[data-testid="payment-item"]').should('have.length.at.least', 1)
        
        // Each payment should show details
        cy.get('[data-testid="payment-item"]').first().within(() => {
          cy.get('[data-testid="payment-date"]').should('be.visible')
          cy.get('[data-testid="payment-amount"]').should('be.visible')
          cy.get('[data-testid="payment-status"]').should('be.visible')
          cy.get('[data-testid="payment-method"]').should('be.visible')
        })
      })
    })

    it('should allow trainer users to set up Stripe Connect accounts', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const trainerUser = data.users.trainer
        
        // Login as trainer user
        cy.login(trainerUser.email, trainerUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Go to earnings
        cy.get('[data-testid="tab-earnings"]').click()
        
        // Set up Stripe Connect
        cy.get('[data-testid="button-setup-stripe"]').click()
        cy.get('[data-testid="modal-stripe-setup"]').should('be.visible')
        
        // Fill business information
        cy.get('[data-testid="input-business-name"]').type('Trainer Business')
        cy.get('[data-testid="input-business-type"]').click()
        cy.get('[data-testid="option-individual"]').click()
        cy.get('[data-testid="input-tax-id"]').type('123456789')
        
        // Fill bank information
        cy.get('[data-testid="input-routing-number"]').type('110000000')
        cy.get('[data-testid="input-account-number"]').type('000123456789')
        cy.get('[data-testid="input-account-name"]').type('Trainer Account')
        
        // Submit setup
        cy.get('[data-testid="button-submit-stripe-setup"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Stripe Connect account set up successfully')
        
        // Should show connected status
        cy.get('[data-testid="stripe-status"]').should('contain', 'Connected')
        cy.get('[data-testid="payout-schedule"]').should('be.visible')
      })
    })

    it('should process payments securely and reliably', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Click on paid content
        cy.get('[data-testid="content-card"]').first().click()
        
        // Click purchase button
        cy.get('[data-testid="button-purchase-content"]').click()
        
        // Proceed to payment
        cy.get('[data-testid="button-proceed-payment"]').click()
        
        // Verify secure payment form
        cy.get('[data-testid="payment-form"]').should('be.visible')
        cy.get('[data-testid="security-badge"]').should('contain', 'Secure Payment')
        cy.get('[data-testid="ssl-indicator"]').should('be.visible')
        cy.get('[data-testid="encryption-notice"]').should('contain', 'Your payment information is encrypted')
        
        // Test payment validation
        cy.get('[data-testid="button-complete-purchase"]').click()
        cy.get('[data-testid="error-payment"]').should('contain', 'Please enter valid payment information')
        
        // Fill valid payment information
        cy.get('[data-testid="input-card-number"]').type('4242424242424242')
        cy.get('[data-testid="input-expiry-date"]').type('12/25')
        cy.get('[data-testid="input-cvv"]').type('123')
        
        // Complete purchase
        cy.get('[data-testid="button-complete-purchase"]').click()
        
        // Should show processing
        cy.get('[data-testid="payment-processing"]').should('be.visible')
        cy.get('[data-testid="processing-message"]').should('contain', 'Processing payment')
        
        // Should show success
        cy.get('[data-testid="payment-success"]').should('be.visible')
        cy.get('[data-testid="success-message"]').should('contain', 'Payment completed successfully')
      })
    })

    it('should handle payment failures gracefully', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Click on paid content
        cy.get('[data-testid="content-card"]').first().click()
        
        // Click purchase button
        cy.get('[data-testid="button-purchase-content"]').click()
        
        // Proceed to payment
        cy.get('[data-testid="button-proceed-payment"]').click()
        
        // Mock payment failure
        cy.intercept('POST', '/api/stripe/create-payment-intent', {
          statusCode: 400,
          body: {
            error: {
              code: 'card_declined',
              message: 'Your card was declined.'
            }
          }
        }).as('paymentFailure')
        
        // Fill payment information with declined card
        cy.get('[data-testid="input-card-number"]').type('4000000000000002')
        cy.get('[data-testid="input-expiry-date"]').type('12/25')
        cy.get('[data-testid="input-cvv"]').type('123')
        
        // Complete purchase
        cy.get('[data-testid="button-complete-purchase"]').click()
        cy.wait('@paymentFailure')
        
        // Should show error message
        cy.get('[data-testid="error-payment"]').should('contain', 'Your card was declined')
        cy.get('[data-testid="error-suggestions"]').should('contain', 'Please try a different payment method')
        cy.get('[data-testid="button-try-again"]').should('be.visible')
      })
    })

    it('should send payment confirmations and receipts', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Click on paid content
        cy.get('[data-testid="content-card"]').first().click()
        
        // Click purchase button
        cy.get('[data-testid="button-purchase-content"]').click()
        
        // Proceed to payment
        cy.get('[data-testid="button-proceed-payment"]').click()
        
        // Complete purchase
        cy.get('[data-testid="input-card-number"]').type('4242424242424242')
        cy.get('[data-testid="input-expiry-date"]').type('12/25')
        cy.get('[data-testid="input-cvv"]').type('123')
        cy.get('[data-testid="button-complete-purchase"]').click()
        
        // Should show payment confirmation
        cy.get('[data-testid="payment-confirmation"]').should('be.visible')
        cy.get('[data-testid="confirmation-title"]').should('contain', 'Payment Confirmed')
        cy.get('[data-testid="confirmation-amount"]').should('be.visible')
        cy.get('[data-testid="confirmation-date"]').should('be.visible')
        cy.get('[data-testid="confirmation-reference"]').should('be.visible')
        
        // Should send email confirmation
        cy.get('[data-testid="email-confirmation"]').should('contain', 'Confirmation email sent')
        
        // Should provide receipt download
        cy.get('[data-testid="button-download-receipt"]').should('be.visible')
        cy.get('[data-testid="button-email-receipt"]').should('be.visible')
      })
    })

    it('should track revenue and commission calculations', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const trainerUser = data.users.trainer
        
        // Login as trainer user
        cy.login(trainerUser.email, trainerUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Go to earnings
        cy.get('[data-testid="tab-earnings"]').click()
        
        // Should show revenue tracking
        cy.get('[data-testid="revenue-tracking"]').should('be.visible')
        cy.get('[data-testid="total-revenue"]').should('be.visible')
        cy.get('[data-testid="platform-commission"]').should('be.visible')
        cy.get('[data-testid="trainer-earnings"]').should('be.visible')
        cy.get('[data-testid="commission-rate"]').should('contain', '10%')
        
        // Should show revenue breakdown
        cy.get('[data-testid="revenue-breakdown"]').should('be.visible')
        cy.get('[data-testid="breakdown-item"]').should('have.length.at.least', 1)
        
        // Each breakdown item should show details
        cy.get('[data-testid="breakdown-item"]').first().within(() => {
          cy.get('[data-testid="sale-date"]').should('be.visible')
          cy.get('[data-testid="sale-amount"]').should('be.visible')
          cy.get('[data-testid="commission-amount"]').should('be.visible')
          cy.get('[data-testid="net-earnings"]').should('be.visible')
        })
        
        // Should show revenue charts
        cy.get('[data-testid="revenue-chart"]').should('be.visible')
        cy.get('[data-testid="commission-chart"]').should('be.visible')
        cy.get('[data-testid="earnings-trend"]').should('be.visible')
      })
    })

    it('should support multiple payment methods', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to training hub
        cy.get('[data-testid="nav-training-hub"]').click()
        
        // Click on paid content
        cy.get('[data-testid="content-card"]').first().click()
        
        // Click purchase button
        cy.get('[data-testid="button-purchase-content"]').click()
        
        // Proceed to payment
        cy.get('[data-testid="button-proceed-payment"]').click()
        
        // Should show multiple payment methods
        cy.get('[data-testid="payment-methods"]').should('be.visible')
        cy.get('[data-testid="method-credit-card"]').should('be.visible')
        cy.get('[data-testid="method-paypal"]').should('be.visible')
        cy.get('[data-testid="method-bank-transfer"]').should('be.visible')
        cy.get('[data-testid="method-apple-pay"]').should('be.visible')
        cy.get('[data-testid="method-google-pay"]').should('be.visible')
        
        // Test credit card payment
        cy.get('[data-testid="method-credit-card"]').click()
        cy.get('[data-testid="credit-card-form"]').should('be.visible')
        
        // Test PayPal payment
        cy.get('[data-testid="method-paypal"]').click()
        cy.get('[data-testid="paypal-button"]').should('be.visible')
        
        // Test Apple Pay
        cy.get('[data-testid="method-apple-pay"]').click()
        cy.get('[data-testid="apple-pay-button"]').should('be.visible')
        
        // Test Google Pay
        cy.get('[data-testid="method-google-pay"]').click()
        cy.get('[data-testid="google-pay-button"]').should('be.visible')
      })
    })
  })
})
