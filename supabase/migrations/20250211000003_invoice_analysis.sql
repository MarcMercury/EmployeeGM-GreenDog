-- ============================================================================
-- MIGRATION: Invoice Analysis System
-- Stores uploaded invoice line data for revenue & service analysis
-- Supports incremental "add-to" uploads with duplicate detection
-- Auto-purges data older than 24 months
-- ============================================================================

-- ============================================================================
-- 1. INVOICE LINES TABLE (uploaded from EzyVet XLS/CSV exports)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Invoice identification (used for deduplication)
  invoice_number TEXT,                         -- "Invoice" column from report
  invoice_line_reference TEXT,                 -- "Invoice Line Reference" — unique per line

  -- Temporal
  invoice_date DATE,                           -- "Invoice Line Date Created"
  invoice_date_modified DATE,                  -- "Invoice Line Date Last Modified"
  invoice_time TIME,                           -- "Invoice Line Time"

  -- Client / Patient
  client_code TEXT,                            -- "Client Contact Code"
  client_first_name TEXT,                      -- "First Name"
  client_email TEXT,                           -- "Email"
  pet_name TEXT,                               -- "Pet Name"
  breed TEXT,                                  -- "Breed"

  -- Product / Service
  product_name TEXT,                           -- "Product Name"
  product_group TEXT,                          -- "Product Group"
  account TEXT,                                -- "Account" (revenue account)
  department TEXT,                             -- "Department"
  
  -- Revenue
  standard_price NUMERIC(12,2),               -- "Standard Price"
  discount NUMERIC(12,2) DEFAULT 0,           -- "Discount"
  surcharge_adjustment NUMERIC(12,2) DEFAULT 0, -- "Surcharge Adjustment"
  discount_adjustment NUMERIC(12,2) DEFAULT 0,  -- "Discount Adjustment"
  rounding_adjustment NUMERIC(12,2) DEFAULT 0,  -- "Rounding Adjustment"
  price_after_discount NUMERIC(12,2),          -- "Price After Discount"
  total_tax_amount NUMERIC(12,2) DEFAULT 0,    -- "Total Tax Amount"
  total_earned NUMERIC(12,2),                  -- "Total Earned"

  -- Staff
  staff_member TEXT,                           -- "Staff Member"
  case_owner TEXT,                             -- "Case Owner"
  last_modified_by TEXT,                       -- "Last Modified By"

  -- Location / Division
  division TEXT,                               -- "Active Division"
  
  -- Invoice type
  invoice_type TEXT,                           -- "Type" (e.g. Standard, Credit Note)
  payment_terms TEXT,                          -- "Payment Terms"

  -- Consult
  consult_id TEXT,                             -- "Consult ID"

  -- Metadata
  source TEXT DEFAULT 'csv_upload',            -- csv_upload, manual
  batch_id UUID,                               -- groups records from a single upload
  raw_data JSONB DEFAULT '{}',                 -- original row for reference

  -- Tracking
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Deduplication: unique on invoice number + line reference
  UNIQUE(invoice_number, invoice_line_reference)
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_inv_lines_date ON invoice_lines(invoice_date);
CREATE INDEX IF NOT EXISTS idx_inv_lines_invoice ON invoice_lines(invoice_number);
CREATE INDEX IF NOT EXISTS idx_inv_lines_product_group ON invoice_lines(product_group);
CREATE INDEX IF NOT EXISTS idx_inv_lines_department ON invoice_lines(department);
CREATE INDEX IF NOT EXISTS idx_inv_lines_division ON invoice_lines(division);
CREATE INDEX IF NOT EXISTS idx_inv_lines_staff ON invoice_lines(staff_member);
CREATE INDEX IF NOT EXISTS idx_inv_lines_account ON invoice_lines(account);
CREATE INDEX IF NOT EXISTS idx_inv_lines_batch ON invoice_lines(batch_id);
CREATE INDEX IF NOT EXISTS idx_inv_lines_client ON invoice_lines(client_code);

