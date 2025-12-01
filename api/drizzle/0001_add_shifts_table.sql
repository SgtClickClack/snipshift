-- Create shift_status enum
CREATE TYPE "public"."shift_status" AS ENUM('open', 'filled', 'completed');

-- Create shifts table
CREATE TABLE "shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"hourly_rate" numeric(10, 2) NOT NULL,
	"status" "shift_status" DEFAULT 'open' NOT NULL,
	"location" varchar(512),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_employer_id_users_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- Create indexes
CREATE INDEX "shifts_employer_id_idx" ON "shifts" ("employer_id");
CREATE INDEX "shifts_status_idx" ON "shifts" ("status");
CREATE INDEX "shifts_start_time_idx" ON "shifts" ("start_time");
CREATE INDEX "shifts_status_start_time_idx" ON "shifts" ("status","start_time");

-- Enable RLS on shifts table
-- Note: These RLS policies use Supabase's auth.uid() function.
-- If using Firebase auth or another auth system, you may need to:
-- 1. Disable RLS and rely on application-level authorization (already implemented in routes)
-- 2. Or create a custom function to map Firebase UID to user ID
-- 3. Or migrate to Supabase Auth for RLS to work automatically
ALTER TABLE "shifts" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Employers can INSERT their own shifts
-- This policy ensures only authenticated users can insert shifts, and only as their own employer_id
CREATE POLICY "Employers can insert their own shifts"
ON "shifts"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = employer_id::text);

-- RLS Policy: Employers can UPDATE their own shifts
CREATE POLICY "Employers can update their own shifts"
ON "shifts"
FOR UPDATE
TO authenticated
USING (auth.uid()::text = employer_id::text)
WITH CHECK (auth.uid()::text = employer_id::text);

-- RLS Policy: All authenticated users can SELECT open shifts
CREATE POLICY "Authenticated users can view open shifts"
ON "shifts"
FOR SELECT
TO authenticated
USING (status = 'open');

-- RLS Policy: Employers can SELECT their own shifts (regardless of status)
CREATE POLICY "Employers can view their own shifts"
ON "shifts"
FOR SELECT
TO authenticated
USING (auth.uid()::text = employer_id::text);

