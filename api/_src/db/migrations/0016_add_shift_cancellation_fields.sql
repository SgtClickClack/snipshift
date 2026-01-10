-- HospoGo: hospitality cancellation logic fields for shifts
-- Keep idempotent for safe re-application in tests/environments.

ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS cancellation_window_hours integer NOT NULL DEFAULT 24;

ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS kill_fee_amount numeric(10, 2);

ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS staff_cancellation_reason text;

ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS is_emergency_fill boolean NOT NULL DEFAULT false;

