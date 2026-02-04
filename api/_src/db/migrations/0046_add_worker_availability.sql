-- Migration: Add worker_availability table for professional scheduling
-- Purpose: Store availability preferences for professional workers (morning/lunch/dinner slots)
-- This enables:
--   1. Smart Fill service to filter invitees by availability
--   2. Professional dashboard availability picker
--   3. Efficient matching of workers to shifts based on time slots

-- Create worker_availability table if it doesn't exist
CREATE TABLE IF NOT EXISTS worker_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- The worker whose availability this is
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- The date for this availability entry (YYYY-MM-DD)
  date DATE NOT NULL,
  
  -- Time slot availability flags
  morning BOOLEAN NOT NULL DEFAULT FALSE,   -- 06:00 - 11:00
  lunch BOOLEAN NOT NULL DEFAULT FALSE,     -- 11:00 - 15:00
  dinner BOOLEAN NOT NULL DEFAULT FALSE,    -- 15:00 - 23:00
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Unique constraint: one availability record per user per day
CREATE UNIQUE INDEX IF NOT EXISTS worker_availability_user_date_unique 
  ON worker_availability(user_id, date);

-- Index for efficient queries by user
CREATE INDEX IF NOT EXISTS worker_availability_user_id_idx 
  ON worker_availability(user_id);

-- Index for efficient queries by date range
CREATE INDEX IF NOT EXISTS worker_availability_date_idx 
  ON worker_availability(date);

-- Composite index for finding available workers on a specific date/slot
CREATE INDEX IF NOT EXISTS worker_availability_query_idx 
  ON worker_availability(date, morning, lunch, dinner);

-- Comment for documentation
COMMENT ON TABLE worker_availability IS 'Stores daily availability preferences for professional workers. Used by Smart Fill to match workers to shifts.';
COMMENT ON COLUMN worker_availability.morning IS 'Available for morning shifts (06:00 - 11:00)';
COMMENT ON COLUMN worker_availability.lunch IS 'Available for lunch shifts (11:00 - 15:00)';
COMMENT ON COLUMN worker_availability.dinner IS 'Available for dinner shifts (15:00 - 23:00)';
