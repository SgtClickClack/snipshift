-- Migration: Add status field to venues table
-- Description: Adds status field to track venue activation state (pending/active)

-- Add status column with default 'pending'
ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';

-- Add index for status queries
CREATE INDEX IF NOT EXISTS venues_status_idx ON venues(status);

-- Add comment
COMMENT ON COLUMN venues.status IS 'Venue activation status: pending (awaiting Stripe onboarding) or active (payouts enabled)';
