-- =====================================================
-- Migration: 096_update_page_definitions.sql
-- Description: Update page definitions to match actual navigation
-- This includes ALL pages from the sidebar navigation
-- =====================================================

-- First, deactivate old pages that no longer exist
UPDATE public.page_definitions SET is_active = false WHERE path IN (
  '/schedule',
  '/training',
  '/recruiting/candidates',
  '/recruiting/onboarding',
  '/admin/global-settings'
);

-- Delete old page access records for deactivated pages
DELETE FROM public.page_access WHERE page_id IN (
  SELECT id FROM public.page_definitions WHERE is_active = false
);

-- Delete the deactivated pages
DELETE FROM public.page_definitions WHERE is_active = false;

-- =====================================================
-- INSERT/UPDATE ALL PAGE DEFINITIONS
-- =====================================================

-- My Workspace Section
INSERT INTO public.page_definitions (path, name, section, icon, sort_order, is_active) VALUES
  ('/', 'Dashboard', 'My Workspace', 'mdi-view-dashboard', 1, true),
  ('/activity', 'Activity Hub', 'My Workspace', 'mdi-bell', 2, true),
  ('/marketplace', 'Marketplace', 'My Workspace', 'mdi-bone', 3, true),
  ('/profile', 'My Profile', 'My Workspace', 'mdi-account-card', 4, true),
  ('/my-schedule', 'My Schedule', 'My Workspace', 'mdi-calendar-account', 5, true),
  ('/people/my-skills', 'My Skills', 'My Workspace', 'mdi-star', 6, true),
  ('/development', 'My Growth', 'My Workspace', 'mdi-chart-line', 7, true),
  ('/academy/my-training', 'My Training', 'My Workspace', 'mdi-school', 8, true)
ON CONFLICT (path) DO UPDATE SET
  name = EXCLUDED.name,
  section = EXCLUDED.section,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = NOW();

-- Management Section
INSERT INTO public.page_definitions (path, name, section, icon, sort_order, is_active) VALUES
  ('/roster', 'Contact List', 'Management', 'mdi-badge-account-horizontal', 10, true),
  ('/schedule/builder', 'Team Schedule', 'Management', 'mdi-calendar-edit', 11, true),
  ('/time-off', 'Time Off Approvals', 'Management', 'mdi-calendar-check', 12, true),
  ('/recruiting', 'Recruiting Pipeline', 'Management', 'mdi-target', 13, true),
  ('/people/skill-stats', 'Skill Stats', 'Management', 'mdi-chart-bar', 14, true)
ON CONFLICT (path) DO UPDATE SET
  name = EXCLUDED.name,
  section = EXCLUDED.section,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = NOW();

-- Med Ops Section
INSERT INTO public.page_definitions (path, name, section, icon, sort_order, is_active) VALUES
  ('/med-ops/calculators', 'Drug Calculators', 'Med Ops', 'mdi-pill', 20, true),
  ('/med-ops/boards', 'Medical Boards', 'Med Ops', 'mdi-clipboard-list', 21, true),
  ('/med-ops/partners', 'Med Ops Partners', 'Med Ops', 'mdi-factory', 22, true),
  ('/med-ops/facilities', 'Facilities Resources', 'Med Ops', 'mdi-wrench', 23, true),
  ('/med-ops/wiki', 'Wiki', 'Med Ops', 'mdi-book-open-variant', 24, true)
ON CONFLICT (path) DO UPDATE SET
  name = EXCLUDED.name,
  section = EXCLUDED.section,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = NOW();

-- Marketing Section
INSERT INTO public.page_definitions (path, name, section, icon, sort_order, is_active) VALUES
  ('/marketing/command-center', 'Command Center', 'Marketing', 'mdi-view-dashboard', 30, true),
  ('/marketing/calendar', 'Calendar', 'Marketing', 'mdi-calendar-month', 31, true),
  ('/growth/events', 'Events', 'Marketing', 'mdi-calendar-star', 32, true),
  ('/marketing/partners', 'Partners', 'Marketing', 'mdi-handshake', 33, true),
  ('/marketing/influencers', 'Influencers', 'Marketing', 'mdi-account-star-outline', 34, true),
  ('/marketing/inventory', 'Inventory', 'Marketing', 'mdi-package-variant', 35, true),
  ('/marketing/resources', 'Resources', 'Marketing', 'mdi-folder-multiple', 36, true)
