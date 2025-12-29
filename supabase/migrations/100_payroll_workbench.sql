-- =====================================================
-- Payroll Review Workbench - Database Support
-- Migration 100 - Payroll Adjustments & Signoffs
-- =====================================================
-- This migration creates the infrastructure for a comprehensive
-- payroll review system with adjustments tracking and approval workflow.

-- =====================================================
-- 1. CREATE PAYROLL_ADJUSTMENTS TABLE
-- =====================================================
-- Tracks bonuses, reimbursements, commissions, and deductions
-- that need to be added to an employee's pay for a given period.

CREATE TABLE IF NOT EXISTS public.payroll_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  
  -- Type of adjustment
  type TEXT NOT NULL CHECK (type IN (
    'bonus',
    'reimbursement', 
    'commission',
    'deduction',
    'pto_payout',
    'holiday_pay',
    'other'
  )),
  
  -- Amount (positive for additions, negative for deductions stored as positive with type='deduction')
  amount NUMERIC(10,2) NOT NULL,
  
  -- Description/note for this adjustment
  note TEXT,
  
  -- Audit trail
  created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_employee 
  ON public.payroll_adjustments(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_period 
  ON public.payroll_adjustments(pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_type 
  ON public.payroll_adjustments(type);

-- =====================================================
-- 2. CREATE PAYROLL_SIGNOFFS TABLE
-- =====================================================
-- Tracks the approval status for each employee's payroll per period.
-- This is the "Confirm & Mark Approved" status.

CREATE TABLE IF NOT EXISTS public.payroll_signoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  
  -- Approval status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'approved',
    'disputed',
    'needs_review'
  )),
  
  -- Calculated totals (cached for quick access)
  regular_hours NUMERIC(10,2) DEFAULT 0,
  overtime_hours NUMERIC(10,2) DEFAULT 0,
  double_time_hours NUMERIC(10,2) DEFAULT 0,
  pto_hours NUMERIC(10,2) DEFAULT 0,
  total_adjustments NUMERIC(10,2) DEFAULT 0,
  gross_pay_estimate NUMERIC(10,2) DEFAULT 0,
  
  -- Flags for issues
  has_missing_punches BOOLEAN DEFAULT FALSE,
  has_negative_hours BOOLEAN DEFAULT FALSE,
  requires_attention BOOLEAN DEFAULT FALSE,
  attention_reason TEXT,
  
  -- Approval tracking
  reviewed_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  
  -- Notes from reviewer
  reviewer_notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One signoff per employee per period
  UNIQUE(employee_id, pay_period_start, pay_period_end)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payroll_signoffs_employee 
  ON public.payroll_signoffs(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_signoffs_period 
  ON public.payroll_signoffs(pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_signoffs_status 
  ON public.payroll_signoffs(status);
CREATE INDEX IF NOT EXISTS idx_payroll_signoffs_requires_attention 
  ON public.payroll_signoffs(requires_attention) WHERE requires_attention = TRUE;

-- =====================================================
-- 3. CREATE TIME_ENTRY_CORRECTIONS TABLE
-- =====================================================
-- Tracks manual corrections made to time entries during payroll review.
-- This preserves the original data while recording the corrected values.

CREATE TABLE IF NOT EXISTS public.time_entry_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  
  -- Original values
  original_clock_in TIMESTAMPTZ,
  original_clock_out TIMESTAMPTZ,
  original_total_hours NUMERIC(10,2),
  
  -- Corrected values
  corrected_clock_in TIMESTAMPTZ,
  corrected_clock_out TIMESTAMPTZ,
  corrected_total_hours NUMERIC(10,2),
  
  -- Reason for correction
  correction_reason TEXT NOT NULL,
  
  -- Audit
  corrected_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  corrected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(time_entry_id, pay_period_start, pay_period_end)
);

CREATE INDEX IF NOT EXISTS idx_time_entry_corrections_entry 
  ON public.time_entry_corrections(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_time_entry_corrections_period 
  ON public.time_entry_corrections(pay_period_start, pay_period_end);

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================

-- Payroll Adjustments RLS
ALTER TABLE public.payroll_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage payroll adjustments" ON public.payroll_adjustments;
CREATE POLICY "Admins manage payroll adjustments" ON public.payroll_adjustments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Users view own adjustments" ON public.payroll_adjustments;
CREATE POLICY "Users view own adjustments" ON public.payroll_adjustments
FOR SELECT USING (
  employee_id IN (
    SELECT e.id FROM employees e
    JOIN profiles p ON e.profile_id = p.id
    WHERE p.auth_user_id = auth.uid()
  )
);

-- Payroll Signoffs RLS
ALTER TABLE public.payroll_signoffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage payroll signoffs" ON public.payroll_signoffs;
CREATE POLICY "Admins manage payroll signoffs" ON public.payroll_signoffs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Users view own signoffs" ON public.payroll_signoffs;
CREATE POLICY "Users view own signoffs" ON public.payroll_signoffs
FOR SELECT USING (
  employee_id IN (
    SELECT e.id FROM employees e
    JOIN profiles p ON e.profile_id = p.id
    WHERE p.auth_user_id = auth.uid()
  )
);

-- Time Entry Corrections RLS
ALTER TABLE public.time_entry_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage time corrections" ON public.time_entry_corrections;
CREATE POLICY "Admins manage time corrections" ON public.time_entry_corrections
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role = 'admin'
  )
);

