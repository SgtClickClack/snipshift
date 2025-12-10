-- Add assignee_id column to shifts table
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "assignee_id" uuid;

-- Add foreign key constraint for assignee_id
DO $$ BEGIN
    ALTER TABLE "shifts" ADD CONSTRAINT "shifts_assignee_id_users_id_fk" 
    FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create index on assignee_id for efficient queries
CREATE INDEX IF NOT EXISTS "shifts_assignee_id_idx" ON "shifts" ("assignee_id");

-- Update shift_status enum to include missing values
-- Note: PostgreSQL doesn't support IF NOT EXISTS for enum values, so we use a different approach
DO $$ BEGIN
    -- Add 'draft' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'draft' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'shift_status')) THEN
        ALTER TYPE "public"."shift_status" ADD VALUE 'draft';
    END IF;
    
    -- Add 'invited' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'invited' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'shift_status')) THEN
        ALTER TYPE "public"."shift_status" ADD VALUE 'invited';
    END IF;
    
    -- Add 'confirmed' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'confirmed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'shift_status')) THEN
        ALTER TYPE "public"."shift_status" ADD VALUE 'confirmed';
    END IF;
END $$;

