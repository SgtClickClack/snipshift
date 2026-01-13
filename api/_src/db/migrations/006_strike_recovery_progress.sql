-- Strike Recovery Progress Migration
-- Adds recovery_progress field to track shifts with 4.5+ rating toward strike removal

-- Add recovery_progress column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS recovery_progress INTEGER NOT NULL DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN users.recovery_progress IS 'Number of shifts with 4.5+ rating completed since last strike. Resets to 0 when strike is removed or rating < 3.0.';

-- Create index for querying users with active recovery progress
CREATE INDEX IF NOT EXISTS users_recovery_progress_idx ON users(recovery_progress) WHERE recovery_progress > 0;
