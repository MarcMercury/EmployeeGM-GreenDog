-- ============================================================================
-- MIGRATION 202: Appointment Analysis System
-- Stores uploaded appointment data (past + upcoming) for demand analysis
-- Supports AI-driven service scheduling recommendations
-- ============================================================================

-- ============================================================================
-- 1. APPOINTMENT DATA TABLE (uploaded from CSV/EzyVet exports)
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointment_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Location & temporal
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  location_name TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME,
  
  -- Appointment details
  appointment_type TEXT NOT NULL,          -- e.g. 'Surgery', 'Dental', 'Wellness Exam', 'Emergency'
  service_category TEXT,                   -- mapped to our service codes: SURG, AP_DENTAL, CLINIC_NAD, etc.
  species TEXT,                            -- e.g. 'Canine', 'Feline', 'Exotic'
  
  -- Status
  status TEXT DEFAULT 'scheduled',         -- scheduled, completed, cancelled, no_show
  is_past BOOLEAN DEFAULT false,           -- set on insert/update based on appointment_date
  
  -- Duration & revenue
  duration_minutes INT,
  revenue NUMERIC(10,2),
  
  -- Provider
  provider_name TEXT,                      -- Vet/tech who handled the appointment
  
  -- Metadata
  source TEXT DEFAULT 'csv_upload',        -- csv_upload, ezyvet_sync, manual
  batch_id UUID,                           -- groups records from a single upload
  raw_data JSONB DEFAULT '{}',             -- original CSV row for reference
  
  -- Tracking
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_appt_data_date ON appointment_data(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appt_data_location ON appointment_data(location_id);
CREATE INDEX IF NOT EXISTS idx_appt_data_type ON appointment_data(appointment_type);
CREATE INDEX IF NOT EXISTS idx_appt_data_category ON appointment_data(service_category);
CREATE INDEX IF NOT EXISTS idx_appt_data_batch ON appointment_data(batch_id);
CREATE INDEX IF NOT EXISTS idx_appt_data_status ON appointment_data(status);

-- ============================================================================
-- 2. APPOINTMENT ANALYSIS RUNS (AI analysis results)
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointment_analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  analysis_period_start DATE,
  analysis_period_end DATE,
  
  -- Results
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  
  -- AI output
  demand_summary JSONB DEFAULT '{}',       -- { "Surgery": { avgPerWeek: 12, trend: "increasing", peakDays: ["Mon","Wed"] }, ... }
  service_recommendations JSONB DEFAULT '[]', -- [ { service: "Surgery", recommendedDays: [1,3,5], staffNeeded: 4, reasoning: "..." }, ... ]
  staffing_suggestions JSONB DEFAULT '[]',   -- [ { service: "Surgery", role: "DVM", count: 2, suggestedEmployees: [...] }, ... ]
  weekly_plan JSONB DEFAULT '{}',            -- { "Mon": { services: [...], totalStaff: 12 }, ... }
  insights JSONB DEFAULT '[]',               -- [ { type: "trend", message: "Surgery demand up 15% MoM", severity: "info" }, ... ]
  
  -- Stats
  total_appointments_analyzed INT DEFAULT 0,
  date_range_weeks INT DEFAULT 0,
  ai_model TEXT,
  
  -- Tracking
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_appt_analysis_location ON appointment_analysis_runs(location_id);
CREATE INDEX IF NOT EXISTS idx_appt_analysis_status ON appointment_analysis_runs(status);

-- ============================================================================
-- 3. SERVICE CATEGORY MAPPING (maps appointment types to our services)
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointment_service_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_type TEXT NOT NULL,           -- raw appointment type from uploaded data
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  service_code TEXT,                        -- our service code (SURG, AP_DENTAL, etc.)
  confidence FLOAT DEFAULT 1.0,            -- how confident the mapping is (AI-assigned)
  is_manual BOOLEAN DEFAULT false,         -- was this manually mapped by a user?
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(appointment_type, service_id)
);

CREATE INDEX IF NOT EXISTS idx_appt_mapping_type ON appointment_service_mapping(appointment_type);

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================
ALTER TABLE appointment_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_service_mapping ENABLE ROW LEVEL SECURITY;

-- Admin access for all three tables
CREATE POLICY "appointment_data_admin" ON appointment_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin', 'marketing_admin')
    )
  );

CREATE POLICY "appointment_analysis_admin" ON appointment_analysis_runs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin', 'marketing_admin')
    )
  );

CREATE POLICY "appointment_mapping_admin" ON appointment_service_mapping
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin', 'marketing_admin')
    )
  );

-- ============================================================================
-- 5. AGGREGATE VIEW for quick analytics
-- ============================================================================
CREATE OR REPLACE VIEW appointment_weekly_summary AS
SELECT
  location_id,
  location_name,
  date_trunc('week', appointment_date)::DATE AS week_start,
  appointment_type,
  service_category,
  COUNT(*) AS total_appointments,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
  COUNT(*) FILTER (WHERE status = 'no_show') AS no_shows,
  ROUND(AVG(duration_minutes)::NUMERIC, 0) AS avg_duration_minutes,
  SUM(revenue) AS total_revenue,
  EXTRACT(DOW FROM appointment_date)::INT AS day_of_week
FROM appointment_data
GROUP BY location_id, location_name, date_trunc('week', appointment_date), 
         appointment_type, service_category, EXTRACT(DOW FROM appointment_date);

-- Grant access
GRANT SELECT ON appointment_weekly_summary TO authenticated;
