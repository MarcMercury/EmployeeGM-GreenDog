-- =====================================================
-- Migration: 083_role_based_access_control.sql
-- Description: Implement multi-tier role system
-- Roles: admin (System ADMIN), office_admin, marketing_admin, user
-- =====================================================

-- =====================================================
-- 1. UPDATE PROFILES ROLE CONSTRAINT
-- =====================================================

-- First, update the check constraint to allow new roles
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'office_admin', 'marketing_admin', 'user'));

-- =====================================================
-- 2. CREATE ROLE DEFINITIONS TABLE (for UI and documentation)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.role_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  tier INTEGER NOT NULL DEFAULT 0,  -- Higher = more access
  permissions JSONB DEFAULT '{}',
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert role definitions
INSERT INTO public.role_definitions (role_key, display_name, description, tier, permissions, icon, color) 
VALUES 
  ('admin', 'System Admin', 'Full system access - can override any setting, manage all data, and access all features', 100, '{
    "my_workspace": {"view": true, "edit": true},
    "management": {"view": true, "edit": true, "roster": true, "schedule": true, "time_off": true, "recruiting": true, "skills": true},
    "med_ops": {"view": true, "edit": true},
    "marketing": {"view": true, "edit": true, "events": true, "leads": true, "inventory": true},
    "gdu": {"view": true, "edit": true, "visitors": true, "events": true},
    "admin_ops": {"view": true, "edit": true, "settings": true, "payroll": true, "master_roster": true}
  }', '⭐', 'amber'),
  ('office_admin', 'Office Admin', 'Operations focus - manages team schedules, time off approvals, and roster. Cannot access Admin Ops or edit profiles/payroll', 50, '{
    "my_workspace": {"view": true, "edit": true},
    "management": {"view": true, "edit": true, "roster": true, "schedule": true, "time_off": true, "recruiting": false, "skills": true},
    "med_ops": {"view": true, "edit": false},
    "marketing": {"view": true, "edit": false},
    "gdu": {"view": true, "edit": false},
    "admin_ops": {"view": false, "edit": false}
  }', '🏢', 'blue'),
  ('marketing_admin', 'Marketing Admin', 'Growth focus - full control over Marketing and GDU. Cannot access Management or Admin Ops', 40, '{
    "my_workspace": {"view": true, "edit": true},
    "management": {"view": false, "edit": false},
    "med_ops": {"view": true, "edit": false},
    "marketing": {"view": true, "edit": true, "events": true, "leads": true, "inventory": true},
    "gdu": {"view": true, "edit": true, "visitors": true, "events": true},
    "admin_ops": {"view": false, "edit": false}
  }', '📣', 'purple'),
  ('user', 'Team Member', 'Standard access - My Workspace and view-only for company resources. No management or admin access', 10, '{
    "my_workspace": {"view": true, "edit": true},
    "management": {"view": false, "edit": false},
    "med_ops": {"view": true, "edit": false},
    "marketing": {"view": true, "edit": false},
    "gdu": {"view": true, "edit": false},
    "admin_ops": {"view": false, "edit": false}
  }', '👤', 'slate')
ON CONFLICT (role_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  permissions = EXCLUDED.permissions,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  updated_at = NOW();

-- Enable RLS
ALTER TABLE public.role_definitions ENABLE ROW LEVEL SECURITY;

-- Everyone can view role definitions
DROP POLICY IF EXISTS "role_definitions_view" ON public.role_definitions;
CREATE POLICY "role_definitions_view" ON public.role_definitions
  FOR SELECT USING (true);

-- Only admins can modify role definitions
DROP POLICY IF EXISTS "role_definitions_admin" ON public.role_definitions;
CREATE POLICY "role_definitions_admin" ON public.role_definitions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

GRANT SELECT ON public.role_definitions TO authenticated;
GRANT ALL ON public.role_definitions TO authenticated;

-- =====================================================
-- 3. HELPER FUNCTIONS FOR ROLE CHECKING
-- =====================================================

-- Check if user has at least office_admin or higher privileges
CREATE OR REPLACE FUNCTION public.has_management_access()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin', 'office_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has marketing_admin or admin privileges
CREATE OR REPLACE FUNCTION public.has_marketing_access()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin', 'marketing_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has GDU access (marketing_admin or admin)
CREATE OR REPLACE FUNCTION public.has_gdu_access()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin', 'marketing_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has admin_ops access (admin only)
CREATE OR REPLACE FUNCTION public.has_admin_ops_access()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();
  
  RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. SET ALL USERS TO 'user' ROLE EXCEPT ADMINS
-- Keep Marc (marc.h.mercury@gmail.com) as admin
-- =====================================================

-- First, set everyone to 'user'
UPDATE public.profiles 
SET role = 'user', updated_at = NOW()
WHERE role != 'admin';

-- Ensure Marc stays as admin (by email pattern)
UPDATE public.profiles 
SET role = 'admin', updated_at = NOW()
WHERE email ILIKE '%marc%mercury%' OR email ILIKE 'marc.h.mercury%';

-- =====================================================
-- 5. CREATE VIEW FOR USER ROLE INFO
-- =====================================================

CREATE OR REPLACE VIEW public.user_role_info AS
SELECT 
  p.id,
  p.auth_user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.role,
  rd.display_name AS role_display_name,
  rd.description AS role_description,
  rd.tier AS role_tier,
  rd.permissions AS role_permissions,
  rd.icon AS role_icon,
  rd.color AS role_color
FROM public.profiles p
LEFT JOIN public.role_definitions rd ON rd.role_key = p.role;

GRANT SELECT ON public.user_role_info TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.role_definitions IS 'Defines available user roles and their permissions';
COMMENT ON FUNCTION public.has_management_access IS 'Returns true if user can access Management section (admin, office_admin)';
COMMENT ON FUNCTION public.has_marketing_access IS 'Returns true if user can access Marketing edit features (admin, marketing_admin)';
COMMENT ON FUNCTION public.has_gdu_access IS 'Returns true if user can access GDU section (admin, marketing_admin)';
COMMENT ON FUNCTION public.has_admin_ops_access IS 'Returns true if user can access Admin Ops section (admin only)';
