-- Migration: Add Xero Audit Log table
-- Tracks all write operations to Xero for compliance and debugging

CREATE TABLE IF NOT EXISTS xero_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation VARCHAR(50) NOT NULL,
    xero_tenant_id VARCHAR(255),
    payload JSONB,
    result JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS xero_audit_log_user_id_idx ON xero_audit_log(user_id);
CREATE INDEX IF NOT EXISTS xero_audit_log_operation_idx ON xero_audit_log(operation);
CREATE INDEX IF NOT EXISTS xero_audit_log_created_at_idx ON xero_audit_log(created_at);
CREATE INDEX IF NOT EXISTS xero_audit_log_tenant_idx ON xero_audit_log(xero_tenant_id);

-- Comment on table and columns
COMMENT ON TABLE xero_audit_log IS 'Audit trail for all Xero integration write operations';
COMMENT ON COLUMN xero_audit_log.operation IS 'Type of operation: CONNECT, DISCONNECT, TOKEN_REFRESH, MAP_EMPLOYEE, UNMAP_EMPLOYEE, SYNC_TIMESHEET, SYNC_TIMESHEET_FAILED';
COMMENT ON COLUMN xero_audit_log.payload IS 'Input parameters for the operation (JSON)';
COMMENT ON COLUMN xero_audit_log.result IS 'Outcome of the operation (JSON)';
