-- Add API Monitoring page to permission system

-- First, add the page definition
INSERT INTO page_definitions (
  page_name,
  path,
  section,
  description,
  icon,
  is_visible,
  is_active,
  created_at
) VALUES (
  'API Monitoring',
  '/admin/api-monitoring',
  'Admin',
  'Real-time API error tracking and missing endpoint detection',
  'mdi-monitor-dashboard',
  true,
  true,
  now()
) ON CONFLICT (path) DO UPDATE SET
  description = 'Real-time API error tracking and missing endpoint detection',
  icon = 'mdi-monitor-dashboard';

-- Get the page ID
WITH page AS (
  SELECT id FROM page_definitions WHERE path = '/admin/api-monitoring'
)
-- Grant access to super_admin and admin roles
INSERT INTO page_access (page_id, role, access_level, created_at)
SELECT page.id, role, 'full' as access_level, now()
FROM page
CROSS JOIN (
  SELECT 'super_admin' as role
  UNION ALL
  SELECT 'admin' as role
) AS roles
ON CONFLICT (page_id, role) DO UPDATE SET
  access_level = 'full';