ON CONFLICT (path) DO UPDATE SET
  name = EXCLUDED.name,
  section = EXCLUDED.section,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = NOW();

-- CRM & Analytics Section
INSERT INTO public.page_definitions (path, name, section, icon, sort_order, is_active) VALUES
  ('/marketing/ezyvet-crm', 'EzyVet CRM', 'CRM & Analytics', 'mdi-database-import', 40, true),
  ('/marketing/ezyvet-analytics', 'EzyVet Analytics', 'CRM & Analytics', 'mdi-chart-areaspline', 41, true),
  ('/growth/leads', 'Event Leads', 'CRM & Analytics', 'mdi-fire', 42, true),
  ('/marketing/partnerships', 'Referral CRM', 'CRM & Analytics', 'mdi-handshake-outline', 43, true),
  ('/marketing/list-hygiene', 'List Hygiene', 'CRM & Analytics', 'mdi-broom', 44, true)
ON CONFLICT (path) DO UPDATE SET
  name = EXCLUDED.name,
  section = EXCLUDED.section,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = NOW();

-- GDU Section
INSERT INTO public.page_definitions (path, name, section, icon, sort_order, is_active) VALUES
  ('/gdu', 'GDU Dash', 'GDU', 'mdi-home', 50, true),
  ('/gdu/students', 'Student CRM', 'GDU', 'mdi-account-school', 51, true),
  ('/gdu/visitors', 'Visitor CRM', 'GDU', 'mdi-account-group', 52, true),
  ('/gdu/events', 'CE Events', 'GDU', 'mdi-calendar-star', 53, true)
ON CONFLICT (path) DO UPDATE SET
  name = EXCLUDED.name,
  section = EXCLUDED.section,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = NOW();

-- Admin Ops Section
INSERT INTO public.page_definitions (path, name, section, icon, sort_order, is_active) VALUES
  ('/settings', 'Global Settings', 'Admin Ops', 'mdi-earth', 60, true),
  ('/admin/users', 'User Management', 'Admin Ops', 'mdi-account-cog', 61, true),
  ('/admin/email-templates', 'Email Templates', 'Admin Ops', 'mdi-email', 62, true),
  ('/admin/skills-management', 'Skills Management', 'Admin Ops', 'mdi-bookshelf', 63, true),
  ('/academy/course-manager', 'Course Manager', 'Admin Ops', 'mdi-school', 64, true),
  ('/export-payroll', 'Export Payroll', 'Admin Ops', 'mdi-cash', 65, true),
  ('/admin/master-roster', 'Master Roster', 'Admin Ops', 'mdi-clipboard-list', 66, true),
  ('/admin/system-health', 'System Health', 'Admin Ops', 'mdi-heart-pulse', 67, true)
ON CONFLICT (path) DO UPDATE SET
  name = EXCLUDED.name,
  section = EXCLUDED.section,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = NOW();

-- =====================================================
-- UPDATE PAGE ACCESS FOR ALL ROLES
-- =====================================================

