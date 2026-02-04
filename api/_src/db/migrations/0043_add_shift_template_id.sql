-- Migration: Add template_id to shifts table
-- Purpose: Link auto-generated shifts to their source template for audit trail and analytics
-- This enables:
--   1. Tracking which shifts were auto-generated vs manually created
--   2. Template-level analytics (e.g., how many shifts generated from each template)
--   3. Proper cascade behavior when templates are updated/deleted

-- Add the template_id column with foreign key to shift_templates
ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES shift_templates(id) ON DELETE SET NULL;

-- Add index for template lookups
CREATE INDEX IF NOT EXISTS shifts_template_id_idx ON shifts(template_id);

-- Add composite index for efficient range queries with employer filtering
-- This optimizes the getShiftsByEmployerInRange query used by auto-fill
CREATE INDEX IF NOT EXISTS shifts_employer_start_end_idx ON shifts(employer_id, start_time, end_time);

-- Comment on column for documentation
COMMENT ON COLUMN shifts.template_id IS 'References the shift template that auto-generated this shift. NULL for manually created shifts.';
