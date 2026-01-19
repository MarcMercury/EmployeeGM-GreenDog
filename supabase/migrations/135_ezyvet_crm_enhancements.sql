-- ============================================================
-- EZYVET CRM ENHANCEMENTS
-- Migration 135: Add breed and department columns for analytics
-- ============================================================

-- Add breed column for breed-based analytics
ALTER TABLE ezyvet_crm_contacts 
ADD COLUMN IF NOT EXISTS breed TEXT;

-- Add department column for department-based analytics  
ALTER TABLE ezyvet_crm_contacts 
ADD COLUMN IF NOT EXISTS department TEXT;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_ezyvet_contacts_breed 
  ON ezyvet_crm_contacts(breed) WHERE breed IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ezyvet_contacts_department 
  ON ezyvet_crm_contacts(department) WHERE department IS NOT NULL;

-- ============================================================
-- UPDATE ANALYTICS VIEWS
-- ============================================================

-- Revenue by breed view
CREATE OR REPLACE VIEW ezyvet_revenue_by_breed AS
SELECT 
  COALESCE(breed, 'Unknown') as breed,
  COUNT(*) as client_count,
  SUM(COALESCE(revenue_ytd, 0)) as total_revenue,
  AVG(COALESCE(revenue_ytd, 0)) as avg_revenue
FROM ezyvet_crm_contacts
WHERE is_active = true
GROUP BY breed
ORDER BY total_revenue DESC;

-- Revenue by department view
CREATE OR REPLACE VIEW ezyvet_revenue_by_department AS
SELECT 
  COALESCE(department, 'Unknown') as department,
  COUNT(*) as client_count,
  SUM(COALESCE(revenue_ytd, 0)) as total_revenue,
  AVG(COALESCE(revenue_ytd, 0)) as avg_revenue
FROM ezyvet_crm_contacts
WHERE is_active = true
GROUP BY department
ORDER BY total_revenue DESC;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

COMMENT ON COLUMN ezyvet_crm_contacts.breed IS 
'Pet breed information for breed-based revenue analytics.';

COMMENT ON COLUMN ezyvet_crm_contacts.department IS 
'Department/service category for department-based performance analytics.';
