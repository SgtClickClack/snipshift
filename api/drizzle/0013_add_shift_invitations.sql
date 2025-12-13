-- Migration: First-to-Accept Invites System
-- Add 'expired' status to shift_offer_status enum for multi-invite support

-- Add 'expired' to shift_offer_status enum
DO $$ BEGIN
    ALTER TYPE "public"."shift_offer_status" ADD VALUE IF NOT EXISTS 'expired';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create shift_invitations table (as specified in requirements)
-- This is separate from shift_offers to support the new "First-to-Accept" pattern
CREATE TABLE IF NOT EXISTS "shift_invitations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "shift_id" uuid NOT NULL,
    "professional_id" uuid NOT NULL,
    "status" varchar(20) NOT NULL DEFAULT 'PENDING',
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "shift_invitations_shift_id_fk" 
        FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action,
    CONSTRAINT "shift_invitations_professional_id_fk" 
        FOREIGN KEY ("professional_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);

-- Add unique constraint to prevent duplicate invitations
CREATE UNIQUE INDEX IF NOT EXISTS "shift_invitations_shift_professional_unique" 
    ON "shift_invitations" ("shift_id", "professional_id");

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS "shift_invitations_shift_id_idx" ON "shift_invitations" ("shift_id");
CREATE INDEX IF NOT EXISTS "shift_invitations_professional_id_idx" ON "shift_invitations" ("professional_id");
CREATE INDEX IF NOT EXISTS "shift_invitations_status_idx" ON "shift_invitations" ("status");
