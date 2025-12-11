-- Add auto_accept column to shifts table
DO $$ BEGIN
    ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "auto_accept" boolean DEFAULT false NOT NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

