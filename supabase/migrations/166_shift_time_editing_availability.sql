-- ============================================================================
-- MIGRATION 166: Shift Time Editing & Availability Display
-- Adds ability to edit slot times and shows availability in employee selector
-- ============================================================================

-- ============================================================================
-- 1. UPDATE SLOT TIMES FUNCTION
-- Allows admins to customize shift times per slot
-- ============================================================================
CREATE OR REPLACE FUNCTION update_slot_times(
  p_slot_id UUID,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE draft_slots
  SET 
    start_time = p_start_time,
    end_time = p_end_time,
    updated_at = now()
  WHERE id = p_slot_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot not found';
  END IF;
  
  RETURN true;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION update_slot_times TO authenticated;

-- ============================================================================
-- 2. ENHANCED GET AVAILABLE EMPLOYEES - Now with Availability Info
-- Returns employee availability preferences for the slot's day
-- ============================================================================

-- Must drop first because return type is changing
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
        AND a.date > CURRENT_DATE - 90),
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
    WHERE e.employment_status = 'Active'
    AND e.is_active = true
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

-- ============================================================================
-- COMPLETE
-- ============================================================================
