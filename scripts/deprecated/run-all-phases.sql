-- =====================================================
-- PHASE 1: FOUNDATION - Data Integrity Constraints
-- Migration: 137_phase1_data_integrity.sql
-- Priority: 🔴 CRITICAL - Do First
-- Purpose: Prevent data corruption at the database level
-- =====================================================

-- This phase adds CHECK constraints to ensure data validity.
-- These are non-breaking changes that enforce business rules.

-- -----------------------------------------------------
-- 1.1 EMPLOYEE DATA VALIDATION
-- -----------------------------------------------------

-- Ensure hire date is before or equal to termination date
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_dates_valid') THEN
    ALTER TABLE employees ADD CONSTRAINT employees_dates_valid
      CHECK (hire_date IS NULL OR termination_date IS NULL OR hire_date <= termination_date);
    RAISE NOTICE 'Added employees_dates_valid constraint';
  ELSE
    RAISE NOTICE 'employees_dates_valid constraint already exists';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping employees_dates_valid: %', SQLERRM;
END $$;

-- Ensure email format is valid (basic regex check)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_email_format') THEN
    ALTER TABLE employees ADD CONSTRAINT employees_email_format
      CHECK (email_work IS NULL OR email_work ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    RAISE NOTICE 'Added employees_email_format constraint';
  ELSE
    RAISE NOTICE 'employees_email_format constraint already exists';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping employees_email_format: %', SQLERRM;
END $$;

-- -----------------------------------------------------
-- 1.2 DATA NORMALIZATION TRIGGER
-- -----------------------------------------------------

-- Automatically clean and normalize employee data on save
CREATE OR REPLACE FUNCTION public.normalize_employee_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Normalize email to lowercase
  IF NEW.email_work IS NOT NULL THEN
    NEW.email_work := lower(trim(NEW.email_work));
  END IF;
  
  -- Trim name fields
  IF NEW.first_name IS NOT NULL THEN
    NEW.first_name := trim(NEW.first_name);
  END IF;
  
  IF NEW.last_name IS NOT NULL THEN
    NEW.last_name := trim(NEW.last_name);
  END IF;
  
  -- Set updated_at timestamp
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$;

-- Apply trigger to employees table
DROP TRIGGER IF EXISTS normalize_employee_before_save ON employees;
CREATE TRIGGER normalize_employee_before_save
  BEFORE INSERT OR UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION normalize_employee_data();

COMMENT ON FUNCTION public.normalize_employee_data() IS 'Normalizes employee data (lowercase email, trim names) before save';

-- -----------------------------------------------------
-- 1.3 PROFILE DATA VALIDATION
-- -----------------------------------------------------

-- Ensure profile email format is valid
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_format') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_email_format
      CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    RAISE NOTICE 'Added profiles_email_format constraint';
  ELSE
    RAISE NOTICE 'profiles_email_format constraint already exists';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping profiles_email_format: %', SQLERRM;
END $$;

-- -----------------------------------------------------
-- PHASE 1 COMPLETE
-- -----------------------------------------------------

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 1 Complete: Data integrity constraints applied';
END $$;
-- =====================================================
-- PHASE 2: PERFORMANCE - Database Indexes
-- Migration: 138_phase2_performance_indexes.sql
-- Priority: 🔴 CRITICAL - Do First
-- Purpose: Speed up common queries for multi-user scale
-- =====================================================

-- This phase adds indexes for frequently-used query patterns.
-- These are non-breaking changes that improve read performance.

-- -----------------------------------------------------
-- 2.1 EMPLOYEE INDEXES
-- -----------------------------------------------------

-- Active employees by department (roster filtering)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_employees_dept_active') THEN
      CREATE INDEX idx_employees_dept_active 
        ON employees(department_id, is_active) 
        WHERE is_active = true;
      RAISE NOTICE 'Created idx_employees_dept_active';
    END IF;
    
    -- Employee lookup by email
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_employees_email_work') THEN
      CREATE INDEX idx_employees_email_work 
        ON employees(email_work) 
        WHERE email_work IS NOT NULL;
      RAISE NOTICE 'Created idx_employees_email_work';
    END IF;
    
    -- Employee lookup by profile_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_employees_profile_id') THEN
      CREATE INDEX idx_employees_profile_id 
        ON employees(profile_id) 
        WHERE profile_id IS NOT NULL;
      RAISE NOTICE 'Created idx_employees_profile_id';
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------
-- 2.2 RECRUITING INDEXES
-- -----------------------------------------------------

-- Candidates by pipeline stage (kanban board)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidates') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_candidates_stage_date') THEN
      CREATE INDEX idx_candidates_stage_date 
        ON candidates(pipeline_stage, created_at DESC);
      RAISE NOTICE 'Created idx_candidates_stage_date';
    END IF;
  END IF;
  
  -- Also check recruiting_candidates table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recruiting_candidates') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_recruiting_candidates_stage') THEN
      CREATE INDEX idx_recruiting_candidates_stage 
        ON recruiting_candidates(pipeline_stage, created_at DESC);
      RAISE NOTICE 'Created idx_recruiting_candidates_stage';
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------
-- 2.3 NOTIFICATION INDEXES
-- -----------------------------------------------------

