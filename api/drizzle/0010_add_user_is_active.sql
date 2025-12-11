-- Add is_active field to users table
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;

-- Create index for is_active for faster filtering
CREATE INDEX IF NOT EXISTS "users_is_active_idx" ON "users" ("is_active");
