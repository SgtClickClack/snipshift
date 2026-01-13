-- Migration: Add enterprise leads table
-- Description: Creates the leads table for storing enterprise lead submissions

-- Create lead inquiry type enum if not exists
DO $$ BEGIN
    CREATE TYPE lead_inquiry_type AS ENUM ('enterprise_plan', 'custom_solution', 'partnership', 'general');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create lead status enum if not exists
DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal_sent', 'closed_won', 'closed_lost');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    number_of_locations INTEGER,
    inquiry_type lead_inquiry_type NOT NULL DEFAULT 'general',
    message TEXT,
    status lead_status NOT NULL DEFAULT 'new',
    source VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS leads_email_idx ON leads(email);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS leads_inquiry_type_idx ON leads(inquiry_type);
