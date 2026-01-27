-- ============================================================================
-- MIGRATION 165: Copy Previous Week & AI Auto-Fill
-- Adds functionality to copy schedules and intelligently auto-assign employees
-- ============================================================================

-- ============================================================================
-- 1. COPY PREVIOUS WEEK SCHEDULE FUNCTION
-- Copies employee assignments from the previous week's published schedule
-- ============================================================================
CREATE OR REPLACE FUNCTION copy_previous_week_schedule(
  p_draft_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft RECORD;
  v_previous_week DATE;
  v_slots_updated INT := 0;
  v_slots_skipped INT := 0;
  v_slot RECORD;
  v_prev_shift RECORD;
BEGIN
  -- Get draft info
  SELECT * INTO v_draft
  FROM schedule_drafts
  WHERE id = p_draft_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Draft not found');
  END IF;
  
  -- Calculate previous week
  v_previous_week := v_draft.week_start - 7;
  
  -- Loop through each unfilled slot in the draft
  FOR v_slot IN
    SELECT ds.*
    FROM draft_slots ds
    WHERE ds.draft_id = p_draft_id
      AND ds.employee_id IS NULL
    ORDER BY ds.slot_date, ds.priority
  LOOP
    -- Find a matching shift from the previous week
    -- Match by: same day of week, same service, similar role
    SELECT sh.* INTO v_prev_shift
    FROM shifts sh
    JOIN schedule_weeks sw ON sh.schedule_week_id = sw.id
    WHERE sw.week_start = v_previous_week
      AND sw.location_id = v_draft.location_id
      AND sw.status = 'published'
      AND sh.employee_id IS NOT NULL
      AND sh.service_id = v_slot.service_id
      AND EXTRACT(DOW FROM sh.start_at) = EXTRACT(DOW FROM v_slot.slot_date)
      -- Try to match role category
      AND (
        sh.staffing_requirement_id IN (
          SELECT id FROM service_staffing_requirements 
          WHERE role_category = v_slot.role_category
        )
        OR sh.notes ILIKE '%' || v_slot.role_category || '%'
      )
    LIMIT 1;
    
    IF FOUND THEN
      -- Check if this employee is already assigned to this date in the draft
      IF NOT EXISTS (
        SELECT 1 FROM draft_slots 
        WHERE draft_id = p_draft_id 
          AND slot_date = v_slot.slot_date 
          AND employee_id = v_prev_shift.employee_id
      ) THEN
        -- Assign the employee
        UPDATE draft_slots
        SET 
          employee_id = v_prev_shift.employee_id,
          assigned_at = now(),
          ai_reasoning = 'Copied from previous week schedule'
        WHERE id = v_slot.id;
        
        v_slots_updated := v_slots_updated + 1;
      ELSE
        v_slots_skipped := v_slots_skipped + 1;
      END IF;
    ELSE
      v_slots_skipped := v_slots_skipped + 1;
    END IF;
  END LOOP;
  
  -- Update draft
  UPDATE schedule_drafts
  SET updated_at = now()
  WHERE id = p_draft_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'slots_filled', v_slots_updated,
    'slots_skipped', v_slots_skipped,
    'previous_week', v_previous_week
  );
END;
$$;

-- ============================================================================
-- 2. AI AUTO-FILL DRAFT FUNCTION
-- Intelligently assigns employees based on availability, skills, and workload
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
  v_slots_filled INT := 0;
  v_slots_skipped INT := 0;
  v_suggestions JSONB := '[]'::JSONB;
