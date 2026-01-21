-- =====================================================
-- Migration: 095_page_access_control.sql
-- Description: Create page-level access control system
-- This allows dynamic configuration of which roles can access which pages
-- =====================================================

-- =====================================================
-- 1. CREATE PAGE DEFINITIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.page_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  section TEXT NOT NULL,
  icon TEXT DEFAULT 'mdi-file',
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_page_definitions_path ON public.page_definitions(path);
CREATE INDEX IF NOT EXISTS idx_page_definitions_section ON public.page_definitions(section);

-- =====================================================
-- 2. CREATE PAGE ACCESS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.page_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.page_definitions(id) ON DELETE CASCADE,
  role_key TEXT NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'none' CHECK (access_level IN ('full', 'view', 'none')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(page_id, role_key)
);

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_page_access_role ON public.page_access(role_key);
CREATE INDEX IF NOT EXISTS idx_page_access_page ON public.page_access(page_id);

-- =====================================================
-- 3. ENABLE RLS
-- =====================================================

ALTER TABLE public.page_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_access ENABLE ROW LEVEL SECURITY;

-- Everyone can view page definitions
CREATE POLICY "page_definitions_select" ON public.page_definitions
  FOR SELECT TO authenticated USING (true);

-- Only super_admin can modify page definitions
CREATE POLICY "page_definitions_admin" ON public.page_definitions
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'super_admin'
    )
  );

-- Everyone can view page access
CREATE POLICY "page_access_select" ON public.page_access
  FOR SELECT TO authenticated USING (true);

-- Only super_admin can modify page access
CREATE POLICY "page_access_admin" ON public.page_access
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'super_admin'
    )
  );

GRANT SELECT ON public.page_definitions TO authenticated;
GRANT ALL ON public.page_definitions TO authenticated;
GRANT SELECT ON public.page_access TO authenticated;
GRANT ALL ON public.page_access TO authenticated;

-- =====================================================
-- 4. INSERT DEFAULT PAGE DEFINITIONS
-- =====================================================

INSERT INTO public.page_definitions (path, name, section, icon, sort_order) VALUES
  -- Dashboard & Profile
  ('/', 'Dashboard', 'Dashboard & Profile', 'mdi-view-dashboard', 1),
  ('/profile', 'My Profile', 'Dashboard & Profile', 'mdi-account-card', 2),
  ('/development', 'My Growth', 'Dashboard & Profile', 'mdi-chart-line', 3),
  ('/people/my-skills', 'My Skills', 'Dashboard & Profile', 'mdi-lightbulb', 4),
  
  -- Contact List
  ('/roster', 'All Staff (Roster)', 'Contact List', 'mdi-badge-account-horizontal', 10),
  ('/people/skill-stats', 'Skill Stats', 'Contact List', 'mdi-chart-bar', 11),
  
  -- Operations
  ('/schedule', 'Schedule', 'Operations', 'mdi-calendar', 20),
  ('/schedule/builder', 'Schedule Builder', 'Operations', 'mdi-view-dashboard-edit', 21),
  ('/time-off', 'Time Off', 'Operations', 'mdi-calendar-remove', 22),
  ('/training', 'Training', 'Operations', 'mdi-school', 23),
  
  -- Recruiting
  ('/recruiting', 'Pipeline', 'Recruiting', 'mdi-view-dashboard', 30),
  ('/recruiting/candidates', 'Candidates', 'Recruiting', 'mdi-account-multiple-plus', 31),
  ('/recruiting/onboarding', 'Onboarding', 'Recruiting', 'mdi-clipboard-check-multiple', 32),
  
  -- Marketing
  ('/marketing/command-center', 'Command Center', 'Marketing', 'mdi-view-dashboard', 40),
  ('/marketing/calendar', 'Calendar', 'Marketing', 'mdi-calendar-month', 41),
  ('/growth/events', 'Events', 'Marketing', 'mdi-calendar-star', 42),
  ('/marketing/partners', 'Partners', 'Marketing', 'mdi-handshake', 43),
  ('/marketing/influencers', 'Influencers', 'Marketing', 'mdi-account-star-outline', 44),
  ('/marketing/inventory', 'Inventory', 'Marketing', 'mdi-package-variant', 45),
  ('/marketing/resources', 'Resources', 'Marketing', 'mdi-folder-multiple', 46),
  
  -- CRM & Analytics
  ('/marketing/ezyvet-crm', 'EzyVet CRM', 'CRM & Analytics', 'mdi-database-import', 50),
  ('/marketing/ezyvet-analytics', 'EzyVet Analytics', 'CRM & Analytics', 'mdi-chart-areaspline', 51),
  ('/growth/leads', 'Event Leads', 'CRM & Analytics', 'mdi-account-star', 52),
  ('/marketing/partnerships', 'Referral CRM', 'CRM & Analytics', 'mdi-handshake-outline', 53),
  
  -- GDU (Education)
  ('/gdu', 'GDU Dashboard', 'GDU (Education)', 'mdi-view-dashboard', 60),
  ('/gdu/students', 'Student Contacts', 'GDU (Education)', 'mdi-account-school', 61),
  ('/gdu/visitors', 'CE Course Contacts', 'GDU (Education)', 'mdi-certificate', 62),
  ('/gdu/events', 'CE Events', 'GDU (Education)', 'mdi-calendar-star', 63),
  
  -- Admin & Settings
  ('/admin/skills-management', 'Skill Library', 'Admin & Settings', 'mdi-bookshelf', 70),
  ('/settings', 'Settings', 'Admin & Settings', 'mdi-cog', 71),
  ('/admin/users', 'User Management', 'Admin & Settings', 'mdi-account-cog', 72),
  ('/admin/global-settings', 'Global Settings', 'Admin & Settings', 'mdi-tune', 73)
