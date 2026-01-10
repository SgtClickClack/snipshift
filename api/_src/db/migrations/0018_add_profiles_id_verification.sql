-- 0018_add_profiles_id_verification.sql
-- Adds Government ID verification fields to profiles.
-- Idempotent and safe to apply multiple times.

ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS id_document_url text;

ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS id_verified_status varchar(20);

-- Keep updated_at consistent for any rows modified elsewhere.

