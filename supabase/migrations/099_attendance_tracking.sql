-- =====================================================
-- Attendance Tracking System
-- Migration 099 - Excused Absences & Weighted Scoring
-- =====================================================
-- This migration introduces a comprehensive attendance tracking system
-- that distinguishes between excused and unexcused attendance events,
-- implements weighted reliability scoring, and provides admin override capability.

-- =====================================================
-- 1. CREATE ATTENDANCE TABLE
-- =====================================================
-- This table tracks attendance events derived from shifts and time entries.
-- It allows for more granular tracking including excused/unexcused status.

CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  shift_date DATE NOT NULL,
  scheduled_start TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  
  -- Status with support for excused variants
  -- present: On time (within grace period)
  -- late: Arrived late (unexcused)
  -- excused_late: Arrived late but excused by admin
  -- absent: Did not show up (unexcused)
  -- excused_absent: Did not show up but excused by admin
  -- no_show: Did not show or clock in (highest penalty)
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN (
    'present',
    'late',
    'excused_late',
    'absent',
    'excused_absent',
    'no_show'
  )),
  
  -- Minutes late (for late arrivals)
  minutes_late INTEGER DEFAULT 0,
  
  -- Excuse tracking
  excused_at TIMESTAMPTZ,
  excused_by_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  excuse_reason TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Penalty weight for scoring (0.0 to 1.0)
  -- Default weights:
  -- present = 0.0, late = 1.0, excused_late = 0.25
  -- absent = 1.0, excused_absent = 0.25, no_show = 1.0
  penalty_weight NUMERIC(3,2) DEFAULT 0.0,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON public.attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_shift_date ON public.attendance(shift_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_shift ON public.attendance(shift_id);

-- Unique constraint: one attendance record per shift per employee
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_employee_shift 
ON public.attendance(employee_id, shift_id) WHERE shift_id IS NOT NULL;

-- =====================================================
-- 2. ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Users can view their own attendance records
DROP POLICY IF EXISTS "Users can view own attendance" ON public.attendance;
CREATE POLICY "Users can view own attendance" ON public.attendance
FOR SELECT
USING (
  employee_id IN (
    SELECT e.id FROM employees e
    JOIN profiles p ON e.profile_id = p.id
    WHERE p.auth_user_id = auth.uid()
  )
);

-- Admins can view all attendance records
DROP POLICY IF EXISTS "Admins can view all attendance" ON public.attendance;
CREATE POLICY "Admins can view all attendance" ON public.attendance
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role = 'admin'
  )
);

-- Managers can view their direct reports' attendance
DROP POLICY IF EXISTS "Managers can view reports attendance" ON public.attendance;
CREATE POLICY "Managers can view reports attendance" ON public.attendance
FOR SELECT
USING (
  employee_id IN (
    SELECT e.id FROM employees e
    WHERE e.manager_employee_id IN (
      SELECT emp.id FROM employees emp
      JOIN profiles p ON emp.profile_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  )
);

-- Only admins, managers, and hr_admin can insert attendance records
DROP POLICY IF EXISTS "Admins can insert attendance" ON public.attendance;
CREATE POLICY "Admins can insert attendance" ON public.attendance
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    LEFT JOIN profile_roles pr ON p.id = pr.profile_id
    LEFT JOIN roles r ON pr.role_id = r.id
    WHERE p.auth_user_id = auth.uid()
    AND (
      p.role = 'admin'
      OR r.key IN ('admin', 'manager', 'hr_admin')
    )
  )
);

-- Only admins, managers, and hr_admin can update attendance records (for excusing)
DROP POLICY IF EXISTS "Admins can update attendance" ON public.attendance;
CREATE POLICY "Admins can update attendance" ON public.attendance
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    LEFT JOIN profile_roles pr ON p.id = pr.profile_id
    LEFT JOIN roles r ON pr.role_id = r.id
    WHERE p.auth_user_id = auth.uid()
    AND (
      p.role = 'admin'
      OR r.key IN ('admin', 'manager', 'hr_admin')
    )
  )
);

