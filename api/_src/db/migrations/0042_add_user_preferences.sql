-- Migration: Add notification_preferences and favorite_professionals columns to users table
-- These columns support user settings for notifications and favoriting professionals

-- Add notification_preferences column (JSONB for flexible preference storage)
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT NULL;

-- Add favorite_professionals column (array of professional user IDs)
ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_professionals TEXT[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN users.notification_preferences IS 'JSON object storing user notification preferences (email, SMS toggles)';
COMMENT ON COLUMN users.favorite_professionals IS 'Array of user IDs that this user has marked as favorite professionals';
