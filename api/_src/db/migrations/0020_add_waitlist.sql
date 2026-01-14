-- Migration: Add waitlist table
-- Description: Creates the waitlist table for storing Brisbane launch waitlist signups

-- Create waitlist role enum if not exists
DO $$ BEGIN
    CREATE TYPE waitlist_role AS ENUM ('venue', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role waitlist_role NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL DEFAULT 'Brisbane, AU',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS waitlist_role_idx ON waitlist(role);
CREATE INDEX IF NOT EXISTS waitlist_created_at_idx ON waitlist(created_at DESC);
CREATE INDEX IF NOT EXISTS waitlist_contact_idx ON waitlist(contact);