-- =====================================================
-- 3. TRIGGER: Auto-set penalty weight based on status
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_attendance_penalty_weight()
RETURNS TRIGGER AS $$
BEGIN
  -- Set penalty weight based on status
  -- The "Quarter Penalty" rule: excused = 25% impact
  CASE NEW.status
    WHEN 'present' THEN
      NEW.penalty_weight := 0.0;
    WHEN 'late' THEN
      NEW.penalty_weight := 1.0;
    WHEN 'excused_late' THEN
      NEW.penalty_weight := 0.25;
    WHEN 'absent' THEN
      NEW.penalty_weight := 1.0;
    WHEN 'excused_absent' THEN
      NEW.penalty_weight := 0.25;
    WHEN 'no_show' THEN
      NEW.penalty_weight := 1.0;
    ELSE
      NEW.penalty_weight := 0.0;
  END CASE;
  
  -- Update the updated_at timestamp
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attendance_penalty_weight ON public.attendance;
CREATE TRIGGER trg_attendance_penalty_weight
BEFORE INSERT OR UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.set_attendance_penalty_weight();

-- =====================================================
-- 4. FUNCTION: Calculate Reliability Score
-- =====================================================
-- This function calculates the reliability score for an employee
-- using weighted penalties for different attendance statuses.
-- Returns a score from 0-100.

