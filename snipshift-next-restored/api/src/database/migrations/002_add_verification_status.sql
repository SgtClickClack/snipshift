-- Migration: Add verification status to brand and trainer profiles
-- Created: 2025-01-16

-- Create verification_status enum
CREATE TYPE verification_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Add verification_status column to brand_profiles table
ALTER TABLE brand_profiles 
ADD COLUMN verification_status verification_status NOT NULL DEFAULT 'PENDING';

-- Add verification_status column to trainer_profiles table  
ALTER TABLE trainer_profiles 
ADD COLUMN verification_status verification_status NOT NULL DEFAULT 'PENDING';

-- Update existing records to have PENDING status
UPDATE brand_profiles SET verification_status = 'PENDING' WHERE verification_status IS NULL;
UPDATE trainer_profiles SET verification_status = 'PENDING' WHERE verification_status IS NULL;
