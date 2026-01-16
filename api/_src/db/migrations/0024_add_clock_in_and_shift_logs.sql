-- Migration: Add clock-in functionality and shift logs
-- Description: Adds clockInTime field to shifts table and creates shift_logs table for attendance tracking

-- Add clock_in_time column to shifts table
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS clock_in_time TIMESTAMP;

-- Create index for clock_in_time
CREATE INDEX IF NOT EXISTS shifts_clock_in_time_idx ON shifts(clock_in_time);

-- Create shift_logs table for detailed attendance tracking
CREATE TABLE IF NOT EXISTS shift_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'CLOCK_IN', 'CLOCK_OUT', etc.
    latitude DECIMAL(10, 7), -- Staff location latitude
    longitude DECIMAL(10, 7), -- Staff location longitude
    venue_latitude DECIMAL(10, 7), -- Venue location latitude
    venue_longitude DECIMAL(10, 7), -- Venue location longitude
    distance_meters INTEGER, -- Calculated distance in meters
    accuracy DECIMAL(10, 2), -- GPS accuracy in meters (if provided)
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(), -- When the event occurred
    metadata TEXT, -- JSON string for additional data
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS shift_logs_shift_id_idx ON shift_logs(shift_id);
CREATE INDEX IF NOT EXISTS shift_logs_staff_id_idx ON shift_logs(staff_id);
CREATE INDEX IF NOT EXISTS shift_logs_event_type_idx ON shift_logs(event_type);
CREATE INDEX IF NOT EXISTS shift_logs_timestamp_idx ON shift_logs(timestamp);
CREATE INDEX IF NOT EXISTS shift_logs_shift_staff_idx ON shift_logs(shift_id, staff_id);

-- Add comments for documentation
COMMENT ON TABLE shift_logs IS 'Stores detailed attendance logs for clock-in events with geofencing data';
COMMENT ON COLUMN shift_logs.distance_meters IS 'Calculated distance between staff location and venue in meters';
COMMENT ON COLUMN shift_logs.metadata IS 'JSON string for additional data (GPS accuracy, device info, etc.)';
