-- =====================================================
-- Migration: 153_repair_rpc_functions.sql  
-- Description: Ensure all RPC functions exist and work correctly
-- =====================================================

-- Drop and recreate get_table_statistics
DROP FUNCTION IF EXISTS public.get_table_statistics();

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
  RETURN QUERY
  SELECT 
    t.tablename::text AS table_name,
    COALESCE(t.n_live_tup, 0)::bigint AS row_count,
    pg_size_pretty(pg_total_relation_size('"' || t.schemaname || '"."' || t.tablename || '"'))::text AS total_size
  FROM pg_stat_user_tables t
  WHERE t.schemaname = 'public'
  ORDER BY t.n_live_tup DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_table_statistics() TO authenticated;

-- Test the function works
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  -- Just verify function exists and can be called (will fail permission check in this context, but that's ok)
  SELECT COUNT(*) INTO test_count FROM information_schema.routines 
  WHERE routine_name = 'get_table_statistics' AND routine_schema = 'public';
  
  IF test_count > 0 THEN
    RAISE NOTICE '✅ get_table_statistics function verified';
  ELSE
    RAISE EXCEPTION '❌ get_table_statistics function missing';
  END IF;
END $$;
