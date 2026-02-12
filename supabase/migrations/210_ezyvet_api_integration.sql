-- ============================================================================
-- MIGRATION 210: ezyVet Direct API Integration
-- Adds tables for OAuth token caching, per-site credentials, live API sync,
-- webhook event log, and sync'd appointment/user/consult data.
-- ============================================================================

-- ============================================================================
-- 1. CLINIC API CREDENTIALS (one row per ezyVet site / Green Dog location)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ezyvet_clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  label TEXT NOT NULL,                      -- 'Venice', 'Van Nuys', etc.
  site_uid TEXT NOT NULL UNIQUE,            -- ezyVet site_uid
  partner_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,              -- encrypted at rest by Supabase vault
  scope TEXT DEFAULT 'read-basic,read-animal,read-consult,read-appointment,read-address,read-contact,read-user',
  base_url TEXT NOT NULL DEFAULT 'https://api.ezyvet.com',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. OAUTH TOKEN CACHE (one cached token per clinic)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ezyvet_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES ezyvet_clinics(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ NOT NULL,          -- absolute expiration time
  issued_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (clinic_id)
);

-- ============================================================================
-- 3. API SYNC LOG (tracks every sync run – API-driven, not CSV)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ezyvet_api_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES ezyvet_clinics(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('users','appointments','consults','animals','full')),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  records_fetched INT DEFAULT 0,
  records_upserted INT DEFAULT 0,
  records_errored INT DEFAULT 0,
  error_details JSONB,
  triggered_by TEXT,                        -- user id, 'webhook', 'cron', etc.
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_ezyvet_api_sync_clinic ON ezyvet_api_sync_log(clinic_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ezyvet_api_sync_type ON ezyvet_api_sync_log(sync_type, status);

-- ============================================================================
-- 4. SYNCED APPOINTMENTS (from ezyVet API v2)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ezyvet_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES ezyvet_clinics(id) ON DELETE CASCADE,
  ezyvet_id BIGINT NOT NULL,                -- ezyVet appointment ID
  
  -- Temporal
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,

  -- Appointment details
  type_id BIGINT,
  type_name TEXT,
  status_id BIGINT,
  status_name TEXT,
  description TEXT,
  
  -- Linked entities
  animal_id BIGINT,
  animal_name TEXT,
  contact_id BIGINT,
  contact_name TEXT,
  resource_id BIGINT,
  resource_name TEXT,                       -- room / equipment
  
  -- Provider
  created_by_user_id BIGINT,
  provider_user_id BIGINT,
  provider_name TEXT,
  
  -- Metadata
  raw_json JSONB DEFAULT '{}',
  synced_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE (clinic_id, ezyvet_id)
);

CREATE INDEX IF NOT EXISTS idx_ezyvet_appt_clinic ON ezyvet_appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ezyvet_appt_start ON ezyvet_appointments(start_at);
CREATE INDEX IF NOT EXISTS idx_ezyvet_appt_status ON ezyvet_appointments(status_name);
CREATE INDEX IF NOT EXISTS idx_ezyvet_appt_provider ON ezyvet_appointments(provider_user_id);

-- ============================================================================
-- 5. SYNCED USERS/STAFF (from ezyVet API v4)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ezyvet_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES ezyvet_clinics(id) ON DELETE CASCADE,
  ezyvet_id BIGINT NOT NULL,
  
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  role TEXT,                                -- DVM, Technician, Reception, etc.
  is_active BOOLEAN DEFAULT true,
  
  -- Link to internal employee (optional)
  employee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  raw_json JSONB DEFAULT '{}',
  synced_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE (clinic_id, ezyvet_id)
);

CREATE INDEX IF NOT EXISTS idx_ezyvet_users_clinic ON ezyvet_users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ezyvet_users_employee ON ezyvet_users(employee_id) WHERE employee_id IS NOT NULL;

-- ============================================================================
-- 6. SYNCED CONSULTS (from ezyVet API v1)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ezyvet_consults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES ezyvet_clinics(id) ON DELETE CASCADE,
  ezyvet_id BIGINT NOT NULL,
  
  consult_type_id BIGINT,
  consult_type_name TEXT,
  status TEXT,
  
  animal_id BIGINT,
  animal_name TEXT,
  contact_id BIGINT,
  
  -- Responsible staff
  vet_user_id BIGINT,
  vet_name TEXT,
  tech_user_id BIGINT,
  tech_name TEXT,
  
  -- Temporal
  date_created TIMESTAMPTZ,
  date_completed TIMESTAMPTZ,
  
  raw_json JSONB DEFAULT '{}',
  synced_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE (clinic_id, ezyvet_id)
);

CREATE INDEX IF NOT EXISTS idx_ezyvet_consults_clinic ON ezyvet_consults(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ezyvet_consults_vet ON ezyvet_consults(vet_user_id);
CREATE INDEX IF NOT EXISTS idx_ezyvet_consults_date ON ezyvet_consults(date_created);

-- ============================================================================
-- 7. WEBHOOK EVENT LOG
-- ============================================================================
CREATE TABLE IF NOT EXISTS ezyvet_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES ezyvet_clinics(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,                 -- appointment.created, consult.updated, etc.
  resource_type TEXT,                       -- appointment, consult, animal …
  resource_id BIGINT,
  payload JSONB NOT NULL DEFAULT '{}',
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error TEXT,
  received_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ezyvet_webhook_unprocessed ON ezyvet_webhook_events(processed, received_at) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_ezyvet_webhook_clinic ON ezyvet_webhook_events(clinic_id, received_at DESC);

-- ============================================================================
-- 8. RLS POLICIES  (service-role bypass; authenticated admin only)
-- ============================================================================

-- Helper: reusable admin check
CREATE OR REPLACE FUNCTION is_admin_user() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role IN ('admin','super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Apply RLS + policies to every new table
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'ezyvet_clinics',
    'ezyvet_tokens',
    'ezyvet_api_sync_log',
    'ezyvet_appointments',
    'ezyvet_users',
    'ezyvet_consults',
    'ezyvet_webhook_events'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Admin manage %s" ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "Admin manage %s" ON public.%I FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user())',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ============================================================================
-- 9. UPDATED_AT TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_ezyvet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS set_ezyvet_clinics_updated_at ON ezyvet_clinics;
CREATE TRIGGER set_ezyvet_clinics_updated_at
  BEFORE UPDATE ON ezyvet_clinics
  FOR EACH ROW EXECUTE FUNCTION update_ezyvet_updated_at();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
COMMENT ON TABLE ezyvet_clinics IS 'Per-site ezyVet API credentials for multi-location OAuth.';
COMMENT ON TABLE ezyvet_tokens IS 'Cached OAuth tokens with expiry for lazy-refresh pattern.';
COMMENT ON TABLE ezyvet_api_sync_log IS 'Audit log for every API-driven sync operation.';
COMMENT ON TABLE ezyvet_appointments IS 'Appointments synced from ezyVet API v2.';
COMMENT ON TABLE ezyvet_users IS 'Staff/user records synced from ezyVet API v4.';
COMMENT ON TABLE ezyvet_consults IS 'Consult records synced from ezyVet API v1.';
COMMENT ON TABLE ezyvet_webhook_events IS 'Inbound webhook event log from ezyVet.';
