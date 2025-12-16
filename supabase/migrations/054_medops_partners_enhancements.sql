-- Migration: 054_medops_partners_enhancements
-- Description: Enhance referral_partners table for Med Ops Partners functionality
-- Adds: category, website, description, icon, color, products fields

-- Ensure status column exists (may be missing in some deployments)
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add check constraint for status if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'referral_partners_status_check'
  ) THEN
    ALTER TABLE public.referral_partners 
    ADD CONSTRAINT referral_partners_status_check 
    CHECK (status IS NULL OR status IN ('active', 'inactive', 'pending'));
  END IF;
END $$;

-- Add new columns to referral_partners table
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'mdi-factory',
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'grey',
ADD COLUMN IF NOT EXISTS products TEXT[] DEFAULT '{}';

-- Add check constraint for category
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'referral_partners_category_check'
  ) THEN
    ALTER TABLE public.referral_partners 
    ADD CONSTRAINT referral_partners_category_check 
    CHECK (category IS NULL OR category IN (
      'Imaging Equipment', 
      'Surgical Instruments', 
      'Laboratory', 
      'Pharmaceuticals', 
      'Anesthesia', 
      'Dental', 
      'Monitoring', 
      'Consumables', 
      'Software', 
      'Other'
    ));
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN public.referral_partners.category IS 'Partner category for Med Ops (e.g., Laboratory, Pharmaceuticals)';
COMMENT ON COLUMN public.referral_partners.website IS 'Partner website URL';
COMMENT ON COLUMN public.referral_partners.description IS 'Brief description of the partner';
COMMENT ON COLUMN public.referral_partners.icon IS 'Material Design icon name for display';
COMMENT ON COLUMN public.referral_partners.color IS 'Color theme for partner avatar';
COMMENT ON COLUMN public.referral_partners.products IS 'Array of products/services offered';

-- Update existing seed data with categories based on names
UPDATE public.referral_partners SET category = 'Other' WHERE category IS NULL;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_referral_partners_category ON public.referral_partners(category);
CREATE INDEX IF NOT EXISTS idx_referral_partners_status ON public.referral_partners(status);
