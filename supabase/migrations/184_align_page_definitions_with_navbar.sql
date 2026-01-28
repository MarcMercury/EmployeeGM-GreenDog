-- =====================================================
-- Migration: 184_align_page_definitions_with_navbar.sql
-- Description: Align page_definitions sections and sort_order with Navigation Bar
-- This ensures the Access Matrix displays in the same order as the sidebar
-- =====================================================

-- NAVIGATION BAR ORDER:
-- 1. Global (Activity Hub, Marketplace)
-- 2. My Workspace (Profile, Contact List, My Schedule, My Skills, My Growth, My Training)
-- 3. Management (Roster, Skill Library, Skill Stats, Facilities, Course Manager)
-- 4. Med Ops (Wiki, Calculators, Boards, Partners)
-- 5. HR (Schedule Overview, Schedule Wizard, Quick Builder, Service Settings, Time Off, Recruiting, Payroll, Master Roster)
-- 6. Marketing (Calendar, Events, Event Leads, Partners, Influencers, Inventory, Resources, Referral CRM)
-- 7. CRM & Analytics (EzyVet CRM, EzyVet Analytics, List Hygiene)
-- 8. GDU (GDU Dash, Student CRM, Visitor CRM, CE Events)
-- 9. Admin Ops (User Management, Email Templates, Skills Management, System Settings)

-- =====================================================
-- 1. UPDATE EXISTING PAGE DEFINITIONS WITH CORRECT SECTIONS AND SORT ORDER
-- =====================================================

-- === GLOBAL SECTION (sort_order 100-199) ===
UPDATE public.page_definitions SET section = 'Global', sort_order = 100, name = 'Activity Hub', icon = 'mdi-bell' WHERE path = '/activity';
UPDATE public.page_definitions SET section = 'Global', sort_order = 110, name = 'Marketplace', icon = 'mdi-store' WHERE path = '/marketplace';

-- === MY WORKSPACE SECTION (sort_order 200-299) ===
UPDATE public.page_definitions SET section = 'My Workspace', sort_order = 200, name = 'My Profile', icon = 'mdi-account-card' WHERE path = '/profile';
UPDATE public.page_definitions SET section = 'My Workspace', sort_order = 210, name = 'Contact List', icon = 'mdi-contacts' WHERE path = '/contact-list';
UPDATE public.page_definitions SET section = 'My Workspace', sort_order = 220, name = 'My Schedule', icon = 'mdi-calendar-account' WHERE path = '/my-schedule';
UPDATE public.page_definitions SET section = 'My Workspace', sort_order = 230, name = 'My Skills', icon = 'mdi-lightbulb' WHERE path = '/people/my-skills';
UPDATE public.page_definitions SET section = 'My Workspace', sort_order = 240, name = 'Skills Library', icon = 'mdi-book-open-variant' WHERE path = '/skills-library';
UPDATE public.page_definitions SET section = 'My Workspace', sort_order = 250, name = 'My Growth', icon = 'mdi-chart-line' WHERE path = '/development';
UPDATE public.page_definitions SET section = 'My Workspace', sort_order = 260, name = 'My Training', icon = 'mdi-school' WHERE path = '/academy/my-training';

-- === MANAGEMENT SECTION (sort_order 300-399) ===
UPDATE public.page_definitions SET section = 'Management', sort_order = 300, name = 'Roster', icon = 'mdi-account-group' WHERE path = '/roster';
UPDATE public.page_definitions SET section = 'Management', sort_order = 320, name = 'Skill Stats', icon = 'mdi-chart-bar' WHERE path = '/people/skill-stats';
UPDATE public.page_definitions SET section = 'Management', sort_order = 330, name = 'Facilities Resources', icon = 'mdi-office-building' WHERE path = '/med-ops/facilities';
UPDATE public.page_definitions SET section = 'Management', sort_order = 340, name = 'Course Manager', icon = 'mdi-book-education' WHERE path = '/academy/course-manager';

