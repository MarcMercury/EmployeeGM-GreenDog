-- ============================================================================
-- MIGRATION 160: Scheduling System Phase 2 - Helper Functions & Views
-- Builds on Phase 1 (Migration 159) foundation
-- ============================================================================

-- ============================================================================
-- 1. GET SERVICES WITH STAFFING REQUIREMENTS
-- Returns services with their staffing requirements for schedule builder
-- ============================================================================
CREATE OR REPLACE FUNCTION get_services_with_requirements(p_location_id UUID DEFAULT NULL)
RETURNS TABLE (
  service_id UUID,
  service_name TEXT,
  service_code TEXT,
  service_color TEXT,
  service_icon TEXT,
  requires_dvm BOOLEAN,
  min_staff INT,
  max_staff INT,
  staffing_requirements JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as service_id,
    s.name as service_name,
    s.code as service_code,
    s.color as service_color,
    s.icon as service_icon,
    s.requires_dvm,
    s.min_staff_count as min_staff,
    s.max_staff_count as max_staff,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', ssr.id,
          'role_category', ssr.role_category,
          'role_label', ssr.role_label,
          'min_count', ssr.min_count,
          'max_count', ssr.max_count,
          'is_required', ssr.is_required,
          'priority', ssr.priority,
          'position_id', ssr.position_id,
          'position_title', jp.title
        ) ORDER BY ssr.sort_order, ssr.priority
      )
      FROM service_staffing_requirements ssr
      LEFT JOIN job_positions jp ON ssr.position_id = jp.id
      WHERE ssr.service_id = s.id),
      '[]'::jsonb
    ) as staffing_requirements
  FROM services s
  WHERE s.is_active = true
  ORDER BY s.sort_order, s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. GET EMPLOYEE SCHEDULING CONTEXT
-- Returns employees with availability, skills, and recent hours
-- ============================================================================
CREATE OR REPLACE FUNCTION get_employee_scheduling_context(
  p_location_id UUID DEFAULT NULL,
  p_week_start DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  employee_id UUID,
  first_name TEXT,
  last_name TEXT,
  position_id UUID,
  position_title TEXT,
  employment_type TEXT,
  primary_location_id UUID,
  skills TEXT[],
  skill_levels JSONB,
  availability JSONB,
  scheduled_hours_this_week NUMERIC,
  scheduled_hours_4_weeks NUMERIC,
  time_off_dates DATE[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as employee_id,
    e.first_name,
    e.last_name,
    e.position_id,
    jp.title as position_title,
    e.employment_type,
    (SELECT el.location_id FROM employee_locations el WHERE el.employee_id = e.id LIMIT 1) as primary_location_id,
    -- Skills as array
    COALESCE(
      (SELECT array_agg(DISTINCT sl.name) 
       FROM employee_skills es 
       JOIN skill_library sl ON es.skill_id = sl.id 
       WHERE es.employee_id = e.id),
      ARRAY[]::TEXT[]
    ) as skills,
    -- Skill levels as JSONB
    COALESCE(
      (SELECT jsonb_object_agg(sl.name, es.level)
       FROM employee_skills es 
       JOIN skill_library sl ON es.skill_id = sl.id 
       WHERE es.employee_id = e.id),
      '{}'::jsonb
    ) as skill_levels,
    -- Availability preferences
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'day_of_week', ea.day_of_week,
          'start_time', ea.start_time::TEXT,
          'end_time', ea.end_time::TEXT,
          'type', ea.availability_type,
          'preference', ea.preference_level
        )
      )
      FROM employee_availability ea
      WHERE ea.employee_id = e.id
      AND ea.is_recurring = true
      AND (ea.effective_until IS NULL OR ea.effective_until >= p_week_start)),
      '[]'::jsonb
    ) as availability,
    -- Hours scheduled this week
    COALESCE(
      (SELECT SUM(EXTRACT(EPOCH FROM (sh.end_at - sh.start_at))/3600)::NUMERIC(10,2)
       FROM shifts sh 
       WHERE sh.employee_id = e.id 
       AND sh.start_at >= p_week_start
       AND sh.start_at < p_week_start + interval '7 days'),
      0
    ) as scheduled_hours_this_week,
    -- Hours scheduled last 4 weeks
    COALESCE(
      (SELECT SUM(EXTRACT(EPOCH FROM (sh.end_at - sh.start_at))/3600)::NUMERIC(10,2)
       FROM shifts sh 
       WHERE sh.employee_id = e.id 
       AND sh.start_at >= p_week_start - interval '4 weeks'
       AND sh.start_at < p_week_start + interval '7 days'),
      0
    ) as scheduled_hours_4_weeks,
    -- Time off dates this week
    COALESCE(
      (SELECT array_agg(DISTINCT d::DATE)
       FROM time_off_requests tor
       CROSS JOIN generate_series(tor.start_date::DATE, tor.end_date::DATE, '1 day') d
       WHERE tor.employee_id = e.id
       AND tor.status = 'approved'
       AND d >= p_week_start
       AND d < p_week_start + interval '7 days'),
      ARRAY[]::DATE[]
    ) as time_off_dates
  FROM employees e
  LEFT JOIN job_positions jp ON e.position_id = jp.id
  WHERE e.employment_status = 'Active'
  AND (p_location_id IS NULL OR EXISTS (
    SELECT 1 FROM employee_locations el 
    WHERE el.employee_id = e.id 
    AND el.location_id = p_location_id
  ))
  ORDER BY e.last_name, e.first_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. GET OR CREATE SCHEDULE WEEK
