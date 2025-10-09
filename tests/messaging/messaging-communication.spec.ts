import { test, expect, Page } from '@playwright/test';

test.describe('Messaging & Communication', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a user
    await page.goto('/');
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.click('[data-testid="login-button"]');
  });

  test.describe('Chat System', () => {
    test('should display chat list', async ({ page }) => {
      await page.goto('/messages');
      
      await expect(page.locator('[data-testid="chat-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="chat-item"]')).toHaveCount.greaterThan(0);
      
      // Check chat item elements
      const firstChat = page.locator('[data-testid="chat-item"]').first();
      await expect(firstChat.locator('[data-testid="chat-name"]')).toBeVisible();
      await expect(firstChat.locator('[data-testid="last-message"]')).toBeVisible();
      await expect(firstChat.locator('[data-testid="message-time"]')).toBeVisible();
      await expect(firstChat.locator('[data-testid="unread-indicator"]')).toBeVisible();
    });

    test('should start new conversation', async ({ page }) => {
      await page.goto('/messages');
      await page.click('[data-testid="new-chat-button"]');
      
      await expect(page.locator('[data-testid="new-chat-modal"]')).toBeVisible();
      
      // Search for user
      await page.fill('[data-testid="user-search"]', 'john');
      await page.click('[data-testid="search-users"]');
      
      await expect(page.locator('[data-testid="user-result"]')).toHaveCount.greaterThan(0);
      
      // Select user and start chat
      await page.click('[data-testid="user-result"]').first();
      await page.click('[data-testid="start-chat"]');
      
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
      await expect(page.locator('[data-testid="chat-header"]')).toBeVisible();
    });

    test('should send and receive messages', async ({ page }) => {
      await page.goto('/messages');
      await page.click('[data-testid="chat-item"]').first();
      
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
      await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
      
      // Send message
      await page.fill('[data-testid="message-input"]', 'Hello! How are you?');
      await page.click('[data-testid="send-button"]');
      
      // Check message appears
      await expect(page.locator('[data-testid="message-bubble"]').last()).toContainText('Hello! How are you?');
      await expect(page.locator('[data-testid="message-status"]').last()).toContainText('Sent');
      
      // Simulate receiving message
      await page.evaluate(() => {
        // Mock receiving a message
        const messagesContainer = document.querySelector('[data-testid="messages-container"]');
        if (messagesContainer) {
          const newMessage = document.createElement('div');
          newMessage.setAttribute('data-testid', 'message-bubble');
          newMessage.className = 'message received';
          newMessage.textContent = 'Hi! I\'m doing well, thanks for asking.';
          messagesContainer.appendChild(newMessage);
        }
      });
      
      await expect(page.locator('[data-testid="message-bubble"]').last()).toContainText('Hi! I\'m doing well, thanks for asking.');
    });

    test('should send different message types', async ({ page }) => {
      await page.goto('/messages');
      await page.click('[data-testid="chat-item"]').first();
      
      // Send text message
      await page.fill('[data-testid="message-input"]', 'Check out this photo!');
      await page.click('[data-testid="send-button"]');
      
      // Send image
      await page.click('[data-testid="attach-button"]');
      await page.click('[data-testid="attach-image"]');
      
      const fileInput = page.locator('[data-testid="image-upload"]');
      await fileInput.setInputFiles({
        name: 'photo.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      });
      
      await page.click('[data-testid="send-button"]');
      
      await expect(page.locator('[data-testid="image-message"]')).toBeVisible();
      
      // Send file
      await page.click('[data-testid="attach-button"]');
      await page.click('[data-testid="attach-file"]');
      
      const fileUpload = page.locator('[data-testid="file-upload"]');
      await fileUpload.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('fake-pdf-data')
      });
      
      await page.click('[data-testid="send-button"]');
      
      await expect(page.locator('[data-testid="file-message"]')).toBeVisible();
    });

    test('should show message status indicators', async ({ page }) => {
      await page.goto('/messages');
      await page.click('[data-testid="chat-item"]').first();
      
      // Send message
      await page.fill('[data-testid="message-input"]', 'Test message');
      await page.click('[data-testid="send-button"]');
      
      // Check status indicators
      const lastMessage = page.locator('[data-testid="message-bubble"]').last();
      await expect(lastMessage.locator('[data-testid="message-status"]')).toContainText('Sent');
      
      // Simulate message being delivered
      await page.evaluate(() => {
        const statusElement = document.querySelector('[data-testid="message-status"]:last-child');
        if (statusElement) {
          statusElement.textContent = 'Delivered';
        }
      });
      
      await expect(lastMessage.locator('[data-testid="message-status"]')).toContainText('Delivered');
    });

    test('should mark messages as read', async ({ page }) => {
      await page.goto('/messages');
      
      // Find chat with unread messages
      const unreadChat = page.locator('[data-testid="unread-indicator"]').first();
      if (await unreadChat.isVisible()) {
        await unreadChat.click();
        
        // Messages should be marked as read
        await expect(page.locator('[data-testid="unread-indicator"]')).not.toBeVisible();
      }
    });

    test('should search messages', async ({ page }) => {
      await page.goto('/messages');
      await page.click('[data-testid="chat-item"]').first();
      
      await page.click('[data-testid="search-messages"]');
      await page.fill('[data-testid="search-input"]', 'hello');
      await page.click('[data-testid="search-button"]');
      
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="search-result"]')).toHaveCount.greaterThan(0);
      
      // Click on search result
      await page.click('[data-testid="search-result"]').first();
      
      // Should scroll to message
      await expect(page.locator('[data-testid="highlighted-message"]')).toBeVisible();
    });
  });

  test.describe('Group Chats', () => {
    test('should create group chat', async ({ page }) => {
      await page.goto('/messages');
      await page.click('[data-testid="new-chat-button"]');
      await page.click('[data-testid="create-group"]');
      
      await expect(page.locator('[data-testid="group-creation-form"]')).toBeVisible();
      
      // Fill group details
      await page.fill('[data-testid="group-name"]', 'Barber Team Chat');
      await page.fill('[data-testid="group-description"]', 'Chat for our barber team');
      
      // Add participants
      await page.fill('[data-testid="add-participant"]', 'john');
      await page.click('[data-testid="add-user"]');
      await page.fill('[data-testid="add-participant"]', 'jane');
      await page.click('[data-testid="add-user"]');
      
      await page.click('[data-testid="create-group-button"]');
      
      await expect(page.locator('text=Group created successfully')).toBeVisible();
      await expect(page.locator('[data-testid="group-chat-interface"]')).toBeVisible();
    });

    test('should manage group participants', async ({ page }) => {
      await page.goto('/messages');
      await page.click('[data-testid="group-chat-item"]').first();
      
      await page.click('[data-testid="group-info"]');
      
      await expect(page.locator('[data-testid="group-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="participants-list"]')).toBeVisible();
      
      // Add participant
      await page.click('[data-testid="add-participant-button"]');
      await page.fill('[data-testid="user-search"]', 'mike');
      await page.click('[data-testid="add-user"]');
      
      await expect(page.locator('text=User added to group')).toBeVisible();
      
      // Remove participant
      await page.click('[data-testid="remove-participant"]').first();
      await page.click('[data-testid="confirm-remove"]');
      
      await expect(page.locator('text=User removed from group')).toBeVisible();
    });

    test('should send group messages', async ({ page }) => {
      await page.goto('/messages');
      await page.click('[data-testid="group-chat-item"]').first();
      
      await page.fill('[data-testid="message-input"]', 'Hello everyone!');
      await page.click('[data-testid="send-button"]');
      
      await expect(page.locator('[data-testid="message-bubble"]').last()).toContainText('Hello everyone!');
      await expect(page.locator('[data-testid="group-message-indicator"]')).toBeVisible();
    });
  });

  test.describe('Notifications System', () => {
    test('should display notification center', async ({ page }) => {
      await page.goto('/');
      
      await page.click('[data-testid="notification-bell"]');
      
      await expect(page.locator('[data-testid="notification-dropdown"]')).toBeVisible();
      await expect(page.locator('[data-testid="notification-item"]')).toHaveCount.greaterThan(0);
      
      // Check notification elements
      const firstNotification = page.locator('[data-testid="notification-item"]').first();
      await expect(firstNotification.locator('[data-testid="notification-title"]')).toBeVisible();
      await expect(firstNotification.locator('[data-testid="notification-message"]')).toBeVisible();
      await expect(firstNotification.locator('[data-testid="notification-time"]')).toBeVisible();
    });

    test('should receive message notifications', async ({ page }) => {
      // Simulate receiving a message notification
      await page.evaluate(() => {
        const notificationBell = document.querySelector('[data-testid="notification-bell"]');
        if (notificationBell) {
          notificationBell.setAttribute('data-unread', 'true');
        }
      });
      
      await page.click('[data-testid="notification-bell"]');
      
      // Should show message notification
      await expect(page.locator('[data-testid="message-notification"]')).toBeVisible();
      await expect(page.locator('[data-testid="unread-indicator"]')).toBeVisible();
    });

    test('should receive job-related notifications', async ({ page }) => {
      await page.click('[data-testid="notification-bell"]');
      
      // Check for job notifications
      const jobNotifications = page.locator('[data-testid="job-notification"]');
      if (await jobNotifications.count() > 0) {
        await expect(jobNotifications.first().locator('[data-testid="notification-title"]')).toContainText(/job|application|shift/);
      }
    });

    test('should mark notifications as read', async ({ page }) => {
      await page.click('[data-testid="notification-bell"]');
      
      // Mark all as read
      await page.click('[data-testid="mark-all-read"]');
      await expect(page.locator('[data-testid="unread-indicator"]')).not.toBeVisible();
      
      // Mark individual notification as read
      await page.click('[data-testid="notification-item"]').first();
      await expect(page.locator('[data-testid="notification-item"]').first()).not.toHaveClass(/unread/);
    });

    test('should configure notification preferences', async ({ page }) => {
      await page.goto('/settings');
      await page.click('[data-testid="notifications-tab"]');
      
      await expect(page.locator('[data-testid="notification-settings"]')).toBeVisible();
      
      // Configure message notifications
      await page.check('[data-testid="message-notifications"]');
      await page.check('[data-testid="job-notifications"]');
      await page.uncheck('[data-testid="marketing-notifications"]');
      
      // Configure notification methods
      await page.check('[data-testid="email-notifications"]');
      await page.check('[data-testid="push-notifications"]');
      await page.uncheck('[data-testid="sms-notifications"]');
      
      await page.click('[data-testid="save-notification-settings"]');
      
      await expect(page.locator('text=Notification preferences saved')).toBeVisible();
    });
  });

  test.describe('Real-time Communication', () => {
    test('should show online/offline status', async ({ page }) => {
      await page.goto('/messages');
      await page.click('[data-testid="chat-item"]').first();
      
      await expect(page.locator('[data-testid="user-status"]')).toBeVisible();
      
      // Check status indicator
      const statusIndicator = page.locator('[data-testid="status-indicator"]');
      await expect(statusIndicator).toBeVisible();
      
      // Status should be online, away, or offline
      const status = await statusIndicator.getAttribute('data-status');
      expect(['online', 'away', 'offline']).toContain(status);
    });

    test('should show typing indicators', async ({ page }) => {
      await page.goto('/messages');
      await page.click('[data-testid="chat-item"]').first();
      
      // Start typing
      await page.fill('[data-testid="message-input"]', 'Hello');
      
      // Simulate other user typing
      await page.evaluate(() => {
        const typingIndicator = document.createElement('div');
        typingIndicator.setAttribute('data-testid', 'typing-indicator');
        typingIndicator.textContent = 'John is typing...';
        const messagesContainer = document.querySelector('[data-testid="messages-container"]');
        if (messagesContainer) {
          messagesContainer.appendChild(typingIndicator);
        }
      });
      
      await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="typing-indicator"]')).toContainText('is typing...');
    });

    test('should handle connection status', async ({ page }) => {
      await page.goto('/messages');
      
      // Simulate connection issues
      await page.evaluate(() => {
        const connectionStatus = document.createElement('div');
        connectionStatus.setAttribute('data-testid', 'connection-status');
        connectionStatus.textContent = 'Reconnecting...';
        connectionStatus.className = 'connection-warning';
        document.body.appendChild(connectionStatus);
      });
      
      await expect(page.locator('[data-testid="connection-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Reconnecting...');
    });
  });

  test.describe('Message Management', () => {
    test('should delete messages', async ({ page }) => {
      await page.goto('/messages');
      await page.click('[data-testid="chat-item"]').first();
      
      // Right-click on message to show context menu
      await page.locator('[data-testid="message-bubble"]').last().click({ button: 'right' });
      
      await expect(page.locator('[data-testid="message-context-menu"]')).toBeVisible();
      await page.click('[data-testid="delete-message"]');
      await page.click('[data-testid="confirm-delete"]');
      
      await expect(page.locator('text=Message deleted')).toBeVisible();
    });

    test('should edit messages', async ({ page }) => {
      await page.goto('/messages');
      await page.click('[data-testid="chat-item"]').first();
      
      // Send a message first
      await page.fill('[data-testid="message-input"]', 'Original message');
      await page.click('[data-testid="send-button"]');
      
      // Edit the message
      await page.locator('[data-testid="message-bubble"]').last().click({ button: 'right' });
      await page.click('[data-testid="edit-message"]');
      
      await expect(page.locator('[data-testid="edit-message-input"]')).toBeVisible();
      await page.fill('[data-testid="edit-message-input"]', 'Edited message');
      await page.click('[data-testid="save-edit"]');
      
      await expect(page.locator('[data-testid="message-bubble"]').last()).toContainText('Edited message');
      await expect(page.locator('[data-testid="edited-indicator"]')).toBeVisible();
    });

    test('should forward messages', async ({ page }) => {
      await page.goto('/messages');
      await page.click('[data-testid="chat-item"]').first();
      
      // Right-click on message
      await page.locator('[data-testid="message-bubble"]').last().click({ button: 'right' });
      await page.click('[data-testid="forward-message"]');
      
      await expect(page.locator('[data-testid="forward-modal"]')).toBeVisible();
      
      // Select recipient
      await page.click('[data-testid="select-recipient"]').first();
      await page.click('[data-testid="forward-button"]');
      
      await expect(page.locator('text=Message forwarded')).toBeVisible();
    });

    test('should star important messages', async ({ page }) => {
      await page.goto('/messages');
      await page.click('[data-testid="chat-item"]').first();
      
      // Star a message
      await page.locator('[data-testid="message-bubble"]').last().click({ button: 'right' });
      await page.click('[data-testid="star-message"]');
      
      await expect(page.locator('[data-testid="starred-indicator"]')).toBeVisible();
      
      // View starred messages
      await page.click('[data-testid="starred-messages"]');
      await expect(page.locator('[data-testid="starred-messages-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="starred-message"]')).toHaveCount.greaterThan(0);
    });
  });

  test.describe('Video & Voice Calls', () => {
    test('should initiate video call', async ({ page }) => {
      await page.goto('/messages');
      await page.click('[data-testid="chat-item"]').first();
      
      await page.click('[data-testid="video-call-button"]');
      
      await expect(page.locator('[data-testid="call-interface"]')).toBeVisible();
      await expect(page.locator('[data-testid="local-video"]')).toBeVisible();
      await expect(page.locator('[data-testid="call-controls"]')).toBeVisible();
    });

    test('should initiate voice call', async ({ page }) => {
      await page.goto('/messages');
      await page.click('[data-testid="chat-item"]').first();
      
      await page.click('[data-testid="voice-call-button"]');
      
      await expect(page.locator('[data-testid="call-interface"]')).toBeVisible();
      await expect(page.locator('[data-testid="call-controls"]')).toBeVisible();
      await expect(page.locator('[data-testid="caller-info"]')).toBeVisible();
    });

    test('should handle call controls', async ({ page }) => {
      await page.goto('/messages');
      await page.click('[data-testid="chat-item"]').first();
      await page.click('[data-testid="video-call-button"]');
      
      // Test mute/unmute
      await page.click('[data-testid="mute-button"]');
      await expect(page.locator('[data-testid="mute-indicator"]')).toBeVisible();
      
      await page.click('[data-testid="mute-button"]');
      await expect(page.locator('[data-testid="mute-indicator"]')).not.toBeVisible();
      
      // Test camera on/off
      await page.click('[data-testid="camera-button"]');
      await expect(page.locator('[data-testid="camera-off-indicator"]')).toBeVisible();
      
      // End call
      await page.click('[data-testid="end-call-button"]');
      await expect(page.locator('[data-testid="call-interface"]')).not.toBeVisible();
    });

    test('should receive incoming calls', async ({ page }) => {
      // Simulate incoming call
      await page.evaluate(() => {
        const incomingCallModal = document.createElement('div');
        incomingCallModal.setAttribute('data-testid', 'incoming-call-modal');
        incomingCallModal.innerHTML = `
          <div data-testid="caller-name">John Doe</div>
          <div data-testid="call-type">Video Call</div>
          <button data-testid="accept-call">Accept</button>
          <button data-testid="decline-call">Decline</button>
        `;
        document.body.appendChild(incomingCallModal);
      });
      
      await expect(page.locator('[data-testid="incoming-call-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="caller-name"]')).toContainText('John Doe');
      
      // Accept call
      await page.click('[data-testid="accept-call"]');
      await expect(page.locator('[data-testid="call-interface"]')).toBeVisible();
    });
  });

  test.describe('Message History & Backup', () => {
    test('should load message history', async ({ page }) => {
      await page.goto('/messages');
      await page.click('[data-testid="chat-item"]').first();
      
      // Scroll to load older messages
      await page.evaluate(() => {
        const messagesContainer = document.querySelector('[data-testid="messages-container"]');
        if (messagesContainer) {
          messagesContainer.scrollTop = 0;
        }
      });
      
      await page.waitForTimeout(1000);
      
      // Should load more messages
      const messageCount = await page.locator('[data-testid="message-bubble"]').count();
      expect(messageCount).toBeGreaterThan(10);
    });

    test('should export chat history', async ({ page }) => {
      await page.goto('/messages');
      await page.click('[data-testid="chat-item"]').first();
      
      await page.click('[data-testid="chat-options"]');
      await page.click('[data-testid="export-chat"]');
      
      await expect(page.locator('[data-testid="export-modal"]')).toBeVisible();
      
      await page.selectOption('[data-testid="export-format"]', 'pdf');
      await page.click('[data-testid="export-button"]');
      
      await expect(page.locator('text=Chat exported successfully')).toBeVisible();
    });

    test('should clear chat history', async ({ page }) => {
      await page.goto('/messages');
      await page.click('[data-testid="chat-item"]').first();
      
      await page.click('[data-testid="chat-options"]');
      await page.click('[data-testid="clear-chat"]');
      
      await expect(page.locator('[data-testid="clear-chat-modal"]')).toBeVisible();
      await page.click('[data-testid="confirm-clear"]');
      
      await expect(page.locator('text=Chat cleared successfully')).toBeVisible();
      await expect(page.locator('[data-testid="message-bubble"]')).toHaveCount(0);
    });
  });
});
