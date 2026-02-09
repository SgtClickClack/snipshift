-- 0047_add_shift_acceptance_contracts.sql
-- Ledger of binding agreements when a shift is accepted (action-as-signature).

CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contract_hash varchar(64) NOT NULL,
  acceptance_log varchar(512),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contracts_shift_id_idx ON contracts(shift_id);
CREATE INDEX IF NOT EXISTS contracts_venue_id_idx ON contracts(venue_id);
CREATE INDEX IF NOT EXISTS contracts_professional_id_idx ON contracts(professional_id);
CREATE INDEX IF NOT EXISTS contracts_created_at_idx ON contracts(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS contracts_shift_id_unique ON contracts(shift_id);