-- Ensures a schedule_weeks record exists for the given week/location
-- ============================================================================
CREATE OR REPLACE FUNCTION get_or_create_schedule_week(
  p_location_id UUID,
  p_week_start DATE
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Try to find existing
  SELECT id INTO v_id
  FROM schedule_weeks
  WHERE location_id = p_location_id
  AND week_start = p_week_start;
  
  -- Create if not exists
  IF v_id IS NULL THEN
    INSERT INTO schedule_weeks (location_id, week_start, status)
    VALUES (p_location_id, p_week_start, 'draft')
    RETURNING id INTO v_id;
  END IF;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. VALIDATE SHIFT ASSIGNMENT
-- Check if assigning employee to shift violates any rules
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_shift_assignment(
  p_employee_id UUID,
  p_shift_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_location_id UUID DEFAULT NULL,
  p_exclude_shift_id UUID DEFAULT NULL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  violations JSONB
) AS $$
DECLARE
  v_violations JSONB := '[]'::jsonb;
  v_shift_hours NUMERIC;
  v_week_hours NUMERIC;
  v_day_hours NUMERIC;
  v_last_shift_end TIMESTAMPTZ;
  v_rest_hours NUMERIC;
  v_consecutive_days INT;
  v_rule RECORD;
BEGIN
  -- Calculate shift hours
  v_shift_hours := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600;
  IF v_shift_hours < 0 THEN
    v_shift_hours := v_shift_hours + 24; -- Overnight shift
  END IF;
  
  -- Calculate day hours (including this shift)
  SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (sh.end_at - sh.start_at))/3600), 0)
  INTO v_day_hours
  FROM shifts sh
  WHERE sh.employee_id = p_employee_id
  AND sh.start_at::DATE = p_shift_date
  AND (p_exclude_shift_id IS NULL OR sh.id != p_exclude_shift_id);
  v_day_hours := v_day_hours + v_shift_hours;
  
  -- Calculate week hours
  SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (sh.end_at - sh.start_at))/3600), 0)
  INTO v_week_hours
  FROM shifts sh
  WHERE sh.employee_id = p_employee_id
  AND sh.start_at >= date_trunc('week', p_shift_date::TIMESTAMP)
  AND sh.start_at < date_trunc('week', p_shift_date::TIMESTAMP) + interval '7 days'
  AND (p_exclude_shift_id IS NULL OR sh.id != p_exclude_shift_id);
  v_week_hours := v_week_hours + v_shift_hours;
  
  -- Check last shift end for rest time
  SELECT MAX(sh.end_at)
  INTO v_last_shift_end
  FROM shifts sh
  WHERE sh.employee_id = p_employee_id
  AND sh.end_at < (p_shift_date + p_start_time)
  AND (p_exclude_shift_id IS NULL OR sh.id != p_exclude_shift_id);
  
  IF v_last_shift_end IS NOT NULL THEN
    v_rest_hours := EXTRACT(EPOCH FROM ((p_shift_date + p_start_time) - v_last_shift_end)) / 3600;
  END IF;
  
  -- Check consecutive days
  WITH work_days AS (
    SELECT DISTINCT sh.start_at::DATE as work_date
    FROM shifts sh
    WHERE sh.employee_id = p_employee_id
    AND sh.start_at::DATE BETWEEN p_shift_date - interval '7 days' AND p_shift_date
    UNION
    SELECT p_shift_date
  )
  SELECT COUNT(*) INTO v_consecutive_days
  FROM (
    SELECT work_date, 
           work_date - (ROW_NUMBER() OVER (ORDER BY work_date))::INT as grp
    FROM work_days
  ) grouped
  WHERE grp = (SELECT work_date - (ROW_NUMBER() OVER (ORDER BY work_date))::INT 
               FROM work_days 
               WHERE work_date = p_shift_date);
  
  -- Check rules
  FOR v_rule IN 
    SELECT * FROM scheduling_rules 
    WHERE is_active = true
    AND (location_id IS NULL OR location_id = p_location_id)
  LOOP
    CASE v_rule.rule_type
      WHEN 'max_hours_per_day' THEN
        IF v_day_hours > (v_rule.parameters->>'max_hours')::NUMERIC THEN
          v_violations := v_violations || jsonb_build_object(
            'rule', v_rule.name,
            'type', v_rule.rule_type,
            'severity', v_rule.severity,
            'message', format('Exceeds daily limit: %.1f hours (max %s)', v_day_hours, v_rule.parameters->>'max_hours')
          );
        END IF;
        
      WHEN 'max_hours_per_week' THEN
        IF v_week_hours > (v_rule.parameters->>'max_hours')::NUMERIC THEN
          v_violations := v_violations || jsonb_build_object(
            'rule', v_rule.name,
            'type', v_rule.rule_type,
            'severity', v_rule.severity,
            'message', format('Exceeds weekly limit: %.1f hours (max %s)', v_week_hours, v_rule.parameters->>'max_hours')
          );
        ELSIF (v_rule.parameters->>'warning_at') IS NOT NULL 
              AND v_week_hours > (v_rule.parameters->>'warning_at')::NUMERIC THEN
          v_violations := v_violations || jsonb_build_object(
            'rule', v_rule.name,
            'type', v_rule.rule_type,
            'severity', 'info',
            'message', format('Approaching weekly limit: %.1f hours', v_week_hours)
          );
        END IF;
        
      WHEN 'min_rest_between_shifts' THEN
        IF v_rest_hours IS NOT NULL AND v_rest_hours < (v_rule.parameters->>'min_hours')::NUMERIC THEN
          v_violations := v_violations || jsonb_build_object(
            'rule', v_rule.name,
            'type', v_rule.rule_type,
            'severity', v_rule.severity,
            'message', format('Insufficient rest: %.1f hours since last shift (min %s)', v_rest_hours, v_rule.parameters->>'min_hours')
          );
        END IF;
        
      WHEN 'max_consecutive_days' THEN
        IF v_consecutive_days > (v_rule.parameters->>'max_days')::INT THEN
          v_violations := v_violations || jsonb_build_object(
            'rule', v_rule.name,
            'type', v_rule.rule_type,
            'severity', v_rule.severity,
            'message', format('Too many consecutive days: %s (max %s)', v_consecutive_days, v_rule.parameters->>'max_days')
          );
        END IF;
        
      WHEN 'overtime_threshold' THEN
        IF v_week_hours > (v_rule.parameters->>'threshold_hours')::NUMERIC THEN
          v_violations := v_violations || jsonb_build_object(
            'rule', v_rule.name,
            'type', v_rule.rule_type,
            'severity', v_rule.severity,
            'message', format('Overtime: %.1f hours this week', v_week_hours)
          );
        END IF;
        
      ELSE
        -- Custom rules could be handled here
        NULL;
    END CASE;
  END LOOP;
  
  -- Check time off
  IF EXISTS (
    SELECT 1 FROM time_off_requests tor
    WHERE tor.employee_id = p_employee_id
    AND tor.status = 'approved'
    AND p_shift_date BETWEEN tor.start_date::DATE AND tor.end_date::DATE
  ) THEN
    v_violations := v_violations || jsonb_build_object(
      'rule', 'Time Off',
      'type', 'time_off_conflict',
      'severity', 'error',
      'message', 'Employee has approved time off on this date'
    );
  END IF;
  
  -- Check availability preference
  DECLARE
    v_avail RECORD;
  BEGIN
    SELECT * INTO v_avail
    FROM employee_availability ea
    WHERE ea.employee_id = p_employee_id
    AND ea.day_of_week = EXTRACT(DOW FROM p_shift_date)
    AND ea.is_recurring = true
    AND (ea.effective_until IS NULL OR ea.effective_until >= p_shift_date)
    LIMIT 1;
    
    IF v_avail IS NOT NULL THEN
      IF v_avail.availability_type = 'unavailable' THEN
        v_violations := v_violations || jsonb_build_object(
          'rule', 'Availability',
          'type', 'availability_conflict',
          'severity', 'error',
          'message', format('Employee marked unavailable on %s', to_char(p_shift_date, 'Day'))
        );
      ELSIF v_avail.availability_type = 'avoid' THEN
        v_violations := v_violations || jsonb_build_object(
          'rule', 'Availability Preference',
          'type', 'availability_preference',
          'severity', 'warning',
          'message', format('Employee prefers to avoid %s', to_char(p_shift_date, 'Day'))
        );
      END IF;
    END IF;
  END;
  
  RETURN QUERY SELECT 
    jsonb_array_length(v_violations) = 0 
    OR NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_violations) v 
      WHERE v->>'severity' = 'error'
    ),
    v_violations;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. GENERATE SHIFT TEMPLATES FOR WEEK
