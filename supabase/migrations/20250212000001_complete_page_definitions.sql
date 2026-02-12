-- =====================================================
-- Migration: 20250212000001_complete_page_definitions.sql
-- Description: Add ALL missing page definitions to the access matrix
-- 
-- PROBLEM: The access matrix only covered ~45 pages but the system has ~75 routes.
--          Pages referenced by the sidebar (hasPageAccess) that were missing would
--          default to 'none' access, making them invisible even to admins.
--
-- This migration adds every missing page and assigns appropriate access per role.
-- =====================================================

-- =====================================================
-- 1. INSERT ALL MISSING PAGE DEFINITIONS
-- =====================================================

-- Pages in the sidebar that were missing from page_definitions
INSERT INTO public.page_definitions (path, name, section, icon, sort_order, is_active) VALUES
  -- Global (missing: /wiki)
  ('/wiki', 'Wiki', 'Global', 'mdi-book-open-page-variant', 105, true),
  
  -- CRM & Analytics (missing from page_definitions but in sidebar)
  ('/marketing/sauron', 'Sauron', 'CRM & Analytics', 'mdi-eye', 695, true),
  ('/marketing/appointment-analysis', 'Appointment Analysis', 'CRM & Analytics', 'mdi-calendar-search', 730, true),
  ('/marketing/invoice-analysis', 'Invoice Analysis', 'CRM & Analytics', 'mdi-receipt-text-check', 740, true),

  -- My Workspace (missing: /goals, /reviews, /mentorship, /my-ops)
  ('/goals', 'My Goals', 'My Workspace', 'mdi-flag-checkered', 265, true),
  ('/reviews', 'My Reviews', 'My Workspace', 'mdi-star-box', 270, true),
  ('/mentorship', 'Mentorship', 'My Workspace', 'mdi-account-supervisor', 275, true),
  ('/my-ops', 'My Ops', 'My Workspace', 'mdi-clipboard-text-clock', 280, true),

  -- Academy (subpages missing from matrix)
  ('/academy', 'Academy Home', 'My Workspace', 'mdi-school', 255, true),
  ('/academy/catalog', 'Course Catalog', 'My Workspace', 'mdi-book-open-variant', 257, true),
  ('/academy/signoffs', 'Sign-Offs', 'Management', 'mdi-clipboard-check', 345, true),
  ('/academy/manager/create', 'Create Course', 'Management', 'mdi-book-plus', 347, true),

  -- HR (missing recruiting subpages & interviews)
  ('/recruiting/candidates', 'Candidates', 'HR', 'mdi-account-multiple-plus', 553, true),
  ('/recruiting/interviews', 'Interviews', 'HR', 'mdi-account-voice', 555, true),
  ('/recruiting/onboarding', 'Onboarding', 'HR', 'mdi-clipboard-check-multiple', 557, true),
  ('/admin/payroll/review', 'Payroll Review', 'HR', 'mdi-cash-check', 565, true),
  ('/admin/intake', 'Intake Management', 'HR', 'mdi-clipboard-text', 575, true),

  -- Admin Ops (missing: /admin/agents, /admin/scheduling-rules, /admin/services, /admin/slack)
  ('/admin/agents', 'AI Agents', 'Admin Ops', 'mdi-robot', 945, true),
  ('/admin/scheduling-rules', 'Scheduling Rules', 'Admin Ops', 'mdi-calendar-cog', 950, true),
  ('/admin/services', 'Services', 'Admin Ops', 'mdi-medical-bag', 955, true),
  ('/admin/slack', 'Slack Integration', 'Admin Ops', 'mdi-slack', 960, true),

  -- Management (missing: /employees)
  ('/employees', 'Employees', 'Management', 'mdi-account-multiple', 305, true),

  -- Marketing (missing subpages)
  ('/marketing', 'Marketing Home', 'Marketing', 'mdi-bullhorn', 595, true),
  ('/marketing/command-center', 'Command Center', 'Marketing', 'mdi-view-dashboard', 597, true),

  -- Growth (missing: /growth/goals, /growth/partners)
  ('/growth/goals', 'Growth Goals', 'Marketing', 'mdi-flag-variant', 665, true),
  ('/growth/partners', 'Growth Partners', 'Marketing', 'mdi-account-group', 667, true),

  -- GDU sub-pages (missing: /gdu/events/new)
  ('/gdu/events/new', 'Create CE Event', 'GDU', 'mdi-calendar-plus', 835, true),

  -- Training (separate from academy)
  ('/training', 'Training Hub', 'My Workspace', 'mdi-school-outline', 258, true),

  -- Contact List / Leads
  ('/contact-list', 'Contact List', 'My Workspace', 'mdi-contacts', 210, true),
  ('/leads', 'Leads', 'Marketing', 'mdi-account-star', 668, true)

  -- NOTE: Dynamic routes like /roster/:id, /recruiting/:id, /gdu/events/:id,
  -- /training/:id, /training/quiz/:id, /marketing/partner/:id, /recruiting/shadow/:id,
  -- /recruiting/onboarding/:id inherit parent route access.
  -- Auth routes (/auth/login, /auth/callback) and public routes (/public/careers,
  -- /public/lead-capture/:eventId, /intake/:token) are unauthenticated and don't
  -- need access matrix entries.

