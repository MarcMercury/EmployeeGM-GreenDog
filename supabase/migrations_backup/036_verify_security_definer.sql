-- =====================================================
-- Migration 036: Verify is_admin and add debug helper
-- =====================================================

-- Recreate is_admin with SECURITY DEFINER to ensure it bypasses RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- SECURITY DEFINER allows this to bypass RLS
  SELECT role INTO user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(user_role = 'admin', FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- Recreate current_profile_id with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM public.profiles 
    WHERE auth_user_id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_id() TO anon;

-- Create current_employee_id with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT e.id FROM public.employees e
    JOIN public.profiles p ON e.profile_id = p.id
    WHERE p.auth_user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO anon;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Verified SECURITY DEFINER functions for RLS helper functions';
END $$;
