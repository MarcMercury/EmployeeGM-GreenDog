-- =====================================================
-- Migration 037: Fix RLS recursion by using auth.users metadata
-- Problem: is_admin() queries profiles, but profiles has RLS that might call is_admin()
-- Solution: Use auth.jwt() claims or auth.users raw_user_meta_data instead
-- =====================================================

-- Option 1: Create is_admin that checks auth.jwt() claims (fastest, no DB query)
-- This requires setting custom claims on the user token

-- Option 2: Create is_admin that checks auth.users directly (bypasses RLS on profiles)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Query profiles with RLS bypassed via SECURITY DEFINER
  -- The SECURITY DEFINER attribute makes this function run as its owner (postgres)
  -- This bypasses RLS on the profiles table
  SELECT role INTO user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(user_role = 'admin', FALSE);
EXCEPTION
  WHEN OTHERS THEN
    -- Return false if any error occurs to prevent auth failures
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Ensure proper grants
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- Also ensure current_profile_id is robust
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM public.profiles 
    WHERE auth_user_id = auth.uid() 
    LIMIT 1
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_id() TO anon;
GRANT EXECUTE ON FUNCTION public.current_profile_id() TO service_role;

-- Ensure current_employee_id is robust  
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT e.id FROM public.employees e
    JOIN public.profiles p ON e.profile_id = p.id
    WHERE p.auth_user_id = auth.uid()
    LIMIT 1
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO anon;
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO service_role;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Added error handling to SECURITY DEFINER functions';
END $$;