-- === MED OPS SECTION (sort_order 400-499) ===
UPDATE public.page_definitions SET section = 'Med Ops', sort_order = 400, name = 'Wiki', icon = 'mdi-book-open-page-variant' WHERE path = '/med-ops/wiki';
UPDATE public.page_definitions SET section = 'Med Ops', sort_order = 410, name = 'Drug Calculators', icon = 'mdi-calculator' WHERE path = '/med-ops/calculators';
UPDATE public.page_definitions SET section = 'Med Ops', sort_order = 420, name = 'Medical Boards', icon = 'mdi-clipboard-pulse' WHERE path = '/med-ops/boards';
UPDATE public.page_definitions SET section = 'Med Ops', sort_order = 430, name = 'Med Ops Partners', icon = 'mdi-handshake' WHERE path = '/med-ops/partners';

-- === HR SECTION (sort_order 500-599) ===
UPDATE public.page_definitions SET section = 'HR', sort_order = 500, name = 'Schedule Command Center', icon = 'mdi-calendar-clock' WHERE path = '/schedule';
UPDATE public.page_definitions SET section = 'HR', sort_order = 510, name = 'Schedule Wizard', icon = 'mdi-wizard-hat' WHERE path = '/schedule/wizard';
UPDATE public.page_definitions SET section = 'HR', sort_order = 520, name = 'Quick Builder', icon = 'mdi-view-dashboard-edit' WHERE path = '/schedule/builder';
UPDATE public.page_definitions SET section = 'HR', sort_order = 530, name = 'Service Settings', icon = 'mdi-medical-bag' WHERE path = '/schedule/services';
UPDATE public.page_definitions SET section = 'HR', sort_order = 540, name = 'Time Off Approvals', icon = 'mdi-calendar-remove' WHERE path = '/time-off';
UPDATE public.page_definitions SET section = 'HR', sort_order = 550, name = 'Recruiting Pipeline', icon = 'mdi-account-search' WHERE path = '/recruiting';
UPDATE public.page_definitions SET section = 'HR', sort_order = 560, name = 'Export Payroll', icon = 'mdi-cash-multiple' WHERE path = '/export-payroll';
UPDATE public.page_definitions SET section = 'HR', sort_order = 570, name = 'Master Roster', icon = 'mdi-table-account' WHERE path = '/admin/master-roster';

-- === MARKETING SECTION (sort_order 600-699) ===
UPDATE public.page_definitions SET section = 'Marketing', sort_order = 600, name = 'Calendar', icon = 'mdi-calendar-month' WHERE path = '/marketing/calendar';
UPDATE public.page_definitions SET section = 'Marketing', sort_order = 610, name = 'Events', icon = 'mdi-calendar-star' WHERE path = '/growth/events';
UPDATE public.page_definitions SET section = 'Marketing', sort_order = 620, name = 'Event Leads', icon = 'mdi-account-star' WHERE path = '/growth/leads';
UPDATE public.page_definitions SET section = 'Marketing', sort_order = 630, name = 'Partners', icon = 'mdi-handshake' WHERE path = '/marketing/partners';
UPDATE public.page_definitions SET section = 'Marketing', sort_order = 640, name = 'Influencers', icon = 'mdi-account-star-outline' WHERE path = '/marketing/influencers';
UPDATE public.page_definitions SET section = 'Marketing', sort_order = 650, name = 'Inventory', icon = 'mdi-package-variant' WHERE path = '/marketing/inventory';
UPDATE public.page_definitions SET section = 'Marketing', sort_order = 660, name = 'Resources', icon = 'mdi-folder-multiple' WHERE path = '/marketing/resources';
UPDATE public.page_definitions SET section = 'Marketing', sort_order = 670, name = 'Referral CRM', icon = 'mdi-handshake-outline' WHERE path = '/marketing/partnerships';

