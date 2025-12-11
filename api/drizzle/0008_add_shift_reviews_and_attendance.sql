-- Add attendance_status enum
DO $$ BEGIN
    CREATE TYPE "public"."attendance_status" AS ENUM('pending', 'completed', 'no_show');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add 'pending_completion' to shift_status enum
DO $$ BEGIN
    ALTER TYPE "public"."shift_status" ADD VALUE IF NOT EXISTS 'pending_completion';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add attendance_status column to shifts table
ALTER TABLE "shifts" 
ADD COLUMN IF NOT EXISTS "attendance_status" "attendance_status" DEFAULT 'pending';

-- Create index on attendance_status
CREATE INDEX IF NOT EXISTS "shifts_attendance_status_idx" ON "shifts" ("attendance_status");

-- Create shift_review_type enum
DO $$ BEGIN
    CREATE TYPE "public"."shift_review_type" AS ENUM('SHOP_REVIEWING_BARBER', 'BARBER_REVIEWING_SHOP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create shift_reviews table
CREATE TABLE IF NOT EXISTS "shift_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"reviewee_id" uuid NOT NULL,
	"type" "shift_review_type" NOT NULL,
	"rating" numeric(1, 0) NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
    ALTER TABLE "shift_reviews" ADD CONSTRAINT "shift_reviews_shift_id_shifts_id_fk" 
    FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "shift_reviews" ADD CONSTRAINT "shift_reviews_reviewer_id_users_id_fk" 
    FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "shift_reviews" ADD CONSTRAINT "shift_reviews_reviewee_id_users_id_fk" 
    FOREIGN KEY ("reviewee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "shift_reviews_shift_id_idx" ON "shift_reviews" ("shift_id");
CREATE INDEX IF NOT EXISTS "shift_reviews_reviewer_id_idx" ON "shift_reviews" ("reviewer_id");
CREATE INDEX IF NOT EXISTS "shift_reviews_reviewee_id_idx" ON "shift_reviews" ("reviewee_id");
CREATE UNIQUE INDEX IF NOT EXISTS "shift_reviews_shift_reviewer_unique" ON "shift_reviews" ("shift_id", "reviewer_id", "type");
