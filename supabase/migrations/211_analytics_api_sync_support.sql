-- Migration: Add ezyVet API sync support columns to existing analytics tables
-- This enables tracking whether data was manually uploaded or synced via the API

-- ===== invoice_lines: add source tracking =====
ALTER TABLE public.invoice_lines 
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'csv_upload',
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

COMMENT ON COLUMN public.invoice_lines.source IS 'Data source: csv_upload or ezyvet_api';
COMMENT ON COLUMN public.invoice_lines.synced_at IS 'Timestamp of last API sync for this record';

CREATE INDEX IF NOT EXISTS idx_invoice_lines_source 
  ON public.invoice_lines(source);

-- ===== invoice_upload_history: add source tracking =====
ALTER TABLE public.invoice_upload_history
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'csv_upload';

COMMENT ON COLUMN public.invoice_upload_history.source IS 'Upload source: csv_upload or ezyvet_api';

-- ===== ezyvet_crm_contacts: add source tracking =====
ALTER TABLE public.ezyvet_crm_contacts
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'csv_upload',
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

COMMENT ON COLUMN public.ezyvet_crm_contacts.source IS 'Data source: csv_upload or ezyvet_api';
COMMENT ON COLUMN public.ezyvet_crm_contacts.last_sync_at IS 'Timestamp of last API sync';

-- ===== appointment_data: add source tracking =====
ALTER TABLE public.appointment_data
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'csv_upload',
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

COMMENT ON COLUMN public.appointment_data.source IS 'Data source: csv_upload, clinic_report, or ezyvet_api';

-- ===== ezyvet_crm_sync_log: track contact sync history =====
CREATE TABLE IF NOT EXISTS public.ezyvet_crm_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_rows INTEGER DEFAULT 0,
  inserted INTEGER DEFAULT 0,
  updated INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  source TEXT DEFAULT 'csv_upload',
  completed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ezyvet_crm_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ezyvet_crm_sync_log"
  ON public.ezyvet_crm_sync_log
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'manager', 'marketing_admin')
    )
  );

-- ===== analytics_sync_status: single row tracking last sync times =====
CREATE TABLE IF NOT EXISTS public.analytics_sync_status (
  id TEXT PRIMARY KEY DEFAULT 'default',
  last_invoice_sync TIMESTAMPTZ,
  last_contact_sync TIMESTAMPTZ,
  last_appointment_sync TIMESTAMPTZ,
  last_referral_update TIMESTAMPTZ,
  invoices_synced INTEGER DEFAULT 0,
  contacts_synced INTEGER DEFAULT 0,
  appointments_synced INTEGER DEFAULT 0,
  referral_partners_updated INTEGER DEFAULT 0,
  sync_mode TEXT DEFAULT 'manual' CHECK (sync_mode IN ('manual', 'auto', 'cron')),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.analytics_sync_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage analytics_sync_status"
  ON public.analytics_sync_status
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'manager', 'marketing_admin')
    )
  );

-- Insert default row
INSERT INTO public.analytics_sync_status (id) VALUES ('default')
  ON CONFLICT (id) DO NOTHING;

-- ===== Helper: function to get sync status summary =====
CREATE OR REPLACE FUNCTION public.get_analytics_sync_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'invoice_lines_total', (SELECT COUNT(*) FROM public.invoice_lines),
    'invoice_lines_api', (SELECT COUNT(*) FROM public.invoice_lines WHERE source = 'ezyvet_api'),
    'invoice_lines_csv', (SELECT COUNT(*) FROM public.invoice_lines WHERE source = 'csv_upload'),
    'contacts_total', (SELECT COUNT(*) FROM public.ezyvet_crm_contacts),
    'contacts_api', (SELECT COUNT(*) FROM public.ezyvet_crm_contacts WHERE source = 'ezyvet_api'),
    'contacts_csv', (SELECT COUNT(*) FROM public.ezyvet_crm_contacts WHERE source = 'csv_upload'),
    'appointments_total', (SELECT COUNT(*) FROM public.appointment_data),
    'appointments_api', (SELECT COUNT(*) FROM public.appointment_data WHERE source = 'ezyvet_api'),
    'referral_partners_total', (SELECT COUNT(*) FROM public.referral_partners),
    'last_sync', (SELECT row_to_json(s) FROM public.analytics_sync_status s WHERE s.id = 'default')
  ) INTO result;
  
  RETURN result;
END;
$$;