ON CONFLICT (path) DO UPDATE SET
  name = EXCLUDED.name,
  section = EXCLUDED.section,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- =====================================================
-- 2. INSERT ACCESS RECORDS FOR ALL NEW PAGES
-- =====================================================

-- For every active page that has NO access records yet, assign access per role
DO $$
DECLARE
  v_page RECORD;
  v_roles TEXT[] := ARRAY['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'marketing_admin', 'user'];
  v_role TEXT;
  v_access TEXT;
BEGIN
  -- Only target pages missing from page_access
  FOR v_page IN 
    SELECT pd.id, pd.path, pd.section, pd.name
    FROM public.page_definitions pd
    WHERE pd.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM public.page_access pa WHERE pa.page_id = pd.id
      )
    ORDER BY pd.sort_order
  LOOP
    FOREACH v_role IN ARRAY v_roles LOOP
      v_access := CASE

        -- ========================================
        -- SUPER ADMIN: Full access to everything
        -- ========================================
        WHEN v_role = 'super_admin' THEN 'full'

        -- ========================================
        -- ADMIN: Full access except User Management (view only)
        -- ========================================
        WHEN v_role = 'admin' THEN 
          CASE 
            WHEN v_page.path = '/admin/users' THEN 'view'
            ELSE 'full'
          END

        -- ========================================
        -- MANAGER: Full except Admin Ops and /marketplace
        -- ========================================
        WHEN v_role = 'manager' THEN 
          CASE 
            WHEN v_page.section = 'Admin Ops' THEN 'none'
            WHEN v_page.path = '/marketplace' THEN 'none'
            ELSE 'full'
          END

        -- ========================================
        -- HR ADMIN: HR, Recruiting, Schedules, Education, GDU, Med Ops
        -- No marketing, No CRM, No Admin Ops
        -- ========================================
        WHEN v_role = 'hr_admin' THEN 
          CASE 
            WHEN v_page.section IN ('My Workspace', 'Global') THEN 
              CASE WHEN v_page.path = '/marketplace' THEN 'none' ELSE 'full' END
            WHEN v_page.section = 'Management' THEN 
              CASE WHEN v_page.path = '/schedule/builder' THEN 'none' ELSE 'full' END
            WHEN v_page.section IN ('Med Ops', 'GDU', 'HR') THEN 'full'
            WHEN v_page.section IN ('Marketing', 'CRM & Analytics', 'Admin Ops') THEN 'none'
            ELSE 'none'
          END

        -- ========================================
        -- OFFICE ADMIN: Roster, Schedules, Time Off, Skills, Med Ops
        -- View only: Marketing calendar/resources
        -- No: Admin Ops, CRM, GDU
        -- ========================================
        WHEN v_role = 'office_admin' THEN 
          CASE 
            WHEN v_page.section IN ('My Workspace', 'Global') THEN 
              CASE WHEN v_page.path = '/marketplace' THEN 'none' ELSE 'full' END
            WHEN v_page.section IN ('Management', 'Med Ops', 'HR') THEN 'full'
            WHEN v_page.section = 'Marketing' THEN 
              CASE WHEN v_page.path IN ('/marketing/calendar', '/marketing/resources') THEN 'view' ELSE 'none' END
            WHEN v_page.section IN ('CRM & Analytics', 'GDU', 'Admin Ops') THEN 'none'
            ELSE 'none'
          END

        -- ========================================
        -- MARKETING ADMIN: Marketing, CRM, GDU, Med Ops
        -- View only: Roster, Time Off
        -- No: Admin Ops
        -- ========================================
        WHEN v_role = 'marketing_admin' THEN 
          CASE 
            WHEN v_page.section IN ('My Workspace', 'Global') THEN 
              CASE WHEN v_page.path = '/marketplace' THEN 'none' ELSE 'full' END
            WHEN v_page.path IN ('/roster', '/time-off', '/schedule/builder') THEN 'view'
            WHEN v_page.section = 'Management' THEN 'none'
            WHEN v_page.section IN ('Med Ops', 'Marketing', 'CRM & Analytics', 'GDU') THEN 'full'
            WHEN v_page.section = 'HR' THEN 'none'
            WHEN v_page.section = 'Admin Ops' THEN 'none'
            ELSE 'none'
          END

        -- ========================================
        -- USER: Personal workspace, limited view
        -- View only: Roster, Schedule, Time Off, Calendar, Resources
        -- Full: Med Ops, My Workspace
        -- No: Admin Ops, CRM, GDU
        -- ========================================
        WHEN v_role = 'user' THEN 
          CASE 
            WHEN v_page.section IN ('My Workspace', 'Global') THEN 
              CASE WHEN v_page.path = '/marketplace' THEN 'none' ELSE 'full' END
            WHEN v_page.path IN ('/roster', '/schedule', '/time-off') THEN 'view'
            WHEN v_page.section = 'Management' THEN 'none'
            WHEN v_page.section = 'Med Ops' THEN 'full'
            WHEN v_page.section = 'HR' THEN 'none'
            WHEN v_page.path IN ('/marketing/calendar', '/marketing/resources') THEN 'view'
            WHEN v_page.section IN ('Marketing', 'CRM & Analytics', 'GDU', 'Admin Ops') THEN 'none'
            ELSE 'none'
          END

        ELSE 'none'
      END;

      INSERT INTO public.page_access (page_id, role_key, access_level)
      VALUES (v_page.id, v_role, v_access)
      ON CONFLICT DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Added access for page: % (%)', v_page.path, v_page.section;
  END LOOP;
