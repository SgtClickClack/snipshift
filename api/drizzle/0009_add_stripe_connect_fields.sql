-- Add payment_status enum (if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE "public"."payment_status" AS ENUM('UNPAID', 'AUTHORIZED', 'PAID', 'REFUNDED', 'PAYMENT_FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new enum values to existing payment_status enum (if it exists with old values)
-- PostgreSQL doesn't support IF NOT EXISTS for enum values, so we catch exceptions
DO $$ BEGIN
    ALTER TYPE "public"."payment_status" ADD VALUE 'UNPAID';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "public"."payment_status" ADD VALUE 'AUTHORIZED';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "public"."payment_status" ADD VALUE 'PAID';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "public"."payment_status" ADD VALUE 'REFUNDED';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "public"."payment_status" ADD VALUE 'PAYMENT_FAILED';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN OTHERS THEN null;
END $$;

-- Add Stripe Connect fields to users table
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "stripe_account_id" varchar(255),
ADD COLUMN IF NOT EXISTS "stripe_onboarding_complete" boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS "stripe_customer_id" varchar(255);

-- Create indexes for Stripe fields on users
CREATE INDEX IF NOT EXISTS "users_stripe_account_id_idx" ON "users" ("stripe_account_id");
CREATE INDEX IF NOT EXISTS "users_stripe_customer_id_idx" ON "users" ("stripe_customer_id");

-- Add payment fields to shifts table
-- Add column first without default to avoid enum value errors
ALTER TABLE "shifts" 
ADD COLUMN IF NOT EXISTS "payment_status" "payment_status",
ADD COLUMN IF NOT EXISTS "payment_intent_id" varchar(255),
ADD COLUMN IF NOT EXISTS "stripe_charge_id" varchar(255),
ADD COLUMN IF NOT EXISTS "application_fee_amount" integer,
ADD COLUMN IF NOT EXISTS "transfer_amount" integer;

-- Try to set default to UNPAID if the enum value exists
DO $$ BEGIN
    ALTER TABLE "shifts" ALTER COLUMN "payment_status" SET DEFAULT 'UNPAID'::payment_status;
EXCEPTION
    WHEN OTHERS THEN
        -- If UNPAID doesn't exist yet, leave it without default
        null;
END $$;

-- Create indexes for payment fields on shifts
CREATE INDEX IF NOT EXISTS "shifts_payment_status_idx" ON "shifts" ("payment_status");
CREATE INDEX IF NOT EXISTS "shifts_payment_intent_id_idx" ON "shifts" ("payment_intent_id");