-- Creates shift slots for a week based on service_slots
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_shifts_from_template(
  p_location_id UUID,
  p_week_start DATE
)
RETURNS INT AS $$
DECLARE
  v_schedule_week_id UUID;
  v_count INT := 0;
  v_slot RECORD;
  v_req RECORD;
  v_shift_date DATE;
  v_start_at TIMESTAMPTZ;
  v_end_at TIMESTAMPTZ;
BEGIN
  -- Get or create schedule week
  v_schedule_week_id := get_or_create_schedule_week(p_location_id, p_week_start);
  
  -- Loop through service slots for this location
  FOR v_slot IN 
    SELECT ss.*, s.name as service_name, s.color as service_color
    FROM service_slots ss
    JOIN services s ON ss.service_id = s.id
    WHERE ss.location_id = p_location_id
    AND ss.is_active = true
    AND s.is_active = true
    AND (ss.effective_from IS NULL OR ss.effective_from <= p_week_start + 6)
    AND (ss.effective_until IS NULL OR ss.effective_until >= p_week_start)
  LOOP
    -- Calculate actual date for this day of week
    v_shift_date := p_week_start + v_slot.day_of_week;
    v_start_at := v_shift_date + v_slot.start_time;
    v_end_at := v_shift_date + v_slot.end_time;
    
    -- If end time is before start time, it's overnight
    IF v_slot.end_time < v_slot.start_time THEN
      v_end_at := v_end_at + interval '1 day';
    END IF;
    
    -- Create shifts for each staffing requirement
    FOR v_req IN
      SELECT * FROM service_staffing_requirements ssr
      WHERE ssr.service_id = v_slot.service_id
      ORDER BY ssr.sort_order, ssr.priority
    LOOP
      -- Create min_count shifts for required roles
      FOR i IN 1..v_req.min_count LOOP
        -- Check if shift already exists
        IF NOT EXISTS (
          SELECT 1 FROM shifts
          WHERE schedule_week_id = v_schedule_week_id
          AND service_slot_id = v_slot.id
          AND staffing_requirement_id = v_req.id
          AND start_at = v_start_at
        ) THEN
          INSERT INTO shifts (
            location_id,
            schedule_week_id,
            service_id,
            service_slot_id,
            staffing_requirement_id,
            start_at,
            end_at,
            shift_type,
            assignment_source,
            is_open_shift
          ) VALUES (
            p_location_id,
            v_schedule_week_id,
            v_slot.service_id,
            v_slot.id,
            v_req.id,
            v_start_at,
            v_end_at,
            'regular',
            'template',
            true
          );
          v_count := v_count + 1;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. PUBLISH SCHEDULE WEEK