END $$;

-- =====================================================
-- 3. VERIFY: Show pages still missing access records
-- =====================================================

DO $$
DECLARE
  v_missing INT;
BEGIN
  SELECT COUNT(*) INTO v_missing
  FROM public.page_definitions pd
  WHERE pd.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.page_access pa WHERE pa.page_id = pd.id
    );
  
  IF v_missing > 0 THEN
    RAISE WARNING '% active pages still have no access records!', v_missing;
  ELSE
    RAISE NOTICE 'All active pages have access records. Access matrix is complete.';
  END IF;
END $$;

-- =====================================================
-- 4. SUMMARY VIEW: Refresh the access matrix summary
-- =====================================================

DROP VIEW IF EXISTS public.access_matrix_summary;

CREATE OR REPLACE VIEW public.access_matrix_summary AS
SELECT 
  rd.role_key,
  rd.display_name,
  rd.tier,
  COUNT(CASE WHEN pa.access_level = 'full' THEN 1 END) as full_access_pages,
  COUNT(CASE WHEN pa.access_level = 'view' THEN 1 END) as view_access_pages,
  COUNT(CASE WHEN pa.access_level = 'none' THEN 1 END) as no_access_pages,
  COUNT(DISTINCT pa.page_id) as total_pages_defined,
  (SELECT COUNT(*) FROM public.page_definitions WHERE is_active = true) as total_active_pages
FROM public.role_definitions rd
LEFT JOIN public.page_access pa ON pa.role_key = rd.role_key
GROUP BY rd.role_key, rd.display_name, rd.tier
ORDER BY rd.tier DESC;

GRANT SELECT ON public.access_matrix_summary TO authenticated;

-- =====================================================
-- NOTES
-- =====================================================
/*
PAGES ADDED BY THIS MIGRATION:

Global:
  /wiki - Wiki (was in sidebar but missing from page_definitions)

My Workspace:
  /goals - My Goals
  /reviews - My Reviews
  /mentorship - Mentorship
  /my-ops - My Ops
  /academy - Academy Home
  /academy/catalog - Course Catalog
  /contact-list - Contact List (may have existed, upserted)
  /training - Training Hub

Management:
  /employees - Employees page
  /academy/signoffs - Sign-Offs
  /academy/manager/create - Create Course

HR:
  /recruiting/candidates - Candidates
  /recruiting/interviews - Interviews
  /recruiting/onboarding - Onboarding
  /admin/payroll/review - Payroll Review
  /admin/intake - Intake Management

Marketing:
  /marketing - Marketing Home
  /marketing/command-center - Command Center
  /growth/goals - Growth Goals
  /growth/partners - Growth Partners
  /leads - Leads

CRM & Analytics:
  /marketing/sauron - Sauron
  /marketing/appointment-analysis - Appointment Analysis
  /marketing/invoice-analysis - Invoice Analysis

GDU:
  /gdu/events/new - Create CE Event

Admin Ops:
  /admin/agents - AI Agents
  /admin/scheduling-rules - Scheduling Rules
  /admin/services - Services
  /admin/slack - Slack Integration

Dynamic routes (inherit parent access, not in matrix):
  /roster/:id, /recruiting/:id, /recruiting/shadow/:id,
  /recruiting/onboarding/:id, /gdu/events/:id, /training/:id,
  /training/quiz/:id, /marketing/partner/:id

Public/Auth routes (no access control needed):
  /auth/login, /auth/callback, /public/careers,
  /public/lead-capture/:eventId, /intake/:token
*/
