-- SnipShift Database Initialization Script
-- This script runs when the PostgreSQL container starts for the first time

-- Create the snipshift database if it doesn't exist
-- Note: This is handled by POSTGRES_DB environment variable, but we can add additional setup here

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- Create a default user for testing (optional)
-- This is just for development convenience
INSERT INTO users (email, display_name, roles, current_role, is_verified, provider)
VALUES ('admin@snipshift.com', 'Admin User', ARRAY['hub', 'professional'], 'hub', true, 'email')
ON CONFLICT (email) DO NOTHING;

-- You can add more initialization data here as needed
-- For example, seed data for development
