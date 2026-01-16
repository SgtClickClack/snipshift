-- Migration: Update payments currency from USD to AUD
-- Description: Updates the default currency for payments table and migrates existing USD records to AUD
-- Date: 2024

-- Update the default value for the currency column
ALTER TABLE payments ALTER COLUMN currency SET DEFAULT 'aud';

-- Update any existing records with 'usd' currency to 'aud'
UPDATE payments 
SET currency = 'aud' 
WHERE LOWER(currency) = 'usd';

-- Add a comment for documentation
COMMENT ON COLUMN payments.currency IS 'ISO 4217 currency code. Default is AUD for Australian market.';
