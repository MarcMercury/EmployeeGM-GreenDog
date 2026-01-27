-- ============================================================================
-- MIGRATION 169: Fix Dashboard Function and Page Definitions
-- Fixes column reference and ensures schedule pages exist in access matrix
-- ============================================================================

-- ============================================================================
-- 1. FIX get_schedule_dashboard FUNCTION
-- Remove reference to non-existent sort_order column
-- ============================================================================
CREATE OR REPLACE FUNCTION get_schedule_dashboard(
  p_week_start DATE
)
RETURNS TABLE (
  location_id UUID,
  location_name TEXT,
  location_code TEXT,
  draft_id UUID,
  draft_status TEXT,
  total_slots INT,
  filled_slots INT,
  required_slots INT,
  required_filled INT,
  coverage_percentage NUMERIC,
  has_draft BOOLEAN,
  published_at TIMESTAMPTZ,
  last_updated TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id as location_id,
    l.name as location_name,
    l.code as location_code,
    sd.id as draft_id,
    COALESCE(sd.status, 'none')::TEXT as draft_status,
    COALESCE((SELECT COUNT(*)::INT FROM draft_slots ds WHERE ds.draft_id = sd.id), 0) as total_slots,
    COALESCE((SELECT COUNT(*)::INT FROM draft_slots ds WHERE ds.draft_id = sd.id AND ds.employee_id IS NOT NULL), 0) as filled_slots,
    COALESCE((SELECT COUNT(*)::INT FROM draft_slots ds WHERE ds.draft_id = sd.id AND ds.is_required = true), 0) as required_slots,
    COALESCE((SELECT COUNT(*)::INT FROM draft_slots ds WHERE ds.draft_id = sd.id AND ds.is_required = true AND ds.employee_id IS NOT NULL), 0) as required_filled,
    CASE 
      WHEN COALESCE((SELECT COUNT(*) FROM draft_slots ds WHERE ds.draft_id = sd.id), 0) = 0 THEN 0
      ELSE ROUND(
        COALESCE((SELECT COUNT(*) FROM draft_slots ds WHERE ds.draft_id = sd.id AND ds.employee_id IS NOT NULL), 0)::NUMERIC /
        COALESCE((SELECT COUNT(*) FROM draft_slots ds WHERE ds.draft_id = sd.id), 1)::NUMERIC * 100,
        1
      )
    END as coverage_percentage,
    sd.id IS NOT NULL as has_draft,
    sd.published_at,
    COALESCE(sd.updated_at, sd.created_at) as last_updated
  FROM locations l
  LEFT JOIN schedule_drafts sd ON sd.location_id = l.id AND sd.week_start = p_week_start
  WHERE l.is_active = true
  ORDER BY l.name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_schedule_dashboard TO authenticated;

-- ============================================================================
-- 2. ENSURE SCHEDULE PAGES EXIST IN PAGE_DEFINITIONS
-- Use explicit path checking
-- ============================================================================

-- First check if pages exist
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM page_definitions WHERE path = '/schedule';
  RAISE NOTICE 'Schedule pages count before: %', v_count;
END $$;

-- Insert schedule pages if not exist
INSERT INTO page_definitions (path, name, section, icon, description, sort_order, is_active) VALUES
  ('/schedule', 'Schedule Command Center', 'HR', 'mdi-calendar-clock', 'Overview of weekly schedules and quick actions', 100, true)
ON CONFLICT (path) DO UPDATE SET
  name = EXCLUDED.name,
  section = EXCLUDED.section,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO page_definitions (path, name, section, icon, description, sort_order, is_active) VALUES
  ('/schedule/wizard', 'Schedule Wizard', 'HR', 'mdi-wizard-hat', 'Step-by-step service-based schedule builder', 101, true)
ON CONFLICT (path) DO UPDATE SET
  name = EXCLUDED.name,
  section = EXCLUDED.section,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO page_definitions (path, name, section, icon, description, sort_order, is_active) VALUES
  ('/schedule/builder', 'Quick Builder', 'HR', 'mdi-view-dashboard-edit', 'Drag-and-drop shift editor', 102, true)
ON CONFLICT (path) DO UPDATE SET
  name = EXCLUDED.name,
  section = EXCLUDED.section,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO page_definitions (path, name, section, icon, description, sort_order, is_active) VALUES
  ('/schedule/services', 'Service Settings', 'HR', 'mdi-medical-bag', 'Configure services and staffing requirements', 103, true)
ON CONFLICT (path) DO UPDATE SET
  name = EXCLUDED.name,
  section = EXCLUDED.section,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

-- ============================================================================
-- 3. SET ACCESS FOR SCHEDULE PAGES
-- ============================================================================
DO $$
DECLARE
  v_page_id UUID;
  v_role TEXT;
  v_access TEXT;
BEGIN
  -- For each schedule page
  FOR v_page_id IN SELECT id FROM page_definitions WHERE path IN ('/schedule', '/schedule/wizard', '/schedule/builder', '/schedule/services') LOOP
    -- Set access for each role
    FOREACH v_role IN ARRAY ARRAY['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin', 'user'] LOOP
      -- Determine access level
      IF v_role IN ('super_admin', 'admin', 'manager', 'hr_admin') THEN
        v_access := 'full';
      ELSE
        v_access := 'none';
      END IF;
      
      -- Upsert access record
      INSERT INTO page_access (page_id, role_key, access_level)
      VALUES (v_page_id, v_role, v_access)
      ON CONFLICT (page_id, role_key) DO UPDATE
      SET access_level = EXCLUDED.access_level,
          updated_at = now();
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Schedule page access configured';
END $$;

-- ============================================================================
-- 4. VERIFY RESULTS
-- ============================================================================
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM page_definitions WHERE path LIKE '/schedule%';
  RAISE NOTICE 'Schedule pages in page_definitions: %', v_count;
  
  SELECT COUNT(*) INTO v_count FROM page_access pa
    JOIN page_definitions pd ON pa.page_id = pd.id
    WHERE pd.path LIKE '/schedule%';
  RAISE NOTICE 'Schedule page access records: %', v_count;
END $$;

-- ============================================================================
-- COMPLETE
-- ============================================================================
