-- ============================================================================
-- MIGRATION 168: Schedule Pages Access Control
-- Adds schedule pages to page_definitions and sets proper role access
-- ============================================================================

-- ============================================================================
-- 1. ADD SCHEDULE PAGES TO PAGE_DEFINITIONS
-- ============================================================================
INSERT INTO public.page_definitions (path, name, section, icon, description, sort_order) VALUES
  ('/schedule', 'Schedule Command Center', 'HR', 'mdi-calendar-clock', 'Overview of weekly schedules and quick actions', 100),
  ('/schedule/wizard', 'Schedule Wizard', 'HR', 'mdi-wizard-hat', 'Step-by-step service-based schedule builder', 101),
  ('/schedule/builder', 'Quick Builder', 'HR', 'mdi-view-dashboard-edit', 'Drag-and-drop shift editor', 102),
  ('/schedule/services', 'Service Settings', 'HR', 'mdi-medical-bag', 'Configure services and staffing requirements', 103)
ON CONFLICT (path) DO UPDATE SET
  name = EXCLUDED.name,
  section = EXCLUDED.section,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- 2. SET ACCESS LEVELS FOR SCHEDULE PAGES
-- Only super_admin, admin, manager, hr_admin get full access
-- All other roles get 'none'
-- ============================================================================
DO $$
DECLARE
  v_page RECORD;
  v_role TEXT;
  v_access_level TEXT;
BEGIN
  -- Loop through schedule pages
  FOR v_page IN 
    SELECT id, path FROM public.page_definitions 
    WHERE path LIKE '/schedule%'
  LOOP
    -- Set access for each role
    FOR v_role IN SELECT unnest(ARRAY['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin', 'user']) LOOP
      -- Determine access level based on role
      IF v_role IN ('super_admin', 'admin', 'manager', 'hr_admin') THEN
        v_access_level := 'full';
      ELSE
        v_access_level := 'none';
      END IF;
      
      -- Insert or update access record
      INSERT INTO public.page_access (page_id, role_key, access_level)
      VALUES (v_page.id, v_role, v_access_level)
      ON CONFLICT (page_id, role_key) DO UPDATE
      SET access_level = EXCLUDED.access_level,
          updated_at = now();
    END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- 3. VERIFY SCHEDULE RPC FUNCTIONS EXIST
-- These were created in migrations 159-167
-- ============================================================================

-- Check that key functions exist and log results
DO $$
DECLARE
  v_func TEXT;
  v_exists BOOLEAN;
BEGIN
  FOR v_func IN SELECT unnest(ARRAY[
    'create_schedule_draft',
    'get_available_employees_for_slot',
    'assign_employee_to_slot',
    'validate_schedule_draft',
    'publish_schedule_draft',
    'copy_previous_week_schedule',
    'ai_auto_fill_draft',
    'clear_draft_assignments',
    'update_slot_times',
    'get_schedule_dashboard',
    'save_template_from_draft',
    'apply_template_to_draft',
    'list_schedule_templates',
    'delete_schedule_template'
  ]) LOOP
    SELECT EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = v_func
    ) INTO v_exists;
    
    IF NOT v_exists THEN
      RAISE WARNING 'Schedule function missing: %', v_func;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 4. ADD SCHEDULE SECTION TO TYPES IF NOT EXISTS
-- Update section icons map
-- ============================================================================

-- Ensure HR section icon is set
UPDATE public.page_definitions
SET section = 'HR'
WHERE path LIKE '/schedule%' AND section != 'HR';

-- ============================================================================
-- COMPLETE
-- ============================================================================