-- Unread notifications per user (badge counts)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_unread') THEN
      CREATE INDEX idx_notifications_unread 
        ON notifications(user_id, created_at DESC) 
        WHERE read_at IS NULL;
      RAISE NOTICE 'Created idx_notifications_unread';
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------
-- 2.4 TIME OFF INDEXES
-- -----------------------------------------------------

-- Pending time off requests for approvers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_off_requests') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_time_off_pending') THEN
      CREATE INDEX idx_time_off_pending 
        ON time_off_requests(approver_id, requested_at) 
        WHERE status = 'pending';
      RAISE NOTICE 'Created idx_time_off_pending';
    END IF;
    
    -- Time off by employee
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_time_off_employee') THEN
      CREATE INDEX idx_time_off_employee 
        ON time_off_requests(employee_id, start_date DESC);
      RAISE NOTICE 'Created idx_time_off_employee';
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------
-- 2.5 SCHEDULE INDEXES
-- -----------------------------------------------------

-- Shifts by schedule and date
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shifts') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_shifts_schedule_date') THEN
      CREATE INDEX idx_shifts_schedule_date 
        ON shifts(schedule_week_id, shift_date);
      RAISE NOTICE 'Created idx_shifts_schedule_date';
    END IF;
    
    -- Shifts by employee
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_shifts_employee_date') THEN
      CREATE INDEX idx_shifts_employee_date 
        ON shifts(employee_id, shift_date DESC);
      RAISE NOTICE 'Created idx_shifts_employee_date';
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------
-- 2.6 MARKETING/CRM INDEXES
-- -----------------------------------------------------

-- Marketing leads by status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketing_leads') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketing_leads_status') THEN
      CREATE INDEX idx_marketing_leads_status 
        ON marketing_leads(status, created_at DESC);
      RAISE NOTICE 'Created idx_marketing_leads_status';
    END IF;
  END IF;
END $$;

-- Referral partners by zone
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'referral_partners') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_referral_partners_zone') THEN
      CREATE INDEX idx_referral_partners_zone 
        ON referral_partners(zone, priority_level);
      RAISE NOTICE 'Created idx_referral_partners_zone';
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------
-- PHASE 2 COMPLETE
-- -----------------------------------------------------

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 2 Complete: Performance indexes created';
END $$;
-- =====================================================
-- PHASE 3: OBSERVABILITY - Health & Monitoring Functions
-- Migration: 139_phase3_health_monitoring.sql
-- Priority: 🟡 HIGH - Do Soon
-- Purpose: Enable system health checks and monitoring
-- =====================================================

-- This phase adds database functions for health monitoring.
-- Used by the /api/health endpoint and admin dashboards.