-- =====================================================
-- 5. AUTO-UPDATE TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION update_payroll_adjustment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payroll_adjustments_updated ON public.payroll_adjustments;
CREATE TRIGGER trg_payroll_adjustments_updated
BEFORE UPDATE ON public.payroll_adjustments
FOR EACH ROW EXECUTE FUNCTION update_payroll_adjustment_timestamp();

DROP TRIGGER IF EXISTS trg_payroll_signoffs_updated ON public.payroll_signoffs;
CREATE TRIGGER trg_payroll_signoffs_updated
BEFORE UPDATE ON public.payroll_signoffs
FOR EACH ROW EXECUTE FUNCTION update_payroll_adjustment_timestamp();

-- =====================================================
-- 6. HELPER FUNCTION: Calculate OT Hours (California Rules)
-- =====================================================
-- California OT Rules:
-- - Daily OT (1.5x): Hours > 8 in a day
-- - Daily DT (2.0x): Hours > 12 in a day  
-- - Weekly OT (1.5x): Hours > 40 in a week (after daily OT is calculated)
-- - 7th consecutive day: First 8 hours at 1.5x, remaining at 2.0x

CREATE OR REPLACE FUNCTION public.calculate_overtime_breakdown(
  p_employee_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  regular_hours NUMERIC,
  overtime_hours NUMERIC,
  double_time_hours NUMERIC,
  total_hours NUMERIC
) AS $$
DECLARE
  v_day DATE;
  v_daily_hours NUMERIC;
  v_daily_regular NUMERIC;
  v_daily_ot NUMERIC;
  v_daily_dt NUMERIC;
  v_week_start DATE;
  v_weekly_hours NUMERIC;
  v_total_regular NUMERIC := 0;
  v_total_ot NUMERIC := 0;
  v_total_dt NUMERIC := 0;
