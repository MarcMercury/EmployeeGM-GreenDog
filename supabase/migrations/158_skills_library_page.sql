-- Migration: Add Skills Library page to page definitions
-- This page is accessible to all authenticated users

INSERT INTO public.page_definitions (path, title, category, icon, display_order, is_active)
VALUES ('/skills-library', 'Skills Library', 'My Workspace', 'mdi-book-open-variant', 7, true)
ON CONFLICT (path) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  is_active = EXCLUDED.is_active;

-- Grant access to all roles for the Skills Library page
-- This makes it a public page accessible to everyone
INSERT INTO public.page_access (page_path, role_id, can_view, can_edit, can_delete)
SELECT 
  '/skills-library',
  id,
  true,
  false,
  false
FROM public.roles
WHERE name IN ('employee', 'manager', 'hr', 'admin', 'super_admin', 'marketing_coordinator', 'marketing_manager')
ON CONFLICT (page_path, role_id) DO UPDATE SET
  can_view = true;
