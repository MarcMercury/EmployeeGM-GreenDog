-- =====================================================
-- FIX: RLS Recursion in is_admin() function
-- Problem: is_admin() queries profile_roles -> profiles, triggering RLS check infinitely
-- Solution: Use profiles.role column directly with SECURITY DEFINER to bypass RLS
-- =====================================================

-- Create/replace is_admin() that checks profiles.role directly
-- SECURITY DEFINER runs as the function owner, bypassing RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Direct query to profiles.role column, bypasses RLS via SECURITY DEFINER
  SELECT role INTO user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- Also fix current_profile_id to be SECURITY DEFINER
-- Use CREATE OR REPLACE to avoid dropping with dependencies
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
