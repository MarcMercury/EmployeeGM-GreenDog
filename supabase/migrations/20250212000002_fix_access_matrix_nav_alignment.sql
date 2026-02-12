-- =====================================================
-- Migration: 20250212000002_fix_access_matrix_nav_alignment.sql
-- Description: Align access matrix with sidebar navigation exactly
-- Applied to production: 2026-02-12
-- =====================================================

-- 1. Add 4 pages that exist in sidebar but were missing from page_definitions
INSERT INTO public.page_definitions (path, name, section, icon, sort_order, is_active) VALUES
  ('/wiki', 'Wiki', 'Global', 'mdi-book-open-page-variant', 105, true),
  ('/marketing/sauron', 'Sauron', 'CRM & Analytics', 'mdi-eye', 695, true),
  ('/marketing/appointment-analysis', 'Appointment Analysis', 'CRM & Analytics', 'mdi-calendar-search', 710, true),
  ('/marketing/invoice-analysis', 'Invoice Analysis', 'CRM & Analytics', 'mdi-receipt-text-check', 715, true)
ON CONFLICT (path) DO UPDATE SET
  name = EXCLUDED.name,
  section = EXCLUDED.section,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 2. Move /skills-library from "My Workspace" to "Management" (matches sidebar grouping)
UPDATE public.page_definitions 
SET section = 'Management', sort_order = 310, updated_at = NOW()
WHERE path = '/skills-library';

-- 3. Fix CRM & Analytics sort order to match sidebar order:
--    Sauron → EzyVet CRM → EzyVet Analytics → Appointment Analysis → Invoice Analysis → List Hygiene
UPDATE public.page_definitions SET sort_order = 695 WHERE path = '/marketing/sauron';
UPDATE public.page_definitions SET sort_order = 700 WHERE path = '/marketing/ezyvet-crm';
UPDATE public.page_definitions SET sort_order = 705 WHERE path = '/marketing/ezyvet-analytics';
UPDATE public.page_definitions SET sort_order = 710 WHERE path = '/marketing/appointment-analysis';
UPDATE public.page_definitions SET sort_order = 715 WHERE path = '/marketing/invoice-analysis';
UPDATE public.page_definitions SET sort_order = 720 WHERE path = '/marketing/list-hygiene';

-- 4. Add access records for all 8 roles for each new page

-- /wiki (Global) - everyone gets full access (same as Activity Hub)
INSERT INTO public.page_access (page_id, role_key, access_level)
SELECT pd.id, r.role_key, 'full'
FROM public.page_definitions pd
CROSS JOIN (VALUES ('super_admin'), ('admin'), ('manager'), ('hr_admin'), ('sup_admin'), ('office_admin'), ('marketing_admin'), ('user')) AS r(role_key)
WHERE pd.path = '/wiki'
ON CONFLICT DO NOTHING;

-- /marketing/sauron (CRM & Analytics) - follows CRM pattern
INSERT INTO public.page_access (page_id, role_key, access_level)
SELECT pd.id, v.role_key, v.access_level::text
FROM public.page_definitions pd
CROSS JOIN (VALUES 
  ('super_admin', 'full'), ('admin', 'full'), ('manager', 'full'), 
  ('hr_admin', 'view'), ('sup_admin', 'full'), ('office_admin', 'view'), 
  ('marketing_admin', 'full'), ('user', 'none')
) AS v(role_key, access_level)
WHERE pd.path = '/marketing/sauron'
ON CONFLICT DO NOTHING;

-- /marketing/appointment-analysis (CRM & Analytics)
INSERT INTO public.page_access (page_id, role_key, access_level)
SELECT pd.id, v.role_key, v.access_level::text
FROM public.page_definitions pd
CROSS JOIN (VALUES 
  ('super_admin', 'full'), ('admin', 'full'), ('manager', 'full'), 
  ('hr_admin', 'view'), ('sup_admin', 'full'), ('office_admin', 'view'), 
  ('marketing_admin', 'full'), ('user', 'none')
) AS v(role_key, access_level)
WHERE pd.path = '/marketing/appointment-analysis'
ON CONFLICT DO NOTHING;

-- /marketing/invoice-analysis (CRM & Analytics)
INSERT INTO public.page_access (page_id, role_key, access_level)
SELECT pd.id, v.role_key, v.access_level::text
FROM public.page_definitions pd
CROSS JOIN (VALUES 
  ('super_admin', 'full'), ('admin', 'full'), ('manager', 'full'), 
  ('hr_admin', 'view'), ('sup_admin', 'full'), ('office_admin', 'view'), 
  ('marketing_admin', 'full'), ('user', 'none')
) AS v(role_key, access_level)
WHERE pd.path = '/marketing/invoice-analysis'
ON CONFLICT DO NOTHING;
