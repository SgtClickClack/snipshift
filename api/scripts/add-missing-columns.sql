-- Add missing pro verification columns to users table
-- These columns are defined in the Drizzle schema but missing from the database

-- Create the pro_verification_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE pro_verification_status AS ENUM('pending_review', 'verified', 'at_risk', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add verification_status column
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status pro_verification_status NOT NULL DEFAULT 'pending_review';

-- Add completed_shift_count column
ALTER TABLE users ADD COLUMN IF NOT EXISTS completed_shift_count integer NOT NULL DEFAULT 0;

-- Add no_show_count column
ALTER TABLE users ADD COLUMN IF NOT EXISTS no_show_count integer NOT NULL DEFAULT 0;

-- Add last_no_show_at column
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_no_show_at timestamp;

-- Add consecutive_five_star_count column
ALTER TABLE users ADD COLUMN IF NOT EXISTS consecutive_five_star_count integer NOT NULL DEFAULT 0;

-- Add top_rated_badge column
ALTER TABLE users ADD COLUMN IF NOT EXISTS top_rated_badge boolean NOT NULL DEFAULT false;

-- Add rating_warning_at column
ALTER TABLE users ADD COLUMN IF NOT EXISTS rating_warning_at timestamp;

-- Add strikes column
ALTER TABLE users ADD COLUMN IF NOT EXISTS strikes integer NOT NULL DEFAULT 0;

-- Add last_strike_date column
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_strike_date timestamp;

-- Add shifts_since_last_strike column
ALTER TABLE users ADD COLUMN IF NOT EXISTS shifts_since_last_strike integer NOT NULL DEFAULT 0;

-- Add recovery_progress column
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_progress integer NOT NULL DEFAULT 0;

-- Add suspended_until column
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until timestamp;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS users_verification_status_idx ON users (verification_status);
CREATE INDEX IF NOT EXISTS users_top_rated_badge_idx ON users (top_rated_badge);
CREATE INDEX IF NOT EXISTS users_average_rating_idx ON users (average_rating);
