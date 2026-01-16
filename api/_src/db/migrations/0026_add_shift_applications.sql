-- Migration: Add shift_applications table
-- Description: Dedicated table for shift applications with venue_id and message fields

-- Create shift_applications table
CREATE TABLE IF NOT EXISTS shift_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS shift_applications_shift_id_idx ON shift_applications(shift_id);
CREATE INDEX IF NOT EXISTS shift_applications_worker_id_idx ON shift_applications(worker_id);
CREATE INDEX IF NOT EXISTS shift_applications_venue_id_idx ON shift_applications(venue_id);
CREATE INDEX IF NOT EXISTS shift_applications_status_idx ON shift_applications(status);
CREATE INDEX IF NOT EXISTS shift_applications_shift_status_idx ON shift_applications(shift_id, status);

-- Unique constraint to prevent duplicate applications
CREATE UNIQUE INDEX IF NOT EXISTS shift_applications_shift_worker_unique ON shift_applications(shift_id, worker_id);

-- Add comments for documentation
COMMENT ON TABLE shift_applications IS 'Stores shift applications submitted by hospitality workers';
COMMENT ON COLUMN shift_applications.status IS 'Application status: pending (awaiting review), accepted (approved by venue), rejected (declined by venue)';
COMMENT ON COLUMN shift_applications.message IS 'Optional message from worker to venue owner';
COMMENT ON COLUMN shift_applications.venue_id IS 'Reference to the venue owner (employer) user ID';
