import { test, expect, Page } from '@playwright/test';

test.describe('Social Features & Community', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a user
    await page.goto('/');
    await page.click('text=Login');
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.click('[data-testid="login-button"]');
  });

  test.describe('Community Feed', () => {
    test('should display community feed with posts', async ({ page }) => {
      await page.goto('/community');
      
      await expect(page.locator('[data-testid="community-feed"]')).toBeVisible();
      await expect(page.locator('[data-testid="post-card"]')).toHaveCount.greaterThan(0);
      
      // Check post elements
      const firstPost = page.locator('[data-testid="post-card"]').first();
      await expect(firstPost.locator('[data-testid="post-author"]')).toBeVisible();
      await expect(firstPost.locator('[data-testid="post-content"]')).toBeVisible();
      await expect(firstPost.locator('[data-testid="post-timestamp"]')).toBeVisible();
      await expect(firstPost.locator('[data-testid="post-actions"]')).toBeVisible();
    });

    test('should filter feed by post type', async ({ page }) => {
      await page.goto('/community');
      
      // Filter by work showcase
      await page.click('[data-testid="filter-work-showcase"]');
      await expect(page.locator('[data-testid="post-card"]')).toHaveCount.greaterThan(0);
      
      // Verify all posts are work showcase type
      const postCards = page.locator('[data-testid="post-card"]');
      const count = await postCards.count();
      
      for (let i = 0; i < count; i++) {
        await expect(postCards.nth(i).locator('[data-testid="post-type"]')).toContainText('Work Showcase');
      }
      
      // Filter by tips & tricks
      await page.click('[data-testid="filter-tips-tricks"]');
      await expect(page.locator('[data-testid="post-type"]')).toContainText('Tips & Tricks');
    });

    test('should sort feed by different criteria', async ({ page }) => {
      await page.goto('/community');
      
      // Sort by most recent
      await page.click('[data-testid="sort-dropdown"]');
      await page.click('text=Most Recent');
      
      await expect(page.locator('[data-testid="sort-indicator"]')).toContainText('Most Recent');
      
      // Sort by most popular
      await page.click('[data-testid="sort-dropdown"]');
      await page.click('text=Most Popular');
      
      await expect(page.locator('[data-testid="sort-indicator"]')).toContainText('Most Popular');
      
      // Sort by trending
      await page.click('[data-testid="sort-dropdown"]');
      await page.click('text=Trending');
      
      await expect(page.locator('[data-testid="sort-indicator"]')).toContainText('Trending');
    });

    test('should search posts by keywords', async ({ page }) => {
      await page.goto('/community');
      
      await page.fill('[data-testid="search-posts"]', 'haircut techniques');
      await page.click('[data-testid="search-button"]');
      
      // Posts should contain the keyword
      const postCards = page.locator('[data-testid="post-card"]');
      const count = await postCards.count();
      
      for (let i = 0; i < count; i++) {
        const content = await postCards.nth(i).locator('[data-testid="post-content"]').textContent();
        expect(content?.toLowerCase()).toMatch(/haircut|techniques/);
      }
    });

    test('should load more posts on scroll', async ({ page }) => {
      await page.goto('/community');
      
      const initialCount = await page.locator('[data-testid="post-card"]').count();
      
      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
      
      const newCount = await page.locator('[data-testid="post-card"]').count();
      expect(newCount).toBeGreaterThan(initialCount);
    });
  });

  test.describe('Post Creation', () => {
    test('should create a text post', async ({ page }) => {
      await page.goto('/community');
      await page.click('[data-testid="create-post-button"]');
      
      await expect(page.locator('[data-testid="post-creation-modal"]')).toBeVisible();
      
      // Select post type
      await page.click('[data-testid="post-type-text"]');
      
      // Fill post content
      await page.fill('[data-testid="post-content"]', 'Just finished an amazing fade cut today! The client was thrilled with the results. #barberlife #fade');
      
      // Add hashtags
      await page.fill('[data-testid="hashtags-input"]', 'barberlife, fade, haircut');
      
      await page.click('[data-testid="publish-post"]');
      
      await expect(page.locator('text=Post published successfully')).toBeVisible();
      await expect(page.locator('[data-testid="post-card"]').first().locator('[data-testid="post-content"]')).toContainText('Just finished an amazing fade cut today!');
    });

    test('should create an image post', async ({ page }) => {
      await page.goto('/community');
      await page.click('[data-testid="create-post-button"]');
      
      await page.click('[data-testid="post-type-image"]');
      
      // Upload image
      const fileInput = page.locator('[data-testid="image-upload"]');
      await fileInput.setInputFiles({
        name: 'haircut-before-after.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      });
      
      // Add caption
      await page.fill('[data-testid="post-caption"]', 'Before and after transformation! What do you think?');
      await page.fill('[data-testid="hashtags-input"]', 'transformation, beforeafter, barber');
      
      await page.click('[data-testid="publish-post"]');
      
      await expect(page.locator('text=Post published successfully')).toBeVisible();
      await expect(page.locator('[data-testid="post-card"]').first().locator('[data-testid="post-image"]')).toBeVisible();
    });

    test('should create a video post', async ({ page }) => {
      await page.goto('/community');
      await page.click('[data-testid="create-post-button"]');
      
      await page.click('[data-testid="post-type-video"]');
      
      // Upload video
      const fileInput = page.locator('[data-testid="video-upload"]');
      await fileInput.setInputFiles({
        name: 'haircut-tutorial.mp4',
        mimeType: 'video/mp4',
        buffer: Buffer.from('fake-video-data')
      });
      
      // Add description
      await page.fill('[data-testid="post-description"]', 'Quick tutorial on achieving the perfect fade');
      await page.fill('[data-testid="hashtags-input"]', 'tutorial, fade, barber');
      
      await page.click('[data-testid="publish-post"]');
      
      await expect(page.locator('text=Post published successfully')).toBeVisible();
      await expect(page.locator('[data-testid="post-card"]').first().locator('[data-testid="post-video"]')).toBeVisible();
    });

    test('should create a tips & tricks post', async ({ page }) => {
      await page.goto('/community');
      await page.click('[data-testid="create-post-button"]');
      
      await page.click('[data-testid="post-type-tips"]');
      
      await page.fill('[data-testid="tip-title"]', 'Pro Tip: Maintaining Scissors');
      await page.fill('[data-testid="tip-content"]', 'Always clean your scissors after each cut and oil them weekly. This extends their life and ensures clean cuts every time.');
      await page.selectOption('[data-testid="tip-category"]', 'tools');
      
      await page.click('[data-testid="publish-post"]');
      
      await expect(page.locator('text=Post published successfully')).toBeVisible();
      await expect(page.locator('[data-testid="post-card"]').first().locator('[data-testid="post-type"]')).toContainText('Tips & Tricks');
    });

    test('should validate post content', async ({ page }) => {
      await page.goto('/community');
      await page.click('[data-testid="create-post-button"]');
      
      // Try to publish empty post
      await page.click('[data-testid="publish-post"]');
      await expect(page.locator('text=Post content is required')).toBeVisible();
      
      // Try with content too long
      const longContent = 'a'.repeat(1001);
      await page.fill('[data-testid="post-content"]', longContent);
      await page.click('[data-testid="publish-post"]');
      await expect(page.locator('text=Post content must be less than 1000 characters')).toBeVisible();
    });
  });

  test.describe('Post Interactions', () => {
    test('should like and unlike posts', async ({ page }) => {
      await page.goto('/community');
      
      const firstPost = page.locator('[data-testid="post-card"]').first();
      const likeButton = firstPost.locator('[data-testid="like-button"]');
      const likeCount = firstPost.locator('[data-testid="like-count"]');
      
      // Get initial like count
      const initialCount = await likeCount.textContent();
      
      // Like the post
      await likeButton.click();
      await expect(likeButton).toHaveClass(/liked/);
      
      // Check like count increased
      const newCount = await likeCount.textContent();
      expect(parseInt(newCount || '0')).toBeGreaterThan(parseInt(initialCount || '0'));
      
      // Unlike the post
      await likeButton.click();
      await expect(likeButton).not.toHaveClass(/liked/);
      
      // Check like count decreased
      const finalCount = await likeCount.textContent();
      expect(parseInt(finalCount || '0')).toBe(parseInt(initialCount || '0'));
    });

    test('should comment on posts', async ({ page }) => {
      await page.goto('/community');
      
      const firstPost = page.locator('[data-testid="post-card"]').first();
      await firstPost.locator('[data-testid="comment-button"]').click();
      
      await expect(page.locator('[data-testid="comment-section"]')).toBeVisible();
      
      // Add comment
      await page.fill('[data-testid="comment-input"]', 'Amazing work! Love the technique.');
      await page.click('[data-testid="post-comment"]');
      
      await expect(page.locator('[data-testid="comment-item"]')).toContainText('Amazing work! Love the technique.');
      await expect(page.locator('[data-testid="comment-count"]')).toContainText('1');
    });

    test('should reply to comments', async ({ page }) => {
      await page.goto('/community');
      
      const firstPost = page.locator('[data-testid="post-card"]').first();
      await firstPost.locator('[data-testid="comment-button"]').click();
      
      // Reply to first comment
      await page.click('[data-testid="reply-button"]').first();
      await page.fill('[data-testid="reply-input"]', 'Thanks for the feedback!');
      await page.click('[data-testid="post-reply"]');
      
      await expect(page.locator('[data-testid="reply-item"]')).toContainText('Thanks for the feedback!');
    });

    test('should share posts', async ({ page }) => {
      await page.goto('/community');
      
      const firstPost = page.locator('[data-testid="post-card"]').first();
      await firstPost.locator('[data-testid="share-button"]').click();
      
      await expect(page.locator('[data-testid="share-modal"]')).toBeVisible();
      
      // Copy link
      await page.click('[data-testid="copy-link"]');
      await expect(page.locator('text=Link copied to clipboard')).toBeVisible();
      
      // Share to social media
      await page.click('[data-testid="share-facebook"]');
      // Should open Facebook share dialog (mocked)
    });

    test('should save posts', async ({ page }) => {
      await page.goto('/community');
      
      const firstPost = page.locator('[data-testid="post-card"]').first();
      await firstPost.locator('[data-testid="save-button"]').click();
      
      await expect(page.locator('text=Post saved')).toBeVisible();
      await expect(firstPost.locator('[data-testid="saved-indicator"]')).toBeVisible();
      
      // Check saved posts page
      await page.goto('/saved-posts');
      await expect(page.locator('[data-testid="saved-post"]')).toHaveCount.greaterThan(0);
    });

    test('should report inappropriate posts', async ({ page }) => {
      await page.goto('/community');
      
      const firstPost = page.locator('[data-testid="post-card"]').first();
      await firstPost.locator('[data-testid="more-options"]').click();
      await page.click('text=Report');
      
      await expect(page.locator('[data-testid="report-modal"]')).toBeVisible();
      
      await page.selectOption('[data-testid="report-reason"]', 'spam');
      await page.fill('[data-testid="report-details"]', 'This post contains spam content');
      await page.click('[data-testid="submit-report"]');
      
      await expect(page.locator('text=Report submitted successfully')).toBeVisible();
    });
  });

  test.describe('User Profiles & Following', () => {
    test('should view user profile', async ({ page }) => {
      await page.goto('/community');
      
      // Click on post author
      await page.click('[data-testid="post-author"]').first();
      
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
      await expect(page.locator('[data-testid="profile-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="profile-stats"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-posts"]')).toBeVisible();
    });

    test('should follow and unfollow users', async ({ page }) => {
      await page.goto('/community');
      await page.click('[data-testid="post-author"]').first();
      
      const followButton = page.locator('[data-testid="follow-button"]');
      const followerCount = page.locator('[data-testid="follower-count"]');
      
      // Get initial follower count
      const initialCount = await followerCount.textContent();
      
      // Follow user
      await followButton.click();
      await expect(followButton).toContainText('Following');
      
      // Check follower count increased
      const newCount = await followerCount.textContent();
      expect(parseInt(newCount || '0')).toBeGreaterThan(parseInt(initialCount || '0'));
      
      // Unfollow user
      await followButton.click();
      await expect(followButton).toContainText('Follow');
      
      // Check follower count decreased
      const finalCount = await followerCount.textContent();
      expect(parseInt(finalCount || '0')).toBe(parseInt(initialCount || '0'));
    });

    test('should view following feed', async ({ page }) => {
      await page.goto('/community');
      await page.click('[data-testid="following-tab"]');
      
      await expect(page.locator('[data-testid="following-feed"]')).toBeVisible();
      await expect(page.locator('[data-testid="post-card"]')).toHaveCount.greaterThan(0);
      
      // All posts should be from followed users
      const postCards = page.locator('[data-testid="post-card"]');
      const count = await postCards.count();
      
      for (let i = 0; i < count; i++) {
        await expect(postCards.nth(i).locator('[data-testid="following-indicator"]')).toBeVisible();
      }
    });

    test('should view followers and following lists', async ({ page }) => {
      await page.goto('/profile');
      
      // View followers
      await page.click('[data-testid="followers-count"]');
      await expect(page.locator('[data-testid="followers-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="follower-item"]')).toHaveCount.greaterThan(0);
      
      // View following
      await page.click('[data-testid="following-count"]');
      await expect(page.locator('[data-testid="following-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="following-item"]')).toHaveCount.greaterThan(0);
    });
  });

  test.describe('Community Features', () => {
    test('should view trending hashtags', async ({ page }) => {
      await page.goto('/community');
      
      await expect(page.locator('[data-testid="trending-hashtags"]')).toBeVisible();
      await expect(page.locator('[data-testid="hashtag-item"]')).toHaveCount.greaterThan(0);
      
      // Click on trending hashtag
      await page.click('[data-testid="hashtag-item"]').first();
      
      await expect(page.locator('[data-testid="hashtag-feed"]')).toBeVisible();
      await expect(page.locator('[data-testid="hashtag-name"]')).toBeVisible();
    });

    test('should view featured posts', async ({ page }) => {
      await page.goto('/community');
      
      await expect(page.locator('[data-testid="featured-posts"]')).toBeVisible();
      await expect(page.locator('[data-testid="featured-post"]')).toHaveCount.greaterThan(0);
      
      // Featured posts should have special styling
      const featuredPost = page.locator('[data-testid="featured-post"]').first();
      await expect(featuredPost.locator('[data-testid="featured-badge"]')).toBeVisible();
    });

    test('should participate in community challenges', async ({ page }) => {
      await page.goto('/community');
      
      await expect(page.locator('[data-testid="community-challenges"]')).toBeVisible();
      await page.click('[data-testid="challenge-card"]').first();
      
      await expect(page.locator('[data-testid="challenge-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="challenge-participants"]')).toBeVisible();
      
      // Join challenge
      await page.click('[data-testid="join-challenge"]');
      await expect(page.locator('text=Joined challenge successfully')).toBeVisible();
      await expect(page.locator('[data-testid="joined-indicator"]')).toBeVisible();
    });

    test('should view community leaderboard', async ({ page }) => {
      await page.goto('/community');
      await page.click('[data-testid="leaderboard-tab"]');
      
      await expect(page.locator('[data-testid="leaderboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="leaderboard-item"]')).toHaveCount.greaterThan(0);
      
      // Check leaderboard elements
      const firstItem = page.locator('[data-testid="leaderboard-item"]').first();
      await expect(firstItem.locator('[data-testid="rank"]')).toBeVisible();
      await expect(firstItem.locator('[data-testid="username"]')).toBeVisible();
      await expect(firstItem.locator('[data-testid="score"]')).toBeVisible();
    });
  });

  test.describe('Notifications & Activity', () => {
    test('should receive notifications for interactions', async ({ page }) => {
      await page.goto('/community');
      
      // Like a post (should trigger notification for post author)
      await page.click('[data-testid="like-button"]').first();
      
      // Check notification bell
      await page.click('[data-testid="notification-bell"]');
      await expect(page.locator('[data-testid="notification-dropdown"]')).toBeVisible();
      
      // Should have new notification
      await expect(page.locator('[data-testid="notification-item"]')).toHaveCount.greaterThan(0);
      await expect(page.locator('[data-testid="unread-indicator"]')).toBeVisible();
    });

    test('should mark notifications as read', async ({ page }) => {
      await page.goto('/community');
      await page.click('[data-testid="notification-bell"]');
      
      // Mark all as read
      await page.click('[data-testid="mark-all-read"]');
      await expect(page.locator('[data-testid="unread-indicator"]')).not.toBeVisible();
      
      // Individual notification
      await page.click('[data-testid="notification-item"]').first();
      await expect(page.locator('[data-testid="notification-item"]').first()).not.toHaveClass(/unread/);
    });

    test('should view activity feed', async ({ page }) => {
      await page.goto('/activity');
      
      await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();
      await expect(page.locator('[data-testid="activity-item"]')).toHaveCount.greaterThan(0);
      
      // Check activity types
      const activityItems = page.locator('[data-testid="activity-item"]');
      const count = await activityItems.count();
      
      for (let i = 0; i < count; i++) {
        const activityType = activityItems.nth(i).locator('[data-testid="activity-type"]');
        await expect(activityType).toBeVisible();
      }
    });
  });

  test.describe('Content Moderation', () => {
    test('should hide inappropriate content', async ({ page }) => {
      await page.goto('/community');
      
      // Post with inappropriate content should be hidden
      const hiddenPost = page.locator('[data-testid="hidden-post"]');
      if (await hiddenPost.isVisible()) {
        await expect(hiddenPost.locator('[data-testid="content-warning"]')).toBeVisible();
        await expect(hiddenPost.locator('[data-testid="show-content"]')).toBeVisible();
      }
    });

    test('should allow users to hide posts', async ({ page }) => {
      await page.goto('/community');
      
      const firstPost = page.locator('[data-testid="post-card"]').first();
      await firstPost.locator('[data-testid="more-options"]').click();
      await page.click('text=Hide');
      
      await expect(page.locator('text=Post hidden')).toBeVisible();
      await expect(firstPost).not.toBeVisible();
    });

    test('should block users', async ({ page }) => {
      await page.goto('/community');
      await page.click('[data-testid="post-author"]').first();
      
      await page.click('[data-testid="more-options"]');
      await page.click('text=Block');
      await page.click('[data-testid="confirm-block"]');
      
      await expect(page.locator('text=User blocked successfully')).toBeVisible();
      
      // Blocked user's posts should not appear
      await page.goto('/community');
      await expect(page.locator('[data-testid="blocked-user-post"]')).not.toBeVisible();
    });
  });
});
