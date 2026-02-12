-- =============================================================
-- Fix Admin Ops section: add 4 missing pages + 2 HR pages
-- Also updates sort_order for logical grouping
-- =============================================================

-- 1) Add 4 missing Admin Ops pages
INSERT INTO page_definitions (path, name, section, icon, sort_order, is_active) VALUES
  ('/admin/agents',           'AI Agent Workforce', 'Admin Ops', 'mdi-robot',          905, true),
  ('/admin/services',         'Services',           'Admin Ops', 'mdi-medical-bag',    915, true),
  ('/admin/scheduling-rules', 'Scheduling Rules',   'Admin Ops', 'mdi-calendar-clock', 925, true),
  ('/admin/slack',            'Slack Integration',   'Admin Ops', 'mdi-slack',          935, true)
ON CONFLICT (path) DO UPDATE SET
  name = EXCLUDED.name, section = EXCLUDED.section, icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- 2) Add 2 missing HR admin pages
INSERT INTO page_definitions (path, name, section, icon, sort_order, is_active) VALUES
  ('/admin/intake',          'Intake Management', 'HR', 'mdi-clipboard-flow', 575, true),
  ('/admin/payroll/review',  'Payroll Review',    'HR', 'mdi-cash-check',     580, true)
ON CONFLICT (path) DO UPDATE SET
  name = EXCLUDED.name, section = EXCLUDED.section, icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- 3) Re-align existing Admin Ops sort_order for consistent ordering
UPDATE page_definitions SET sort_order = 900 WHERE path = '/admin/users';
UPDATE page_definitions SET sort_order = 910 WHERE path = '/admin/email-templates';
UPDATE page_definitions SET sort_order = 930 WHERE path = '/admin/skills-management';
UPDATE page_definitions SET sort_order = 940 WHERE path = '/admin/system-health';
UPDATE page_definitions SET sort_order = 950 WHERE path = '/settings';

-- 4) page_access for 4 new Admin Ops pages
--    All use ['auth','admin'] middleware → super_admin=full, admin=full, rest=none
INSERT INTO page_access (page_id, role_key, access_level)
SELECT pd.id, r.role_key,
  CASE
    WHEN r.role_key IN ('super_admin', 'admin') THEN 'full'
    ELSE 'none'
  END
FROM page_definitions pd
CROSS JOIN role_definitions r
WHERE pd.path IN ('/admin/agents', '/admin/services', '/admin/scheduling-rules', '/admin/slack')
ON CONFLICT (page_id, role_key) DO UPDATE SET access_level = EXCLUDED.access_level;

-- 5) page_access for /admin/intake (HR)
--    super_admin=full, admin=full, hr_admin=view, rest=none
INSERT INTO page_access (page_id, role_key, access_level)
SELECT pd.id, r.role_key,
  CASE
    WHEN r.role_key IN ('super_admin', 'admin') THEN 'full'
    WHEN r.role_key = 'hr_admin' THEN 'view'
    ELSE 'none'
  END
FROM page_definitions pd
CROSS JOIN role_definitions r
WHERE pd.path = '/admin/intake'
ON CONFLICT (page_id, role_key) DO UPDATE SET access_level = EXCLUDED.access_level;

-- 6) page_access for /admin/payroll/review (HR)
--    super_admin=full, admin=full, rest=none
INSERT INTO page_access (page_id, role_key, access_level)
SELECT pd.id, r.role_key,
  CASE
    WHEN r.role_key IN ('super_admin', 'admin') THEN 'full'
    ELSE 'none'
  END
FROM page_definitions pd
CROSS JOIN role_definitions r
WHERE pd.path = '/admin/payroll/review'
ON CONFLICT (page_id, role_key) DO UPDATE SET access_level = EXCLUDED.access_level;