-- Marks a week as published and notifies employees
-- ============================================================================
CREATE OR REPLACE FUNCTION publish_schedule_week(
  p_schedule_week_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- Update schedule week status
  UPDATE schedule_weeks
  SET 
    status = 'published',
    published_at = now(),
    published_by = v_user_id,
    updated_at = now()
  WHERE id = p_schedule_week_id
  AND status IN ('draft', 'review');
  
  -- Update all shifts to published
  UPDATE shifts
  SET is_published = true
  WHERE schedule_week_id = p_schedule_week_id;
  
  -- Create notifications for employees with shifts
  INSERT INTO notifications (
    user_id,
    title,
    message,
    category,
    reference_type,
    reference_id
  )
  SELECT DISTINCT
    e.profile_id,
    'Schedule Published',
    format('Your schedule for week of %s has been published', 
      to_char(sw.week_start, 'Mon DD, YYYY')),
    'schedule',
    'schedule_week',
    sw.id
  FROM shifts sh
  JOIN schedule_weeks sw ON sh.schedule_week_id = sw.id
  JOIN employees e ON sh.employee_id = e.id
  WHERE sw.id = p_schedule_week_id
  AND e.profile_id IS NOT NULL;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. GET SCHEDULE WEEK SUMMARY
-- Returns summary stats for a schedule week
-- ============================================================================
CREATE OR REPLACE FUNCTION get_schedule_week_summary(
  p_location_id UUID,
  p_week_start DATE
)
RETURNS TABLE (
  schedule_week_id UUID,
  status TEXT,
  total_shifts INT,
  filled_shifts INT,
  open_shifts INT,
  coverage_percentage NUMERIC,
  total_hours NUMERIC,
  published_at TIMESTAMPTZ,
  services JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sw.id as schedule_week_id,
    sw.status,
    sw.total_shifts,
    sw.filled_shifts,
    sw.open_shifts,
    CASE 
      WHEN sw.total_shifts > 0 
      THEN ROUND((sw.filled_shifts::NUMERIC / sw.total_shifts::NUMERIC) * 100, 1)
      ELSE 0
    END as coverage_percentage,
    COALESCE(
      (SELECT SUM(EXTRACT(EPOCH FROM (sh.end_at - sh.start_at))/3600)::NUMERIC(10,1)
       FROM shifts sh WHERE sh.schedule_week_id = sw.id),
      0
    ) as total_hours,
    sw.published_at,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'service_id', s.id,
          'service_name', s.name,
          'service_code', s.code,
          'color', s.color,
          'total', (SELECT COUNT(*) FROM shifts sh2 
                    WHERE sh2.schedule_week_id = sw.id AND sh2.service_id = s.id),
          'filled', (SELECT COUNT(*) FROM shifts sh2 
                     WHERE sh2.schedule_week_id = sw.id 
                     AND sh2.service_id = s.id 
                     AND sh2.employee_id IS NOT NULL)
        ) ORDER BY s.sort_order
      )
      FROM services s
      WHERE EXISTS (
        SELECT 1 FROM shifts sh3 
        WHERE sh3.schedule_week_id = sw.id 
        AND sh3.service_id = s.id
      )),
      '[]'::jsonb
    ) as services
  FROM schedule_weeks sw
  WHERE sw.location_id = p_location_id
  AND sw.week_start = p_week_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. VIEW: SHIFT DETAILS WITH CONTEXT
