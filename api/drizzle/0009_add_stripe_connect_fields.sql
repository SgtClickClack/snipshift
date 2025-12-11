-- Add payment_status enum
DO $$ BEGIN
    CREATE TYPE "public"."payment_status" AS ENUM('UNPAID', 'AUTHORIZED', 'PAID', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
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
ALTER TABLE "shifts" 
ADD COLUMN IF NOT EXISTS "payment_status" "payment_status" DEFAULT 'UNPAID',
ADD COLUMN IF NOT EXISTS "payment_intent_id" varchar(255);

-- Create indexes for payment fields on shifts
CREATE INDEX IF NOT EXISTS "shifts_payment_status_idx" ON "shifts" ("payment_status");
CREATE INDEX IF NOT EXISTS "shifts_payment_intent_id_idx" ON "shifts" ("payment_intent_id");
