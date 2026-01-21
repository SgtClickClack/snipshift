-- Add pending_onboarding role for safer signup defaults
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'pending_onboarding';

-- Add Firebase UID and last login tracking
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS firebase_uid varchar(128),
  ADD COLUMN IF NOT EXISTS last_login timestamp;

-- Default new users to pending_onboarding until profile is completed
ALTER TABLE users
  ALTER COLUMN role SET DEFAULT 'pending_onboarding',
  ALTER COLUMN roles SET DEFAULT ARRAY['pending_onboarding']::text[];

-- Ensure Firebase UID is unique for upsert safety
CREATE UNIQUE INDEX IF NOT EXISTS users_firebase_uid_idx ON users (firebase_uid);
