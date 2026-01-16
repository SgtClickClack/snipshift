-- Migration: Add payouts table
-- Description: Creates a table to track payouts to workers after shift completion

CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL, -- Payout amount in cents
    hourly_rate DECIMAL(10, 2) NOT NULL,
    hours_worked DECIMAL(10, 2) NOT NULL,
    stripe_transfer_id VARCHAR(255), -- Stripe Transfer ID if applicable
    stripe_charge_id VARCHAR(255), -- Stripe Charge ID from payment capture
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    processed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Ensure one payout per shift
    CONSTRAINT unique_shift_payout UNIQUE (shift_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS payouts_worker_id_idx ON payouts(worker_id);
CREATE INDEX IF NOT EXISTS payouts_venue_id_idx ON payouts(venue_id);
CREATE INDEX IF NOT EXISTS payouts_shift_id_idx ON payouts(shift_id);
CREATE INDEX IF NOT EXISTS payouts_status_idx ON payouts(status);
CREATE INDEX IF NOT EXISTS payouts_created_at_idx ON payouts(created_at);

COMMENT ON TABLE payouts IS 'Tracks payouts to workers after shift completion';
COMMENT ON COLUMN payouts.amount_cents IS 'Total payout amount in cents (hourly_rate * hours_worked)';
COMMENT ON COLUMN payouts.stripe_transfer_id IS 'Stripe Transfer ID if payout was processed via Stripe Connect';
COMMENT ON COLUMN payouts.status IS 'Payout status: pending, processing, completed, failed';
