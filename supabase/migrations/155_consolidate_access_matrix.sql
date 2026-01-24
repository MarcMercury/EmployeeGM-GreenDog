-- =====================================================
-- Migration: 155_consolidate_access_matrix.sql
-- Description: Fix access matrix inconsistencies between migrations 143 and 144
-- This establishes a single, authoritative source of truth for role-based access
-- =====================================================

-- =====================================================
-- STEP 1: VERIFY role_definitions are correct
-- =====================================================

-- Ensure all roles are properly defined with correct descriptions
DELETE FROM public.role_definitions;

INSERT INTO public.role_definitions (role_key, display_name, description, tier, permissions, icon, color) VALUES 
  ('super_admin', 'Super Admin', 'Full system access. Can manage users, roles, and system configuration.', 200, '{"all": true}', 'mdi-shield-crown', 'red'),
  ('admin', 'Admin', 'Full system access. Cannot create/delete users, but can manage roles and settings.', 100, '{"admin_ops": true, "user_management": false, "all_pages": true}', 'mdi-shield-account', 'amber'),
  ('manager', 'Manager', 'Can access HR, Recruiting, Marketing, Operations, and GDU. No admin settings.', 80, '{"hr": true, "recruiting": true, "marketing": true, "operations": true, "gdu": true}', 'mdi-account-tie', 'purple'),
  ('hr_admin', 'HR Admin', 'Can access HR, Recruiting, Schedules, Education, and GDU. Limited marketing.', 60, '{"hr": true, "recruiting": true, "schedules": true, "education": true, "gdu": true}', 'mdi-account-group', 'cyan'),
  ('office_admin', 'Office Admin', 'Can access Roster, Schedules, Time Off, Skills, Med Ops. Limited marketing view.', 50, '{"roster": true, "schedules": true, "time_off": true, "skills": true, "med_ops": true}', 'mdi-office-building', 'blue'),
  ('marketing_admin', 'Marketing Admin', 'Can access Marketing, CRM, GDU, Med Ops. Limited Management view.', 40, '{"marketing": true, "crm": true, "gdu": true, "med_ops": true}', 'mdi-bullhorn', 'purple'),
  ('user', 'User', 'Can access personal workspace, view roster/schedule, limited med ops.', 10, '{"personal": true, "view_only": true}', 'mdi-account', 'slate')