ON CONFLICT (path) DO NOTHING;

-- =====================================================
-- 5. INSERT DEFAULT PAGE ACCESS FOR ALL ROLES
-- =====================================================

-- Helper to insert access for a role to all pages
DO $$
DECLARE
  v_page RECORD;
  v_roles TEXT[] := ARRAY['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'marketing_admin', 'user'];
  v_role TEXT;
  v_access TEXT;
BEGIN
  -- Loop through each page
  FOR v_page IN SELECT id, path, section FROM public.page_definitions LOOP
    -- Loop through each role
    FOREACH v_role IN ARRAY v_roles LOOP
      -- Determine access based on role and section
      v_access := CASE
        -- Super Admin: Full access to everything
        WHEN v_role = 'super_admin' THEN 'full'
        
        -- Admin: Full access to everything
        WHEN v_role = 'admin' THEN 'full'
        
        -- Manager: Full access to most things
        WHEN v_role = 'manager' THEN 
          CASE 
            WHEN v_page.section = 'Admin & Settings' THEN 'none'
            ELSE 'full'
          END
        
        -- HR Admin
        WHEN v_role = 'hr_admin' THEN 
          CASE 
            WHEN v_page.section IN ('Dashboard & Profile', 'Contact List') THEN 'full'
            WHEN v_page.section = 'Operations' AND v_page.path = '/schedule/builder' THEN 'none'
            WHEN v_page.section = 'Operations' THEN 
              CASE WHEN v_page.path IN ('/schedule', '/time-off') THEN 'view' ELSE 'full' END
            WHEN v_page.section = 'Recruiting' THEN 'full'
            WHEN v_page.section IN ('Marketing', 'CRM & Analytics') THEN 'none'
            WHEN v_page.section = 'GDU (Education)' THEN 'full'
            WHEN v_page.section = 'Admin & Settings' THEN 'none'
            ELSE 'none'
          END
        
        -- Office Admin
        WHEN v_role = 'office_admin' THEN 
          CASE 
            WHEN v_page.section IN ('Dashboard & Profile', 'Contact List', 'Operations', 'Recruiting') THEN 'full'
            WHEN v_page.section IN ('Marketing', 'CRM & Analytics', 'GDU (Education)', 'Admin & Settings') THEN 'none'
            ELSE 'none'
          END
        
        -- Marketing Admin
        WHEN v_role = 'marketing_admin' THEN 
          CASE 
            WHEN v_page.section = 'Dashboard & Profile' THEN 'full'
            WHEN v_page.section = 'Contact List' AND v_page.path = '/roster' THEN 'view'
            WHEN v_page.section = 'Operations' AND v_page.path IN ('/schedule', '/time-off') THEN 'view'
            WHEN v_page.section = 'Operations' AND v_page.path = '/training' THEN 'full'
            WHEN v_page.section = 'Recruiting' AND v_page.path IN ('/recruiting', '/recruiting/candidates') THEN 'view'
            WHEN v_page.section IN ('Marketing', 'CRM & Analytics', 'GDU (Education)') THEN 'full'
            WHEN v_page.section = 'Admin & Settings' THEN 'none'
            ELSE 'none'
          END
        
        -- User
        WHEN v_role = 'user' THEN 
          CASE 
            WHEN v_page.section = 'Dashboard & Profile' THEN 'full'
            WHEN v_page.path = '/roster' THEN 'view'
            WHEN v_page.path IN ('/schedule', '/time-off', '/training') THEN 'view'
            ELSE 'none'
          END
        
        ELSE 'none'
      END;
      
      -- Insert the access record
      INSERT INTO public.page_access (page_id, role_key, access_level)
      VALUES (v_page.id, v_role, v_access)
      ON CONFLICT (page_id, role_key) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- =====================================================
-- 6. UPDATE role_definitions to add super_admin and other missing roles
-- =====================================================

-- First update the constraint
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'marketing_admin', 'user'));