-- ============================================================================
-- 2. INVOICE ANALYSIS RUNS (AI analysis results)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  division TEXT,
  analysis_period_start DATE,
  analysis_period_end DATE,

  -- Results
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),

  -- AI output
  revenue_summary JSONB DEFAULT '{}',          -- revenue breakdowns by department, product group, etc.
  trend_analysis JSONB DEFAULT '{}',           -- MoM, YoY trends
  top_products JSONB DEFAULT '[]',             -- top revenue-generating products
  department_breakdown JSONB DEFAULT '{}',     -- per-department revenue analysis
  staff_performance JSONB DEFAULT '{}',        -- revenue per staff member
  insights JSONB DEFAULT '[]',                 -- AI-generated key insights
  recommendations JSONB DEFAULT '[]',          -- AI-suggested actions

  -- Stats
  total_lines_analyzed INT DEFAULT 0,
  total_revenue_analyzed NUMERIC(14,2) DEFAULT 0,
  date_range_days INT DEFAULT 0,
  ai_model TEXT,

  -- Tracking
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_inv_analysis_status ON invoice_analysis_runs(status);
CREATE INDEX IF NOT EXISTS idx_inv_analysis_division ON invoice_analysis_runs(division);

-- ============================================================================
-- 3. UPLOAD HISTORY (track each upload batch)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_upload_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL,
  file_name TEXT,
  total_rows INT DEFAULT 0,
  inserted INT DEFAULT 0,
  duplicates_skipped INT DEFAULT 0,
  errors INT DEFAULT 0,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_upload_batch ON invoice_upload_history(batch_id);

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_upload_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_lines_admin" ON invoice_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
      AND role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin', 'marketing_admin')
    )
  );

CREATE POLICY "invoice_analysis_admin" ON invoice_analysis_runs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
      AND role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin', 'marketing_admin')
    )
  );

CREATE POLICY "invoice_upload_history_admin" ON invoice_upload_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
      AND role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin', 'marketing_admin')
    )
  );

-- ============================================================================
-- 5. AGGREGATE VIEWS for quick analytics
-- ============================================================================

-- Monthly revenue summary by department
CREATE OR REPLACE VIEW invoice_monthly_summary AS
SELECT
  division,
  department,
  product_group,
  date_trunc('month', invoice_date)::DATE AS month_start,
  COUNT(*) AS total_lines,
  SUM(total_earned) AS total_revenue,
  SUM(standard_price) AS gross_revenue,
  SUM(discount) AS total_discounts,
  SUM(total_tax_amount) AS total_tax,
  AVG(total_earned) AS avg_line_revenue,
  COUNT(DISTINCT invoice_number) AS unique_invoices,
  COUNT(DISTINCT client_code) AS unique_clients,
  COUNT(DISTINCT staff_member) AS unique_staff
FROM invoice_lines
WHERE invoice_date IS NOT NULL
GROUP BY division, department, product_group, date_trunc('month', invoice_date);

-- Staff revenue summary  
CREATE OR REPLACE VIEW invoice_staff_summary AS
SELECT
  staff_member,
  division,
  department,
  date_trunc('month', invoice_date)::DATE AS month_start,
  COUNT(*) AS total_lines,
  SUM(total_earned) AS total_revenue,
  COUNT(DISTINCT invoice_number) AS unique_invoices,
  COUNT(DISTINCT client_code) AS unique_clients
FROM invoice_lines
WHERE invoice_date IS NOT NULL AND staff_member IS NOT NULL
GROUP BY staff_member, division, department, date_trunc('month', invoice_date);

-- Grant access
GRANT SELECT ON invoice_monthly_summary TO authenticated;
GRANT SELECT ON invoice_staff_summary TO authenticated;

-- ============================================================================
-- 6. AUTO-PURGE FUNCTION (removes data older than 24 months)
-- ============================================================================
CREATE OR REPLACE FUNCTION purge_old_invoice_lines()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM invoice_lines
  WHERE invoice_date < (CURRENT_DATE - INTERVAL '24 months');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Purged % invoice lines older than 24 months', deleted_count;
  RETURN deleted_count;
END;
$$;
