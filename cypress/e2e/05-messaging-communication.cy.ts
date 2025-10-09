describe('Messaging & Communication - SnipShift V2', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  describe('Real-Time Messaging', () => {
    it('should allow users to send and receive messages in real-time', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        const shopUser = data.users.shop
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to messaging
        cy.get('[data-testid="nav-messaging"]').click()
        
        // Start new conversation
        cy.get('[data-testid="button-new-message"]').click()
        cy.get('[data-testid="modal-new-message"]').should('be.visible')
        
        // Select recipient
        cy.get('[data-testid="input-recipient"]').type(shopUser.displayName)
        cy.get('[data-testid="recipient-suggestion"]').first().click()
        
        // Send message
        cy.get('[data-testid="textarea-message"]').type('Hi, I\'m interested in the shift you posted. Are you still looking for someone?')
        cy.get('[data-testid="button-send-message"]').click()
        
        // Should show message sent
        cy.get('[data-testid="message-sent"]').should('be.visible')
        cy.get('[data-testid="message-content"]').should('contain', 'Hi, I\'m interested in the shift you posted')
        cy.get('[data-testid="message-timestamp"]').should('be.visible')
        
        // Switch to shop user to receive message
        cy.login(shopUser.email, shopUser.password)
        cy.get('[data-testid="nav-messaging"]').click()
        
        // Should see new message
        cy.get('[data-testid="conversation-item"]').should('contain', barberUser.displayName)
        cy.get('[data-testid="unread-indicator"]').should('be.visible')
        cy.get('[data-testid="message-preview"]').should('contain', 'Hi, I\'m interested in the shift')
        
        // Click on conversation
        cy.get('[data-testid="conversation-item"]').first().click()
        cy.get('[data-testid="chat-messages"]').should('be.visible')
        cy.get('[data-testid="received-message"]').should('contain', 'Hi, I\'m interested in the shift you posted')
      })
    })

    it('should allow users to start conversations with other users', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        const shopUser = data.users.shop
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to messaging
        cy.get('[data-testid="nav-messaging"]').click()
        
        // Start new conversation
        cy.get('[data-testid="button-new-message"]').click()
        cy.get('[data-testid="modal-new-message"]').should('be.visible')
        
        // Search for user
        cy.get('[data-testid="input-recipient"]').type(shopUser.displayName)
        cy.get('[data-testid="recipient-suggestion"]').should('be.visible')
        cy.get('[data-testid="recipient-suggestion"]').first().click()
        
        // Should show recipient selected
        cy.get('[data-testid="selected-recipient"]').should('contain', shopUser.displayName)
        cy.get('[data-testid="recipient-role"]').should('contain', 'Shop')
        cy.get('[data-testid="recipient-avatar"]').should('be.visible')
        
        // Type message
        cy.get('[data-testid="textarea-message"]').type('Hello! I wanted to discuss a potential collaboration.')
        
        // Send message
        cy.get('[data-testid="button-send-message"]').click()
        
        // Should create new conversation
        cy.get('[data-testid="conversation-created"]').should('be.visible')
        cy.get('[data-testid="conversation-title"]').should('contain', shopUser.displayName)
        cy.get('[data-testid="chat-messages"]').should('be.visible')
      })
    })

    it('should allow users to send text messages, images, and files', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        const shopUser = data.users.shop
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to messaging
        cy.get('[data-testid="nav-messaging"]').click()
        
        // Start conversation with shop user
        cy.get('[data-testid="button-new-message"]').click()
        cy.get('[data-testid="input-recipient"]').type(shopUser.displayName)
        cy.get('[data-testid="recipient-suggestion"]').first().click()
        
        // Send text message
        cy.get('[data-testid="textarea-message"]').type('Here are some samples of my work.')
        cy.get('[data-testid="button-send-message"]').click()
        
        // Send image
        cy.get('[data-testid="button-attach-file"]').click()
        cy.get('[data-testid="input-file-upload"]').selectFile('cypress/fixtures/work-sample-1.jpg')
        cy.get('[data-testid="file-preview"]').should('be.visible')
        cy.get('[data-testid="button-send-file"]').click()
        
        // Should show image message
        cy.get('[data-testid="image-message"]').should('be.visible')
        cy.get('[data-testid="image-preview"]').should('be.visible')
        cy.get('[data-testid="image-caption"]').should('contain', 'work-sample-1.jpg')
        
        // Send document
        cy.get('[data-testid="button-attach-file"]').click()
        cy.get('[data-testid="input-file-upload"]').selectFile('cypress/fixtures/resume.pdf')
        cy.get('[data-testid="file-preview"]').should('be.visible')
        cy.get('[data-testid="button-send-file"]').click()
        
        // Should show document message
        cy.get('[data-testid="document-message"]').should('be.visible')
        cy.get('[data-testid="document-name"]').should('contain', 'resume.pdf')
        cy.get('[data-testid="document-size"]').should('be.visible')
        cy.get('[data-testid="button-download-document"]').should('be.visible')
      })
    })

    it('should show message delivery and read status', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        const shopUser = data.users.shop
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to messaging
        cy.get('[data-testid="nav-messaging"]').click()
        
        // Start conversation
        cy.get('[data-testid="button-new-message"]').click()
        cy.get('[data-testid="input-recipient"]').type(shopUser.displayName)
        cy.get('[data-testid="recipient-suggestion"]').first().click()
        
        // Send message
        cy.get('[data-testid="textarea-message"]').type('Test message for delivery status')
        cy.get('[data-testid="button-send-message"]').click()
        
        // Should show delivery status
        cy.get('[data-testid="message-status"]').should('contain', 'Delivered')
        cy.get('[data-testid="delivery-timestamp"]').should('be.visible')
        
        // Switch to shop user to read message
        cy.login(shopUser.email, shopUser.password)
        cy.get('[data-testid="nav-messaging"]').click()
        cy.get('[data-testid="conversation-item"]').first().click()
        
        // Should show message as read
        cy.get('[data-testid="message-status"]').should('contain', 'Read')
        cy.get('[data-testid="read-timestamp"]').should('be.visible')
        
        // Switch back to barber to see read status
        cy.login(barberUser.email, barberUser.password)
        cy.get('[data-testid="nav-messaging"]').click()
        cy.get('[data-testid="conversation-item"]').first().click()
        
        // Should show message as read
        cy.get('[data-testid="message-status"]').should('contain', 'Read')
        cy.get('[data-testid="read-indicator"]').should('be.visible')
      })
    })

    it('should allow users to view conversation history', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        const shopUser = data.users.shop
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to messaging
        cy.get('[data-testid="nav-messaging"]').click()
        
        // Start conversation
        cy.get('[data-testid="button-new-message"]').click()
        cy.get('[data-testid="input-recipient"]').type(shopUser.displayName)
        cy.get('[data-testid="recipient-suggestion"]').first().click()
        
        // Send multiple messages
        cy.get('[data-testid="textarea-message"]').type('First message')
        cy.get('[data-testid="button-send-message"]').click()
        
        cy.get('[data-testid="textarea-message"]').type('Second message')
        cy.get('[data-testid="button-send-message"]').click()
        
        cy.get('[data-testid="textarea-message"]').type('Third message')
        cy.get('[data-testid="button-send-message"]').click()
        
        // Should show conversation history
        cy.get('[data-testid="chat-messages"]').should('be.visible')
        cy.get('[data-testid="message-item"]').should('have.length', 3)
        cy.get('[data-testid="message-item"]').first().should('contain', 'First message')
        cy.get('[data-testid="message-item"]').eq(1).should('contain', 'Second message')
        cy.get('[data-testid="message-item"]').last().should('contain', 'Third message')
        
        // Should show timestamps
        cy.get('[data-testid="message-timestamp"]').should('have.length', 3)
        cy.get('[data-testid="message-timestamp"]').each(($timestamp) => {
          cy.wrap($timestamp).should('be.visible')
        })
      })
    })

    it('should allow users to search through message history', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        const shopUser = data.users.shop
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to messaging
        cy.get('[data-testid="nav-messaging"]').click()
        
        // Start conversation
        cy.get('[data-testid="button-new-message"]').click()
        cy.get('[data-testid="input-recipient"]').type(shopUser.displayName)
        cy.get('[data-testid="recipient-suggestion"]').first().click()
        
        // Send messages with different content
        cy.get('[data-testid="textarea-message"]').type('I can work on Monday and Tuesday')
        cy.get('[data-testid="button-send-message"]').click()
        
        cy.get('[data-testid="textarea-message"]').type('My hourly rate is $35')
        cy.get('[data-testid="button-send-message"]').click()
        
        cy.get('[data-testid="textarea-message"]').type('I have 5 years of experience')
        cy.get('[data-testid="button-send-message"]').click()
        
        // Search for specific message
        cy.get('[data-testid="button-search-messages"]').click()
        cy.get('[data-testid="input-search-messages"]').type('hourly rate')
        cy.get('[data-testid="button-search"]').click()
        
        // Should show search results
        cy.get('[data-testid="search-results"]').should('be.visible')
        cy.get('[data-testid="search-result"]').should('contain', 'My hourly rate is $35')
        cy.get('[data-testid="search-highlight"]').should('contain', 'hourly rate')
        
        // Clear search
        cy.get('[data-testid="button-clear-search"]').click()
        cy.get('[data-testid="chat-messages"]').should('be.visible')
      })
    })

    it('should allow users to block and report other users', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        const shopUser = data.users.shop
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to messaging
        cy.get('[data-testid="nav-messaging"]').click()
        
        // Start conversation
        cy.get('[data-testid="button-new-message"]').click()
        cy.get('[data-testid="input-recipient"]').type(shopUser.displayName)
        cy.get('[data-testid="recipient-suggestion"]').first().click()
        
        // Block user
        cy.get('[data-testid="button-user-actions"]').click()
        cy.get('[data-testid="button-block-user"]').click()
        cy.get('[data-testid="modal-block-user"]').should('be.visible')
        cy.get('[data-testid="textarea-block-reason"]').type('Inappropriate behavior')
        cy.get('[data-testid="button-confirm-block"]').click()
        
        // Should show block confirmation
        cy.get('[data-testid="toast-success"]').should('contain', 'User blocked successfully')
        cy.get('[data-testid="blocked-indicator"]').should('be.visible')
        cy.get('[data-testid="blocked-message"]').should('contain', 'You have blocked this user')
        
        // Report user
        cy.get('[data-testid="button-user-actions"]').click()
        cy.get('[data-testid="button-report-user"]').click()
        cy.get('[data-testid="modal-report-user"]').should('be.visible')
        cy.get('[data-testid="select-report-reason"]').click()
        cy.get('[data-testid="option-harassment"]').click()
        cy.get('[data-testid="textarea-report-details"]').type('User sent inappropriate messages')
        cy.get('[data-testid="button-submit-report"]').click()
        
        // Should show report confirmation
        cy.get('[data-testid="toast-success"]').should('contain', 'Report submitted successfully')
      })
    })

    it('should send push notifications for new messages', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        const shopUser = data.users.shop
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Enable push notifications
        cy.get('[data-testid="user-menu"]').click()
        cy.get('[data-testid="link-settings"]').click()
        cy.get('[data-testid="tab-notifications"]').click()
        cy.get('[data-testid="toggle-push-notifications"]').click()
        cy.get('[data-testid="toggle-message-notifications"]').click()
        cy.get('[data-testid="button-save-settings"]').click()
        
        // Navigate to messaging
        cy.get('[data-testid="nav-messaging"]').click()
        
        // Start conversation
        cy.get('[data-testid="button-new-message"]').click()
        cy.get('[data-testid="input-recipient"]').type(shopUser.displayName)
        cy.get('[data-testid="recipient-suggestion"]').first().click()
        
        // Send message
        cy.get('[data-testid="textarea-message"]').type('Test message for notifications')
        cy.get('[data-testid="button-send-message"]').click()
        
        // Switch to shop user
        cy.login(shopUser.email, shopUser.password)
        
        // Should receive push notification
        cy.get('[data-testid="notification-bell"]').click()
        cy.get('[data-testid="notification-dropdown"]').should('be.visible')
        cy.get('[data-testid="notification-item"]').should('contain', 'New Message')
        cy.get('[data-testid="notification-message"]').should('contain', 'Test message for notifications')
        
        // Click notification to open conversation
        cy.get('[data-testid="notification-item"]').first().click()
        cy.get('[data-testid="chat-messages"]').should('be.visible')
        cy.get('[data-testid="received-message"]').should('contain', 'Test message for notifications')
      })
    })

    it('should allow users to set message notification preferences', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Go to settings
        cy.get('[data-testid="user-menu"]').click()
        cy.get('[data-testid="link-settings"]').click()
        cy.get('[data-testid="tab-notifications"]').click()
        
        // Configure message notifications
        cy.get('[data-testid="toggle-message-notifications"]').click()
        cy.get('[data-testid="select-notification-sound"]').click()
        cy.get('[data-testid="option-chime"]').click()
        cy.get('[data-testid="toggle-desktop-notifications"]').click()
        cy.get('[data-testid="toggle-email-notifications"]').click()
        cy.get('[data-testid="select-notification-frequency"]').click()
        cy.get('[data-testid="option-immediate"]').click()
        
        // Set quiet hours
        cy.get('[data-testid="toggle-quiet-hours"]').click()
        cy.get('[data-testid="input-quiet-start"]').type('22:00')
        cy.get('[data-testid="input-quiet-end"]').type('08:00')
        
        // Save settings
        cy.get('[data-testid="button-save-settings"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Notification settings saved successfully')
        
        // Should show updated settings
        cy.get('[data-testid="notification-settings-summary"]').should('contain', 'Notifications enabled')
        cy.get('[data-testid="notification-settings-summary"]').should('contain', 'Quiet hours: 10:00 PM - 8:00 AM')
      })
    })

    it('should maintain message encryption and privacy', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        const shopUser = data.users.shop
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to messaging
        cy.get('[data-testid="nav-messaging"]').click()
        
        // Start conversation
        cy.get('[data-testid="button-new-message"]').click()
        cy.get('[data-testid="input-recipient"]').type(shopUser.displayName)
        cy.get('[data-testid="recipient-suggestion"]').first().click()
        
        // Send message
        cy.get('[data-testid="textarea-message"]').type('This is a private message')
        cy.get('[data-testid="button-send-message"]').click()
        
        // Should show encryption indicators
        cy.get('[data-testid="encryption-indicator"]').should('be.visible')
        cy.get('[data-testid="encryption-status"]').should('contain', 'End-to-end encrypted')
        cy.get('[data-testid="privacy-badge"]').should('contain', 'Private')
        
        // Should show message security
        cy.get('[data-testid="message-security"]').should('be.visible')
        cy.get('[data-testid="security-features"]').should('contain', 'Encrypted')
        cy.get('[data-testid="security-features"]').should('contain', 'Secure')
        cy.get('[data-testid="security-features"]').should('contain', 'Private')
      })
    })
  })

  describe('Chat Management', () => {
    it('should allow users to view all active conversations', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        const shopUser = data.users.shop
        const trainerUser = data.users.trainer
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to messaging
        cy.get('[data-testid="nav-messaging"]').click()
        
        // Start multiple conversations
        cy.get('[data-testid="button-new-message"]').click()
        cy.get('[data-testid="input-recipient"]').type(shopUser.displayName)
        cy.get('[data-testid="recipient-suggestion"]').first().click()
        cy.get('[data-testid="textarea-message"]').type('Message to shop')
        cy.get('[data-testid="button-send-message"]').click()
        
        cy.get('[data-testid="button-new-message"]').click()
        cy.get('[data-testid="input-recipient"]').type(trainerUser.displayName)
        cy.get('[data-testid="recipient-suggestion"]').first().click()
        cy.get('[data-testid="textarea-message"]').type('Message to trainer')
        cy.get('[data-testid="button-send-message"]').click()
        
        // Should see all conversations
        cy.get('[data-testid="conversations-list"]').should('be.visible')
        cy.get('[data-testid="conversation-item"]').should('have.length.at.least', 2)
        
        // Each conversation should show details
        cy.get('[data-testid="conversation-item"]').first().within(() => {
          cy.get('[data-testid="conversation-name"]').should('be.visible')
          cy.get('[data-testid="conversation-preview"]').should('be.visible')
          cy.get('[data-testid="conversation-timestamp"]').should('be.visible')
          cy.get('[data-testid="conversation-avatar"]').should('be.visible')
        })
      })
    })

    it('should allow users to organize conversations by priority', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        const shopUser = data.users.shop
        const trainerUser = data.users.trainer
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to messaging
        cy.get('[data-testid="nav-messaging"]').click()
        
        // Start conversations
        cy.get('[data-testid="button-new-message"]').click()
        cy.get('[data-testid="input-recipient"]').type(shopUser.displayName)
        cy.get('[data-testid="recipient-suggestion"]').first().click()
        cy.get('[data-testid="textarea-message"]').type('Message to shop')
        cy.get('[data-testid="button-send-message"]').click()
        
        cy.get('[data-testid="button-new-message"]').click()
        cy.get('[data-testid="input-recipient"]').type(trainerUser.displayName)
        cy.get('[data-testid="recipient-suggestion"]').first().click()
        cy.get('[data-testid="textarea-message"]').type('Message to trainer')
        cy.get('[data-testid="button-send-message"]').click()
        
        // Set priority for first conversation
        cy.get('[data-testid="conversation-item"]').first().within(() => {
          cy.get('[data-testid="button-conversation-actions"]').click()
          cy.get('[data-testid="button-set-priority"]').click()
          cy.get('[data-testid="option-high-priority"]').click()
        })
        
        // Should show priority indicator
        cy.get('[data-testid="priority-indicator"]').should('be.visible')
        cy.get('[data-testid="priority-badge"]').should('contain', 'High Priority')
        
        // Should sort conversations by priority
        cy.get('[data-testid="sort-conversations"]').click()
        cy.get('[data-testid="option-sort-by-priority"]').click()
        cy.get('[data-testid="conversation-item"]').first().should('have.class', 'high-priority')
      })
    })

    it('should allow users to archive old conversations', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        const shopUser = data.users.shop
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to messaging
        cy.get('[data-testid="nav-messaging"]').click()
        
        // Start conversation
        cy.get('[data-testid="button-new-message"]').click()
        cy.get('[data-testid="input-recipient"]').type(shopUser.displayName)
        cy.get('[data-testid="recipient-suggestion"]').first().click()
        cy.get('[data-testid="textarea-message"]').type('Old conversation')
        cy.get('[data-testid="button-send-message"]').click()
        
        // Archive conversation
        cy.get('[data-testid="conversation-item"]').first().within(() => {
          cy.get('[data-testid="button-conversation-actions"]').click()
          cy.get('[data-testid="button-archive-conversation"]').click()
        })
        
        // Should show archive confirmation
        cy.get('[data-testid="modal-archive-confirmation"]').should('be.visible')
        cy.get('[data-testid="button-confirm-archive"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Conversation archived successfully')
        
        // Should not appear in active conversations
        cy.get('[data-testid="conversation-item"]').should('not.contain', 'Old conversation')
        
        // Should appear in archived conversations
        cy.get('[data-testid="tab-archived"]').click()
        cy.get('[data-testid="archived-conversation"]').should('contain', 'Old conversation')
      })
    })

    it('should allow users to delete conversations and messages', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        const shopUser = data.users.shop
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to messaging
        cy.get('[data-testid="nav-messaging"]').click()
        
        // Start conversation
        cy.get('[data-testid="button-new-message"]').click()
        cy.get('[data-testid="input-recipient"]').type(shopUser.displayName)
        cy.get('[data-testid="recipient-suggestion"]').first().click()
        cy.get('[data-testid="textarea-message"]').type('Message to delete')
        cy.get('[data-testid="button-send-message"]').click()
        
        // Delete specific message
        cy.get('[data-testid="message-item"]').first().within(() => {
          cy.get('[data-testid="button-message-actions"]').click()
          cy.get('[data-testid="button-delete-message"]').click()
        })
        
        // Should show delete confirmation
        cy.get('[data-testid="modal-delete-message"]').should('be.visible')
        cy.get('[data-testid="button-confirm-delete"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Message deleted successfully')
        
        // Should not show deleted message
        cy.get('[data-testid="message-item"]').should('not.contain', 'Message to delete')
        
        // Delete entire conversation
        cy.get('[data-testid="button-conversation-actions"]').click()
        cy.get('[data-testid="button-delete-conversation"]').click()
        cy.get('[data-testid="modal-delete-conversation"]').should('be.visible')
        cy.get('[data-testid="button-confirm-delete"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Conversation deleted successfully')
        
        // Should not show deleted conversation
        cy.get('[data-testid="conversation-item"]').should('not.contain', shopUser.displayName)
      })
    })

    it('should allow users to create group conversations', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        const shopUser = data.users.shop
        const trainerUser = data.users.trainer
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to messaging
        cy.get('[data-testid="nav-messaging"]').click()
        
        // Create group conversation
        cy.get('[data-testid="button-new-message"]').click()
        cy.get('[data-testid="button-create-group"]').click()
        cy.get('[data-testid="modal-create-group"]').should('be.visible')
        
        // Set group name
        cy.get('[data-testid="input-group-name"]').type('Project Collaboration')
        
        // Add participants
        cy.get('[data-testid="input-add-participant"]').type(shopUser.displayName)
        cy.get('[data-testid="participant-suggestion"]').first().click()
        cy.get('[data-testid="input-add-participant"]').type(trainerUser.displayName)
        cy.get('[data-testid="participant-suggestion"]').first().click()
        
        // Should show participants
        cy.get('[data-testid="group-participants"]').should('contain', shopUser.displayName)
        cy.get('[data-testid="group-participants"]').should('contain', trainerUser.displayName)
        
        // Create group
        cy.get('[data-testid="button-create-group"]').click()
        
        // Should show group conversation
        cy.get('[data-testid="group-conversation"]').should('be.visible')
        cy.get('[data-testid="group-name"]').should('contain', 'Project Collaboration')
        cy.get('[data-testid="group-participants-count"]').should('contain', '3 participants')
        
        // Send message to group
        cy.get('[data-testid="textarea-message"]').type('Hello everyone!')
        cy.get('[data-testid="button-send-message"]').click()
        
        // Should show message in group
        cy.get('[data-testid="group-message"]').should('contain', 'Hello everyone!')
      })
    })

    it('should allow users to add/remove participants from group chats', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        const shopUser = data.users.shop
        const trainerUser = data.users.trainer
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to messaging
        cy.get('[data-testid="nav-messaging"]').click()
        
        // Create group conversation
        cy.get('[data-testid="button-new-message"]').click()
        cy.get('[data-testid="button-create-group"]').click()
        cy.get('[data-testid="input-group-name"]').type('Test Group')
        cy.get('[data-testid="input-add-participant"]').type(shopUser.displayName)
        cy.get('[data-testid="participant-suggestion"]').first().click()
        cy.get('[data-testid="button-create-group"]').click()
        
        // Add participant
        cy.get('[data-testid="button-group-actions"]').click()
        cy.get('[data-testid="button-manage-participants"]').click()
        cy.get('[data-testid="modal-manage-participants"]').should('be.visible')
        
        cy.get('[data-testid="input-add-participant"]').type(trainerUser.displayName)
        cy.get('[data-testid="participant-suggestion"]').first().click()
        cy.get('[data-testid="button-add-participant"]').click()
        
        // Should show added participant
        cy.get('[data-testid="participant-list"]').should('contain', trainerUser.displayName)
        cy.get('[data-testid="participant-count"]').should('contain', '3 participants')
        
        // Remove participant
        cy.get('[data-testid="participant-item"]').contains(trainerUser.displayName).within(() => {
          cy.get('[data-testid="button-remove-participant"]').click()
        })
        
        // Should show remove confirmation
        cy.get('[data-testid="modal-remove-participant"]').should('be.visible')
        cy.get('[data-testid="button-confirm-remove"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Participant removed successfully')
        
        // Should not show removed participant
        cy.get('[data-testid="participant-list"]').should('not.contain', trainerUser.displayName)
        cy.get('[data-testid="participant-count"]').should('contain', '2 participants')
      })
    })

    it('should allow users to set conversation names and descriptions', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        const shopUser = data.users.shop
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to messaging
        cy.get('[data-testid="nav-messaging"]').click()
        
        // Start conversation
        cy.get('[data-testid="button-new-message"]').click()
        cy.get('[data-testid="input-recipient"]').type(shopUser.displayName)
        cy.get('[data-testid="recipient-suggestion"]').first().click()
        cy.get('[data-testid="textarea-message"]').type('Initial message')
        cy.get('[data-testid="button-send-message"]').click()
        
        // Set conversation name
        cy.get('[data-testid="button-conversation-actions"]').click()
        cy.get('[data-testid="button-edit-conversation"]').click()
        cy.get('[data-testid="modal-edit-conversation"]').should('be.visible')
        
        cy.get('[data-testid="input-conversation-name"]').clear().type('Shift Discussion')
        cy.get('[data-testid="textarea-conversation-description"]').type('Discussion about the weekend shift opportunity')
        
        // Save changes
        cy.get('[data-testid="button-save-conversation"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Conversation updated successfully')
        
        // Should show updated name
        cy.get('[data-testid="conversation-name"]').should('contain', 'Shift Discussion')
        cy.get('[data-testid="conversation-description"]').should('contain', 'Discussion about the weekend shift opportunity')
      })
    })

    it('should allow users to mute conversation notifications', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        const shopUser = data.users.shop
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to messaging
        cy.get('[data-testid="nav-messaging"]').click()
        
        // Start conversation
        cy.get('[data-testid="button-new-message"]').click()
        cy.get('[data-testid="input-recipient"]').type(shopUser.displayName)
        cy.get('[data-testid="recipient-suggestion"]').first().click()
        cy.get('[data-testid="textarea-message"]').type('Initial message')
        cy.get('[data-testid="button-send-message"]').click()
        
        // Mute conversation
        cy.get('[data-testid="button-conversation-actions"]').click()
        cy.get('[data-testid="button-mute-conversation"]').click()
        cy.get('[data-testid="modal-mute-conversation"]').should('be.visible')
        
        // Set mute duration
        cy.get('[data-testid="select-mute-duration"]').click()
        cy.get('[data-testid="option-1-hour"]').click()
        cy.get('[data-testid="button-confirm-mute"]').click()
        
        // Should show success message
        cy.get('[data-testid="toast-success"]').should('contain', 'Conversation muted successfully')
        
        // Should show mute indicator
        cy.get('[data-testid="mute-indicator"]').should('be.visible')
        cy.get('[data-testid="mute-status"]').should('contain', 'Muted for 1 hour')
        
        // Should not show notification badge
        cy.get('[data-testid="notification-badge"]').should('not.exist')
      })
    })

    it('should maintain chat data integrity and backup', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        const shopUser = data.users.shop
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to messaging
        cy.get('[data-testid="nav-messaging"]').click()
        
        // Start conversation
        cy.get('[data-testid="button-new-message"]').click()
        cy.get('[data-testid="input-recipient"]').type(shopUser.displayName)
        cy.get('[data-testid="recipient-suggestion"]').first().click()
        cy.get('[data-testid="textarea-message"]').type('Important message')
        cy.get('[data-testid="button-send-message"]').click()
        
        // Should show data integrity indicators
        cy.get('[data-testid="data-integrity"]').should('be.visible')
        cy.get('[data-testid="backup-status"]').should('contain', 'Backed up')
        cy.get('[data-testid="sync-status"]').should('contain', 'Synced')
        cy.get('[data-testid="encryption-status"]').should('contain', 'Encrypted')
        
        // Should show message integrity
        cy.get('[data-testid="message-item"]').first().within(() => {
          cy.get('[data-testid="message-integrity"]').should('be.visible')
          cy.get('[data-testid="message-hash"]').should('be.visible')
          cy.get('[data-testid="message-verified"]').should('contain', 'Verified')
        })
      })
    })

    it('should handle offline message delivery', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        const shopUser = data.users.shop
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to messaging
        cy.get('[data-testid="nav-messaging"]').click()
        
        // Start conversation
        cy.get('[data-testid="button-new-message"]').click()
        cy.get('[data-testid="input-recipient"]').type(shopUser.displayName)
        cy.get('[data-testid="recipient-suggestion"]').first().click()
        
        // Simulate offline mode
        cy.intercept('POST', '/api/chats/*/messages', { forceNetworkError: true }).as('offlineMessage')
        
        // Send message while offline
        cy.get('[data-testid="textarea-message"]').type('Message sent while offline')
        cy.get('[data-testid="button-send-message"]').click()
        
        // Should show offline status
        cy.get('[data-testid="offline-indicator"]').should('be.visible')
        cy.get('[data-testid="message-status"]').should('contain', 'Pending')
        cy.get('[data-testid="offline-message"]').should('contain', 'Message sent while offline')
        
        // Restore network
        cy.intercept('POST', '/api/chats/*/messages', { statusCode: 200 }).as('onlineMessage')
        
        // Should automatically retry sending
        cy.get('[data-testid="message-status"]').should('contain', 'Delivered')
        cy.get('[data-testid="sync-indicator"]').should('contain', 'Synced')
      })
    })
  })
})
