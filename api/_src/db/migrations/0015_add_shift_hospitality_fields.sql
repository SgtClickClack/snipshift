-- HospoGo pivot: hospitality-specific shift fields
-- Safe to run multiple times

ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS role varchar(64);

ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS uniform_requirements text;

ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS rsa_required boolean NOT NULL DEFAULT false;

ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS expected_pax integer;

