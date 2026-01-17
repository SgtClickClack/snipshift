-- SQL Migration: Convert verification_status from enum to text
-- Run this in the Neon console before running npm run db:push

-- Step 1: Alter the column type from enum to text
-- This preserves existing data by casting enum values to text
ALTER TABLE users 
  ALTER COLUMN verification_status TYPE text 
  USING verification_status::text;

-- Step 2: Verify the change (optional - run separately to check)
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name = 'verification_status';

-- Step 3: After running db:push successfully, you can drop the enum type if desired:
-- DROP TYPE IF EXISTS pro_verification_status;
