-- Migration: Atomic Settlement and Productivity Ready
-- Date: 2026-01-21
-- Description: Adds Settlement IDs for D365/Workday reconciliation and Productivity Ready flag for enterprise compliance

-- =============================================================================
-- TASK 1 & 2: ATOMIC SETTLEMENT - Add Settlement ID to payouts
-- =============================================================================

-- Add settlement_id column to payouts table (required for D365/Workday reconciliation)
ALTER TABLE payouts 
ADD COLUMN IF NOT EXISTS settlement_id VARCHAR(32);

-- Add settlement_type column (immediate vs batch processing)
ALTER TABLE payouts 
ADD COLUMN IF NOT EXISTS settlement_type VARCHAR(20) NOT NULL DEFAULT 'immediate';

-- Generate Settlement IDs for existing payouts that don't have one
-- Format: STL-{YYYYMMDD}-{random6}
UPDATE payouts 
SET settlement_id = 'STL-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6))
WHERE settlement_id IS NULL;

-- Now make settlement_id NOT NULL (only if it's not already NOT NULL)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payouts' 
        AND column_name = 'settlement_id' 
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE payouts ALTER COLUMN settlement_id SET NOT NULL;
    END IF;
END $$;

-- Add unique constraint on settlement_id (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'payouts_settlement_id_unique'
    ) THEN
        ALTER TABLE payouts ADD CONSTRAINT payouts_settlement_id_unique UNIQUE (settlement_id);
    END IF;
END $$;

-- Add index for settlement_id lookups
CREATE INDEX IF NOT EXISTS payouts_settlement_id_idx ON payouts(settlement_id);

-- =============================================================================
-- TASK 2: AUDIT LOG - Add Settlement ID to financial ledger
-- =============================================================================

-- Add new ledger entry types for immediate settlement
DO $$ 
BEGIN
    ALTER TYPE ledger_entry_type ADD VALUE IF NOT EXISTS 'IMMEDIATE_SETTLEMENT_COMPLETED';
    ALTER TYPE ledger_entry_type ADD VALUE IF NOT EXISTS 'IMMEDIATE_SETTLEMENT_FAILED';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add settlement_id column to financial_ledger_entries
ALTER TABLE financial_ledger_entries 
ADD COLUMN IF NOT EXISTS settlement_id VARCHAR(32);

-- Add index for settlement_id lookups on ledger
CREATE INDEX IF NOT EXISTS financial_ledger_entries_settlement_id_idx 
ON financial_ledger_entries(settlement_id);

-- Backfill settlement_ids for existing ledger entries from their associated payouts
UPDATE financial_ledger_entries fle
SET settlement_id = p.settlement_id
FROM payouts p
WHERE fle.payout_id = p.id 
AND fle.settlement_id IS NULL;

-- =============================================================================
-- TASK 3: PRODUCTIVITY READY - Add VEVO and compliance fields to profiles
-- =============================================================================

-- Add VEVO verification fields
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS vevo_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS vevo_verified_at TIMESTAMP;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS vevo_expiry_date DATE;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS vevo_reference_number VARCHAR(50);

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS vevo_check_type VARCHAR(30);

-- Add Productivity Ready flag (gate for enterprise clients like Endeavour)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS productivity_ready BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS productivity_ready_at TIMESTAMP;

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS profiles_vevo_verified_idx ON profiles(vevo_verified);
CREATE INDEX IF NOT EXISTS profiles_productivity_ready_idx ON profiles(productivity_ready);

-- =============================================================================
-- COMMENTS for documentation
-- =============================================================================

COMMENT ON COLUMN payouts.settlement_id IS 'Unique Settlement ID for D365/Workday reconciliation. Format: STL-{YYYYMMDD}-{random6}';
COMMENT ON COLUMN payouts.settlement_type IS 'Settlement type: immediate (bypasses batch) or batch (legacy processing)';

COMMENT ON COLUMN financial_ledger_entries.settlement_id IS 'Links to payouts.settlement_id for cross-system reconciliation';

COMMENT ON COLUMN profiles.vevo_verified IS 'TRUE when VEVO (Visa Entitlement Verification Online) check has been completed';
COMMENT ON COLUMN profiles.vevo_verified_at IS 'Timestamp when VEVO verification was completed';
COMMENT ON COLUMN profiles.vevo_expiry_date IS 'Work rights expiry date for visa holders (NULL for citizens/permanent residents)';
COMMENT ON COLUMN profiles.vevo_reference_number IS 'VEVO reference number for audit trail (PII - handle with care)';
COMMENT ON COLUMN profiles.vevo_check_type IS 'Type of work rights: citizen, permanent_resident, work_visa, student_visa';
COMMENT ON COLUMN profiles.productivity_ready IS 'TRUE when both ID verification AND VEVO verification are complete - gate for enterprise clients';
COMMENT ON COLUMN profiles.productivity_ready_at IS 'Timestamp when user became productivity ready';