-- Add missing roles to role_definitions
INSERT INTO public.role_definitions (role_key, display_name, description, tier, permissions, icon, color) 
VALUES 
  ('super_admin', 'Super Admin', 'Full system access with user management capabilities. Can modify roles and system configuration.', 200, '{
    "my_workspace": {"view": true, "edit": true},
    "management": {"view": true, "edit": true, "roster": true, "schedule": true, "time_off": true, "recruiting": true, "skills": true},
    "med_ops": {"view": true, "edit": true},
    "marketing": {"view": true, "edit": true, "events": true, "leads": true, "inventory": true},
    "gdu": {"view": true, "edit": true, "visitors": true, "events": true},
    "admin_ops": {"view": true, "edit": true, "settings": true, "payroll": true, "master_roster": true, "user_management": true}
  }', 'mdi-shield-crown', 'red'),
  ('manager', 'Manager', 'Team manager with broad access to HR, recruiting, marketing, and operations. Cannot access admin settings.', 80, '{
    "my_workspace": {"view": true, "edit": true},
    "management": {"view": true, "edit": true, "roster": true, "schedule": true, "time_off": true, "recruiting": true, "skills": true},
    "med_ops": {"view": true, "edit": true},
    "marketing": {"view": true, "edit": true, "events": true, "leads": true, "inventory": true},
    "gdu": {"view": true, "edit": true, "visitors": true, "events": true},
    "admin_ops": {"view": false, "edit": false}
  }', 'mdi-account-tie', 'purple'),
  ('hr_admin', 'HR Admin', 'HR functions including recruiting, onboarding, and employee management. Limited marketing access.', 60, '{
    "my_workspace": {"view": true, "edit": true},
    "management": {"view": true, "edit": true, "roster": true, "schedule": false, "time_off": true, "recruiting": true, "skills": true},
    "med_ops": {"view": true, "edit": false},
    "marketing": {"view": false, "edit": false},
    "gdu": {"view": true, "edit": true, "visitors": true, "events": true},
    "admin_ops": {"view": false, "edit": false}
  }', 'mdi-account-group', 'cyan')
ON CONFLICT (role_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  permissions = EXCLUDED.permissions,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  updated_at = NOW();

-- =====================================================
-- 7. CREATE HELPER FUNCTION TO CHECK PAGE ACCESS
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_page_access(p_path TEXT, p_role TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
  v_access TEXT;
BEGIN
  -- Get role from parameter or current user
  IF p_role IS NOT NULL THEN
    v_role := p_role;
  ELSE
    SELECT role INTO v_role FROM public.profiles WHERE auth_user_id = auth.uid();
  END IF;
  
  -- Super admin always has full access
  IF v_role = 'super_admin' THEN
    RETURN 'full';
  END IF;
  
  -- Look up access level
  SELECT pa.access_level INTO v_access
  FROM public.page_access pa
  JOIN public.page_definitions pd ON pd.id = pa.page_id
  WHERE pd.path = p_path AND pa.role_key = v_role;
  
  RETURN COALESCE(v_access, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. CREATE VIEW FOR EASY ACCESS MATRIX QUERYING
-- =====================================================

CREATE OR REPLACE VIEW public.access_matrix_view AS
SELECT 
  pd.id AS page_id,
  pd.path,
  pd.name AS page_name,
  pd.section,
  pd.icon AS page_icon,
  pd.sort_order,
  pa.role_key,
  pa.access_level,
  rd.display_name AS role_display_name,
  rd.tier AS role_tier,
  rd.icon AS role_icon,
  rd.color AS role_color
FROM public.page_definitions pd
LEFT JOIN public.page_access pa ON pa.page_id = pd.id
LEFT JOIN public.role_definitions rd ON rd.role_key = pa.role_key
WHERE pd.is_active = true
ORDER BY pd.sort_order, rd.tier DESC;

GRANT SELECT ON public.access_matrix_view TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.page_definitions IS 'Defines all navigable pages in the application';
COMMENT ON TABLE public.page_access IS 'Stores role-based access levels for each page';
COMMENT ON FUNCTION public.check_page_access IS 'Check if a role has access to a specific page path';
COMMENT ON VIEW public.access_matrix_view IS 'Denormalized view of the access matrix for easy querying';
