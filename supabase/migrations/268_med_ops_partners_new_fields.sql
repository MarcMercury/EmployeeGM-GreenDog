-- =====================================================
-- Migration 268: Add new fields to med_ops_partners
-- Source: Med Contacts spreadsheets (Feb 2026 update)
-- Description: Add location_code, department, cost_type,
--   portal credentials, form status, browser pref, and misc_info
-- =====================================================

-- Location code (which clinic/location this vendor serves)
ALTER TABLE public.med_ops_partners
  ADD COLUMN IF NOT EXISTS location_code TEXT;
COMMENT ON COLUMN public.med_ops_partners.location_code IS 'Clinic location code: AETNA, SO, VEN, MPMV, MVS ALL, etc.';

-- Department that uses this vendor
ALTER TABLE public.med_ops_partners
  ADD COLUMN IF NOT EXISTS department TEXT;
COMMENT ON COLUMN public.med_ops_partners.department IS 'Department: ALL OTHER, EXOTICS, INTERNAL MED, etc.';

-- Cost type / cost category
ALTER TABLE public.med_ops_partners
  ADD COLUMN IF NOT EXISTS cost_type TEXT;
COMMENT ON COLUMN public.med_ops_partners.cost_type IS 'Cost category: MED SUPPLIES, PATIENTS, etc.';

-- Whether vendor charges credit card fees
ALTER TABLE public.med_ops_partners
  ADD COLUMN IF NOT EXISTS has_cc_fees BOOLEAN DEFAULT NULL;
COMMENT ON COLUMN public.med_ops_partners.has_cc_fees IS 'Whether vendor charges credit card processing fees';

-- Portal / login credentials (for vendor ordering portals)
ALTER TABLE public.med_ops_partners
  ADD COLUMN IF NOT EXISTS portal_url TEXT;
COMMENT ON COLUMN public.med_ops_partners.portal_url IS 'Login portal URL if different from main website';

ALTER TABLE public.med_ops_partners
  ADD COLUMN IF NOT EXISTS portal_username TEXT;
COMMENT ON COLUMN public.med_ops_partners.portal_username IS 'Username/email for vendor portal login';

ALTER TABLE public.med_ops_partners
  ADD COLUMN IF NOT EXISTS portal_password TEXT;
COMMENT ON COLUMN public.med_ops_partners.portal_password IS 'Password for vendor portal login';

-- Account form status
ALTER TABLE public.med_ops_partners
  ADD COLUMN IF NOT EXISTS form_filled BOOLEAN DEFAULT NULL;
COMMENT ON COLUMN public.med_ops_partners.form_filled IS 'Whether account setup forms have been filled out';

ALTER TABLE public.med_ops_partners
  ADD COLUMN IF NOT EXISTS form_filled_date DATE;
COMMENT ON COLUMN public.med_ops_partners.form_filled_date IS 'Date when account forms were filled out';

-- Browser preference for vendor portal
ALTER TABLE public.med_ops_partners
  ADD COLUMN IF NOT EXISTS browser_preference TEXT;
COMMENT ON COLUMN public.med_ops_partners.browser_preference IS 'Preferred browser for portal: Chrome, Safari, Either';

-- Additional info field
ALTER TABLE public.med_ops_partners
  ADD COLUMN IF NOT EXISTS vendor_info TEXT;
COMMENT ON COLUMN public.med_ops_partners.vendor_info IS 'Additional vendor info, internal reference notes';

-- Order method
ALTER TABLE public.med_ops_partners
  ADD COLUMN IF NOT EXISTS order_method TEXT;
COMMENT ON COLUMN public.med_ops_partners.order_method IS 'How to place orders: Website, Phone, Email, etc.';

-- Payment method
ALTER TABLE public.med_ops_partners
  ADD COLUMN IF NOT EXISTS payment_method TEXT;
COMMENT ON COLUMN public.med_ops_partners.payment_method IS 'Payment method: Monthly auto, CC on file, Invoice, etc.';

-- Create indexes on new columns
CREATE INDEX IF NOT EXISTS idx_med_ops_partners_location_code ON public.med_ops_partners(location_code);
CREATE INDEX IF NOT EXISTS idx_med_ops_partners_department ON public.med_ops_partners(department);
