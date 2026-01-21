/* 0033_add_shift_drafts.sql.
   Draft storage for shift creation autosave and cross-device recovery. */

CREATE TABLE IF NOT EXISTS shift_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  draft_data jsonb NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shift_drafts_venue_id_idx ON shift_drafts(venue_id);
CREATE INDEX IF NOT EXISTS shift_drafts_updated_at_idx ON shift_drafts(updated_at);