BEGIN
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
           ssr.role_category,
           ssr.role_label
    FROM draft_slots ds
    JOIN services s ON ds.service_id = s.id
    LEFT JOIN service_staffing_requirements ssr ON ds.staffing_requirement_id = ssr.id
    WHERE ds.draft_id = p_draft_id
      AND ds.employee_id IS NULL
    ORDER BY 
      ds.is_required DESC, -- Required slots first
      ds.priority ASC,      -- Higher priority first
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
      -- Calculate a composite score
      (
        -- Availability preference (0-30 points)
        CASE 
          WHEN ea.availability_type = 'preferred' THEN 30
          WHEN ea.availability_type = 'available' THEN 20
          WHEN ea.availability_type IS NULL THEN 10 -- No preference recorded
          WHEN ea.availability_type = 'avoid' THEN 5
          ELSE 0
        END
        -- Hours balance (0-30 points, more points if fewer hours)
        + GREATEST(0, 30 - COALESCE(sc.current_week_hours, 0))
        -- Position match bonus (0-20 points)
        + CASE 
            WHEN p.title ILIKE '%' || v_slot.role_category || '%' THEN 20
            WHEN p.title ILIKE '%dvm%' AND v_slot.role_category = 'DVM' THEN 20
            WHEN p.title ILIKE '%tech%' AND v_slot.role_category = 'Tech' THEN 15
            WHEN p.title ILIKE '%lead%' AND v_slot.role_category = 'Lead' THEN 15
            ELSE 0
          END
        -- Recent assignment to same service bonus (0-10 points)
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
    WHERE e.employment_status = 'Active'
      -- Not already assigned on this date in this draft
      AND NOT EXISTS (
        SELECT 1 FROM draft_slots ds2
        WHERE ds2.draft_id = p_draft_id
          AND ds2.slot_date = v_slot.slot_date
          AND ds2.employee_id = e.id
      )
      -- Not on approved time off
      AND NOT EXISTS (
        SELECT 1 FROM time_off_requests tor
        WHERE tor.employee_id = e.id
          AND tor.status = 'Approved'
          AND v_slot.slot_date BETWEEN tor.start_date AND tor.end_date
      )
      -- Respect availability preference if enabled
      AND (
        NOT p_respect_availability
        OR ea.availability_type IS NULL
        OR ea.availability_type != 'unavailable'
      )
      -- Check hours cap if balance enabled (max 40 hours)
      AND (
        NOT p_balance_hours
        OR COALESCE(sc.current_week_hours, 0) < 40
      )
    ORDER BY total_score DESC
    LIMIT 1;
    
    IF v_best_employee.employee_id IS NOT NULL THEN
      -- Assign the employee
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
      
      -- Add to suggestions log
      v_suggestions := v_suggestions || jsonb_build_object(
        'slot_id', v_slot.id,
        'service', v_slot.service_name,
        'role', v_slot.role_label,
        'date', v_slot.slot_date,
        'employee_id', v_best_employee.employee_id,
        'employee_name', v_best_employee.first_name || ' ' || v_best_employee.last_name,
        'confidence', v_best_employee.total_score
      );
    ELSE
      v_slots_skipped := v_slots_skipped + 1;
    END IF;
  END LOOP;
  
  -- Update draft with AI analysis
  UPDATE schedule_drafts
  SET 
    ai_suggestions = v_suggestions,
    updated_at = now()
  WHERE id = p_draft_id;
  
  -- Log this AI action
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
    auth.uid()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'slots_filled', v_slots_filled,
    'slots_skipped', v_slots_skipped,
    'suggestions', v_suggestions
  );
END;
$$;

-- ============================================================================
-- 3. GET EMPLOYEE HOURS FOR WEEK FUNCTION
-- Calculates hours an employee is scheduled for in a given week
-- ============================================================================
CREATE OR REPLACE FUNCTION get_employee_week_hours(
  p_employee_id UUID,
  p_week_start DATE,
  p_draft_id UUID DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_published_hours NUMERIC := 0;
  v_draft_hours NUMERIC := 0;
BEGIN
  -- Get hours from published shifts
  SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_at - start_at)) / 3600), 0)
  INTO v_published_hours
  FROM shifts
  WHERE employee_id = p_employee_id
    AND start_at >= p_week_start
    AND start_at < p_week_start + 7;
  
  -- Get hours from draft slots (if draft specified)
  IF p_draft_id IS NOT NULL THEN
    SELECT COALESCE(SUM(
      EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
    ), 0)
    INTO v_draft_hours
    FROM draft_slots
    WHERE draft_id = p_draft_id
      AND employee_id = p_employee_id;
  END IF;
  
  RETURN v_published_hours + v_draft_hours;
END;
$$;

-- ============================================================================
-- 4. CLEAR ALL DRAFT ASSIGNMENTS FUNCTION
-- Resets all slots in a draft to unassigned
-- ============================================================================
CREATE OR REPLACE FUNCTION clear_draft_assignments(
  p_draft_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cleared INT;
BEGIN
  UPDATE draft_slots
  SET 
    employee_id = NULL,
    ai_suggested_employee_id = NULL,
    ai_confidence = NULL,
    ai_reasoning = NULL,
    assigned_at = NULL,
    assigned_by = NULL,
    has_conflict = false,
    conflict_reason = NULL,
    updated_at = now()
  WHERE draft_id = p_draft_id
    AND employee_id IS NOT NULL;
  
  GET DIAGNOSTICS v_cleared = ROW_COUNT;
  
  UPDATE schedule_drafts
  SET 
    ai_suggestions = '[]'::JSONB,
    updated_at = now()
  WHERE id = p_draft_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'slots_cleared', v_cleared
  );
END;
$$;

-- ============================================================================
-- COMPLETE
-- ============================================================================