ON CONFLICT (role_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  permissions = EXCLUDED.permissions,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  updated_at = NOW();

-- =====================================================
-- STEP 2: VERIFY page_definitions are complete
-- =====================================================

-- Ensure sections are consistent: My Workspace, Management, Med Ops, Marketing, CRM & Analytics, GDU, Admin Ops

-- =====================================================
-- STEP 3: REBUILD ACCESS MATRIX (DELETE and recreate)
-- =====================================================

DELETE FROM public.page_access;

-- Recreate access matrix with consistent, documented logic
DO $$
DECLARE
  v_page RECORD;
  v_roles TEXT[] := ARRAY['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'marketing_admin', 'user'];
  v_role TEXT;
  v_access TEXT;
BEGIN
  -- Loop through each active page
  FOR v_page IN SELECT id, path, section, name FROM public.page_definitions WHERE is_active = true ORDER BY section, sort_order LOOP
    -- Loop through each role
    FOREACH v_role IN ARRAY v_roles LOOP
      -- Determine access based on role and page
      v_access := CASE
        
        -- ========================================
        -- SUPER ADMIN: Full access to everything
        -- ========================================
        WHEN v_role = 'super_admin' THEN 'full'
        
        -- ========================================
        -- ADMIN: Full access except User Management
        -- Note: Only super_admin can manage user access matrix
        -- ========================================
        WHEN v_role = 'admin' THEN 
          CASE 
            WHEN v_page.path = '/admin/users' THEN 'view'
            ELSE 'full'
          END
        
        -- ========================================
        -- MANAGER: Full access except Admin Ops
        -- Managers can do HR, Marketing, Operations, but not system config
        -- ========================================
        WHEN v_role = 'manager' THEN 
          CASE 
            WHEN v_page.section = 'Admin Ops' THEN 'none'
            WHEN v_page.path = '/marketplace' THEN 'none'
            ELSE 'full'
          END
        
        -- ========================================
        -- HR ADMIN: HR, Recruiting, Schedules, Education, GDU
        -- Limited access: Schedule Builder (none), Med Ops (view), Marketing (none)
        -- ========================================
        WHEN v_role = 'hr_admin' THEN 
          CASE 
            -- My Workspace: Full access except marketplace
            WHEN v_page.section = 'My Workspace' THEN 
              CASE WHEN v_page.path = '/marketplace' THEN 'none' ELSE 'full' END
            
            -- Management: Full except Schedule Builder
            WHEN v_page.section = 'Management' THEN 
              CASE WHEN v_page.path = '/schedule/builder' THEN 'none' ELSE 'full' END
            
            -- Med Ops: Full access
            WHEN v_page.section = 'Med Ops' THEN 'full'
            
            -- GDU: Full access (education)
            WHEN v_page.section = 'GDU' THEN 'full'
            
            -- Marketing & CRM: No access
            WHEN v_page.section IN ('Marketing', 'CRM & Analytics') THEN 'none'
            
            -- Admin Ops: No access
            WHEN v_page.section = 'Admin Ops' THEN 'none'
            
            ELSE 'none'
          END
        
        -- ========================================
        -- OFFICE ADMIN: Roster, Schedules, Time Off, Skills, Med Ops
        -- No access: Admin Ops, Marketing (except calendar/resources view)
        -- ========================================
        WHEN v_role = 'office_admin' THEN 
          CASE 
            -- My Workspace: Full except marketplace
            WHEN v_page.section = 'My Workspace' THEN 
              CASE WHEN v_page.path = '/marketplace' THEN 'none' ELSE 'full' END
            
            -- Management: Full access
            WHEN v_page.section = 'Management' THEN 'full'
            
            -- Med Ops: Full access
            WHEN v_page.section = 'Med Ops' THEN 'full'
            
            -- Marketing: Limited view access only
            WHEN v_page.section = 'Marketing' THEN 
              CASE WHEN v_page.path IN ('/marketing/calendar', '/marketing/resources') THEN 'view' ELSE 'none' END
            
            -- CRM, GDU, Admin Ops: No access
            WHEN v_page.section IN ('CRM & Analytics', 'GDU', 'Admin Ops') THEN 'none'
            
            ELSE 'none'
          END
        
        -- ========================================
        -- MARKETING ADMIN: Marketing, CRM, GDU, Med Ops, Limited Management
        -- Limited access: Roster (view), Time Off (view), Schedule (view)
        -- ========================================
        WHEN v_role = 'marketing_admin' THEN 
          CASE 
            -- My Workspace: Full except marketplace
            WHEN v_page.section = 'My Workspace' THEN 
              CASE WHEN v_page.path = '/marketplace' THEN 'none' ELSE 'full' END
            
            -- Management: Limited view only
            WHEN v_page.path IN ('/roster', '/time-off', '/schedule/builder') THEN 'view'
            WHEN v_page.section = 'Management' THEN 'none'
            
            -- Med Ops: Full access
            WHEN v_page.section = 'Med Ops' THEN 'full'
            
            -- Marketing, CRM, GDU: Full access
            WHEN v_page.section IN ('Marketing', 'CRM & Analytics', 'GDU') THEN 'full'
            
            -- Admin Ops: No access
            WHEN v_page.section = 'Admin Ops' THEN 'none'
            
            ELSE 'none'
          END
        
        -- ========================================
        -- USER: Personal workspace, limited view access
        -- Can see: Dashboard, Profile, Schedule, Skills
        -- Can view: Roster, Calendar, Resources
        -- Can access: Med Ops, Training
        -- ========================================
        WHEN v_role = 'user' THEN 
          CASE 
            -- My Workspace: Full access except marketplace
            WHEN v_page.section = 'My Workspace' THEN 
              CASE WHEN v_page.path = '/marketplace' THEN 'none' ELSE 'full' END
            
            -- Management: Limited view only
            WHEN v_page.path IN ('/roster', '/schedule', '/time-off') THEN 'view'
            WHEN v_page.section = 'Management' THEN 'none'
            
            -- Med Ops: Full access
            WHEN v_page.section = 'Med Ops' THEN 'full'
            
            -- Marketing: Limited view only
            WHEN v_page.path IN ('/marketing/calendar', '/marketing/resources') THEN 'view'
            WHEN v_page.section = 'Marketing' THEN 'none'
            
            -- CRM, GDU, Admin Ops: No access
            WHEN v_page.section IN ('CRM & Analytics', 'GDU', 'Admin Ops') THEN 'none'
            
            ELSE 'none'
          END
        
        ELSE 'none'
      END;
      
      -- Insert the access record
      INSERT INTO public.page_access (page_id, role_key, access_level)
      VALUES (v_page.id, v_role, v_access);
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Access matrix rebuilt successfully';
END $$;

-- =====================================================
-- STEP 4: VERIFY DATA INTEGRITY
-- =====================================================

-- Check for any users with invalid roles
DO $$
DECLARE
  v_invalid_count INT;
BEGIN
  SELECT COUNT(*) INTO v_invalid_count
  FROM public.profiles
  WHERE role NOT IN ('super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'marketing_admin', 'user')
  AND role IS NOT NULL;
  
  IF v_invalid_count > 0 THEN
    RAISE WARNING 'Found % users with invalid roles. Review profiles table.', v_invalid_count;
  ELSE
    RAISE NOTICE 'All user roles are valid';
  END IF;
END $$;

-- =====================================================
-- STEP 5: ADD DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.page_access IS 'Role-based page access control. Defines which pages each role can access and their permission level (full/view/none). Last updated: 2026-01-24 - Migration 155';

-- =====================================================
-- STEP 6: CREATE VERIFICATION VIEW
-- =====================================================

DROP VIEW IF EXISTS public.access_matrix_summary;

CREATE VIEW public.access_matrix_summary AS
SELECT 
  rd.role_key,
  rd.display_name,
  rd.tier,
  COUNT(CASE WHEN pa.access_level = 'full' THEN 1 END) as full_access_pages,
  COUNT(CASE WHEN pa.access_level = 'view' THEN 1 END) as view_access_pages,
  COUNT(CASE WHEN pa.access_level = 'none' THEN 1 END) as no_access_pages,
  COUNT(DISTINCT pa.page_id) as total_pages_defined
FROM public.role_definitions rd
LEFT JOIN public.page_access pa ON pa.role_key = rd.role_key
GROUP BY rd.role_key, rd.display_name, rd.tier
ORDER BY rd.tier DESC;

GRANT SELECT ON public.access_matrix_summary TO authenticated;

-- =====================================================
-- SUMMARY
-- =====================================================

/*
ROLE ACCESS SUMMARY (After Migration 155):

super_admin (200)
- Full access to ALL pages and sections
- Can manage users and system configuration

admin (100)  
- Full access to all pages EXCEPT user management
- Can view but not manage /admin/users
- Can manage roles and configuration

manager (80)
- Full access EXCEPT Admin Ops and /marketplace
- Can access: HR, Recruiting, Marketing, Operations, GDU, Med Ops, Personal
- Cannot: Configure system, manage marketplace

hr_admin (60)
- Full: My Workspace (except /marketplace), Management (except /schedule/builder), Med Ops, GDU
- No: Admin Ops, Marketing, CRM

office_admin (50)
- Full: My Workspace (except /marketplace), Management, Med Ops
- View: Marketing calendar and resources
- No: Admin Ops, CRM, GDU

marketing_admin (40)
- Full: My Workspace (except /marketplace), Marketing, CRM, GDU, Med Ops
- View: Roster, Time Off, Schedule
- No: Admin Ops

user (10)
- Full: My Workspace (except /marketplace), Med Ops
- View: Roster, Schedule, Time Off, Marketing calendar/resources
- No: Admin Ops, CRM, GDU

*/