-- -----------------------------------------------------
-- 3.1 DATABASE HEALTH CHECK FUNCTION
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_database_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_active_employees int := 0;
  v_total_profiles int := 0;
  v_pending_time_off int := 0;
  v_unread_notifications int := 0;
  v_orphaned_profiles int := 0;
  v_start_time timestamptz;
  v_query_time_ms int;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Count active employees (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') THEN
    SELECT count(*) INTO v_active_employees FROM employees WHERE is_active = true;
  END IF;
  
  -- Count total profiles
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    SELECT count(*) INTO v_total_profiles FROM profiles;
  END IF;
  
  -- Count pending time off requests
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_off_requests') THEN
    SELECT count(*) INTO v_pending_time_off FROM time_off_requests WHERE status = 'pending';
  END IF;
  
  -- Count unread notifications
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    SELECT count(*) INTO v_unread_notifications FROM notifications WHERE read_at IS NULL;
  END IF;
  
  -- Check for orphaned profiles (profiles with auth_user_id but no matching auth.users)
  BEGIN
    SELECT count(*) INTO v_orphaned_profiles 
    FROM profiles p 
    WHERE p.auth_user_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.auth_user_id);
  EXCEPTION WHEN OTHERS THEN
    v_orphaned_profiles := -1; -- Indicate check failed
  END;
  
  -- Calculate query time
  v_query_time_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::int;
  
  -- Build result
  v_result := jsonb_build_object(
    'timestamp', now(),
    'status', CASE 
      WHEN v_orphaned_profiles > 0 THEN 'warning'
      WHEN v_orphaned_profiles = -1 THEN 'degraded'
      ELSE 'healthy' 
    END,
    'metrics', jsonb_build_object(
      'active_employees', v_active_employees,
      'total_profiles', v_total_profiles,
      'pending_time_off', v_pending_time_off,
      'unread_notifications', v_unread_notifications,
      'query_time_ms', v_query_time_ms
    ),
    'issues', jsonb_build_object(
      'orphaned_profiles', GREATEST(v_orphaned_profiles, 0)
    )
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'timestamp', now(),
    'status', 'error',
    'error', jsonb_build_object(
      'message', SQLERRM,
      'code', SQLSTATE
    )
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_database_health() TO authenticated;

COMMENT ON FUNCTION public.check_database_health() IS 
  'Returns system health metrics for monitoring dashboards and /api/health endpoint';

-- -----------------------------------------------------
-- 3.2 TABLE STATISTICS FUNCTION
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_table_statistics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Only allow admins
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  ) THEN
    RETURN jsonb_build_object('error', 'Admin access required');
  END IF;

  SELECT jsonb_object_agg(
    tablename,
    jsonb_build_object(
      'estimated_rows', n_live_tup,
      'last_vacuum', last_vacuum,
      'last_analyze', last_analyze
    )
  ) INTO v_result
  FROM pg_stat_user_tables
  WHERE schemaname = 'public';
  
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_table_statistics() TO authenticated;

COMMENT ON FUNCTION public.get_table_statistics() IS 
  'Returns table row counts and maintenance statistics (admin only)';

-- -----------------------------------------------------
-- 3.3 SLOW QUERY LOG TABLE (optional)
-- -----------------------------------------------------

-- Create table to log slow operations for analysis
CREATE TABLE IF NOT EXISTS public.performance_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL,  -- 'query', 'api_call', 'background_job'
  operation_name text NOT NULL,
  duration_ms int NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Index for querying recent slow operations
CREATE INDEX IF NOT EXISTS idx_performance_log_recent 
  ON performance_log(created_at DESC) 
  WHERE duration_ms > 500;

-- RLS: Only admins can view
ALTER TABLE public.performance_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view performance logs" ON public.performance_log;
CREATE POLICY "Admins can view performance logs"
  ON public.performance_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Anyone can insert (for logging from API)
DROP POLICY IF EXISTS "System can insert performance logs" ON public.performance_log;
CREATE POLICY "System can insert performance logs"
  ON public.performance_log FOR INSERT
  WITH CHECK (true);

