/* 0041_add_user_pay_rates.sql
   Add base hourly rate and currency to users for roster costing.
   Business/Owner can set pay rates for staff members. */

ALTER TABLE users ADD COLUMN IF NOT EXISTS base_hourly_rate numeric(10, 2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS currency varchar(3) NOT NULL DEFAULT 'AUD';

COMMENT ON COLUMN users.base_hourly_rate IS 'Base hourly pay rate for roster costing (set by venue owner for staff)';
COMMENT ON COLUMN users.currency IS 'Currency code for pay rates (ISO 4217, e.g. AUD, USD)';
