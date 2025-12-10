-- Add missing columns to shifts table to match schema
-- This migration ensures all columns from the Drizzle schema exist

-- Add is_recurring column if it doesn't exist
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "is_recurring" boolean NOT NULL DEFAULT false;

-- Add parent_shift_id column if it doesn't exist  
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "parent_shift_id" uuid;

-- Add foreign key for parent_shift_id if it doesn't exist
DO $$ BEGIN
    ALTER TABLE "shifts" ADD CONSTRAINT "shifts_parent_shift_id_shifts_id_fk" 
    FOREIGN KEY ("parent_shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create index on parent_shift_id if it doesn't exist
CREATE INDEX IF NOT EXISTS "shifts_parent_shift_id_idx" ON "shifts" ("parent_shift_id");

-- Ensure assignee_id exists (in case it was dropped)
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "assignee_id" uuid;

-- Ensure assignee_id foreign key exists
DO $$ BEGIN
    ALTER TABLE "shifts" ADD CONSTRAINT "shifts_assignee_id_users_id_fk" 
    FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Ensure assignee_id index exists
CREATE INDEX IF NOT EXISTS "shifts_assignee_id_idx" ON "shifts" ("assignee_id");

-- Update shift_status enum to include all required values
DO $$ BEGIN
    -- Add 'draft' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'draft' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'shift_status')) THEN
        ALTER TYPE "public"."shift_status" ADD VALUE 'draft';
    END IF;
    
    -- Add 'pending' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'shift_status')) THEN
        ALTER TYPE "public"."shift_status" ADD VALUE 'pending';
    END IF;
    
    -- Add 'invited' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'invited' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'shift_status')) THEN
        ALTER TYPE "public"."shift_status" ADD VALUE 'invited';
    END IF;
    
    -- Add 'confirmed' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'confirmed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'shift_status')) THEN
        ALTER TYPE "public"."shift_status" ADD VALUE 'confirmed';
    END IF;
    
    -- Add 'cancelled' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelled' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'shift_status')) THEN
        ALTER TYPE "public"."shift_status" ADD VALUE 'cancelled';
    END IF;
END $$;

