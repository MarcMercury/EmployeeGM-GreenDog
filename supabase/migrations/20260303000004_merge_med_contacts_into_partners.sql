-- Migration: Merge med_contacts records into med_ops_partners
-- The xlsx data (145 vendor contacts) was imported into med_contacts but needs to
-- live in med_ops_partners so partner profiles show the actual contact details.
-- This migration copies all med_contacts records into med_ops_partners, mapping fields.
-- For existing partners (matched by name), we UPDATE with the contact details.
-- For new vendors, we INSERT fresh rows.

-- =====================================================
-- STEP 1: Update existing med_ops_partners that match by name
-- (fill in missing contact info from med_contacts)
-- =====================================================
UPDATE public.med_ops_partners p
SET
  contact_name = COALESCE(p.contact_name, mc.contact_name),
  contact_email = COALESCE(p.contact_email, mc.contact_email),
  contact_phone = COALESCE(p.contact_phone, mc.contact_phone),
  account_number = COALESCE(p.account_number, mc.account_number),
  portal_username = COALESCE(p.portal_username, mc.login_user_id),
  portal_password = COALESCE(p.portal_password, mc.login_password),
  order_method = COALESCE(p.order_method, mc.order_method),
  payment_method = COALESCE(p.payment_method, mc.payment_method),
  location_code = COALESCE(p.location_code, mc.location),
  department = COALESCE(p.department, mc.department),
  browser_preference = COALESCE(p.browser_preference, mc.browser_preference),
  notes = CASE
    WHEN p.notes IS NULL AND mc.notes IS NOT NULL THEN mc.notes
    WHEN p.notes IS NOT NULL AND mc.notes IS NOT NULL AND p.notes NOT LIKE '%' || mc.notes || '%'
      THEN p.notes || E'\n\n' || mc.notes
    ELSE p.notes
  END,
  website = COALESCE(p.website, mc.website),
  updated_at = NOW()
FROM public.med_contacts mc
WHERE LOWER(TRIM(p.name)) = LOWER(TRIM(mc.vendor_name))
  AND mc.is_active = true;

-- =====================================================
-- STEP 2: Insert med_contacts records that have no match in med_ops_partners
-- =====================================================
INSERT INTO public.med_ops_partners (
  name,
  category,
  description,
  contact_name,
  contact_email,
  contact_phone,
  account_number,
  website,
  portal_username,
  portal_password,
  order_method,
  payment_method,
  notes,
  location_code,
  department,
  browser_preference,
  vendor_info,
  icon,
  color,
  is_active
)
SELECT
  mc.vendor_name,
  mc.category,
  mc.sub_label,
  mc.contact_name,
  mc.contact_email,
  mc.contact_phone,
  mc.account_number,
  mc.website,
  mc.login_user_id,
  mc.login_password,
  mc.order_method,
  mc.payment_method,
  mc.notes,
  mc.location,
  mc.department,
  mc.browser_preference,
  mc.misc_info,
  'mdi-factory',
  'indigo',
  true
FROM public.med_contacts mc
WHERE mc.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.med_ops_partners p
    WHERE LOWER(TRIM(p.name)) = LOWER(TRIM(mc.vendor_name))
  );
