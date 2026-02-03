-- Migration: Add xero_employee_id to users for Xero employee mapping
ALTER TABLE users ADD COLUMN IF NOT EXISTS xero_employee_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS users_xero_employee_id_idx ON users(xero_employee_id) WHERE xero_employee_id IS NOT NULL;