-- === CRM & ANALYTICS SECTION (sort_order 700-799) ===
UPDATE public.page_definitions SET section = 'CRM & Analytics', sort_order = 700, name = 'EzyVet CRM', icon = 'mdi-database-import' WHERE path = '/marketing/ezyvet-crm';
UPDATE public.page_definitions SET section = 'CRM & Analytics', sort_order = 710, name = 'EzyVet Analytics', icon = 'mdi-chart-areaspline' WHERE path = '/marketing/ezyvet-analytics';
UPDATE public.page_definitions SET section = 'CRM & Analytics', sort_order = 720, name = 'List Hygiene', icon = 'mdi-broom' WHERE path = '/marketing/list-hygiene';

-- === GDU SECTION (sort_order 800-899) ===
UPDATE public.page_definitions SET section = 'GDU', sort_order = 800, name = 'GDU Dash', icon = 'mdi-view-dashboard' WHERE path = '/gdu';
UPDATE public.page_definitions SET section = 'GDU', sort_order = 810, name = 'Student CRM', icon = 'mdi-account-school' WHERE path = '/gdu/students';
UPDATE public.page_definitions SET section = 'GDU', sort_order = 820, name = 'Visitor CRM', icon = 'mdi-account-group' WHERE path = '/gdu/visitors';
UPDATE public.page_definitions SET section = 'GDU', sort_order = 830, name = 'CE Events', icon = 'mdi-calendar-star' WHERE path = '/gdu/events';

-- === ADMIN OPS SECTION (sort_order 900-999) ===
UPDATE public.page_definitions SET section = 'Admin Ops', sort_order = 900, name = 'User Management', icon = 'mdi-account-cog' WHERE path = '/admin/users';
UPDATE public.page_definitions SET section = 'Admin Ops', sort_order = 910, name = 'Email Templates', icon = 'mdi-email-edit' WHERE path = '/admin/email-templates';
UPDATE public.page_definitions SET section = 'Admin Ops', sort_order = 920, name = 'Skills Management', icon = 'mdi-bookshelf' WHERE path = '/admin/skills-management';
UPDATE public.page_definitions SET section = 'Admin Ops', sort_order = 930, name = 'System Settings', icon = 'mdi-cog' WHERE path = '/admin/system-health';
UPDATE public.page_definitions SET section = 'Admin Ops', sort_order = 940, name = 'Global Settings', icon = 'mdi-tune' WHERE path = '/settings';

-- =====================================================
-- 2. INSERT MISSING PAGE DEFINITIONS
-- =====================================================

-- Insert pages that may not exist yet
INSERT INTO public.page_definitions (path, name, section, icon, sort_order, is_active) VALUES
  ('/activity', 'Activity Hub', 'Global', 'mdi-bell', 100, true),
  ('/marketplace', 'Marketplace', 'Global', 'mdi-store', 110, true),
  ('/contact-list', 'Contact List', 'My Workspace', 'mdi-contacts', 210, true),
  ('/my-schedule', 'My Schedule', 'My Workspace', 'mdi-calendar-account', 220, true),
  ('/skills-library', 'Skills Library', 'My Workspace', 'mdi-book-open-variant', 240, true),
  ('/academy/my-training', 'My Training', 'My Workspace', 'mdi-school', 260, true),
  ('/med-ops/facilities', 'Facilities Resources', 'Management', 'mdi-office-building', 330, true),
  ('/academy/course-manager', 'Course Manager', 'Management', 'mdi-book-education', 340, true),
  ('/med-ops/wiki', 'Wiki', 'Med Ops', 'mdi-book-open-page-variant', 400, true),
  ('/med-ops/calculators', 'Drug Calculators', 'Med Ops', 'mdi-calculator', 410, true),
  ('/med-ops/boards', 'Medical Boards', 'Med Ops', 'mdi-clipboard-pulse', 420, true),
  ('/med-ops/partners', 'Med Ops Partners', 'Med Ops', 'mdi-handshake', 430, true),
  ('/schedule/wizard', 'Schedule Wizard', 'HR', 'mdi-wizard-hat', 510, true),
  ('/schedule/services', 'Service Settings', 'HR', 'mdi-medical-bag', 530, true),
  ('/export-payroll', 'Export Payroll', 'HR', 'mdi-cash-multiple', 560, true),
  ('/admin/master-roster', 'Master Roster', 'HR', 'mdi-table-account', 570, true),
  ('/marketing/list-hygiene', 'List Hygiene', 'CRM & Analytics', 'mdi-broom', 720, true),
  ('/admin/email-templates', 'Email Templates', 'Admin Ops', 'mdi-email-edit', 910, true),
  ('/admin/system-health', 'System Settings', 'Admin Ops', 'mdi-cog', 930, true)
