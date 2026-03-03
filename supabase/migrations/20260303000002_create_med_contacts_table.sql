-- Migration: Create med_contacts table for medical vendor/supplier contacts
-- Source: Med Contacts 1 & 2 xlsx files from data/marketing/
-- Contains vendor accounts with contact info, websites, and login credentials
-- Credentials (user_id, password) are stored encrypted-at-rest by Supabase
-- and are only revealed in the UI to admin, supervisor, super_admin, manager roles

CREATE TABLE IF NOT EXISTS public.med_contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_name text NOT NULL,
  category text DEFAULT 'Other',
  sub_label text,
  misc_info text,
  contact_name text,
  contact_email text,
  contact_phone text,
  account_number text,
  website text,
  login_user_id text,
  login_password text,
  order_method text,
  payment_method text,
  notes text,
  location text,
  department text,
  browser_preference text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for common searches
CREATE INDEX IF NOT EXISTS idx_med_contacts_vendor ON public.med_contacts(vendor_name);
CREATE INDEX IF NOT EXISTS idx_med_contacts_category ON public.med_contacts(category);
CREATE INDEX IF NOT EXISTS idx_med_contacts_active ON public.med_contacts(is_active);

-- Enable RLS
ALTER TABLE public.med_contacts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read med_contacts (credentials hidden in UI)
CREATE POLICY "med_contacts_select" ON public.med_contacts
  FOR SELECT TO authenticated
  USING (true);

-- Only admins/managers can insert/update/delete
CREATE POLICY "med_contacts_modify" ON public.med_contacts
  FOR ALL TO authenticated
  USING (public.is_marketing_admin())
  WITH CHECK (public.is_marketing_admin());

-- Grant access
GRANT SELECT ON public.med_contacts TO authenticated;
GRANT ALL ON public.med_contacts TO authenticated;
