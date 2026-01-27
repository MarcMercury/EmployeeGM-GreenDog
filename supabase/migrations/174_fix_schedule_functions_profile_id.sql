-- ============================================================================
-- MIGRATION 174: Fix all schedule functions to use profile ID instead of auth.uid()
-- Multiple functions were inserting auth.uid() into created_by columns that FK to profiles.id
-- ============================================================================

-- ============================================================================
-- 1. FIX ai_auto_fill_draft FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION ai_auto_fill_draft(
  p_draft_id UUID,
  p_respect_availability BOOLEAN DEFAULT true,
  p_balance_hours BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft RECORD;
  v_slot RECORD;
  v_best_employee RECORD;
  v_profile_id UUID;
  v_slots_filled INT := 0;
  v_slots_skipped INT := 0;
  v_suggestions JSONB := '[]'::JSONB;
BEGIN
  -- Get profile ID for current user
  SELECT id INTO v_profile_id FROM profiles WHERE auth_user_id = auth.uid();

  -- Get draft info
  SELECT * INTO v_draft
  FROM schedule_drafts
  WHERE id = p_draft_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Draft not found');
  END IF;
  
  -- Process each unfilled slot, prioritizing required slots first
  FOR v_slot IN
    SELECT ds.*,
           s.name as service_name,
           ssr.role_category as req_role_category,
           ssr.role_label as req_role_label
    FROM draft_slots ds
    JOIN services s ON ds.service_id = s.id
    LEFT JOIN service_staffing_requirements ssr ON ds.staffing_requirement_id = ssr.id
    WHERE ds.draft_id = p_draft_id
      AND ds.employee_id IS NULL
    ORDER BY 
      ds.is_required DESC,
      ds.priority ASC,
      ds.slot_date ASC
  LOOP
    -- Find the best available employee for this slot
    SELECT 
      e.id as employee_id,
      e.first_name,
      e.last_name,
      sc.current_week_hours,
      CASE 
        WHEN ea.availability_type = 'preferred' THEN 3
        WHEN ea.availability_type = 'available' THEN 2
        WHEN ea.availability_type = 'avoid' THEN 1
        ELSE 0
      END as availability_score,
      (
        CASE 
          WHEN ea.availability_type = 'preferred' THEN 30
          WHEN ea.availability_type = 'available' THEN 20
          WHEN ea.availability_type IS NULL THEN 10
          WHEN ea.availability_type = 'avoid' THEN 5
          ELSE 0
        END
        + GREATEST(0, 30 - COALESCE(sc.current_week_hours, 0))
        + CASE 
            WHEN p.title ILIKE '%' || v_slot.role_category || '%' THEN 20
            WHEN p.title ILIKE '%dvm%' AND v_slot.role_category = 'DVM' THEN 20
            WHEN p.title ILIKE '%tech%' AND v_slot.role_category = 'Tech' THEN 15
            WHEN p.title ILIKE '%lead%' AND v_slot.role_category = 'Lead' THEN 15
            ELSE 0
          END
        + CASE 
            WHEN EXISTS (
              SELECT 1 FROM shifts sh 
              WHERE sh.employee_id = e.id 
                AND sh.service_id = v_slot.service_id
                AND sh.start_at > now() - interval '30 days'
            ) THEN 10
            ELSE 0
          END
      ) as total_score
    INTO v_best_employee
    FROM employees e
    JOIN job_positions p ON e.position_id = p.id
    LEFT JOIN scheduling_context sc ON sc.employee_id = e.id
    LEFT JOIN employee_availability ea ON 
      ea.employee_id = e.id 
      AND ea.day_of_week = EXTRACT(DOW FROM v_slot.slot_date)
      AND (ea.effective_from IS NULL OR ea.effective_from <= v_slot.slot_date)
      AND (ea.effective_until IS NULL OR ea.effective_until >= v_slot.slot_date)
    WHERE e.employment_status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM draft_slots ds2
        WHERE ds2.draft_id = p_draft_id
          AND ds2.slot_date = v_slot.slot_date
          AND ds2.employee_id = e.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM time_off_requests tor
        WHERE tor.employee_id = e.id
          AND tor.status = 'Approved'
          AND v_slot.slot_date BETWEEN tor.start_date AND tor.end_date
      )
      AND (
        NOT p_respect_availability
        OR ea.availability_type IS NULL
        OR ea.availability_type != 'unavailable'
      )
      AND (
        NOT p_balance_hours
        OR COALESCE(sc.current_week_hours, 0) < 40
      )
    ORDER BY total_score DESC
    LIMIT 1;
    
    IF v_best_employee.employee_id IS NOT NULL THEN
      UPDATE draft_slots
      SET 
        employee_id = v_best_employee.employee_id,
        ai_suggested_employee_id = v_best_employee.employee_id,
        ai_confidence = v_best_employee.total_score / 100.0,
        ai_reasoning = format(
          'Auto-assigned based on: availability score=%s, current hours=%s, position match',
          v_best_employee.availability_score,
          COALESCE(v_best_employee.current_week_hours, 0)
        ),
        assigned_at = now()
      WHERE id = v_slot.id;
      
      v_slots_filled := v_slots_filled + 1;
      
      v_suggestions := v_suggestions || jsonb_build_object(
        'slot_id', v_slot.id,
        'service', v_slot.service_name,
        'role', COALESCE(v_slot.req_role_label, v_slot.role_label),
        'date', v_slot.slot_date,
        'employee_id', v_best_employee.employee_id,
        'employee_name', v_best_employee.first_name || ' ' || v_best_employee.last_name,
        'confidence', v_best_employee.total_score
      );
    ELSE
      v_slots_skipped := v_slots_skipped + 1;
    END IF;
  END LOOP;
  
  UPDATE schedule_drafts
  SET 
    ai_suggestions = v_suggestions,
    updated_at = now()
  WHERE id = p_draft_id;
  
  -- Log this AI action using profile ID (not auth.uid())
  IF v_profile_id IS NOT NULL THEN
    INSERT INTO ai_scheduling_log (week_start, location_id, action, suggestions, created_by)
    VALUES (
      v_draft.week_start,
      v_draft.location_id,
      'auto_fill',
      jsonb_build_object(
        'slots_filled', v_slots_filled,
        'slots_skipped', v_slots_skipped,
        'suggestions', v_suggestions
      ),
      v_profile_id
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'slots_filled', v_slots_filled,
    'slots_skipped', v_slots_skipped,
    'suggestions', v_suggestions
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION ai_auto_fill_draft(UUID, BOOLEAN, BOOLEAN) TO authenticated;

-- ============================================================================
-- 2. FIX get_available_employees_for_slot FUNCTION
-- Remove invalid is_active column reference (column doesn't exist on employees)
-- ============================================================================
DROP FUNCTION IF EXISTS get_available_employees_for_slot(UUID, DATE, TIME, TIME, TEXT);

CREATE OR REPLACE FUNCTION get_available_employees_for_slot(
  p_draft_id UUID,
  p_slot_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_role_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  employee_id UUID,
  first_name TEXT,
  last_name TEXT,
  position_title TEXT,
  is_available BOOLEAN,
  conflict_reason TEXT,
  current_week_hours NUMERIC,
  reliability_score NUMERIC,
  availability_type TEXT,
  availability_note TEXT,
  preference_level INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft RECORD;
  v_slot_start TIMESTAMPTZ;
  v_slot_end TIMESTAMPTZ;
  v_day_of_week INT;
BEGIN
  -- Get draft info
  SELECT * INTO v_draft FROM schedule_drafts WHERE id = p_draft_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Draft not found';
  END IF;
  
  -- Calculate day of week for availability lookup
  v_day_of_week := EXTRACT(DOW FROM p_slot_date)::INT;
  
  -- Calculate exact timestamps
  v_slot_start := (p_slot_date::TEXT || ' ' || p_start_time::TEXT)::TIMESTAMPTZ;
  v_slot_end := (p_slot_date::TEXT || ' ' || p_end_time::TEXT)::TIMESTAMPTZ;
  
  RETURN QUERY
  WITH employee_data AS (
    SELECT 
      e.id,
      e.first_name,
      e.last_name,
      jp.title as position_title,
      -- Check for approved time off
      EXISTS (
        SELECT 1 FROM time_off_requests tor
        WHERE tor.employee_id = e.id
        AND tor.status = 'approved'
        AND p_slot_date BETWEEN tor.start_date AND tor.end_date
      ) as has_time_off,
      -- Check for existing published shifts (any location)
      EXISTS (
        SELECT 1 FROM shifts s
        WHERE s.employee_id = e.id
        AND s.status IN ('draft', 'published')
        AND (s.start_at, s.end_at) OVERLAPS (v_slot_start, v_slot_end)
      ) as has_shift_conflict,
      -- Check for assignment in this draft
      EXISTS (
        SELECT 1 FROM draft_slots ds
        WHERE ds.draft_id = p_draft_id
        AND ds.employee_id = e.id
        AND ds.slot_date = p_slot_date
        AND (ds.start_time, ds.end_time) OVERLAPS (p_start_time, p_end_time)
      ) as has_draft_conflict,
      -- Calculate current week hours
      COALESCE(
        (SELECT SUM(EXTRACT(EPOCH FROM (s.end_at - s.start_at))/3600)
         FROM shifts s
         WHERE s.employee_id = e.id
         AND s.start_at >= v_draft.week_start
         AND s.start_at < v_draft.week_start + 7),
        0
      ) as week_hours,
      -- Reliability score (from attendance if available)
      COALESCE(
        (SELECT AVG(CASE 
          WHEN a.status = 'on_time' THEN 100
          WHEN a.status = 'late' THEN 70
          WHEN a.status = 'absent' THEN 0
          ELSE 80
        END)
        FROM attendance a
        WHERE a.employee_id = e.id
        AND a.shift_date > CURRENT_DATE - 90),
        85
      ) as reliability,
      -- Get availability for this day of week
      (
        SELECT ea.availability_type
        FROM employee_availability ea
        WHERE ea.employee_id = e.id
        AND ea.day_of_week = v_day_of_week
        AND (ea.effective_from IS NULL OR ea.effective_from <= p_slot_date)
        AND (ea.effective_until IS NULL OR ea.effective_until >= p_slot_date)
        ORDER BY ea.created_at DESC
        LIMIT 1
      ) as avail_type,
      -- Get availability reason/note
      (
        SELECT ea.reason
        FROM employee_availability ea
        WHERE ea.employee_id = e.id
        AND ea.day_of_week = v_day_of_week
        AND (ea.effective_from IS NULL OR ea.effective_from <= p_slot_date)
        AND (ea.effective_until IS NULL OR ea.effective_until >= p_slot_date)
        ORDER BY ea.created_at DESC
        LIMIT 1
      ) as avail_reason,
      -- Get preference level
      (
        SELECT ea.preference_level
        FROM employee_availability ea
        WHERE ea.employee_id = e.id
        AND ea.day_of_week = v_day_of_week
        AND (ea.effective_from IS NULL OR ea.effective_from <= p_slot_date)
        AND (ea.effective_until IS NULL OR ea.effective_until >= p_slot_date)
        ORDER BY ea.created_at DESC
        LIMIT 1
      ) as pref_level
    FROM employees e
    LEFT JOIN job_positions jp ON e.position_id = jp.id
    WHERE e.employment_status = 'active'
  )
  SELECT 
    ed.id,
    ed.first_name,
    ed.last_name,
    ed.position_title,
    -- Unavailable availability type also counts as not available
    NOT (ed.has_time_off OR ed.has_shift_conflict OR ed.has_draft_conflict OR COALESCE(ed.avail_type, '') = 'unavailable') as is_available,
    CASE 
      WHEN ed.has_time_off THEN 'Approved time off'
      WHEN ed.has_shift_conflict THEN 'Scheduled elsewhere'
      WHEN ed.has_draft_conflict THEN 'Already in this draft'
      WHEN COALESCE(ed.avail_type, '') = 'unavailable' THEN 'Marked unavailable'
      ELSE NULL
    END as conflict_reason,
    ed.week_hours::NUMERIC,
    ed.reliability::NUMERIC,
    COALESCE(ed.avail_type, 'unknown') as availability_type,
    ed.avail_reason as availability_note,
    COALESCE(ed.pref_level, 0)::INT as preference_level
  FROM employee_data ed
  ORDER BY 
    -- Available first
    NOT (ed.has_time_off OR ed.has_shift_conflict OR ed.has_draft_conflict OR COALESCE(ed.avail_type, '') = 'unavailable') DESC,
    -- Preferred > Available > Unknown > Avoid > Unavailable
    CASE ed.avail_type
      WHEN 'preferred' THEN 1
      WHEN 'available' THEN 2
      WHEN NULL THEN 3
      WHEN 'avoid' THEN 4
      WHEN 'unavailable' THEN 5
      ELSE 3
    END ASC,
    ed.reliability DESC,
    ed.week_hours ASC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_employees_for_slot(UUID, DATE, TIME, TIME, TEXT) TO authenticated;

-- ============================================================================
-- 3. FIX assign_employee_to_slot FUNCTION
-- Uses auth.uid() for assigned_by but FK references profiles.id
-- ============================================================================
CREATE OR REPLACE FUNCTION assign_employee_to_slot(
  p_slot_id UUID,
  p_employee_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot RECORD;
  v_profile_id UUID;
BEGIN
  -- Get profile ID for current user
  SELECT id INTO v_profile_id FROM profiles WHERE auth_user_id = auth.uid();

  -- Get slot details
  SELECT * INTO v_slot FROM draft_slots WHERE id = p_slot_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot not found';
  END IF;
  
  -- Update the slot
  UPDATE draft_slots
  SET employee_id = p_employee_id,
      assigned_at = now(),
      assigned_by = v_profile_id,
      updated_at = now()
  WHERE id = p_slot_id;
  
  RETURN true;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION assign_employee_to_slot(UUID, UUID) TO authenticated;
-- ============================================================================
-- 4. FIX publish_schedule_draft FUNCTION
-- Uses auth.uid() for published_by on both schedule_weeks and schedule_drafts
-- ============================================================================
CREATE OR REPLACE FUNCTION publish_schedule_draft(p_draft_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft RECORD;
  v_slot RECORD;
  v_schedule_week_id UUID;
  v_profile_id UUID;
BEGIN
  -- Get profile ID for current user
  SELECT id INTO v_profile_id FROM profiles WHERE auth_user_id = auth.uid();

  -- Get draft
  SELECT * INTO v_draft FROM schedule_drafts WHERE id = p_draft_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Draft not found';
  END IF;
  
  -- Get or create schedule_week
  SELECT id INTO v_schedule_week_id
  FROM schedule_weeks
  WHERE location_id = v_draft.location_id AND week_start = v_draft.week_start;
  
  IF v_schedule_week_id IS NULL THEN
    INSERT INTO schedule_weeks (location_id, week_start, status)
    VALUES (v_draft.location_id, v_draft.week_start, 'draft')
    RETURNING id INTO v_schedule_week_id;
  END IF;
  
  -- Convert draft_slots to shifts
  FOR v_slot IN
    SELECT ds.*, s.name as service_name
    FROM draft_slots ds
    JOIN services s ON ds.service_id = s.id
    WHERE ds.draft_id = p_draft_id
    AND ds.employee_id IS NOT NULL
  LOOP
    INSERT INTO shifts (
      employee_id,
      location_id,
      service_id,
      staffing_requirement_id,
      schedule_week_id,
      start_at,
      end_at,
      role_required,
      status,
      is_published,
      assignment_source
    ) VALUES (
      v_slot.employee_id,
      v_draft.location_id,
      v_slot.service_id,
      v_slot.staffing_requirement_id,
      v_schedule_week_id,
      (v_slot.slot_date::TEXT || ' ' || v_slot.start_time::TEXT)::TIMESTAMPTZ,
      (v_slot.slot_date::TEXT || ' ' || v_slot.end_time::TEXT)::TIMESTAMPTZ,
      v_slot.role_label,
      'published',
      true,
      'manual'
    );
  END LOOP;
  
  -- Update schedule_week status (use profile ID, not auth.uid())
  UPDATE schedule_weeks
  SET status = 'published',
      published_at = now(),
      published_by = v_profile_id
  WHERE id = v_schedule_week_id;
  
  -- Mark draft as published (use profile ID, not auth.uid())
  UPDATE schedule_drafts
  SET status = 'published',
      published_at = now(),
      published_by = v_profile_id
  WHERE id = p_draft_id;
  
  RETURN true;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION publish_schedule_draft(UUID) TO authenticated;

-- ============================================================================
-- 5. FIX save_template_from_draft FUNCTION
-- Uses auth.uid() for created_by on schedule_templates
-- ============================================================================
CREATE OR REPLACE FUNCTION save_template_from_draft(
  p_draft_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_location_specific BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft RECORD;
  v_template_id UUID;
  v_slot_defs JSONB := '[]'::JSONB;
  v_slot RECORD;
  v_profile_id UUID;
BEGIN
  -- Get profile ID for current user
  SELECT id INTO v_profile_id FROM profiles WHERE auth_user_id = auth.uid();

  -- Get draft info
  SELECT * INTO v_draft FROM schedule_drafts WHERE id = p_draft_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Draft not found';
  END IF;
  
  -- Build slot definitions from draft slots
  FOR v_slot IN
    SELECT DISTINCT ON (ds.service_id, ds.role_category, ds.role_label, EXTRACT(DOW FROM ds.slot_date))
      s.code as service_code,
      ds.role_label,
      ds.role_category,
      EXTRACT(DOW FROM ds.slot_date)::INT as day_of_week,
      ds.start_time::TEXT,
      ds.end_time::TEXT,
      ds.is_required,
      ds.priority
    FROM draft_slots ds
    JOIN services s ON ds.service_id = s.id
    WHERE ds.draft_id = p_draft_id
    ORDER BY ds.service_id, ds.role_category, ds.role_label, EXTRACT(DOW FROM ds.slot_date), ds.priority
  LOOP
    v_slot_defs := v_slot_defs || jsonb_build_object(
      'service_code', v_slot.service_code,
      'role_label', v_slot.role_label,
      'role_category', v_slot.role_category,
      'day_of_week', v_slot.day_of_week,
      'start_time', v_slot.start_time,
      'end_time', v_slot.end_time,
      'is_required', v_slot.is_required,
      'priority', v_slot.priority
    );
  END LOOP;
  
  -- Create template (use profile ID, not auth.uid())
  INSERT INTO schedule_templates (
    name,
    description,
    location_id,
    operational_days,
    service_ids,
    slot_definitions,
    created_by
  ) VALUES (
    p_name,
    p_description,
    CASE WHEN p_location_specific THEN v_draft.location_id ELSE NULL END,
    v_draft.operational_days,
    v_draft.selected_service_ids,
    v_slot_defs,
    v_profile_id
  )
  RETURNING id INTO v_template_id;
  
  RETURN v_template_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION save_template_from_draft(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;

-- ============================================================================
-- 6. FIX apply_template_to_draft FUNCTION
-- Uses auth.uid() for created_by on schedule_drafts
-- ============================================================================
CREATE OR REPLACE FUNCTION apply_template_to_draft(
  p_template_id UUID,
  p_location_id UUID,
  p_week_start DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template RECORD;
  v_draft_id UUID;
  v_slot JSONB;
  v_service_id UUID;
  v_slot_date DATE;
  v_day INT;
  v_profile_id UUID;
BEGIN
  -- Get profile ID for current user
  SELECT id INTO v_profile_id FROM profiles WHERE auth_user_id = auth.uid();

  -- Get template
  SELECT * INTO v_template FROM schedule_templates WHERE id = p_template_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
  
  -- Check for existing draft
  SELECT id INTO v_draft_id
  FROM schedule_drafts
  WHERE location_id = p_location_id AND week_start = p_week_start;
  
  IF v_draft_id IS NOT NULL THEN
    -- Clear existing slots
    DELETE FROM draft_slots WHERE draft_id = v_draft_id;
    
    -- Update draft with template settings
    UPDATE schedule_drafts
    SET 
      operational_days = v_template.operational_days,
      selected_service_ids = v_template.service_ids,
      status = 'building',
      updated_at = now()
    WHERE id = v_draft_id;
  ELSE
    -- Create new draft (use profile ID, not auth.uid())
    INSERT INTO schedule_drafts (
      location_id,
      week_start,
      operational_days,
      selected_service_ids,
      created_by
    ) VALUES (
      p_location_id,
      p_week_start,
      v_template.operational_days,
      v_template.service_ids,
      v_profile_id
    )
    RETURNING id INTO v_draft_id;
  END IF;
  
  -- Create slots from template definitions
  FOR v_slot IN SELECT * FROM jsonb_array_elements(v_template.slot_definitions)
  LOOP
    -- Get service ID by code
    SELECT id INTO v_service_id FROM services WHERE code = v_slot->>'service_code';
    
    IF v_service_id IS NOT NULL THEN
      -- Calculate slot date
      v_day := (v_slot->>'day_of_week')::INT;
      v_slot_date := p_week_start + v_day;
      
      -- Only create if day is in operational days
      IF v_day = ANY(v_template.operational_days) THEN
        INSERT INTO draft_slots (
          draft_id,
          service_id,
          role_category,
          role_label,
          slot_date,
          start_time,
          end_time,
          is_required,
          priority
        ) VALUES (
          v_draft_id,
          v_service_id,
          v_slot->>'role_category',
          v_slot->>'role_label',
          v_slot_date,
          (v_slot->>'start_time')::TIME,
          (v_slot->>'end_time')::TIME,
          COALESCE((v_slot->>'is_required')::BOOLEAN, true),
          COALESCE((v_slot->>'priority')::INT, 1)
        );
      END IF;
    END IF;
  END LOOP;
  
  -- Update template usage stats
  UPDATE schedule_templates
  SET 
    usage_count = usage_count + 1,
    last_used_at = now()
  WHERE id = p_template_id;
  
  RETURN v_draft_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION apply_template_to_draft(UUID, UUID, DATE) TO authenticated;

-- ============================================================================
-- 7. FIX RLS POLICIES
-- Policies were using WHERE id = auth.uid() but should use WHERE auth_user_id = auth.uid()
-- The profiles.id is NOT the same as auth.uid() - we need to match on auth_user_id
-- ============================================================================

-- Fix schedule_drafts policies
DROP POLICY IF EXISTS "schedule_drafts_select_admin" ON schedule_drafts;
CREATE POLICY "schedule_drafts_select_admin" ON schedule_drafts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin')
    )
  );

DROP POLICY IF EXISTS "schedule_drafts_modify_admin" ON schedule_drafts;
CREATE POLICY "schedule_drafts_modify_admin" ON schedule_drafts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin')
    )
  );

-- Fix draft_slots policies
DROP POLICY IF EXISTS "draft_slots_select_admin" ON draft_slots;
CREATE POLICY "draft_slots_select_admin" ON draft_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin')
    )
  );

DROP POLICY IF EXISTS "draft_slots_modify_admin" ON draft_slots;
CREATE POLICY "draft_slots_modify_admin" ON draft_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin')
    )
  );

-- Fix schedule_templates policy (from migration 167)
DROP POLICY IF EXISTS "schedule_templates_modify" ON schedule_templates;
CREATE POLICY "schedule_templates_modify" ON schedule_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr_admin', 'manager'))
);