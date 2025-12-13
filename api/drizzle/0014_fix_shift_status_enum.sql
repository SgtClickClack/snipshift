-- Migration: Fix shift_status enum to include all required values
-- This ensures the PostgreSQL enum has all values matching the Drizzle schema
-- Statuses: draft, pending, invited, open, filled, completed, confirmed, cancelled, pending_completion

-- Add 'draft' status if not exists
DO $$ BEGIN
    ALTER TYPE "public"."shift_status" ADD VALUE IF NOT EXISTS 'draft';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add 'pending' status if not exists
DO $$ BEGIN
    ALTER TYPE "public"."shift_status" ADD VALUE IF NOT EXISTS 'pending';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add 'invited' status if not exists
DO $$ BEGIN
    ALTER TYPE "public"."shift_status" ADD VALUE IF NOT EXISTS 'invited';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add 'open' status if not exists (should already exist from initial migration)
DO $$ BEGIN
    ALTER TYPE "public"."shift_status" ADD VALUE IF NOT EXISTS 'open';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add 'filled' status if not exists (should already exist from initial migration)
DO $$ BEGIN
    ALTER TYPE "public"."shift_status" ADD VALUE IF NOT EXISTS 'filled';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add 'completed' status if not exists (should already exist from initial migration)
DO $$ BEGIN
    ALTER TYPE "public"."shift_status" ADD VALUE IF NOT EXISTS 'completed';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add 'confirmed' status if not exists
DO $$ BEGIN
    ALTER TYPE "public"."shift_status" ADD VALUE IF NOT EXISTS 'confirmed';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add 'cancelled' status if not exists
DO $$ BEGIN
    ALTER TYPE "public"."shift_status" ADD VALUE IF NOT EXISTS 'cancelled';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add 'pending_completion' status if not exists
DO $$ BEGIN
    ALTER TYPE "public"."shift_status" ADD VALUE IF NOT EXISTS 'pending_completion';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Verify: List all enum values (for debugging purposes, this is just a SELECT)
-- You can run this manually to verify: SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'shift_status');