BEGIN
  -- Process each day in the range
  FOR v_day IN SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::DATE
  LOOP
    -- Get total hours for this day from time_entries
    -- Use corrected values if available
    SELECT COALESCE(
      (SELECT SUM(COALESCE(tec.corrected_total_hours, te.total_hours))
       FROM time_entries te
       LEFT JOIN time_entry_corrections tec ON te.id = tec.time_entry_id
         AND tec.pay_period_start = p_start_date
         AND tec.pay_period_end = p_end_date
       WHERE te.employee_id = p_employee_id
         AND te.clock_in_at::DATE = v_day
         AND te.total_hours IS NOT NULL),
      0
    ) INTO v_daily_hours;
    
    -- California Daily OT Calculation
    IF v_daily_hours <= 8 THEN
      v_daily_regular := v_daily_hours;
      v_daily_ot := 0;
      v_daily_dt := 0;
    ELSIF v_daily_hours <= 12 THEN
      v_daily_regular := 8;
      v_daily_ot := v_daily_hours - 8;
      v_daily_dt := 0;
    ELSE
      v_daily_regular := 8;
      v_daily_ot := 4; -- Hours 8-12
      v_daily_dt := v_daily_hours - 12; -- Hours beyond 12
    END IF;
    
    v_total_regular := v_total_regular + v_daily_regular;
    v_total_ot := v_total_ot + v_daily_ot;
    v_total_dt := v_total_dt + v_daily_dt;
  END LOOP;
  
  -- Weekly OT check: if regular hours > 40, convert excess to OT
  IF v_total_regular > 40 THEN
    v_total_ot := v_total_ot + (v_total_regular - 40);
    v_total_regular := 40;
  END IF;
  
  RETURN QUERY SELECT 
    v_total_regular,
    v_total_ot,
    v_total_dt,
    v_total_regular + v_total_ot + v_total_dt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. HELPER FUNCTION: Get Payroll Summary for Period
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_payroll_summary(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  employee_id UUID,
  employee_name TEXT,
  department_name TEXT,
  pay_rate NUMERIC,
  pay_type TEXT,
  regular_hours NUMERIC,
  overtime_hours NUMERIC,
  double_time_hours NUMERIC,
  pto_hours NUMERIC,
  adjustments_total NUMERIC,
  gross_pay_estimate NUMERIC,
  status TEXT,
  has_issues BOOLEAN,
  issue_details TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH employee_hours AS (
    SELECT 
      e.id as emp_id,
      (public.calculate_overtime_breakdown(e.id, p_start_date, p_end_date)).*
    FROM employees e
    WHERE e.employment_status = 'active'
  ),
  pto_hours AS (
    SELECT 
      tor.employee_id,
      COALESCE(SUM(tor.duration_hours), 0) as hours
    FROM time_off_requests tor
    WHERE tor.status = 'approved'
      AND tor.start_date <= p_end_date
      AND tor.end_date >= p_start_date
    GROUP BY tor.employee_id
  ),
  adjustments AS (
    SELECT 
      pa.employee_id,
      SUM(CASE WHEN pa.type = 'deduction' THEN -pa.amount ELSE pa.amount END) as total
    FROM payroll_adjustments pa
    WHERE pa.pay_period_start = p_start_date
      AND pa.pay_period_end = p_end_date
    GROUP BY pa.employee_id
  ),
  signoffs AS (
    SELECT 
      ps.employee_id,
      ps.status,
      ps.requires_attention,
      ps.attention_reason,
      ps.has_missing_punches,
      ps.has_negative_hours
    FROM payroll_signoffs ps
    WHERE ps.pay_period_start = p_start_date
      AND ps.pay_period_end = p_end_date
  ),
  missing_punches AS (
    SELECT 
      te.employee_id,
      COUNT(*) as missing_count
    FROM time_entries te
    WHERE te.clock_in_at::DATE BETWEEN p_start_date AND p_end_date
      AND (te.clock_out_at IS NULL OR te.total_hours IS NULL OR te.total_hours < 0)
    GROUP BY te.employee_id
  )
  SELECT
    e.id as employee_id,
    CONCAT(e.first_name, ' ', e.last_name) as employee_name,
    d.name as department_name,
    COALESCE(ec.pay_rate, 0) as pay_rate,
    COALESCE(ec.pay_type, 'Hourly') as pay_type,
    COALESCE(eh.regular_hours, 0) as regular_hours,
    COALESCE(eh.overtime_hours, 0) as overtime_hours,
    COALESCE(eh.double_time_hours, 0) as double_time_hours,
    COALESCE(ph.hours, 0) as pto_hours,
    COALESCE(adj.total, 0) as adjustments_total,
    -- Gross pay calculation
    CASE 
      WHEN COALESCE(ec.pay_type, 'Hourly') = 'Hourly' THEN
        (COALESCE(eh.regular_hours, 0) * COALESCE(ec.pay_rate, 0)) +
        (COALESCE(eh.overtime_hours, 0) * COALESCE(ec.pay_rate, 0) * 1.5) +
        (COALESCE(eh.double_time_hours, 0) * COALESCE(ec.pay_rate, 0) * 2.0) +
        (COALESCE(ph.hours, 0) * COALESCE(ec.pay_rate, 0)) +
        COALESCE(adj.total, 0)
      ELSE
        -- Salaried: Convert to bi-weekly equivalent
        (COALESCE(ec.pay_rate, 0) / 26) + COALESCE(adj.total, 0)
    END as gross_pay_estimate,
    COALESCE(so.status, 'pending') as status,
    -- Has issues if missing punches or attention required
    (COALESCE(mp.missing_count, 0) > 0 OR COALESCE(so.requires_attention, false)) as has_issues,
    CASE 
      WHEN COALESCE(mp.missing_count, 0) > 0 THEN 
        CONCAT(mp.missing_count, ' missing clock-out(s)')
      WHEN COALESCE(so.attention_reason, '') != '' THEN 
        so.attention_reason
      ELSE NULL
    END as issue_details
  FROM employees e
  LEFT JOIN departments d ON e.department_id = d.id
  LEFT JOIN employee_compensation ec ON e.id = ec.employee_id
  LEFT JOIN employee_hours eh ON e.id = eh.emp_id
  LEFT JOIN pto_hours ph ON e.id = ph.employee_id
  LEFT JOIN adjustments adj ON e.id = adj.employee_id
  LEFT JOIN signoffs so ON e.id = so.employee_id
  LEFT JOIN missing_punches mp ON e.id = mp.employee_id
  WHERE e.employment_status = 'active'
  ORDER BY e.last_name, e.first_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. HELPER FUNCTION: Get Employee Time Entries for Period
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_employee_timecard(
  p_employee_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  entry_id UUID,
  shift_id UUID,
  entry_date DATE,
  clock_in_at TIMESTAMPTZ,
  clock_out_at TIMESTAMPTZ,
  original_clock_in TIMESTAMPTZ,
  original_clock_out TIMESTAMPTZ,
  total_hours NUMERIC,
  is_corrected BOOLEAN,
  correction_reason TEXT,
  has_issue BOOLEAN,
  issue_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    te.id as entry_id,
    te.shift_id,
    te.clock_in_at::DATE as entry_date,
    COALESCE(tec.corrected_clock_in, te.clock_in_at) as clock_in_at,
    COALESCE(tec.corrected_clock_out, te.clock_out_at) as clock_out_at,
    te.clock_in_at as original_clock_in,
    te.clock_out_at as original_clock_out,
    COALESCE(tec.corrected_total_hours, te.total_hours) as total_hours,
    tec.id IS NOT NULL as is_corrected,
    tec.correction_reason,
    (te.clock_out_at IS NULL OR te.total_hours IS NULL OR te.total_hours < 0) as has_issue,
    CASE
      WHEN te.clock_out_at IS NULL THEN 'missing_clock_out'
      WHEN te.total_hours IS NULL THEN 'missing_hours'
      WHEN te.total_hours < 0 THEN 'negative_hours'
      ELSE NULL
    END as issue_type
  FROM time_entries te
  LEFT JOIN time_entry_corrections tec ON te.id = tec.time_entry_id
    AND tec.pay_period_start = p_start_date
    AND tec.pay_period_end = p_end_date
  WHERE te.employee_id = p_employee_id
    AND te.clock_in_at::DATE BETWEEN p_start_date AND p_end_date
  ORDER BY te.clock_in_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. Grant execute permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION public.calculate_overtime_breakdown(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_payroll_summary(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employee_timecard(UUID, DATE, DATE) TO authenticated;

-- Grant table access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_adjustments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_signoffs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entry_corrections TO authenticated;

-- =====================================================
-- 10. Add helpful comments
-- =====================================================
COMMENT ON TABLE public.payroll_adjustments IS 'Tracks bonuses, reimbursements, commissions, and deductions for payroll periods';
COMMENT ON TABLE public.payroll_signoffs IS 'Tracks approval status and cached totals for employee payroll per period';
COMMENT ON TABLE public.time_entry_corrections IS 'Stores corrections made to time entries during payroll review';
COMMENT ON FUNCTION public.calculate_overtime_breakdown IS 'Calculates regular, OT (1.5x), and double-time (2.0x) hours using California rules';
COMMENT ON FUNCTION public.get_payroll_summary IS 'Returns complete payroll summary for all active employees in a date range';
COMMENT ON FUNCTION public.get_employee_timecard IS 'Returns detailed time entries for an employee including corrections';
