describe('Mobile Experience - SnipShift V2', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
    // Set mobile viewport for all tests
    cy.viewport(375, 667) // iPhone SE size
  })

  describe('Mobile App Functionality', () => {
    it('should allow users to access all core features on mobile devices', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Should show mobile-optimized interface
        cy.get('[data-testid="mobile-app"]').should('be.visible')
        cy.get('[data-testid="mobile-header"]').should('be.visible')
        cy.get('[data-testid="mobile-navigation"]').should('be.visible')
        
        // Test core features accessibility
        cy.get('[data-testid="mobile-nav-shifts"]').should('be.visible')
        cy.get('[data-testid="mobile-nav-messaging"]').should('be.visible')
        cy.get('[data-testid="mobile-nav-community"]').should('be.visible')
        cy.get('[data-testid="mobile-nav-training"]').should('be.visible')
        cy.get('[data-testid="mobile-nav-profile"]').should('be.visible')
        
        // Navigate to shifts
        cy.get('[data-testid="mobile-nav-shifts"]').click()
        cy.get('[data-testid="mobile-shifts-page"]').should('be.visible')
        cy.get('[data-testid="mobile-shift-card"]').should('have.length.at.least', 1)
        
        // Navigate to messaging
        cy.get('[data-testid="mobile-nav-messaging"]').click()
        cy.get('[data-testid="mobile-messaging-page"]').should('be.visible')
        cy.get('[data-testid="mobile-conversation-list"]').should('be.visible')
        
        // Navigate to community
        cy.get('[data-testid="mobile-nav-community"]').click()
        cy.get('[data-testid="mobile-community-page"]').should('be.visible')
        cy.get('[data-testid="mobile-social-feed"]').should('be.visible')
        
        // Navigate to training
        cy.get('[data-testid="mobile-nav-training"]').click()
        cy.get('[data-testid="mobile-training-page"]').should('be.visible')
        cy.get('[data-testid="mobile-training-content"]').should('be.visible')
        
        // Navigate to profile
        cy.get('[data-testid="mobile-nav-profile"]').click()
        cy.get('[data-testid="mobile-profile-page"]').should('be.visible')
        cy.get('[data-testid="mobile-profile-info"]').should('be.visible')
      })
    })

    it('should provide native performance and user experience', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Test page load performance
        cy.measurePageLoadPerformance(2000) // 2 second max for mobile
        
        // Test smooth scrolling
        cy.get('[data-testid="mobile-content"]').scrollTo('bottom')
        cy.get('[data-testid="mobile-content"]').should('be.visible')
        
        // Test touch interactions
        cy.get('[data-testid="mobile-button"]').first().trigger('touchstart')
        cy.get('[data-testid="mobile-button"]').first().trigger('touchend')
        cy.get('[data-testid="mobile-button"]').first().should('have.class', 'touched')
        
        // Test swipe gestures
        cy.get('[data-testid="mobile-carousel"]').trigger('touchstart', { touches: [{ clientX: 200, clientY: 300 }] })
        cy.get('[data-testid="mobile-carousel"]').trigger('touchmove', { touches: [{ clientX: 100, clientY: 300 }] })
        cy.get('[data-testid="mobile-carousel"]').trigger('touchend')
        cy.get('[data-testid="mobile-carousel"]').should('have.class', 'swiped')
        
        // Test pull-to-refresh
        cy.get('[data-testid="mobile-content"]').trigger('touchstart', { touches: [{ clientY: 100 }] })
        cy.get('[data-testid="mobile-content"]').trigger('touchmove', { touches: [{ clientY: 200 }] })
        cy.get('[data-testid="mobile-content"]').trigger('touchend')
        cy.get('[data-testid="pull-to-refresh"]').should('be.visible')
      })
    })

    it('should allow users to receive push notifications on mobile', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Enable push notifications
        cy.get('[data-testid="mobile-menu"]').click()
        cy.get('[data-testid="mobile-settings"]').click()
        cy.get('[data-testid="mobile-notifications"]').click()
        cy.get('[data-testid="toggle-push-notifications"]').click()
        cy.get('[data-testid="button-save-settings"]').click()
        
        // Should show notification permission request
        cy.get('[data-testid="notification-permission"]').should('be.visible')
        cy.get('[data-testid="button-allow-notifications"]').click()
        
        // Should show notification settings
        cy.get('[data-testid="notification-settings"]').should('be.visible')
        cy.get('[data-testid="toggle-message-notifications"]').should('be.checked')
        cy.get('[data-testid="toggle-shift-notifications"]').should('be.checked')
        cy.get('[data-testid="toggle-community-notifications"]').should('be.checked')
        
        // Test notification delivery
        cy.get('[data-testid="button-test-notification"]').click()
        cy.get('[data-testid="test-notification"]').should('be.visible')
        cy.get('[data-testid="notification-title"]').should('contain', 'Test Notification')
        cy.get('[data-testid="notification-body"]').should('contain', 'Push notifications are working')
        
        // Test notification actions
        cy.get('[data-testid="notification-action"]').click()
        cy.get('[data-testid="notification-handled"]').should('be.visible')
      })
    })

    it('should work offline with data synchronization', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Test offline functionality
        cy.testOfflineFunctionality()
        
        // Should show offline indicator
        cy.get('[data-testid="offline-indicator"]').should('be.visible')
        cy.get('[data-testid="offline-message"]').should('contain', 'You are offline')
        
        // Should show cached content
        cy.get('[data-testid="cached-content"]').should('be.visible')
        cy.get('[data-testid="cached-shifts"]').should('have.length.at.least', 1)
        cy.get('[data-testid="cached-messages"]').should('have.length.at.least', 1)
        
        // Should allow offline actions
        cy.get('[data-testid="button-offline-action"]').click()
        cy.get('[data-testid="offline-action-queued"]').should('be.visible')
        cy.get('[data-testid="queued-actions"]').should('contain', '1 action queued')
        
        // Restore network
        cy.intercept('GET', '**/*', { statusCode: 200 }).as('onlineRequest')
        
        // Should automatically sync
        cy.get('[data-testid="sync-indicator"]').should('be.visible')
        cy.get('[data-testid="sync-progress"]').should('contain', 'Syncing')
        cy.get('[data-testid="sync-complete"]').should('contain', 'Sync complete')
        cy.get('[data-testid="queued-actions"]').should('contain', '0 actions queued')
      })
    })

    it('should allow users to use location services for shift search', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to shifts
        cy.get('[data-testid="mobile-nav-shifts"]').click()
        
        // Enable location services
        cy.get('[data-testid="button-enable-location"]').click()
        cy.get('[data-testid="location-permission"]').should('be.visible')
        cy.get('[data-testid="button-allow-location"]').click()
        
        // Should show location-based shifts
        cy.get('[data-testid="location-based-shifts"]').should('be.visible')
        cy.get('[data-testid="current-location"]').should('contain', 'Sydney, NSW')
        cy.get('[data-testid="nearby-shifts"]').should('have.length.at.least', 1)
        
        // Should show distance to shifts
        cy.get('[data-testid="shift-distance"]').should('be.visible')
        cy.get('[data-testid="shift-distance"]').first().should('contain', 'km')
        
        // Should show map view
        cy.get('[data-testid="button-map-view"]').click()
        cy.get('[data-testid="mobile-map"]').should('be.visible')
        cy.get('[data-testid="map-marker"]').should('be.visible')
        cy.get('[data-testid="user-location"]').should('be.visible')
        
        // Should show directions
        cy.get('[data-testid="button-get-directions"]').click()
        cy.get('[data-testid="directions-modal"]').should('be.visible')
        cy.get('[data-testid="directions-steps"]').should('have.length.at.least', 1)
        cy.get('[data-testid="button-open-maps"]').should('be.visible')
      })
    })

    it('should support camera integration for profile pictures', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to profile
        cy.get('[data-testid="mobile-nav-profile"]').click()
        
        // Update profile picture
        cy.get('[data-testid="button-edit-profile"]').click()
        cy.get('[data-testid="button-change-photo"]').click()
        cy.get('[data-testid="photo-options"]').should('be.visible')
        
        // Test camera option
        cy.get('[data-testid="button-take-photo"]').click()
        cy.get('[data-testid="camera-permission"]').should('be.visible')
        cy.get('[data-testid="button-allow-camera"]').click()
        
        // Should show camera interface
        cy.get('[data-testid="camera-interface"]').should('be.visible')
        cy.get('[data-testid="camera-preview"]').should('be.visible')
        cy.get('[data-testid="button-capture"]').should('be.visible')
        cy.get('[data-testid="button-flip-camera"]').should('be.visible')
        
        // Mock photo capture
        cy.get('[data-testid="button-capture"]').click()
        cy.get('[data-testid="photo-preview"]').should('be.visible')
        cy.get('[data-testid="button-use-photo"]').click()
        
        // Should update profile picture
        cy.get('[data-testid="profile-picture"]').should('be.visible')
        cy.get('[data-testid="toast-success"]').should('contain', 'Profile picture updated')
        
        // Test gallery option
        cy.get('[data-testid="button-change-photo"]').click()
        cy.get('[data-testid="button-choose-from-gallery"]').click()
        cy.get('[data-testid="gallery-permission"]').should('be.visible')
        cy.get('[data-testid="button-allow-gallery"]').click()
        
        // Should show gallery interface
        cy.get('[data-testid="gallery-interface"]').should('be.visible')
        cy.get('[data-testid="gallery-photos"]').should('have.length.at.least', 1)
        cy.get('[data-testid="gallery-photos"]').first().click()
        cy.get('[data-testid="button-select-photo"]').click()
        
        // Should update profile picture
        cy.get('[data-testid="profile-picture"]').should('be.visible')
        cy.get('[data-testid="toast-success"]').should('contain', 'Profile picture updated')
      })
    })

    it('should allow users to use biometric authentication on mobile', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Enable biometric authentication
        cy.get('[data-testid="mobile-menu"]').click()
        cy.get('[data-testid="mobile-settings"]').click()
        cy.get('[data-testid="mobile-security"]').click()
        cy.get('[data-testid="toggle-biometric-auth"]').click()
        
        // Should show biometric setup
        cy.get('[data-testid="biometric-setup"]').should('be.visible')
        cy.get('[data-testid="button-setup-biometric"]').click()
        
        // Should show biometric permission
        cy.get('[data-testid="biometric-permission"]').should('be.visible')
        cy.get('[data-testid="button-allow-biometric"]').click()
        
        // Should show biometric configured
        cy.get('[data-testid="biometric-configured"]').should('be.visible')
        cy.get('[data-testid="biometric-status"]').should('contain', 'Enabled')
        
        // Test biometric login
        cy.get('[data-testid="button-logout"]').click()
        cy.get('[data-testid="mobile-login"]').should('be.visible')
        
        // Should show biometric login option
        cy.get('[data-testid="button-biometric-login"]').should('be.visible')
        cy.get('[data-testid="button-biometric-login"]').click()
        
        // Should show biometric prompt
        cy.get('[data-testid="biometric-prompt"]').should('be.visible')
        cy.get('[data-testid="biometric-icon"]').should('be.visible')
        cy.get('[data-testid="biometric-message"]').should('contain', 'Use your fingerprint to login')
        
        // Mock biometric success
        cy.get('[data-testid="button-mock-biometric"]').click()
        cy.get('[data-testid="biometric-success"]').should('be.visible')
        
        // Should login successfully
        cy.get('[data-testid="mobile-dashboard"]').should('be.visible')
        cy.get('[data-testid="toast-success"]').should('contain', 'Login successful')
      })
    })

    it('should provide seamless navigation and gestures', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Test bottom navigation
        cy.get('[data-testid="mobile-bottom-nav"]').should('be.visible')
        cy.get('[data-testid="mobile-nav-item"]').should('have.length', 5)
        
        // Test navigation transitions
        cy.get('[data-testid="mobile-nav-shifts"]').click()
        cy.get('[data-testid="mobile-shifts-page"]').should('be.visible')
        cy.get('[data-testid="page-transition"]').should('have.class', 'slide-in')
        
        cy.get('[data-testid="mobile-nav-messaging"]').click()
        cy.get('[data-testid="mobile-messaging-page"]').should('be.visible')
        cy.get('[data-testid="page-transition"]').should('have.class', 'slide-in')
        
        // Test swipe navigation
        cy.get('[data-testid="mobile-content"]').trigger('touchstart', { touches: [{ clientX: 50, clientY: 300 }] })
        cy.get('[data-testid="mobile-content"]').trigger('touchmove', { touches: [{ clientX: 200, clientY: 300 }] })
        cy.get('[data-testid="mobile-content"]').trigger('touchend')
        cy.get('[data-testid="mobile-community-page"]').should('be.visible')
        
        // Test back gesture
        cy.get('[data-testid="mobile-content"]').trigger('touchstart', { touches: [{ clientX: 200, clientY: 300 }] })
        cy.get('[data-testid="mobile-content"]').trigger('touchmove', { touches: [{ clientX: 50, clientY: 300 }] })
        cy.get('[data-testid="mobile-content"]').trigger('touchend')
        cy.get('[data-testid="mobile-messaging-page"]').should('be.visible')
        
        // Test long press actions
        cy.get('[data-testid="mobile-shift-card"]').first().trigger('touchstart', { touches: [{ clientX: 200, clientY: 300 }] })
        cy.wait(1000) // Long press
        cy.get('[data-testid="mobile-shift-card"]').first().trigger('touchend')
        cy.get('[data-testid="context-menu"]').should('be.visible')
        cy.get('[data-testid="context-menu-item"]').should('have.length.at.least', 1)
      })
    })

    it('should allow users to share content from mobile app', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Navigate to shifts
        cy.get('[data-testid="mobile-nav-shifts"]').click()
        
        // Share shift
        cy.get('[data-testid="mobile-shift-card"]').first().click()
        cy.get('[data-testid="mobile-shift-details"]').should('be.visible')
        cy.get('[data-testid="button-share-shift"]').click()
        cy.get('[data-testid="share-options"]').should('be.visible')
        
        // Test native share
        cy.get('[data-testid="button-native-share"]').click()
        cy.get('[data-testid="native-share-sheet"]').should('be.visible')
        cy.get('[data-testid="share-option-message"]').should('be.visible')
        cy.get('[data-testid="share-option-email"]').should('be.visible')
        cy.get('[data-testid="share-option-social"]').should('be.visible')
        
        // Test message share
        cy.get('[data-testid="share-option-message"]').click()
        cy.get('[data-testid="message-composer"]').should('be.visible')
        cy.get('[data-testid="message-text"]').should('contain', 'Check out this shift opportunity')
        cy.get('[data-testid="button-send-message"]').click()
        cy.get('[data-testid="toast-success"]').should('contain', 'Message sent')
        
        // Test social share
        cy.get('[data-testid="button-share-shift"]').click()
        cy.get('[data-testid="share-option-social"]').click()
        cy.get('[data-testid="social-share-options"]').should('be.visible')
        cy.get('[data-testid="share-facebook"]').should('be.visible')
        cy.get('[data-testid="share-twitter"]').should('be.visible')
        cy.get('[data-testid="share-linkedin"]').should('be.visible')
        
        // Test copy link
        cy.get('[data-testid="button-copy-link"]').click()
        cy.get('[data-testid="toast-success"]').should('contain', 'Link copied to clipboard')
      })
    })

    it('should support multiple screen sizes and orientations', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Test iPhone SE (375x667)
        cy.viewport(375, 667)
        cy.get('[data-testid="mobile-app"]').should('be.visible')
        cy.get('[data-testid="mobile-content"]').should('be.visible')
        cy.get('[data-testid="mobile-bottom-nav"]').should('be.visible')
        
        // Test iPhone 12 (390x844)
        cy.viewport(390, 844)
        cy.get('[data-testid="mobile-app"]').should('be.visible')
        cy.get('[data-testid="mobile-content"]').should('be.visible')
        cy.get('[data-testid="mobile-bottom-nav"]').should('be.visible')
        
        // Test iPhone 12 Pro Max (428x926)
        cy.viewport(428, 926)
        cy.get('[data-testid="mobile-app"]').should('be.visible')
        cy.get('[data-testid="mobile-content"]').should('be.visible')
        cy.get('[data-testid="mobile-bottom-nav"]').should('be.visible')
        
        // Test landscape orientation
        cy.viewport(667, 375)
        cy.get('[data-testid="mobile-app"]').should('be.visible')
        cy.get('[data-testid="mobile-content"]').should('be.visible')
        cy.get('[data-testid="mobile-bottom-nav"]').should('be.visible')
        
        // Test tablet size
        cy.viewport(768, 1024)
        cy.get('[data-testid="mobile-app"]').should('be.visible')
        cy.get('[data-testid="mobile-content"]').should('be.visible')
        cy.get('[data-testid="mobile-bottom-nav"]').should('be.visible')
        
        // Test responsive layout changes
        cy.viewport(375, 667)
        cy.get('[data-testid="mobile-layout"]').should('have.class', 'portrait')
        cy.get('[data-testid="mobile-layout"]').should('have.class', 'small-screen')
        
        cy.viewport(667, 375)
        cy.get('[data-testid="mobile-layout"]').should('have.class', 'landscape')
        cy.get('[data-testid="mobile-layout"]').should('have.class', 'small-screen')
        
        cy.viewport(768, 1024)
        cy.get('[data-testid="mobile-layout"]').should('have.class', 'portrait')
        cy.get('[data-testid="mobile-layout"]').should('have.class', 'large-screen')
      })
    })
  })

  describe('Progressive Web App Features', () => {
    it('should allow web app to be installed on mobile devices', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Should show install prompt
        cy.get('[data-testid="install-prompt"]').should('be.visible')
        cy.get('[data-testid="install-title"]').should('contain', 'Install SnipShift')
        cy.get('[data-testid="install-description"]').should('contain', 'Add to home screen for quick access')
        cy.get('[data-testid="button-install"]').should('be.visible')
        cy.get('[data-testid="button-dismiss"]').should('be.visible')
        
        // Install app
        cy.get('[data-testid="button-install"]').click()
        cy.get('[data-testid="install-progress"]').should('be.visible')
        cy.get('[data-testid="install-status"]').should('contain', 'Installing')
        
        // Should show install complete
        cy.get('[data-testid="install-complete"]').should('be.visible')
        cy.get('[data-testid="install-success"]').should('contain', 'App installed successfully')
        cy.get('[data-testid="button-launch-app"]').should('be.visible')
        
        // Should show app icon on home screen
        cy.get('[data-testid="app-icon"]').should('be.visible')
        cy.get('[data-testid="app-name"]').should('contain', 'SnipShift')
        
        // Should show app in app drawer
        cy.get('[data-testid="app-drawer"]').should('be.visible')
        cy.get('[data-testid="app-drawer-item"]').should('contain', 'SnipShift')
      })
    })

    it('should provide app-like experience in browser', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Should show app-like interface
        cy.get('[data-testid="pwa-app"]').should('be.visible')
        cy.get('[data-testid="pwa-header"]').should('be.visible')
        cy.get('[data-testid="pwa-navigation"]').should('be.visible')
        cy.get('[data-testid="pwa-content"]').should('be.visible')
        
        // Should show app-like navigation
        cy.get('[data-testid="pwa-nav-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="pwa-nav-item"]').first().within(() => {
          cy.get('[data-testid="nav-icon"]').should('be.visible')
          cy.get('[data-testid="nav-label"]').should('be.visible')
          cy.get('[data-testid="nav-badge"]').should('be.visible')
        })
        
        // Should show app-like transitions
        cy.get('[data-testid="pwa-nav-item"]').first().click()
        cy.get('[data-testid="pwa-page-transition"]').should('have.class', 'slide-in')
        cy.get('[data-testid="pwa-page"]').should('be.visible')
        
        // Should show app-like loading states
        cy.get('[data-testid="pwa-loading"]').should('be.visible')
        cy.get('[data-testid="pwa-loading-spinner"]').should('be.visible')
        cy.get('[data-testid="pwa-loading-text"]').should('contain', 'Loading')
        
        // Should show app-like error states
        cy.get('[data-testid="pwa-error"]').should('be.visible')
        cy.get('[data-testid="pwa-error-icon"]').should('be.visible')
        cy.get('[data-testid="pwa-error-message"]').should('contain', 'Something went wrong')
        cy.get('[data-testid="pwa-error-retry"]').should('be.visible')
      })
    })

    it('should work offline with cached content', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Test offline functionality
        cy.testOfflineFunctionality()
        
        // Should show offline indicator
        cy.get('[data-testid="pwa-offline-indicator"]').should('be.visible')
        cy.get('[data-testid="pwa-offline-message"]').should('contain', 'You are offline')
        
        // Should show cached content
        cy.get('[data-testid="pwa-cached-content"]').should('be.visible')
        cy.get('[data-testid="pwa-cached-shifts"]').should('have.length.at.least', 1)
        cy.get('[data-testid="pwa-cached-messages"]').should('have.length.at.least', 1)
        cy.get('[data-testid="pwa-cached-profile"]').should('be.visible')
        
        // Should show offline actions
        cy.get('[data-testid="pwa-offline-actions"]').should('be.visible')
        cy.get('[data-testid="pwa-offline-action"]').should('have.length.at.least', 1)
        cy.get('[data-testid="pwa-offline-action"]').first().within(() => {
          cy.get('[data-testid="action-name"]').should('be.visible')
          cy.get('[data-testid="action-status"]').should('contain', 'Queued')
          cy.get('[data-testid="action-timestamp"]').should('be.visible')
        })
        
        // Should show sync status
        cy.get('[data-testid="pwa-sync-status"]').should('be.visible')
        cy.get('[data-testid="pwa-sync-indicator"]').should('contain', 'Offline')
        cy.get('[data-testid="pwa-sync-queue"]').should('contain', '1 action queued')
        
        // Restore network
        cy.intercept('GET', '**/*', { statusCode: 200 }).as('onlineRequest')
        
        // Should automatically sync
        cy.get('[data-testid="pwa-sync-indicator"]').should('contain', 'Syncing')
        cy.get('[data-testid="pwa-sync-progress"]').should('be.visible')
        cy.get('[data-testid="pwa-sync-complete"]').should('contain', 'Sync complete')
        cy.get('[data-testid="pwa-sync-queue"]').should('contain', '0 actions queued')
      })
    })

    it('should support push notifications', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Enable push notifications
        cy.get('[data-testid="pwa-menu"]').click()
        cy.get('[data-testid="pwa-settings"]').click()
        cy.get('[data-testid="pwa-notifications"]').click()
        cy.get('[data-testid="toggle-push-notifications"]').click()
        cy.get('[data-testid="button-save-settings"]').click()
        
        // Should show notification permission request
        cy.get('[data-testid="pwa-notification-permission"]').should('be.visible')
        cy.get('[data-testid="button-allow-notifications"]').click()
        
        // Should show notification settings
        cy.get('[data-testid="pwa-notification-settings"]').should('be.visible')
        cy.get('[data-testid="toggle-message-notifications"]').should('be.checked')
        cy.get('[data-testid="toggle-shift-notifications"]').should('be.checked')
        cy.get('[data-testid="toggle-community-notifications"]').should('be.checked')
        
        // Test notification delivery
        cy.get('[data-testid="button-test-notification"]').click()
        cy.get('[data-testid="pwa-test-notification"]').should('be.visible')
        cy.get('[data-testid="notification-title"]').should('contain', 'Test Notification')
        cy.get('[data-testid="notification-body"]').should('contain', 'Push notifications are working')
        
        // Test notification actions
        cy.get('[data-testid="notification-action"]').click()
        cy.get('[data-testid="notification-handled"]').should('be.visible')
        
        // Test notification history
        cy.get('[data-testid="pwa-notification-history"]').should('be.visible')
        cy.get('[data-testid="notification-history-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="notification-history-item"]').first().within(() => {
          cy.get('[data-testid="notification-title"]').should('be.visible')
          cy.get('[data-testid="notification-body"]').should('be.visible')
          cy.get('[data-testid="notification-timestamp"]').should('be.visible')
          cy.get('[data-testid="notification-read-status"]').should('be.visible')
        })
      })
    })

    it('should provide fast loading and smooth animations', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Test page load performance
        cy.measurePageLoadPerformance(1000) // 1 second max for PWA
        
        // Test smooth animations
        cy.get('[data-testid="pwa-nav-item"]').first().click()
        cy.get('[data-testid="pwa-page-transition"]').should('have.class', 'slide-in')
        cy.get('[data-testid="pwa-page-transition"]').should('have.class', 'smooth')
        
        // Test loading animations
        cy.get('[data-testid="pwa-loading"]').should('be.visible')
        cy.get('[data-testid="pwa-loading-spinner"]').should('have.class', 'smooth')
        cy.get('[data-testid="pwa-loading-progress"]').should('be.visible')
        
        // Test hover animations
        cy.get('[data-testid="pwa-button"]').first().trigger('mouseover')
        cy.get('[data-testid="pwa-button"]').first().should('have.class', 'hover')
        cy.get('[data-testid="pwa-button"]').first().trigger('mouseout')
        cy.get('[data-testid="pwa-button"]').first().should('not.have.class', 'hover')
        
        // Test click animations
        cy.get('[data-testid="pwa-button"]').first().click()
        cy.get('[data-testid="pwa-button"]').first().should('have.class', 'clicked')
        cy.get('[data-testid="pwa-button"]').first().should('have.class', 'smooth')
        
        // Test scroll animations
        cy.get('[data-testid="pwa-content"]').scrollTo('bottom')
        cy.get('[data-testid="pwa-scroll-indicator"]').should('be.visible')
        cy.get('[data-testid="pwa-scroll-indicator"]').should('have.class', 'smooth')
        
        // Test fade animations
        cy.get('[data-testid="pwa-fade-in"]').should('be.visible')
        cy.get('[data-testid="pwa-fade-in"]').should('have.class', 'fade-in')
        cy.get('[data-testid="pwa-fade-in"]').should('have.class', 'smooth')
      })
    })

    it('should adapt to different screen sizes', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Test small screen (320px)
        cy.viewport(320, 568)
        cy.get('[data-testid="pwa-app"]').should('be.visible')
        cy.get('[data-testid="pwa-content"]').should('be.visible')
        cy.get('[data-testid="pwa-navigation"]').should('be.visible')
        cy.get('[data-testid="pwa-layout"]').should('have.class', 'small-screen')
        
        // Test medium screen (375px)
        cy.viewport(375, 667)
        cy.get('[data-testid="pwa-app"]').should('be.visible')
        cy.get('[data-testid="pwa-content"]').should('be.visible')
        cy.get('[data-testid="pwa-navigation"]').should('be.visible')
        cy.get('[data-testid="pwa-layout"]').should('have.class', 'medium-screen')
        
        // Test large screen (414px)
        cy.viewport(414, 896)
        cy.get('[data-testid="pwa-app"]').should('be.visible')
        cy.get('[data-testid="pwa-content"]').should('be.visible')
        cy.get('[data-testid="pwa-navigation"]').should('be.visible')
        cy.get('[data-testid="pwa-layout"]').should('have.class', 'large-screen')
        
        // Test tablet screen (768px)
        cy.viewport(768, 1024)
        cy.get('[data-testid="pwa-app"]').should('be.visible')
        cy.get('[data-testid="pwa-content"]').should('be.visible')
        cy.get('[data-testid="pwa-navigation"]').should('be.visible')
        cy.get('[data-testid="pwa-layout"]').should('have.class', 'tablet-screen')
        
        // Test desktop screen (1024px)
        cy.viewport(1024, 768)
        cy.get('[data-testid="pwa-app"]').should('be.visible')
        cy.get('[data-testid="pwa-content"]').should('be.visible')
        cy.get('[data-testid="pwa-navigation"]').should('be.visible')
        cy.get('[data-testid="pwa-layout"]').should('have.class', 'desktop-screen')
      })
    })

    it('should support touch gestures and interactions', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Test tap gestures
        cy.get('[data-testid="pwa-button"]').first().trigger('touchstart')
        cy.get('[data-testid="pwa-button"]').first().trigger('touchend')
        cy.get('[data-testid="pwa-button"]').first().should('have.class', 'tapped')
        
        // Test double tap
        cy.get('[data-testid="pwa-button"]').first().trigger('touchstart')
        cy.get('[data-testid="pwa-button"]').first().trigger('touchend')
        cy.get('[data-testid="pwa-button"]').first().trigger('touchstart')
        cy.get('[data-testid="pwa-button"]').first().trigger('touchend')
        cy.get('[data-testid="pwa-button"]').first().should('have.class', 'double-tapped')
        
        // Test long press
        cy.get('[data-testid="pwa-button"]').first().trigger('touchstart')
        cy.wait(1000) // Long press
        cy.get('[data-testid="pwa-button"]').first().trigger('touchend')
        cy.get('[data-testid="pwa-button"]').first().should('have.class', 'long-pressed')
        
        // Test swipe gestures
        cy.get('[data-testid="pwa-content"]').trigger('touchstart', { touches: [{ clientX: 200, clientY: 300 }] })
        cy.get('[data-testid="pwa-content"]').trigger('touchmove', { touches: [{ clientX: 100, clientY: 300 }] })
        cy.get('[data-testid="pwa-content"]').trigger('touchend')
        cy.get('[data-testid="pwa-content"]').should('have.class', 'swiped-left')
        
        // Test pinch gestures
        cy.get('[data-testid="pwa-content"]').trigger('touchstart', { touches: [{ clientX: 200, clientY: 300 }, { clientX: 300, clientY: 300 }] })
        cy.get('[data-testid="pwa-content"]').trigger('touchmove', { touches: [{ clientX: 150, clientY: 300 }, { clientX: 350, clientY: 300 }] })
        cy.get('[data-testid="pwa-content"]').trigger('touchend')
        cy.get('[data-testid="pwa-content"]').should('have.class', 'pinched')
        
        // Test rotate gestures
        cy.get('[data-testid="pwa-content"]').trigger('touchstart', { touches: [{ clientX: 200, clientY: 300 }, { clientX: 300, clientY: 300 }] })
        cy.get('[data-testid="pwa-content"]').trigger('touchmove', { touches: [{ clientX: 250, clientY: 250 }, { clientX: 250, clientY: 350 }] })
        cy.get('[data-testid="pwa-content"]').trigger('touchend')
        cy.get('[data-testid="pwa-content"]').should('have.class', 'rotated')
      })
    })

    it('should provide native-like navigation', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Should show native-like navigation
        cy.get('[data-testid="pwa-navigation"]').should('be.visible')
        cy.get('[data-testid="pwa-nav-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="pwa-nav-item"]').first().within(() => {
          cy.get('[data-testid="nav-icon"]').should('be.visible')
          cy.get('[data-testid="nav-label"]').should('be.visible')
          cy.get('[data-testid="nav-badge"]').should('be.visible')
        })
        
        // Test navigation transitions
        cy.get('[data-testid="pwa-nav-item"]').first().click()
        cy.get('[data-testid="pwa-page-transition"]').should('have.class', 'slide-in')
        cy.get('[data-testid="pwa-page-transition"]').should('have.class', 'smooth')
        
        // Test back navigation
        cy.get('[data-testid="pwa-back-button"]').click()
        cy.get('[data-testid="pwa-page-transition"]').should('have.class', 'slide-out')
        cy.get('[data-testid="pwa-page-transition"]').should('have.class', 'smooth')
        
        // Test breadcrumb navigation
        cy.get('[data-testid="pwa-breadcrumb"]').should('be.visible')
        cy.get('[data-testid="pwa-breadcrumb-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="pwa-breadcrumb-item"]').first().click()
        cy.get('[data-testid="pwa-page-transition"]').should('have.class', 'slide-in')
        
        // Test tab navigation
        cy.get('[data-testid="pwa-tab-nav"]').should('be.visible')
        cy.get('[data-testid="pwa-tab-item"]').should('have.length.at.least', 1)
        cy.get('[data-testid="pwa-tab-item"]').first().click()
        cy.get('[data-testid="pwa-tab-content"]').should('be.visible')
        cy.get('[data-testid="pwa-tab-transition"]').should('have.class', 'fade-in')
      })
    })

    it('should allow access to device features (camera, location)', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Test camera access
        cy.get('[data-testid="pwa-menu"]').click()
        cy.get('[data-testid="pwa-profile"]').click()
        cy.get('[data-testid="button-edit-profile"]').click()
        cy.get('[data-testid="button-change-photo"]').click()
        cy.get('[data-testid="button-take-photo"]').click()
        
        // Should request camera permission
        cy.get('[data-testid="camera-permission"]').should('be.visible')
        cy.get('[data-testid="button-allow-camera"]').click()
        
        // Should show camera interface
        cy.get('[data-testid="camera-interface"]').should('be.visible')
        cy.get('[data-testid="camera-preview"]').should('be.visible')
        cy.get('[data-testid="button-capture"]').should('be.visible')
        cy.get('[data-testid="button-flip-camera"]').should('be.visible')
        
        // Test location access
        cy.get('[data-testid="pwa-nav-shifts"]').click()
        cy.get('[data-testid="button-enable-location"]').click()
        
        // Should request location permission
        cy.get('[data-testid="location-permission"]').should('be.visible')
        cy.get('[data-testid="button-allow-location"]').click()
        
        // Should show location-based content
        cy.get('[data-testid="location-based-shifts"]').should('be.visible')
        cy.get('[data-testid="current-location"]').should('be.visible')
        cy.get('[data-testid="nearby-shifts"]').should('have.length.at.least', 1)
        
        // Test device orientation
        cy.get('[data-testid="pwa-orientation"]').should('be.visible')
        cy.get('[data-testid="pwa-orientation"]').should('contain', 'Portrait')
        
        // Test device vibration
        cy.get('[data-testid="button-test-vibration"]').click()
        cy.get('[data-testid="vibration-test"]').should('be.visible')
        cy.get('[data-testid="vibration-status"]').should('contain', 'Vibration test completed')
        
        // Test device battery
        cy.get('[data-testid="pwa-battery"]').should('be.visible')
        cy.get('[data-testid="battery-level"]').should('be.visible')
        cy.get('[data-testid="battery-status"]').should('be.visible')
      })
    })

    it('should provide seamless updates and synchronization', () => {
      cy.fixture('snipshift-v2-test-data').then((data) => {
        const barberUser = data.users.barber
        
        // Login as barber
        cy.login(barberUser.email, barberUser.password)
        
        // Should show update available
        cy.get('[data-testid="pwa-update-available"]').should('be.visible')
        cy.get('[data-testid="update-message"]').should('contain', 'New version available')
        cy.get('[data-testid="button-update"]').should('be.visible')
        cy.get('[data-testid="button-dismiss"]').should('be.visible')
        
        // Update app
        cy.get('[data-testid="button-update"]').click()
        cy.get('[data-testid="update-progress"]').should('be.visible')
        cy.get('[data-testid="update-status"]').should('contain', 'Updating')
        
        // Should show update complete
        cy.get('[data-testid="update-complete"]').should('be.visible')
        cy.get('[data-testid="update-success"]').should('contain', 'Update complete')
        cy.get('[data-testid="button-restart"]').should('be.visible')
        
        // Restart app
        cy.get('[data-testid="button-restart"]').click()
        cy.get('[data-testid="pwa-app"]').should('be.visible')
        cy.get('[data-testid="pwa-content"]').should('be.visible')
        
        // Should show synchronization
        cy.get('[data-testid="pwa-sync"]').should('be.visible')
        cy.get('[data-testid="sync-status"]').should('contain', 'Syncing')
        cy.get('[data-testid="sync-progress"]').should('be.visible')
        
        // Should show sync complete
        cy.get('[data-testid="sync-complete"]').should('be.visible')
        cy.get('[data-testid="sync-success"]').should('contain', 'Sync complete')
        cy.get('[data-testid="sync-timestamp"]').should('be.visible')
        
        // Should show data consistency
        cy.get('[data-testid="pwa-data-consistency"]').should('be.visible')
        cy.get('[data-testid="data-status"]').should('contain', 'Up to date')
        cy.get('[data-testid="data-timestamp"]').should('be.visible')
        cy.get('[data-testid="data-version"]').should('be.visible')
      })
    })
  })
})
