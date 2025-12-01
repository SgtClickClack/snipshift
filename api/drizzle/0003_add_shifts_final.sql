-- Create shift_status enum (handle if it already exists)
DO $$ BEGIN
    CREATE TYPE "public"."shift_status" AS ENUM('open', 'filled', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create shifts table
CREATE TABLE IF NOT EXISTS "shifts" (
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

-- Add foreign key constraint (handle if it already exists)
DO $$ BEGIN
    ALTER TABLE "shifts" ADD CONSTRAINT "shifts_employer_id_users_id_fk" 
    FOREIGN KEY ("employer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes (IF NOT EXISTS handles duplicates)
CREATE INDEX IF NOT EXISTS "shifts_employer_id_idx" ON "shifts" ("employer_id");
CREATE INDEX IF NOT EXISTS "shifts_status_idx" ON "shifts" ("status");
CREATE INDEX IF NOT EXISTS "shifts_start_time_idx" ON "shifts" ("start_time");
CREATE INDEX IF NOT EXISTS "shifts_status_start_time_idx" ON "shifts" ("status","start_time");
