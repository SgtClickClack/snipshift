-- HospoGo: profiles reliability strikes (staff penalty persistence)
-- Keep idempotent for safe re-application.

CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  reliability_strikes integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS reliability_strikes integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS profiles_reliability_strikes_idx
  ON profiles (reliability_strikes);

