-- Migration: Add approval status to waitlist table
-- Description: Adds approval status and approved timestamp for venue approval flow

-- Create waitlist approval status enum if not exists
DO $$ BEGIN
    CREATE TYPE waitlist_approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add approval_status column with default 'pending'
ALTER TABLE waitlist 
ADD COLUMN IF NOT EXISTS approval_status waitlist_approval_status NOT NULL DEFAULT 'pending';

-- Add approved_at timestamp column (nullable, ISO 8601 UTC)
ALTER TABLE waitlist 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- Create index for filtering by approval status
CREATE INDEX IF NOT EXISTS waitlist_approval_status_idx ON waitlist(approval_status);

-- Create index for approved_at queries
CREATE INDEX IF NOT EXISTS waitlist_approved_at_idx ON waitlist(approved_at DESC);
