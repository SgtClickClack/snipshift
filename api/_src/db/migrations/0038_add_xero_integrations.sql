-- Migration: Add xero_integrations table for isolated Xero OAuth token storage
-- Description: Stores encrypted tokens for Xero connections; separate from users table

-- OAuth state table for CSRF protection (state -> userId mapping)
CREATE TABLE IF NOT EXISTS xero_oauth_state (
  state VARCHAR(64) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS xero_oauth_state_expires_at_idx ON xero_oauth_state(expires_at);

CREATE TABLE IF NOT EXISTS xero_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  xero_tenant_id VARCHAR(255) NOT NULL,
  xero_tenant_name VARCHAR(255),
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  scope TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS xero_integrations_user_id_idx ON xero_integrations(user_id);
CREATE INDEX IF NOT EXISTS xero_integrations_xero_tenant_id_idx ON xero_integrations(xero_tenant_id);

COMMENT ON TABLE xero_integrations IS 'Stores encrypted OAuth tokens for Xero connections; isolated from core auth';