-- Auto-cleanup old logs (keep 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_performance_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM performance_log WHERE created_at < now() - interval '7 days';
END;
$$;

COMMENT ON TABLE public.performance_log IS 'Logs slow operations for performance monitoring';

-- -----------------------------------------------------
-- PHASE 3 COMPLETE
-- -----------------------------------------------------

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 3 Complete: Health monitoring functions created';
END $$;
-- =====================================================
-- PHASE 4: AUDIT - Immutability & Enhanced Logging
-- Migration: 140_phase4_audit_enhancements.sql
-- Priority: 🟡 HIGH - Do Soon
-- Purpose: Protect audit trail and enhance logging
-- =====================================================

-- This phase ensures audit logs cannot be tampered with
-- and adds enhanced logging capabilities.

-- -----------------------------------------------------
-- 4.1 CREATE AUDIT LOG TABLE (if not exists)
-- -----------------------------------------------------

-- Ensure the audit_log table exists with proper structure
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who performed the action
  actor_id uuid REFERENCES auth.users(id),
  actor_email text,
  actor_ip inet,
  
  -- What was affected
  entity_type text NOT NULL,
  entity_id uuid,
  entity_name text,
  
  -- What happened
  action text NOT NULL,
  action_category text,
  
  -- Change details
  old_values jsonb,
  new_values jsonb,
  changes jsonb,
  
  -- Context
  session_id text,
  user_agent text,
  request_path text,
  
  -- Timestamp
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_entity 
  ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor 
  ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action 
  ON audit_log(action, action_category);
CREATE INDEX IF NOT EXISTS idx_audit_log_created 
  ON audit_log(created_at DESC);

COMMENT ON TABLE public.audit_log IS 'Immutable audit trail for all critical operations';

-- -----------------------------------------------------
-- 4.2 AUDIT LOG RLS POLICIES
-- -----------------------------------------------------

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_log;
CREATE POLICY "Admins can view audit logs"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- System can insert audit logs
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log;
CREATE POLICY "System can insert audit logs"
  ON public.audit_log FOR INSERT
  WITH CHECK (true);

-- No UPDATE or DELETE policies = immutable

-- -----------------------------------------------------
-- 4.3 AUDIT LOG IMMUTABILITY TRIGGER
-- -----------------------------------------------------

-- Function to prevent modifications
CREATE OR REPLACE FUNCTION public.prevent_audit_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Audit log records cannot be modified or deleted. This is a security feature.';
END;
$$;

-- Apply trigger
DROP TRIGGER IF EXISTS audit_log_immutable ON audit_log;
CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- -----------------------------------------------------
-- 4.4 CONVENIENT AUDIT LOGGING FUNCTION
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_entity_type text,
  p_entity_id uuid,
  p_entity_name text,
  p_action text,
  p_action_category text DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_changes jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_actor_email text;
  v_audit_id uuid;
BEGIN
  -- Get current user info
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NOT NULL THEN
    SELECT email INTO v_actor_email
    FROM profiles
    WHERE auth_user_id = v_actor_id;
  END IF;
  
  -- Insert audit record
  INSERT INTO audit_log (
    actor_id,
    actor_email,
    entity_type,
    entity_id,
    entity_name,
    action,
    action_category,
    old_values,
    new_values,
    changes
  ) VALUES (
    v_actor_id,
    v_actor_email,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_action,
    p_action_category,
    p_old_values,
    p_new_values,
    p_changes
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_audit_event(text, uuid, text, text, text, jsonb, jsonb, jsonb) TO authenticated;

COMMENT ON FUNCTION public.log_audit_event IS 
  'Convenience function to log audit events from application code';

-- -----------------------------------------------------
-- 4.5 AUDIT CLEANUP FUNCTION (archive old records)
-- -----------------------------------------------------

-- Create archive table for old audit records
CREATE TABLE IF NOT EXISTS public.audit_log_archive (
  LIKE public.audit_log INCLUDING ALL
);

COMMENT ON TABLE public.audit_log_archive IS 'Archived audit records older than 90 days';

-- Function to archive old audit records (run monthly)
CREATE OR REPLACE FUNCTION public.archive_old_audit_logs()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_archived_count int;
BEGIN
  -- Only super_admin can run this
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE auth_user_id = auth.uid() 
    AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Super admin access required';
  END IF;

  -- Move records older than 90 days to archive
  WITH moved AS (
    DELETE FROM audit_log
    WHERE created_at < now() - interval '90 days'
    RETURNING *
  )
  INSERT INTO audit_log_archive SELECT * FROM moved;
  
  GET DIAGNOSTICS v_archived_count = ROW_COUNT;
  
  RETURN v_archived_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_old_audit_logs() TO authenticated;

-- -----------------------------------------------------
-- PHASE 4 COMPLETE
-- -----------------------------------------------------

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 4 Complete: Audit logging enhanced';
END $$;
-- =====================================================
-- PHASE 5: AI INFRASTRUCTURE - Tables for AI Features
-- Migration: 141_phase5_ai_infrastructure.sql
-- Priority: 🟢 MEDIUM - Nice to Have
-- Purpose: Database support for AI-powered features
-- =====================================================

-- This phase creates tables and functions to support
-- AI-powered features like scheduling and document parsing.

-- -----------------------------------------------------
-- 5.1 AI USAGE TRACKING TABLE
-- -----------------------------------------------------

-- Track AI API usage for cost monitoring and optimization
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who used the feature
  user_id uuid REFERENCES auth.users(id),
  profile_id uuid,
  
  -- What feature was used
  feature text NOT NULL,  -- 'schedule_suggest', 'document_parse', 'query', etc.
  model text NOT NULL,    -- 'gpt-4-turbo', 'gpt-3.5-turbo', etc.
  
  -- Usage metrics
  input_tokens int,
  output_tokens int,
  total_tokens int,
  estimated_cost_usd numeric(10, 6),
  
  -- Context
  request_metadata jsonb DEFAULT '{}',
  response_summary text,
  success boolean DEFAULT true,
  error_message text,
  
  -- Timing
  duration_ms int,
  created_at timestamptz DEFAULT now()
);

-- Indexes for usage analysis
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature 
  ON ai_usage_log(feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user 
  ON ai_usage_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_date 
  ON ai_usage_log(created_at DESC);

-- RLS
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all usage
DROP POLICY IF EXISTS "Admins can view AI usage" ON public.ai_usage_log;
CREATE POLICY "Admins can view AI usage"
  ON public.ai_usage_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Users can view their own usage
DROP POLICY IF EXISTS "Users can view own AI usage" ON public.ai_usage_log;
CREATE POLICY "Users can view own AI usage"
  ON public.ai_usage_log FOR SELECT
  USING (user_id = auth.uid());

-- System can insert
DROP POLICY IF EXISTS "System can log AI usage" ON public.ai_usage_log;
CREATE POLICY "System can log AI usage"
  ON public.ai_usage_log FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.ai_usage_log IS 'Tracks AI API usage for cost monitoring and optimization';

-- -----------------------------------------------------
-- 5.2 AI GENERATED SCHEDULES TABLE
-- -----------------------------------------------------

-- Store AI-generated schedule suggestions for review
CREATE TABLE IF NOT EXISTS public.ai_schedule_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  week_start date NOT NULL,
  department_id uuid,
  location_id uuid,
  
  -- Generator
  requested_by uuid REFERENCES auth.users(id),
  
  -- Suggestion data
  suggested_shifts jsonb NOT NULL,  -- Array of shift assignments
  coverage_analysis jsonb,          -- Coverage metrics
  warnings text[],                   -- Any issues detected
  confidence_score numeric(3, 2),   -- 0.00 to 1.00
  
  -- Status
  status text DEFAULT 'pending',    -- 'pending', 'approved', 'modified', 'rejected'
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  
  -- Tracking
  created_at timestamptz DEFAULT now(),
  applied_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_schedules_week 
  ON ai_schedule_suggestions(week_start, department_id);
CREATE INDEX IF NOT EXISTS idx_ai_schedules_status 
  ON ai_schedule_suggestions(status, created_at DESC);

-- RLS
ALTER TABLE public.ai_schedule_suggestions ENABLE ROW LEVEL SECURITY;

-- Managers and admins can view/manage
DROP POLICY IF EXISTS "Managers can view AI schedules" ON public.ai_schedule_suggestions;
CREATE POLICY "Managers can view AI schedules"
  ON public.ai_schedule_suggestions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'manager', 'hr_admin')
    )
  );

