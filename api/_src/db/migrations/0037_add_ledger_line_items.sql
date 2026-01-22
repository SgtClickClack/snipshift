-- Migration: Add Ledger Line Items for Award Breakdown
-- Date: 2026-01-21
-- Description: Adds line items table to track Base Pay vs Penalty Rates breakdown linked to Settlement IDs

-- Create line item type enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ledger_line_item_type') THEN
        CREATE TYPE ledger_line_item_type AS ENUM (
            'BASE_PAY',
            'SUNDAY_PENALTY',
            'LATE_NIGHT_LOADING'
        );
    END IF;
END $$;

-- Create financial_ledger_line_items table
CREATE TABLE IF NOT EXISTS financial_ledger_line_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ledger_entry_id uuid NOT NULL REFERENCES financial_ledger_entries(id) ON DELETE CASCADE,
    settlement_id VARCHAR(32), -- Denormalized for quick lookups by Settlement ID
    
    line_item_type ledger_line_item_type NOT NULL,
    description VARCHAR(255) NOT NULL,
    hours INTEGER, -- Hours in hundredths (e.g., 250 = 2.5 hours)
    rate_cents INTEGER, -- Rate per hour in cents
    amount_cents INTEGER NOT NULL, -- Line item amount in cents
    
    created_at timestamp NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS financial_ledger_line_items_ledger_entry_id_idx 
    ON financial_ledger_line_items(ledger_entry_id);

CREATE INDEX IF NOT EXISTS financial_ledger_line_items_settlement_id_idx 
    ON financial_ledger_line_items(settlement_id);
