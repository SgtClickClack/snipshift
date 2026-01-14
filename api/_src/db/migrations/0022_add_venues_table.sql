-- Migration: Add venues table
-- Description: Creates the venues table for storing venue profile data in Brisbane onboarding

-- Create venues table
CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    waitlist_id UUID REFERENCES waitlist(id) ON DELETE SET NULL,
    
    -- Venue Information
    venue_name VARCHAR(255) NOT NULL,
    liquor_license_number VARCHAR(100),
    
    -- Structured Address (JSONB for flexibility)
    -- Format: { street, suburb, postcode, city, state, country, lat?, lng? }
    -- Country: ISO 3166-1 alpha-2 code "AU"
    -- Postcode: Brisbane range 4000-4199
    address JSONB NOT NULL,
    
    -- Operating Hours (JSONB per day)
    -- Format: { [day]: { open?: "HH:mm", close?: "HH:mm", closed?: boolean } }
    operating_hours JSONB NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS venues_user_id_idx ON venues(user_id);
CREATE INDEX IF NOT EXISTS venues_waitlist_id_idx ON venues(waitlist_id);
CREATE INDEX IF NOT EXISTS venues_venue_name_idx ON venues(venue_name);

-- Add comment for documentation
COMMENT ON TABLE venues IS 'Stores venue profile data for Brisbane-based hospitality venues';
COMMENT ON COLUMN venues.address IS 'Structured address object matching ISO 3166-1 and Australian postcode standards';
COMMENT ON COLUMN venues.operating_hours IS 'JSON structure per day of week with open/close times or closed flag';
