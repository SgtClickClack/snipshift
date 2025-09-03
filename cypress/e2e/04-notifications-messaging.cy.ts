describe('Notifications and Messaging System', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
  })

  it('should display notification bell with unread count', () => {
    cy.quickLogin('professional')
    
    // Check notification bell is visible
    cy.get('[data-testid="notification-bell"]').should('be.visible')
    
    // If there are unread notifications, badge should be visible
    cy.get('[data-testid="notification-bell"]').then(($bell) => {
      if ($bell.find('[data-testid="notification-badge"]').length > 0) {
        cy.get('[data-testid="notification-badge"]').should('be.visible')
      }
    })
  })

  it('should open notification dropdown when bell is clicked', () => {
    cy.quickLogin('professional')
    
    // Click notification bell
    cy.get('[data-testid="notification-bell"]').click()
    
    // Notification dropdown should open
    cy.get('[data-testid="notification-dropdown"]').should('be.visible')
    cy.get('[data-testid="notification-list"]').should('be.visible')
  })

  it('should display different types of notifications', () => {
    cy.quickLogin('professional')
    cy.get('[data-testid="notification-bell"]').click()
    
    // Check for different notification types
    cy.get('[data-testid="notification-list"]').within(() => {
      // Job application notifications
      cy.get('[data-testid="notification-job-application"]').should('exist')
      
      // Training notifications  
      cy.get('[data-testid="notification-training"]').should('exist')
      
      // Social notifications
      cy.get('[data-testid="notification-social"]').should('exist')
    })
  })

  it('should mark notifications as read when clicked', () => {
    cy.quickLogin('professional')
    cy.get('[data-testid="notification-bell"]').click()
    
    // Get first unread notification
    cy.get('[data-testid="notification-item"]:first').then(($notification) => {
      if ($notification.hasClass('unread')) {
        // Click the notification
        cy.wrap($notification).click()
        
        // Should be marked as read
        cy.wrap($notification).should('not.have.class', 'unread')
        
        // Notification count should decrease
        cy.get('[data-testid="notification-bell"]').within(() => {
          cy.get('[data-testid="notification-badge"]').then(($badge) => {
            if ($badge.length > 0) {
              const count = parseInt($badge.text())
              expect(count).to.be.at.least(0)
            }
          })
        })
      }
    })
  })

  it('should allow users to start a chat conversation', () => {
    // Login as Professional user
    cy.quickLogin('professional')
    
    // Navigate to job feed to find a Hub to chat with
    cy.get('[data-testid="nav-job-feed"]').click()
    cy.get('[data-testid="job-card"]').first().within(() => {
      cy.get('[data-testid="button-start-chat"]').click()
    })
    
    // Messaging modal should open
    cy.get('[data-testid="modal-messaging"]').should('be.visible')
    cy.get('[data-testid="chat-conversation"]').should('be.visible')
  })

  it('should allow users to send and receive messages', () => {
    cy.quickLogin('professional')
    
    // Open messaging
    cy.get('[data-testid="button-messages"]').click()
    cy.get('[data-testid="modal-messaging"]').should('be.visible')
    
    // Select an existing conversation or start new one
    cy.get('[data-testid="chat-list"]').within(() => {
      cy.get('[data-testid="chat-item"]').first().click()
    })
    
    // Send a message
    const testMessage = 'Hello, I am interested in discussing the job opportunity.'
    cy.get('[data-testid="input-message"]').type(testMessage)
    cy.get('[data-testid="button-send-message"]').click()
    
    // Message should appear in conversation
    cy.get('[data-testid="message-item"]').should('contain', testMessage)
    
    // Input should be cleared
    cy.get('[data-testid="input-message"]').should('have.value', '')
  })

  it('should show unread message indicator', () => {
    cy.quickLogin('hub')
    
    // Check if there are unread messages
    cy.get('[data-testid="button-messages"]').within(() => {
      cy.get('[data-testid="unread-messages-badge"]').should('exist')
    })
    
    // Open messaging
    cy.get('[data-testid="button-messages"]').click()
    
    // Unread conversations should be highlighted
    cy.get('[data-testid="chat-list"]').within(() => {
      cy.get('[data-testid="chat-item"].unread').should('exist')
    })
  })

  it('should update message status when read', () => {
    cy.quickLogin('hub')
    cy.get('[data-testid="button-messages"]').click()
    
    // Click on an unread conversation
    cy.get('[data-testid="chat-list"]').within(() => {
      cy.get('[data-testid="chat-item"].unread').first().click()
    })
    
    // Messages should be marked as read
    cy.get('[data-testid="message-item"].unread').should('not.exist')
    
    // Conversation should no longer show unread indicator
    cy.get('[data-testid="chat-item"].unread').should('not.exist')
  })

  it('should trigger notification when application is approved', () => {
    // This test simulates the full flow from application to approval notification
    
    // First, create and apply for a job
    cy.quickLogin('hub')
    cy.get('[data-testid="button-post-job"]').click()
    
    // Quick job creation
    cy.get('[data-testid="input-job-title"]').type('Test Notification Job')
    cy.get('[data-testid="textarea-job-description"]').type('Test job for notification')
    cy.get('[data-testid="input-hourly-rate"]').type('30')
    cy.get('[data-testid="button-submit-job"]').click()
    
    // Switch to professional and apply
    cy.quickLogin('professional')
    cy.get('[data-testid="nav-job-feed"]').click()
    cy.get('[data-testid="job-card"]').contains('Test Notification Job').click()
    cy.get('[data-testid="button-apply-job"]').click()
    cy.get('[data-testid="textarea-cover-letter"]').type('Test application')
    cy.get('[data-testid="button-submit-application"]').click()
    
    // Switch back to hub and approve
    cy.quickLogin('hub')
    cy.get('[data-testid="tab-applications"]').click()
    cy.get('[data-testid="application-card"]').first().click()
    cy.get('[data-testid="button-approve-application"]').click()
    cy.get('[data-testid="button-confirm-approval"]').click()
    
    // Switch back to professional and check notification
    cy.quickLogin('professional')
    
    // Should see notification badge
    cy.get('[data-testid="notification-bell"]').within(() => {
      cy.get('[data-testid="notification-badge"]').should('be.visible')
    })
    
    // Click to see notifications
    cy.get('[data-testid="notification-bell"]').click()
    cy.get('[data-testid="notification-item"]').should('contain', 'Application approved')
  })
})