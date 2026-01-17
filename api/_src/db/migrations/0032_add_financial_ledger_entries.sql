-- 0032_add_financial_ledger_entries.sql
-- Immutable financial ledger for $100M-grade payout/payment reconciliation.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ledger_entry_type') THEN
    CREATE TYPE ledger_entry_type AS ENUM (
      'SHIFT_PAYOUT_COMPLETED',
      'SHIFT_PAYOUT_FAILED',
      'RECONCILIATION_PAYOUT_COMPLETED',
      'RECONCILIATION_PAYOUT_FAILED'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS financial_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type ledger_entry_type NOT NULL,

  shift_id uuid REFERENCES shifts(id) ON DELETE SET NULL,
  payout_id uuid REFERENCES payouts(id) ON DELETE SET NULL,
  worker_id uuid REFERENCES users(id) ON DELETE SET NULL,
  venue_id uuid REFERENCES users(id) ON DELETE SET NULL,

  amount_cents integer NOT NULL,
  currency varchar(8) NOT NULL DEFAULT 'aud',

  stripe_payment_intent_id varchar(255),
  stripe_charge_id varchar(255),
  stripe_transfer_id varchar(255),
  stripe_event_id varchar(255),

  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS financial_ledger_entries_shift_id_idx ON financial_ledger_entries(shift_id);
CREATE INDEX IF NOT EXISTS financial_ledger_entries_payout_id_idx ON financial_ledger_entries(payout_id);
CREATE INDEX IF NOT EXISTS financial_ledger_entries_worker_id_idx ON financial_ledger_entries(worker_id);
CREATE INDEX IF NOT EXISTS financial_ledger_entries_venue_id_idx ON financial_ledger_entries(venue_id);
CREATE INDEX IF NOT EXISTS financial_ledger_entries_created_at_idx ON financial_ledger_entries(created_at);
CREATE INDEX IF NOT EXISTS financial_ledger_entries_pi_idx ON financial_ledger_entries(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS financial_ledger_entries_charge_idx ON financial_ledger_entries(stripe_charge_id);
CREATE UNIQUE INDEX IF NOT EXISTS financial_ledger_entries_stripe_event_id_unique ON financial_ledger_entries(stripe_event_id);
CREATE UNIQUE INDEX IF NOT EXISTS financial_ledger_entries_payout_entry_type_unique ON financial_ledger_entries(payout_id, entry_type);