CREATE OR REPLACE FUNCTION public.calculate_reliability_score(
  p_employee_id UUID,
  p_lookback_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
  v_total_records INTEGER;
  v_total_penalty NUMERIC;
  v_score INTEGER;
BEGIN
  -- Count total attendance records in the lookback period
  SELECT COUNT(*), COALESCE(SUM(penalty_weight), 0)
  INTO v_total_records, v_total_penalty
  FROM public.attendance
  WHERE employee_id = p_employee_id
    AND shift_date >= CURRENT_DATE - p_lookback_days;
  
  -- If no records, return 100 (perfect score)
  IF v_total_records = 0 THEN
    RETURN 100;
  END IF;
  
  -- Calculate score: 100 - (total_penalty / total_records * 100)
  -- This gives us a percentage where:
  -- - All present = 100%
  -- - All late = 0%
  -- - 4 excused_late = same as 1 late (0.25 * 4 = 1.0)
  v_score := GREATEST(0, LEAST(100, 
    ROUND(100 - (v_total_penalty / v_total_records * 100))
  ));
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. FUNCTION: Get Attendance Breakdown
-- =====================================================
-- Returns a summary of attendance records by status for an employee

CREATE OR REPLACE FUNCTION public.get_attendance_breakdown(
  p_employee_id UUID,
  p_lookback_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  status TEXT,
  count BIGINT,
  penalty_sum NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.status,
    COUNT(*)::BIGINT as count,
    SUM(a.penalty_weight) as penalty_sum
  FROM public.attendance a
  WHERE a.employee_id = p_employee_id
    AND a.shift_date >= CURRENT_DATE - p_lookback_days
  GROUP BY a.status
  ORDER BY 
    CASE a.status
      WHEN 'no_show' THEN 1
      WHEN 'absent' THEN 2
      WHEN 'excused_absent' THEN 3
      WHEN 'late' THEN 4
      WHEN 'excused_late' THEN 5
      WHEN 'present' THEN 6
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. FUNCTION: Get Attendance Details by Status
-- =====================================================
-- Returns detailed records for a specific status (for drill-down UI)

CREATE OR REPLACE FUNCTION public.get_attendance_by_status(
  p_employee_id UUID,
  p_status TEXT,
  p_lookback_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  id UUID,
  shift_date DATE,
  scheduled_start TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  minutes_late INTEGER,
  notes TEXT,
  excuse_reason TEXT,
  excused_at TIMESTAMPTZ,
  excused_by_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.shift_date,
    a.scheduled_start,
    a.actual_start,
    a.minutes_late,
    a.notes,
    a.excuse_reason,
    a.excused_at,
    CASE 
      WHEN e.id IS NOT NULL THEN CONCAT(e.first_name, ' ', e.last_name)
      ELSE NULL
    END as excused_by_name
  FROM public.attendance a
  LEFT JOIN public.employees e ON a.excused_by_employee_id = e.id
  WHERE a.employee_id = p_employee_id
    AND a.status = p_status
    AND a.shift_date >= CURRENT_DATE - p_lookback_days
  ORDER BY a.shift_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. FUNCTION: Convert to Excused Status
-- =====================================================
-- Allows admins/managers to convert a late/absent to excused
-- and triggers recalculation of reliability score

CREATE OR REPLACE FUNCTION public.convert_to_excused(
  p_attendance_id UUID,
  p_excusing_employee_id UUID,
  p_excuse_reason TEXT
)
RETURNS public.attendance AS $$
DECLARE
  v_record public.attendance;
  v_new_status TEXT;
BEGIN
  -- Get the current record
  SELECT * INTO v_record
  FROM public.attendance
  WHERE id = p_attendance_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attendance record not found';
  END IF;
  
  -- Determine new status based on current status
  CASE v_record.status
    WHEN 'late' THEN
      v_new_status := 'excused_late';
    WHEN 'absent' THEN
      v_new_status := 'excused_absent';
    WHEN 'no_show' THEN
      -- no_show can be converted to excused_absent
      v_new_status := 'excused_absent';
    ELSE
      -- Already excused or present, no change needed
      RETURN v_record;
  END CASE;
  
  -- Update the record
  UPDATE public.attendance
  SET 
    status = v_new_status,
    excused_at = NOW(),
    excused_by_employee_id = p_excusing_employee_id,
    excuse_reason = p_excuse_reason,
    updated_at = NOW()
  WHERE id = p_attendance_id
  RETURNING * INTO v_record;
  
  RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. FUNCTION: Sync attendance from shifts/time_entries
-- =====================================================
-- This function can be called to generate/update attendance records
-- based on completed shifts and their time entries

CREATE OR REPLACE FUNCTION public.sync_attendance_from_shift(
  p_shift_id UUID
)
RETURNS public.attendance AS $$
DECLARE
  v_shift public.shifts;
  v_entry public.time_entries;
  v_employee_id UUID;
  v_status TEXT;
  v_minutes_late INTEGER;
  v_record public.attendance;
  v_grace_period INTEGER := 5; -- 5 minute grace period
BEGIN
  -- Get the shift
  SELECT * INTO v_shift
  FROM public.shifts
  WHERE id = p_shift_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;
  
  v_employee_id := v_shift.employee_id;
  
  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'Shift has no employee assigned';
  END IF;
  
  -- Get the time entry for this shift
  SELECT * INTO v_entry
  FROM public.time_entries
  WHERE shift_id = p_shift_id
    AND employee_id = v_employee_id
  LIMIT 1;
  
  -- Determine status
  IF v_entry IS NULL OR v_entry.clock_in_at IS NULL THEN
    -- No clock in found - could be no_show or absent
    IF v_shift.status = 'missed' THEN
      v_status := 'no_show';
    ELSE
      v_status := 'absent';
    END IF;
    v_minutes_late := 0;
  ELSE
    -- Calculate minutes late
    v_minutes_late := GREATEST(0, 
      EXTRACT(EPOCH FROM (v_entry.clock_in_at - v_shift.start_at)) / 60
    )::INTEGER;
    
    IF v_minutes_late <= v_grace_period THEN
      v_status := 'present';
      v_minutes_late := 0;
    ELSE
      v_status := 'late';
    END IF;
  END IF;
  
  -- Upsert the attendance record
  INSERT INTO public.attendance (
    employee_id,
    shift_id,
    shift_date,
    scheduled_start,
    actual_start,
    status,
    minutes_late
  )
  VALUES (
    v_employee_id,
    p_shift_id,
    v_shift.start_at::DATE,
    v_shift.start_at,
    v_entry.clock_in_at,
    v_status,
    v_minutes_late
  )
  ON CONFLICT (employee_id, shift_id)
  DO UPDATE SET
    actual_start = EXCLUDED.actual_start,
    status = CASE 
      WHEN public.attendance.status LIKE 'excused_%' THEN public.attendance.status
      ELSE EXCLUDED.status
    END,
    minutes_late = EXCLUDED.minutes_late,
    updated_at = NOW()
  RETURNING * INTO v_record;
  
  RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. Grant execute permissions on functions
-- =====================================================
GRANT EXECUTE ON FUNCTION public.calculate_reliability_score(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_attendance_breakdown(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_attendance_by_status(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_to_excused(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_attendance_from_shift(UUID) TO authenticated;

-- =====================================================
-- 10. Add helpful comments
-- =====================================================
COMMENT ON TABLE public.attendance IS 'Tracks employee attendance events with support for excused/unexcused status and weighted reliability scoring';
COMMENT ON COLUMN public.attendance.status IS 'Attendance status: present, late, excused_late, absent, excused_absent, no_show';
COMMENT ON COLUMN public.attendance.penalty_weight IS 'Penalty weight for reliability scoring (0.0 = no impact, 1.0 = full impact, 0.25 = excused)';
COMMENT ON FUNCTION public.calculate_reliability_score IS 'Calculates weighted reliability score (0-100) using the Quarter Penalty rule for excused absences';
COMMENT ON FUNCTION public.convert_to_excused IS 'Converts a late/absent/no_show record to excused status with reason and updates reliability score';
