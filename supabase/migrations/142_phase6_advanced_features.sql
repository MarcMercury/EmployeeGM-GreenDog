-- =====================================================
-- PHASE 6: ADVANCED FEATURES - Future Enhancements
-- Migration: 142_phase6_advanced_features.sql
-- Priority: 🟢 LOW - Nice to Have
-- Purpose: Advanced features for future development
-- =====================================================

-- This phase adds infrastructure for advanced features
-- that can be implemented incrementally.

-- -----------------------------------------------------
-- 6.1 NATURAL LANGUAGE QUERY SUPPORT
-- -----------------------------------------------------

-- Store saved queries for the natural language interface
CREATE TABLE IF NOT EXISTS public.saved_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Owner
  created_by uuid REFERENCES auth.users(id),
  
  -- Query details
  name text NOT NULL,
  description text,
  natural_language text NOT NULL,  -- Original question
  generated_sql text NOT NULL,     -- AI-generated SQL
  
  -- Sharing
  is_public boolean DEFAULT false,
  shared_with_roles text[],
  
  -- Tracking
  run_count int DEFAULT 0,
  last_run_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_queries_user 
  ON saved_queries(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_queries_public 
  ON saved_queries(is_public, created_at DESC) 
  WHERE is_public = true;

-- RLS
ALTER TABLE public.saved_queries ENABLE ROW LEVEL SECURITY;

-- Users can manage their own queries
DROP POLICY IF EXISTS "Users can manage own queries" ON public.saved_queries;
CREATE POLICY "Users can manage own queries"
  ON public.saved_queries FOR ALL
  USING (created_by = auth.uid());

-- Users can view public queries
DROP POLICY IF EXISTS "Users can view public queries" ON public.saved_queries;
CREATE POLICY "Users can view public queries"
  ON public.saved_queries FOR SELECT
  USING (is_public = true);

COMMENT ON TABLE public.saved_queries IS 'Stores natural language queries and their generated SQL';

-- -----------------------------------------------------
-- 6.2 MANAGER INSIGHTS SYSTEM
-- -----------------------------------------------------

-- Store AI-generated insights for managers
CREATE TABLE IF NOT EXISTS public.manager_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Target
  manager_id uuid REFERENCES auth.users(id) NOT NULL,
  department_id uuid,
  
  -- Insight content
  insight_type text NOT NULL,  -- 'weekly_summary', 'alert', 'recommendation'
  title text NOT NULL,
  content text NOT NULL,
  priority text DEFAULT 'normal',  -- 'low', 'normal', 'high', 'urgent'
  
  -- Action items
  action_items jsonb,  -- Array of { title, deadline, completed }
  
  -- Status
  read_at timestamptz,
  dismissed_at timestamptz,
  actioned_at timestamptz,
  
  -- Tracking
  generated_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_insights_manager 
  ON manager_insights(manager_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_unread 
  ON manager_insights(manager_id, read_at) 
  WHERE read_at IS NULL;

-- RLS
ALTER TABLE public.manager_insights ENABLE ROW LEVEL SECURITY;

-- Managers can see their own insights
DROP POLICY IF EXISTS "Managers can view own insights" ON public.manager_insights;
CREATE POLICY "Managers can view own insights"
  ON public.manager_insights FOR ALL
  USING (manager_id = auth.uid());

-- Admins can view all insights
DROP POLICY IF EXISTS "Admins can view all insights" ON public.manager_insights;
CREATE POLICY "Admins can view all insights"
  ON public.manager_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

COMMENT ON TABLE public.manager_insights IS 'AI-generated insights and recommendations for managers';

-- -----------------------------------------------------
-- 6.3 PREDICTIVE STAFFING TABLE
-- -----------------------------------------------------

-- Store predictive staffing recommendations
CREATE TABLE IF NOT EXISTS public.staffing_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope
  prediction_date date NOT NULL,
  department_id uuid,
  location_id uuid,
  
  -- Predictions
  predicted_demand jsonb,        -- { morning: 5, afternoon: 7, evening: 4 }
  recommended_staff jsonb,       -- { role: 'RVT', count: 3 }
  confidence_score numeric(3, 2),
  
  -- Factors
  factors_considered jsonb,      -- { historical_avg: 5.2, events: ['Holiday'], weather: 'Clear' }
  
  -- Validation
  actual_demand jsonb,           -- Filled in after the fact
  accuracy_score numeric(3, 2),
  
  -- Tracking
  generated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_predictions_date 
  ON staffing_predictions(prediction_date, department_id);

-- RLS
ALTER TABLE public.staffing_predictions ENABLE ROW LEVEL SECURITY;

-- Managers and admins can view
DROP POLICY IF EXISTS "Managers can view predictions" ON public.staffing_predictions;
CREATE POLICY "Managers can view predictions"
  ON public.staffing_predictions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'manager', 'hr_admin')
    )
  );

