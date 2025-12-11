-- Add roles array column to users table
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "roles" text[] DEFAULT ARRAY['professional']::text[] NOT NULL;