-- Enriched shift view for schedule builder
-- ============================================================================
CREATE OR REPLACE VIEW shift_builder_details AS
SELECT 
  sh.id as shift_id,
  sh.location_id,
  l.name as location_name,
  sh.schedule_week_id,
  sw.week_start,
  sw.status as week_status,
  sh.service_id,
  s.name as service_name,
  s.code as service_code,
  s.color as service_color,
  sh.staffing_requirement_id,
  ssr.role_category,
  ssr.role_label,
  sh.employee_id,
  e.first_name as employee_first_name,
  e.last_name as employee_last_name,
  jp.title as employee_position,
  sh.start_at,
  sh.end_at,
  EXTRACT(EPOCH FROM (sh.end_at - sh.start_at))/3600 as hours,
  sh.is_published,
  sh.is_open_shift,
  sh.ai_suggested,
  sh.ai_confidence,
  sh.ai_reasoning,
  sh.conflict_flags,
  sh.assignment_source,
  sh.notes
FROM shifts sh
LEFT JOIN locations l ON sh.location_id = l.id
LEFT JOIN schedule_weeks sw ON sh.schedule_week_id = sw.id
LEFT JOIN services s ON sh.service_id = s.id
LEFT JOIN service_staffing_requirements ssr ON sh.staffing_requirement_id = ssr.id
LEFT JOIN employees e ON sh.employee_id = e.id
LEFT JOIN job_positions jp ON e.position_id = jp.id;

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_services_with_requirements TO authenticated;
GRANT EXECUTE ON FUNCTION get_employee_scheduling_context TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_schedule_week TO authenticated;
GRANT EXECUTE ON FUNCTION validate_shift_assignment TO authenticated;
GRANT EXECUTE ON FUNCTION generate_shifts_from_template TO authenticated;
GRANT EXECUTE ON FUNCTION publish_schedule_week TO authenticated;
GRANT EXECUTE ON FUNCTION get_schedule_week_summary TO authenticated;
GRANT SELECT ON shift_builder_details TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
