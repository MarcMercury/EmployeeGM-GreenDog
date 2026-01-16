-- ============================================================
-- EZYVET CRM SYSTEM
-- Migration 134: Isolated data import for external EzyVet contacts
-- ============================================================

-- ============================================================
-- 1. EZYVET CRM CONTACTS TABLE (Isolated External Data)
-- ============================================================

CREATE TABLE IF NOT EXISTS ezyvet_crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- The anchor/truth key - unique identifier from EzyVet
  ezyvet_contact_code TEXT UNIQUE NOT NULL,
  
  -- Contact information
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone_mobile TEXT,
  
  -- Address information
  address_city TEXT,
  address_zip TEXT,
  
  -- Financial & activity data
  revenue_ytd NUMERIC(12, 2) DEFAULT 0,
  last_visit DATE,
  
  -- Classification
  division TEXT,
  referral_source TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_sync_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. INDEXES FOR PERFORMANCE
-- ============================================================

-- Primary lookup index on the anchor key
CREATE INDEX IF NOT EXISTS idx_ezyvet_contacts_code 
  ON ezyvet_crm_contacts(ezyvet_contact_code);

-- Email lookup for deduplication/matching
CREATE INDEX IF NOT EXISTS idx_ezyvet_contacts_email 
  ON ezyvet_crm_contacts(email) WHERE email IS NOT NULL;

-- Revenue analysis
CREATE INDEX IF NOT EXISTS idx_ezyvet_contacts_revenue 
  ON ezyvet_crm_contacts(revenue_ytd DESC);

-- Active status filtering
CREATE INDEX IF NOT EXISTS idx_ezyvet_contacts_active 
  ON ezyvet_crm_contacts(is_active);

-- Geographic analysis
CREATE INDEX IF NOT EXISTS idx_ezyvet_contacts_city 
  ON ezyvet_crm_contacts(address_city) WHERE address_city IS NOT NULL;

-- Recency analysis
CREATE INDEX IF NOT EXISTS idx_ezyvet_contacts_last_visit 
  ON ezyvet_crm_contacts(last_visit DESC NULLS LAST);

-- Referral source analysis
CREATE INDEX IF NOT EXISTS idx_ezyvet_contacts_referral 
  ON ezyvet_crm_contacts(referral_source) WHERE referral_source IS NOT NULL;

-- Division filtering
CREATE INDEX IF NOT EXISTS idx_ezyvet_contacts_division 
  ON ezyvet_crm_contacts(division) WHERE division IS NOT NULL;

-- ============================================================
-- 3. SYNC HISTORY TABLE (Audit Trail)
-- ============================================================

CREATE TABLE IF NOT EXISTS ezyvet_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL DEFAULT 'csv_import',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running', -- running, completed, failed
  total_rows INTEGER DEFAULT 0,
  inserted_count INTEGER DEFAULT 0,
  updated_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  error_details JSONB,
  triggered_by TEXT,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ezyvet_sync_history_status 
  ON ezyvet_sync_history(status, started_at DESC);

-- ============================================================
-- 4. UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_ezyvet_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS set_ezyvet_contacts_updated_at ON ezyvet_crm_contacts;
CREATE TRIGGER set_ezyvet_contacts_updated_at
  BEFORE UPDATE ON ezyvet_crm_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_ezyvet_contacts_updated_at();

-- ============================================================
-- 5. RLS POLICIES (Admin-only access for external data)
-- ============================================================

ALTER TABLE ezyvet_crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ezyvet_sync_history ENABLE ROW LEVEL SECURITY;

-- Admin read access for contacts
DROP POLICY IF EXISTS "Admin read ezyvet contacts" ON ezyvet_crm_contacts;
CREATE POLICY "Admin read ezyvet contacts" ON ezyvet_crm_contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admin write access for contacts
DROP POLICY IF EXISTS "Admin manage ezyvet contacts" ON ezyvet_crm_contacts;
CREATE POLICY "Admin manage ezyvet contacts" ON ezyvet_crm_contacts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admin read access for sync history
DROP POLICY IF EXISTS "Admin read ezyvet sync history" ON ezyvet_sync_history;
CREATE POLICY "Admin read ezyvet sync history" ON ezyvet_sync_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admin write access for sync history
DROP POLICY IF EXISTS "Admin manage ezyvet sync history" ON ezyvet_sync_history;
CREATE POLICY "Admin manage ezyvet sync history" ON ezyvet_sync_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================
-- 6. ANALYTICS HELPER VIEWS
-- ============================================================

-- Revenue by city view
CREATE OR REPLACE VIEW ezyvet_revenue_by_city AS
SELECT 
  COALESCE(address_city, 'Unknown') as city,
  COUNT(*) as client_count,
  SUM(COALESCE(revenue_ytd, 0)) as total_revenue,
  AVG(COALESCE(revenue_ytd, 0)) as avg_revenue
FROM ezyvet_crm_contacts
WHERE is_active = true
GROUP BY address_city
ORDER BY total_revenue DESC;

-- Revenue by referral source view
CREATE OR REPLACE VIEW ezyvet_revenue_by_referral AS
SELECT 
  COALESCE(referral_source, 'Unknown') as source,
  COUNT(*) as client_count,
  SUM(COALESCE(revenue_ytd, 0)) as total_revenue,
  AVG(COALESCE(revenue_ytd, 0)) as avg_revenue
FROM ezyvet_crm_contacts
WHERE is_active = true
GROUP BY referral_source
ORDER BY total_revenue DESC;

-- Division summary view
CREATE OR REPLACE VIEW ezyvet_division_summary AS
SELECT 
  COALESCE(division, 'Unknown') as division,
  COUNT(*) as client_count,
  COUNT(*) FILTER (WHERE is_active = true) as active_count,
  SUM(COALESCE(revenue_ytd, 0)) as total_revenue,
  AVG(COALESCE(revenue_ytd, 0)) as avg_revenue
FROM ezyvet_crm_contacts
GROUP BY division
ORDER BY total_revenue DESC;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

COMMENT ON TABLE ezyvet_crm_contacts IS 
'Isolated table for EzyVet CRM contact imports. Never mix with internal employee/user tables.';

COMMENT ON COLUMN ezyvet_crm_contacts.ezyvet_contact_code IS 
'Primary anchor key from EzyVet system - used for upsert operations.';
