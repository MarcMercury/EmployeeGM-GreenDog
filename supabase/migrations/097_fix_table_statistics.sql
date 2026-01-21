-- =====================================================
-- Migration: 097_fix_table_statistics.sql
-- Description: Fix get_table_statistics to return proper format
-- Returns array with table_name, row_count, total_size
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_table_statistics()
RETURNS TABLE (
  table_name text,
  row_count bigint,
  total_size text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Return table statistics from pg_stat_user_tables
  -- Combined with pg_total_relation_size for actual size
  RETURN QUERY
  SELECT 
    t.tablename::text AS table_name,
    t.n_live_tup::bigint AS row_count,
    pg_size_pretty(pg_total_relation_size('"' || t.schemaname || '"."' || t.tablename || '"'))::text AS total_size
  FROM pg_stat_user_tables t
  WHERE t.schemaname = 'public'
  ORDER BY t.n_live_tup DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_table_statistics() TO authenticated;

COMMENT ON FUNCTION public.get_table_statistics() IS 
  'Returns table row counts and sizes for System Health dashboard (admin only)';

-- Also add recent_audit_entries to check_database_health
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
  v_recent_audit_entries int := 0;
  v_start_time timestamptz;
  v_query_time_ms int;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Count active employees (uses employment_status column)
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
  
  -- Count recent audit entries (last hour)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') THEN
    SELECT count(*) INTO v_recent_audit_entries FROM audit_log WHERE created_at > now() - interval '1 hour';
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
      'recent_audit_entries', v_recent_audit_entries,
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

GRANT EXECUTE ON FUNCTION public.check_database_health() TO authenticated;

COMMENT ON FUNCTION public.check_database_health() IS 
  'Returns system health metrics for monitoring dashboards - real data from database';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Table statistics function updated to return proper format for System Health UI';
END $$;