COMMENT ON TABLE public.ai_schedule_suggestions IS 'Stores AI-generated schedule suggestions for review before applying';

-- -----------------------------------------------------
-- 5.3 DOCUMENT PARSING RESULTS TABLE
-- -----------------------------------------------------

-- Store parsed document data for recruiting
CREATE TABLE IF NOT EXISTS public.ai_parsed_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source document
  storage_path text,
  original_filename text,
  file_type text,
  
  -- Parsing context
  parsed_by uuid REFERENCES auth.users(id),
  document_type text,  -- 'resume', 'certification', 'transcript', etc.
  
  -- Extracted data
  extracted_person jsonb,       -- { firstName, lastName, email, phone }
  extracted_experience jsonb,   -- Array of work history
  extracted_education jsonb,    -- Array of education
  extracted_certifications jsonb, -- Array of certs
  extracted_skills jsonb,       -- Array of skills
  
  -- Quality metrics
  confidence_score numeric(3, 2),
  raw_text_preview text,        -- First 2000 chars for verification
  
  -- Linking
  linked_to_candidate_id uuid,
  linked_to_employee_id uuid,
  
  -- Tracking
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parsed_docs_type 
  ON ai_parsed_documents(document_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parsed_docs_candidate 
  ON ai_parsed_documents(linked_to_candidate_id) 
  WHERE linked_to_candidate_id IS NOT NULL;

-- RLS
ALTER TABLE public.ai_parsed_documents ENABLE ROW LEVEL SECURITY;

-- HR and recruiting can view
DROP POLICY IF EXISTS "HR can view parsed documents" ON public.ai_parsed_documents;
CREATE POLICY "HR can view parsed documents"
  ON public.ai_parsed_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'manager', 'hr_admin', 'marketing_admin')
    )
  );