-- Delete existing access records for all pages (we'll re-create them)
DELETE FROM public.page_access;

-- Insert access for all pages and roles
DO $$
DECLARE
  v_page RECORD;
  v_roles TEXT[] := ARRAY['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'marketing_admin', 'user'];
  v_role TEXT;
  v_access TEXT;
BEGIN
  -- Loop through each page
  FOR v_page IN SELECT id, path, section, name FROM public.page_definitions WHERE is_active = true LOOP
    -- Loop through each role
    FOREACH v_role IN ARRAY v_roles LOOP
      -- Determine access based on role and page
      v_access := CASE
        -- Super Admin: Full access to everything
        WHEN v_role = 'super_admin' THEN 'full'
        
        -- Admin: Full access to everything except User Management
        WHEN v_role = 'admin' THEN 
          CASE 
            WHEN v_page.path = '/admin/users' THEN 'none'
            ELSE 'full'
          END
        
        -- Manager: Full access except Admin Ops and some CRM
        WHEN v_role = 'manager' THEN 
          CASE 
            WHEN v_page.section = 'Admin Ops' THEN 'none'
            WHEN v_page.path = '/marketplace' THEN 'none'
            ELSE 'full'
          END
        
        -- HR Admin: Full My Workspace, Management (limited), Med Ops view, GDU full
        WHEN v_role = 'hr_admin' THEN 
          CASE 
            WHEN v_page.section = 'My Workspace' AND v_page.path != '/marketplace' THEN 'full'
            WHEN v_page.path = '/marketplace' THEN 'none'
            WHEN v_page.section = 'Management' THEN 
              CASE 
                WHEN v_page.path = '/schedule/builder' THEN 'none'
                ELSE 'full'
              END
            WHEN v_page.section = 'Med Ops' THEN 'full'
            WHEN v_page.section IN ('Marketing', 'CRM & Analytics') THEN 'none'
            WHEN v_page.section = 'GDU' THEN 'full'
            WHEN v_page.section = 'Admin Ops' THEN 'none'
            ELSE 'none'
          END
        
        -- Office Admin: Full My Workspace, Management, Med Ops; limited Marketing
        WHEN v_role = 'office_admin' THEN 
          CASE 
            WHEN v_page.section = 'My Workspace' AND v_page.path != '/marketplace' THEN 'full'
            WHEN v_page.path = '/marketplace' THEN 'none'
            WHEN v_page.section = 'Management' THEN 'full'
            WHEN v_page.section = 'Med Ops' THEN 'full'
            WHEN v_page.path IN ('/marketing/calendar', '/marketing/resources') THEN 'view'
            WHEN v_page.section IN ('Marketing', 'CRM & Analytics', 'GDU', 'Admin Ops') THEN 'none'
            ELSE 'none'
          END
        
        -- Marketing Admin: Full Marketing, CRM, GDU; limited Management
        WHEN v_role = 'marketing_admin' THEN 
          CASE 
            WHEN v_page.section = 'My Workspace' AND v_page.path != '/marketplace' THEN 'full'
            WHEN v_page.path = '/marketplace' THEN 'none'
            WHEN v_page.path = '/roster' THEN 'view'
            WHEN v_page.path = '/time-off' THEN 'view'
            WHEN v_page.path = '/recruiting' THEN 'view'
            WHEN v_page.section = 'Management' THEN 'none'
            WHEN v_page.section = 'Med Ops' THEN 'full'
            WHEN v_page.section IN ('Marketing', 'CRM & Analytics', 'GDU') THEN 'full'
            WHEN v_page.section = 'Admin Ops' THEN 'none'
            ELSE 'none'
          END
        
        -- User: Only personal pages, view roster/calendar
        WHEN v_role = 'user' THEN 
          CASE 
            WHEN v_page.section = 'My Workspace' AND v_page.path != '/marketplace' THEN 'full'
            WHEN v_page.path = '/marketplace' THEN 'none'
            WHEN v_page.path = '/roster' THEN 'view'
            WHEN v_page.path = '/time-off' THEN 'view'
            WHEN v_page.section = 'Med Ops' THEN 'full'
            WHEN v_page.path IN ('/marketing/calendar', '/marketing/resources') THEN 'view'
            ELSE 'none'
          END
        
        ELSE 'none'
      END;
      
      -- Insert the access record
      INSERT INTO public.page_access (page_id, role_key, access_level)
      VALUES (v_page.id, v_role, v_access)
      ON CONFLICT (page_id, role_key) DO UPDATE SET 
        access_level = EXCLUDED.access_level,
        updated_at = NOW();
    END LOOP;
  END LOOP;
END $$;

-- =====================================================
-- UPDATE COMPOSABLE SECTION ICONS
-- =====================================================

COMMENT ON TABLE public.page_definitions IS 'Defines all navigable pages with sections: My Workspace, Management, Med Ops, Marketing, CRM & Analytics, GDU, Admin Ops';
