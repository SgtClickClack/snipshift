-- Migration: Add total_earned field to users table
-- Description: Tracks total earnings for workers across all completed shifts

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS total_earned_cents INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS users_total_earned_cents_idx ON users(total_earned_cents);

COMMENT ON COLUMN users.total_earned_cents IS 'Total earnings in cents across all completed shifts (sum of payout amounts)';