ON CONFLICT (path) DO UPDATE SET
  section = EXCLUDED.section,
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- =====================================================
-- 3. ADD PAGE ACCESS FOR sup_admin ROLE FOR ALL PAGES
-- =====================================================

-- First ensure sup_admin has proper access to all pages
INSERT INTO public.page_access (page_id, role_key, access_level)
SELECT 
  pd.id,
  'sup_admin',
  CASE 
    -- Full access to My Workspace
    WHEN pd.section = 'My Workspace' THEN 'full'
    WHEN pd.section = 'Global' THEN 'full'
    -- Full access to Management
    WHEN pd.section = 'Management' THEN 'full'
    -- Full access to Med Ops
    WHEN pd.section = 'Med Ops' THEN 'full'
    -- Full access to HR
    WHEN pd.section = 'HR' THEN 'full'
    -- No access to Marketing
    WHEN pd.section = 'Marketing' THEN 'none'
    -- No access to CRM & Analytics
    WHEN pd.section = 'CRM & Analytics' THEN 'none'
    -- Full access to GDU
    WHEN pd.section = 'GDU' THEN 'full'
    -- No access to Admin Ops
    WHEN pd.section = 'Admin Ops' THEN 'none'
    ELSE 'none'
  END
FROM public.page_definitions pd
WHERE NOT EXISTS (
  SELECT 1 FROM public.page_access pa 
  WHERE pa.page_id = pd.id AND pa.role_key = 'sup_admin'
);

-- Update any existing sup_admin access to correct values
UPDATE public.page_access pa
SET access_level = CASE 
    WHEN pd.section IN ('My Workspace', 'Global', 'Management', 'Med Ops', 'HR', 'GDU') THEN 'full'
    ELSE 'none'
  END
FROM public.page_definitions pd
WHERE pa.page_id = pd.id AND pa.role_key = 'sup_admin';

-- Also ensure sup_admin has 'full' access for all HR-related sections
UPDATE public.page_access pa
SET access_level = 'full'
FROM public.page_definitions pd
WHERE pa.page_id = pd.id 
  AND pa.role_key = 'sup_admin' 
  AND pd.section IN ('Global', 'My Workspace', 'Management', 'Med Ops', 'HR', 'GDU');

-- And ensure sup_admin has 'none' access for Marketing, CRM & Analytics, Admin Ops
UPDATE public.page_access pa
SET access_level = 'none'
FROM public.page_definitions pd
WHERE pa.page_id = pd.id 
  AND pa.role_key = 'sup_admin' 
  AND pd.section IN ('Marketing', 'CRM & Analytics', 'Admin Ops');

-- =====================================================
-- 4. DEACTIVATE OLD/UNUSED PAGES
-- =====================================================

-- Deactivate pages that no longer exist in the navigation
UPDATE public.page_definitions SET is_active = false 
WHERE path IN (
  '/',  -- Old dashboard route
  '/admin/global-settings',  -- Duplicate of /settings
  '/recruiting/candidates',  -- Merged into /recruiting
  '/recruiting/onboarding',  -- Merged into /recruiting
  '/training',  -- Renamed to /academy/my-training
  '/marketing/command-center'  -- No longer used
);

-- =====================================================
-- 5. VERIFY RESULTS
-- =====================================================

-- Show final state ordered by section and sort_order
-- SELECT section, name, path, sort_order, is_active
-- FROM public.page_definitions
-- WHERE is_active = true
-- ORDER BY sort_order;
