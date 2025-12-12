-- =====================================================
-- Migration 038: Add debug/test functions
-- =====================================================

-- Create a function to test if we can access profiles safely
CREATE OR REPLACE FUNCTION public.test_auth_lookup(test_email TEXT)
RETURNS TABLE (
  profile_exists BOOLEAN,
  profile_id UUID,
  profile_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE as profile_exists,
    p.id as profile_id,
    p.role as profile_role
  FROM public.profiles p
  WHERE LOWER(p.email) = LOWER(test_email)
  LIMIT 1;
  
  -- Return empty row if not found
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.test_auth_lookup(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_auth_lookup(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.test_auth_lookup(TEXT) TO service_role;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Created test_auth_lookup function for debugging';
END $$;
