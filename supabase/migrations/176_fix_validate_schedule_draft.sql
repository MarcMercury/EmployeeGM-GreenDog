-- MIGRATION 176: Fix validate_schedule_draft format string error
-- ============================================================================
-- The validate_schedule_draft function uses %.1f which is not valid in PostgreSQL
-- PostgreSQL format() only supports %s (string), %I (identifier), %L (literal)
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_schedule_draft(p_draft_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_errors JSONB := '[]';
  v_warnings JSONB := '[]';
  v_record RECORD;
  v_coverage_score FLOAT;
  v_total_slots INT;
  v_filled_slots INT;
  v_required_unfilled INT;
BEGIN
  -- Check 1: Understaffing (required roles not filled)
  FOR v_record IN
    SELECT ds.role_label, ds.slot_date, s.name as service_name
    FROM draft_slots ds
    JOIN services s ON ds.service_id = s.id
    WHERE ds.draft_id = p_draft_id
    AND ds.is_required = true
    AND ds.employee_id IS NULL
  LOOP
    v_errors := v_errors || jsonb_build_object(
      'type', 'understaffing',
      'severity', 'error',
      'message', format('Missing required %s for %s on %s', 
        v_record.role_label, v_record.service_name, v_record.slot_date),
      'date', v_record.slot_date
    );
  END LOOP;
  
  -- Check 2: Employee double-booked in draft
  FOR v_record IN
    SELECT e.first_name, e.last_name, ds.slot_date, COUNT(*) as shift_count
    FROM draft_slots ds
    JOIN employees e ON ds.employee_id = e.id
    WHERE ds.draft_id = p_draft_id
    AND ds.employee_id IS NOT NULL
    GROUP BY e.id, e.first_name, e.last_name, ds.slot_date, ds.start_time, ds.end_time
    HAVING COUNT(*) > 1
  LOOP
    v_errors := v_errors || jsonb_build_object(
      'type', 'double_booking',
      'severity', 'error',
      'message', format('%s %s is double-booked on %s', 
        v_record.first_name, v_record.last_name, v_record.slot_date)
    );
  END LOOP;
  
  -- Check 3: Overtime warning (> 40 hours) - Fixed: use %s with ROUND() instead of %.1f
  FOR v_record IN
    SELECT e.first_name, e.last_name, 
           SUM(EXTRACT(EPOCH FROM (ds.end_time::TIME - ds.start_time::TIME))/3600) as draft_hours
    FROM draft_slots ds
    JOIN employees e ON ds.employee_id = e.id
    WHERE ds.draft_id = p_draft_id
    AND ds.employee_id IS NOT NULL
    GROUP BY e.id, e.first_name, e.last_name
    HAVING SUM(EXTRACT(EPOCH FROM (ds.end_time::TIME - ds.start_time::TIME))/3600) > 40
  LOOP
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'overtime',
      'severity', 'warning',
      'message', format('%s %s has %s hours scheduled (overtime)', 
        v_record.first_name, v_record.last_name, ROUND(v_record.draft_hours::numeric, 1))
    );
  END LOOP;
  
  -- Check 4: 7 consecutive days warning
  FOR v_record IN
    SELECT e.first_name, e.last_name, COUNT(DISTINCT ds.slot_date) as work_days
    FROM draft_slots ds
    JOIN employees e ON ds.employee_id = e.id
    WHERE ds.draft_id = p_draft_id
    AND ds.employee_id IS NOT NULL
    GROUP BY e.id, e.first_name, e.last_name
    HAVING COUNT(DISTINCT ds.slot_date) >= 7
  LOOP
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'consecutive_days',
      'severity', 'warning',
      'message', format('%s %s is scheduled %s days this week', 
        v_record.first_name, v_record.last_name, v_record.work_days)
    );
  END LOOP;
  
  -- Calculate coverage score
  SELECT COUNT(*), COUNT(*) FILTER (WHERE employee_id IS NOT NULL)
  INTO v_total_slots, v_filled_slots
  FROM draft_slots
  WHERE draft_id = p_draft_id;
  
  -- Count required unfilled slots
  SELECT COUNT(*) INTO v_required_unfilled
  FROM draft_slots
  WHERE draft_id = p_draft_id
    AND is_required = true
    AND employee_id IS NULL;
  
  v_coverage_score := CASE 
    WHEN v_total_slots > 0 THEN (v_filled_slots::FLOAT / v_total_slots::FLOAT) * 100
    ELSE 0
  END;
  
  -- Update draft with validation results
  UPDATE schedule_drafts
  SET validation_errors = v_errors,
      validation_warnings = v_warnings,
      coverage_score = v_coverage_score,
      validated_at = now(),
      status = CASE WHEN v_required_unfilled = 0 THEN 'validated' ELSE 'reviewing' END,
      updated_at = now()
  WHERE id = p_draft_id;
  
  -- is_valid is true when there are no required unfilled slots (not when errors = 0)
  -- This is because the "errors" list shows ALL unfilled required slots which can be many
  RETURN jsonb_build_object(
    'errors', v_errors,
    'warnings', v_warnings,
    'coverage_score', v_coverage_score,
    'total_slots', v_total_slots,
    'filled_slots', v_filled_slots,
    'required_unfilled', v_required_unfilled,
    'is_valid', v_required_unfilled = 0
  );
END;
$$;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION validate_schedule_draft TO authenticated;
