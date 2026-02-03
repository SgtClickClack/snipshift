/* 0040_add_shift_templates.sql
   Capacity requirements per venue/day - defines how many workers needed per time slot. */

CREATE TABLE IF NOT EXISTS shift_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL,
  start_time varchar(5) NOT NULL,
  end_time varchar(5) NOT NULL,
  required_staff_count integer NOT NULL,
  label varchar(128) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shift_templates_venue_id_idx ON shift_templates(venue_id);
CREATE INDEX IF NOT EXISTS shift_templates_venue_day_idx ON shift_templates(venue_id, day_of_week);
