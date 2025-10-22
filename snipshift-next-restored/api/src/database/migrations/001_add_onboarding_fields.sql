-- Migration to add onboarding fields to user profiles
-- This extends the existing schema with additional fields needed for onboarding

-- Add fields to professional_profiles table
ALTER TABLE professional_profiles 
ADD COLUMN IF NOT EXISTS abn text,
ADD COLUMN IF NOT EXISTS instagram_link text,
ADD COLUMN IF NOT EXISTS insurance_document text,
ADD COLUMN IF NOT EXISTS qualification_document text,
ADD COLUMN IF NOT EXISTS stripe_connected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS full_name text;

-- Add fields to hub_profiles table  
ALTER TABLE hub_profiles
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS chair_capacity text,
ADD COLUMN IF NOT EXISTS vibe_tags jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS abn text,
ADD COLUMN IF NOT EXISTS business_insurance text,
ADD COLUMN IF NOT EXISTS shop_photos jsonb DEFAULT '[]';

-- Add fields to brand_profiles table
ALTER TABLE brand_profiles
ADD COLUMN IF NOT EXISTS contact_name text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS location jsonb,
ADD COLUMN IF NOT EXISTS business_type text,
ADD COLUMN IF NOT EXISTS social_media_links jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS partnership_goals jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS target_audience jsonb DEFAULT '[]';

-- Add fields to trainer_profiles table
ALTER TABLE trainer_profiles
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS contact_name text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS location jsonb,
ADD COLUMN IF NOT EXISTS business_type text,
ADD COLUMN IF NOT EXISTS social_media_links jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS partnership_goals jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS target_audience jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS product_categories jsonb DEFAULT '[]';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_professional_profiles_abn ON professional_profiles(abn);
CREATE INDEX IF NOT EXISTS idx_hub_profiles_abn ON hub_profiles(abn);
CREATE INDEX IF NOT EXISTS idx_brand_profiles_company_name ON brand_profiles(company_name);
CREATE INDEX IF NOT EXISTS idx_trainer_profiles_company_name ON trainer_profiles(company_name);
