-- Pro Verification Logic Migration
-- Adds fields for automated pro verification, no-show tracking, and Top Rated badge

-- Create pro verification status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pro_verification_status') THEN
        CREATE TYPE pro_verification_status AS ENUM (
            'pending_review',
            'verified',
            'at_risk',
            'suspended'
        );
    END IF;
END $$;

-- Add pro verification columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verification_status pro_verification_status NOT NULL DEFAULT 'pending_review';

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS completed_shift_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS no_show_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_no_show_at TIMESTAMP;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS consecutive_five_star_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS top_rated_badge BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS rating_warning_at TIMESTAMP;

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS users_verification_status_idx ON users(verification_status);
CREATE INDEX IF NOT EXISTS users_top_rated_badge_idx ON users(top_rated_badge);
CREATE INDEX IF NOT EXISTS users_average_rating_idx ON users(average_rating);

-- Update existing professionals to 'verified' if they have completed shifts
-- This ensures backwards compatibility for existing users
UPDATE users 
SET verification_status = 'verified' 
WHERE role = 'professional' 
  AND is_onboarded = true
  AND EXISTS (
    SELECT 1 FROM shifts 
    WHERE shifts.assignee_id = users.id 
      AND shifts.attendance_status = 'completed'
  );

-- Calculate completed shift counts for existing professionals
UPDATE users 
SET completed_shift_count = (
    SELECT COUNT(*) FROM shifts 
    WHERE shifts.assignee_id = users.id 
      AND shifts.attendance_status = 'completed'
)
WHERE role = 'professional';

-- Calculate no-show counts for existing professionals
UPDATE users 
SET no_show_count = (
    SELECT COUNT(*) FROM shifts 
    WHERE shifts.assignee_id = users.id 
      AND shifts.attendance_status = 'no_show'
)
WHERE role = 'professional';

-- Set last no-show date for existing professionals
UPDATE users 
SET last_no_show_at = (
    SELECT MAX(shifts.updated_at) FROM shifts 
    WHERE shifts.assignee_id = users.id 
      AND shifts.attendance_status = 'no_show'
)
WHERE role = 'professional';

-- Mark users with rating below 4.0 as 'at_risk' if they are professionals
UPDATE users 
SET verification_status = 'at_risk'
WHERE role = 'professional' 
  AND average_rating IS NOT NULL
  AND average_rating::numeric < 4.0
  AND verification_status = 'verified';

COMMENT ON COLUMN users.verification_status IS 'Pro verification status: pending_review (new), verified (completed shift), at_risk (rating <4.0), suspended';
COMMENT ON COLUMN users.completed_shift_count IS 'Total count of successfully completed shifts';
COMMENT ON COLUMN users.no_show_count IS 'Total count of no-show incidents';
COMMENT ON COLUMN users.last_no_show_at IS 'Timestamp of the most recent no-show incident';
COMMENT ON COLUMN users.consecutive_five_star_count IS 'Count of consecutive 5-star reviews (resets on non-5-star review)';
COMMENT ON COLUMN users.top_rated_badge IS 'True if pro has 5+ consistent 5-star reviews';
COMMENT ON COLUMN users.rating_warning_at IS 'Timestamp when warning about rating drop was sent';
