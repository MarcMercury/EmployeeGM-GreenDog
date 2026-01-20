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
  -- Note: employees uses employment_status column, not is_active
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') THEN
    SELECT count(*) INTO v_active_employees FROM employees WHERE employment_status = 'active';
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
