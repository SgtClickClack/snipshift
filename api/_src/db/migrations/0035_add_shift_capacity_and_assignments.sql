-- Add capacity (staff required) to shifts. Default 1 for backward compatibility.
ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS capacity integer NOT NULL DEFAULT 1;

-- One-to-many: shift_assignments replaces single assigneeId for multi-worker shifts.
-- assigneeId remains for backward compatibility (can mirror first assignment).
CREATE TABLE IF NOT EXISTS shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shift_id, user_id)
);

CREATE INDEX IF NOT EXISTS shift_assignments_shift_id_idx ON shift_assignments(shift_id);
CREATE INDEX IF NOT EXISTS shift_assignments_user_id_idx ON shift_assignments(user_id);

-- Backfill: for existing shifts with assignee_id, create a shift_assignment row.
INSERT INTO shift_assignments (shift_id, user_id)
SELECT id, assignee_id FROM shifts
WHERE assignee_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM shift_assignments sa WHERE sa.shift_id = shifts.id AND sa.user_id = shifts.assignee_id);