COMMENT ON TABLE public.ai_parsed_documents IS 'Stores AI-extracted data from uploaded documents';

-- -----------------------------------------------------
-- 5.4 AI USAGE STATISTICS FUNCTION
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_ai_usage_stats(
  p_days int DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Only admins can view stats
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  ) THEN
    RETURN jsonb_build_object('error', 'Admin access required');
  END IF;

  SELECT jsonb_build_object(
    'period_days', p_days,
    'total_requests', count(*),
    'total_tokens', sum(COALESCE(total_tokens, 0)),
    'estimated_cost_usd', sum(COALESCE(estimated_cost_usd, 0)),
    'by_feature', (
      SELECT jsonb_object_agg(feature, cnt)
      FROM (
        SELECT feature, count(*) as cnt
        FROM ai_usage_log
        WHERE created_at > now() - (p_days || ' days')::interval
        GROUP BY feature
      ) sub
    ),
    'success_rate', (
      SELECT round(100.0 * sum(CASE WHEN success THEN 1 ELSE 0 END) / NULLIF(count(*), 0), 2)
      FROM ai_usage_log
      WHERE created_at > now() - (p_days || ' days')::interval
    )
  ) INTO v_result
  FROM ai_usage_log
  WHERE created_at > now() - (p_days || ' days')::interval;
  
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ai_usage_stats(int) TO authenticated;

COMMENT ON FUNCTION public.get_ai_usage_stats IS 
  'Returns AI usage statistics for cost monitoring (admin only)';

-- -----------------------------------------------------
-- PHASE 5 COMPLETE
-- -----------------------------------------------------

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 5 Complete: AI infrastructure tables created';
END $$;
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
    AND e.is_active = true
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
