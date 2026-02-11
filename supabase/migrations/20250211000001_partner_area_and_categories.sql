-- Migration: Add area field and update partner_type enum for marketing_partners
-- Date: 2026-02-11
-- Purpose: 
--   1. Add 'area' column matching referral CRM zone logic
--   2. Add new partner_type enum values: media, groomer, daycare_boarding, pet_retail, charity, merch_vendor, designers_graphics
--   3. Rename association → chamber (consolidate), remove spay_neuter

-- Step 1: Add area column to marketing_partners
ALTER TABLE public.marketing_partners 
ADD COLUMN IF NOT EXISTS area TEXT;

-- Add constraint matching referral CRM zones plus Online/Remote/Out of Area
ALTER TABLE public.marketing_partners 
ADD CONSTRAINT marketing_partners_area_check 
CHECK (area IS NULL OR area IN (
  'Westside & Coastal',
  'South Valley',
  'North Valley',
  'Central & Eastside',
  'South Bay',
  'San Gabriel Valley',
  'Online/Remote/Out of Area'
));

-- Create index for area filtering
CREATE INDEX IF NOT EXISTS idx_marketing_partners_area ON public.marketing_partners(area);

-- Step 2: Add new enum values to marketing_partner_type
-- PostgreSQL requires ALTER TYPE ... ADD VALUE for enums
DO $$ 
BEGIN
  -- Add new category values
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'media' AND enumtypid = 'marketing_partner_type'::regtype) THEN
    ALTER TYPE marketing_partner_type ADD VALUE 'media';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'groomer' AND enumtypid = 'marketing_partner_type'::regtype) THEN
    ALTER TYPE marketing_partner_type ADD VALUE 'groomer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'daycare_boarding' AND enumtypid = 'marketing_partner_type'::regtype) THEN
    ALTER TYPE marketing_partner_type ADD VALUE 'daycare_boarding';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pet_retail' AND enumtypid = 'marketing_partner_type'::regtype) THEN
    ALTER TYPE marketing_partner_type ADD VALUE 'pet_retail';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'charity' AND enumtypid = 'marketing_partner_type'::regtype) THEN
    ALTER TYPE marketing_partner_type ADD VALUE 'charity';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'merch_vendor' AND enumtypid = 'marketing_partner_type'::regtype) THEN
    ALTER TYPE marketing_partner_type ADD VALUE 'merch_vendor';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'designers_graphics' AND enumtypid = 'marketing_partner_type'::regtype) THEN
    ALTER TYPE marketing_partner_type ADD VALUE 'designers_graphics';
  END IF;
END $$;

-- Step 3: Migrate existing 'association' records to 'chamber' and 'spay_neuter' to appropriate types
-- association → chamber (consolidate)
UPDATE public.marketing_partners SET partner_type = 'chamber' WHERE partner_type = 'association';
-- spay_neuter → rescue (most logical fit since they're animal welfare orgs)
UPDATE public.marketing_partners SET partner_type = 'rescue' WHERE partner_type = 'spay_neuter';

-- Step 4: Update the updated_at timestamp trigger to include area
CREATE OR REPLACE FUNCTION update_marketing_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS marketing_partners_updated_at ON public.marketing_partners;
CREATE TRIGGER marketing_partners_updated_at
  BEFORE UPDATE ON public.marketing_partners
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_partners_updated_at();
