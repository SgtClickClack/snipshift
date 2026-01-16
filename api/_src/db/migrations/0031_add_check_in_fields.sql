-- Migration: Add check-in functionality fields
-- Description: Adds 'checked_in' to attendance_status enum and actual_start_time column to shifts table

-- Add 'checked_in' value to attendance_status enum
-- Note: PostgreSQL requires using ALTER TYPE ... ADD VALUE which cannot be rolled back
DO $$ 
BEGIN
  -- Check if 'checked_in' already exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'checked_in' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'attendance_status')
  ) THEN
    ALTER TYPE attendance_status ADD VALUE 'checked_in';
  END IF;
END $$;

-- Add actual_start_time column to shifts table
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMP;

-- Create index for actual_start_time for query performance
CREATE INDEX IF NOT EXISTS shifts_actual_start_time_idx ON shifts(actual_start_time);

-- Add comment for documentation
COMMENT ON COLUMN shifts.actual_start_time IS 'Server-side timestamp when worker checked in to the shift (geofenced)';