COMMENT ON TABLE public.staffing_predictions IS 'AI-generated staffing demand predictions';

-- -----------------------------------------------------
-- 6.4 COMPLIANCE ALERTS TABLE
-- -----------------------------------------------------

-- Track compliance-related alerts
CREATE TABLE IF NOT EXISTS public.compliance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What
  alert_type text NOT NULL,  -- 'cert_expiring', 'training_overdue', 'license_renewal', etc.
  entity_type text NOT NULL, -- 'employee', 'certification', 'license'
  entity_id uuid NOT NULL,
  entity_name text,
  
  -- Details
  title text NOT NULL,
  description text,
  due_date date,
  days_until_due int,
  
  -- Severity
  severity text DEFAULT 'warning',  -- 'info', 'warning', 'critical'
  
  -- Resolution
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  resolution_notes text,
  
  -- Notifications
  notified_users uuid[],
  last_notified_at timestamptz,
  
  -- Tracking
  created_at timestamptz DEFAULT now(),
  auto_generated boolean DEFAULT true
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_compliance_unresolved 
  ON compliance_alerts(severity, due_date) 
  WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_entity 
  ON compliance_alerts(entity_type, entity_id);

-- RLS
ALTER TABLE public.compliance_alerts ENABLE ROW LEVEL SECURITY;

-- HR and admins can view
DROP POLICY IF EXISTS "HR can view compliance alerts" ON public.compliance_alerts;
CREATE POLICY "HR can view compliance alerts"
  ON public.compliance_alerts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'manager', 'hr_admin')
    )
  );

COMMENT ON TABLE public.compliance_alerts IS 'Tracks compliance deadlines and alerts for certifications, licenses, training';

-- -----------------------------------------------------
-- 6.5 GENERATE COMPLIANCE ALERTS FUNCTION
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_compliance_alerts()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alerts_created int := 0;
BEGIN
  -- Check for expiring licenses (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_licenses') THEN
    INSERT INTO compliance_alerts (alert_type, entity_type, entity_id, entity_name, title, description, due_date, days_until_due, severity)
    SELECT 
      'license_renewal',
      'employee',
      el.employee_id,
      e.first_name || ' ' || e.last_name,
      'License Expiring: ' || el.license_type,
      el.license_type || ' license expires on ' || el.expiration_date,
      el.expiration_date,
      (el.expiration_date - current_date),
      CASE 
        WHEN el.expiration_date - current_date <= 7 THEN 'critical'
        WHEN el.expiration_date - current_date <= 30 THEN 'warning'
        ELSE 'info'
      END
    FROM employee_licenses el
    JOIN employees e ON e.id = el.employee_id
    WHERE el.expiration_date BETWEEN current_date AND current_date + interval '90 days'
    AND e.employment_status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM compliance_alerts ca 
      WHERE ca.entity_id = el.employee_id 
      AND ca.alert_type = 'license_renewal'
      AND ca.due_date = el.expiration_date
      AND ca.resolved_at IS NULL
    );
    
    GET DIAGNOSTICS v_alerts_created = ROW_COUNT;
  END IF;
  
  RETURN v_alerts_created;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_compliance_alerts() TO authenticated;

COMMENT ON FUNCTION public.generate_compliance_alerts IS 
  'Scans for upcoming compliance deadlines and creates alerts';

-- -----------------------------------------------------
-- PHASE 6 COMPLETE
-- -----------------------------------------------------

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 6 Complete: Advanced feature infrastructure created';
END $$;
