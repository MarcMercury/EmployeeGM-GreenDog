-- =====================================================
-- PARTNER CONTACT CATEGORY
-- Migration: 087_partner_contact_category.sql
-- Description: Add category field to marketing_partner_contacts
--              to allow categorizing contacts
-- =====================================================

-- Add category column
ALTER TABLE public.marketing_partner_contacts 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add index for category filtering
CREATE INDEX IF NOT EXISTS idx_marketing_partner_contacts_category 
ON public.marketing_partner_contacts(category);

-- Add comment
COMMENT ON COLUMN public.marketing_partner_contacts.category IS 
  'Category/type for the contact (pet_business, rescue, influencer, etc.)';
