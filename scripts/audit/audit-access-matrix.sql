-- =====================================================
-- ACCESS MATRIX AUDIT SCRIPT
-- Purpose: Verify all access levels match the defined matrix
-- =====================================================

-- =====================================================
-- 1. CHECK ROLE DEFINITIONS
-- =====================================================
SELECT 
  '=== ROLE DEFINITIONS ===' as section,
  role_key,
  display_name,
  tier,
  created_at,
  updated_at
FROM public.role_definitions
ORDER BY tier DESC;

-- =====================================================
-- 2. CHECK PAGE DEFINITIONS
-- =====================================================
SELECT 
  '=== PAGE DEFINITIONS ===' as section,
  COUNT(*) as total_pages,
  COUNT(CASE WHEN is_active THEN 1 END) as active_pages,
  COUNT(CASE WHEN NOT is_active THEN 1 END) as inactive_pages
FROM public.page_definitions;

SELECT 
  section,
  COUNT(*) as page_count,
  COUNT(CASE WHEN is_active THEN 1 END) as active_count
FROM public.page_definitions
GROUP BY section
ORDER BY section;

-- =====================================================
-- 3. CHECK PAGE ACCESS MATRIX COMPLETENESS
-- =====================================================
SELECT 
  '=== PAGE ACCESS COMPLETENESS ===' as section,
  (SELECT COUNT(*) FROM public.page_definitions WHERE is_active) * (SELECT COUNT(*) FROM public.role_definitions) as expected_records,
  COUNT(*) as actual_records,
  CASE 
    WHEN COUNT(*) = (SELECT COUNT(*) FROM public.page_definitions WHERE is_active) * (SELECT COUNT(*) FROM public.role_definitions)
    THEN 'COMPLETE'
    ELSE 'INCOMPLETE'
  END as status
FROM public.page_access;

-- =====================================================
-- 4. CHECK FOR MISSING ACCESS RECORDS
-- =====================================================
SELECT 
  '=== MISSING ACCESS RECORDS ===' as section,
  pd.path,
  rd.role_key,
  'MISSING' as status
FROM public.page_definitions pd
CROSS JOIN public.role_definitions rd
LEFT JOIN public.page_access pa ON pa.page_id = pd.id AND pa.role_key = rd.role_key
WHERE pd.is_active = true
AND pa.id IS NULL
ORDER BY pd.path, rd.tier DESC;

-- =====================================================
-- 5. CHECK ACCESS LEVELS FOR EACH SECTION
-- =====================================================
SELECT 
  '=== ACCESS MATRIX BY ROLE AND SECTION ===' as section,
  rd.role_key,
  pd.section,
  COUNT(DISTINCT pd.id) as pages_in_section,
  COUNT(CASE WHEN pa.access_level = 'full' THEN 1 END) as full_access,
  COUNT(CASE WHEN pa.access_level = 'view' THEN 1 END) as view_access,
  COUNT(CASE WHEN pa.access_level = 'none' THEN 1 END) as no_access
FROM public.role_definitions rd
CROSS JOIN public.page_definitions pd
LEFT JOIN public.page_access pa ON pa.page_id = pd.id AND pa.role_key = rd.role_key
WHERE pd.is_active = true
GROUP BY rd.role_key, rd.tier, pd.section
ORDER BY rd.tier DESC, pd.section, COUNT(DISTINCT pd.id) DESC;

-- =====================================================
-- 6. CHECK USERS WITH INVALID ROLES
-- =====================================================
SELECT 
  '=== USERS WITH INVALID ROLES ===' as section,
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.role,
  p.is_active,
  'INVALID' as status
FROM public.profiles p
WHERE p.role NOT IN ('super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'marketing_admin', 'user')
AND p.role IS NOT NULL;

-- =====================================================
-- 7. CHECK ACCESS LEVEL DISTRIBUTION
-- =====================================================
SELECT 
  '=== ACCESS LEVEL DISTRIBUTION ===' as section,
  pa.access_level,
  COUNT(*) as total_records,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM public.page_access), 2) as percentage
FROM public.page_access pa
GROUP BY pa.access_level
ORDER BY total_records DESC;

-- =====================================================
-- 8. CHECK FOR ANOMALIES
-- =====================================================
SELECT 
  '=== POTENTIAL ANOMALIES ===' as section,
  'user role with full access' as issue,
  COUNT(*) as count
FROM public.page_access
WHERE role_key = 'user' AND access_level = 'full'
UNION ALL
SELECT 
  '=== POTENTIAL ANOMALIES ===',
  'manager with no access to management section',
  COUNT(*)
FROM public.page_access pa
JOIN public.page_definitions pd ON pa.page_id = pd.id
WHERE pa.role_key = 'manager' 
AND pd.section = 'Management'
AND pa.access_level = 'none'
UNION ALL
SELECT 
  '=== POTENTIAL ANOMALIES ===',
  'hr_admin with full access to admin settings',
  COUNT(*)
FROM public.page_access pa
JOIN public.page_definitions pd ON pa.page_id = pd.id
WHERE pa.role_key = 'hr_admin'
AND pd.section = 'Admin & Settings'
AND pa.access_level = 'full';

-- =====================================================
-- 9. DETAILED MATRIX VIEW
-- =====================================================
SELECT 
  '=== DETAILED ACCESS MATRIX ===' as section,
  rd.role_key,
  rd.display_name,
  rd.tier,
  pd.path,
  pd.name,
  pd.section,
  pa.access_level
FROM public.role_definitions rd
LEFT JOIN public.page_access pa ON pa.role_key = rd.role_key
LEFT JOIN public.page_definitions pd ON pd.id = pa.page_id
WHERE pd.is_active = true OR pa.access_level IS NOT NULL
ORDER BY rd.tier DESC, pd.section, pd.sort_order
LIMIT 200;

-- =====================================================
-- 10. SUMMARY STATISTICS
-- =====================================================
SELECT 
  '=== SUMMARY STATISTICS ===' as section,
  (SELECT COUNT(*) FROM public.profiles WHERE role IS NOT NULL) as total_users,
  (SELECT COUNT(DISTINCT role) FROM public.profiles) as unique_roles,
  (SELECT COUNT(*) FROM public.role_definitions) as defined_roles,
  (SELECT COUNT(*) FROM public.page_definitions WHERE is_active) as active_pages,
  (SELECT COUNT(*) FROM public.page_access) as access_records,
  (SELECT COUNT(*) FROM public.roles) as legacy_roles_table;
