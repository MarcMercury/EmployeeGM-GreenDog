-- ============================================================================
-- MIGRATION 281: Bonus Calculators
-- Adds page definition for /admin/bonus-calculators (Admin Ops section) and
-- creates bonus_plans + bonus_runs tables for configurable, per-employee
-- bonus agreements that are calculated from raw invoice line-item data.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Page definition (Admin Ops → Bonus Calculators)
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO public.page_definitions (path, name, section, icon, sort_order, is_active, description)
VALUES (
  '/admin/bonus-calculators',
  'Bonus Calculators',
  'Admin Ops',
  'mdi-calculator-variant',
  950,
  true,
  'Upload invoice data and auto-calculate bonuses per employee agreement'
)
ON CONFLICT (path) DO UPDATE
SET name = EXCLUDED.name,
    section = EXCLUDED.section,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description;

-- Grant super admins, admins and hr admins full access, everyone else none
INSERT INTO public.page_access (page_id, role_key, access_level)
SELECT
  pd.id,
  r.role_key,
  CASE WHEN r.role_key IN ('super_admin', 'admin', 'hr_admin') THEN 'full' ELSE 'none' END
FROM public.page_definitions pd
CROSS JOIN (VALUES
  ('super_admin'), ('admin'), ('hr_admin'), ('manager'),
  ('doctor'), ('csr'), ('tech'), ('user')
) AS r(role_key)
WHERE pd.path = '/admin/bonus-calculators'
ON CONFLICT (page_id, role_key) DO UPDATE
SET access_level = EXCLUDED.access_level;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. bonus_plans — one row per employee bonus agreement
--    "config" is a JSON blob that varies by plan_type so each agreement can
--    be rule-configured independently (category %, thresholds, etc.)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bonus_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name TEXT NOT NULL,                 -- display label (matches invoice Staff/Case Owner)
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  plan_type TEXT NOT NULL
    CHECK (plan_type IN (
      'production_categories',   -- e.g. Geist: categorised % of Total Earned
      'revenue_attendance',      -- e.g. Rally: flat bonus × % shifts worked
      'revenue_percentage',      -- e.g. Marc / Cynthia: flat % of net revenue
      'threshold_surplus'        -- e.g. Robertson: % of revenue over baseline
    )),
  period_type TEXT NOT NULL DEFAULT 'quarterly'
    CHECK (period_type IN ('quarterly', 'semi_annual', 'annual', 'monthly')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,   -- type-specific rules
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bonus_plans_employee ON public.bonus_plans(employee_id);
CREATE INDEX IF NOT EXISTS idx_bonus_plans_active ON public.bonus_plans(active);

-- ──────────────────────────────────────────────────────────────────────────
-- 3. bonus_runs — saved calculation results for a given plan + period
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bonus_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.bonus_plans(id) ON DELETE CASCADE,
  period_label TEXT NOT NULL,                    -- e.g. "Q4 2025"
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_bonus NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_revenue NUMERIC(14,2) NOT NULL DEFAULT 0,
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,  -- full per-line breakdown
  source_rows INT NOT NULL DEFAULT 0,            -- # of invoice lines consumed
  source_filename TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'paid', 'void')),
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  calculated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bonus_runs_plan ON public.bonus_runs(plan_id);
CREATE INDEX IF NOT EXISTS idx_bonus_runs_period ON public.bonus_runs(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_bonus_runs_status ON public.bonus_runs(status);

-- ──────────────────────────────────────────────────────────────────────────
-- 4. updated_at trigger for bonus_plans
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_bonus_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_bonus_plans ON public.bonus_plans;
CREATE TRIGGER trg_touch_bonus_plans
  BEFORE UPDATE ON public.bonus_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_bonus_plans_updated_at();

-- ──────────────────────────────────────────────────────────────────────────
-- 5. RLS
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE public.bonus_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_runs  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage bonus plans" ON public.bonus_plans;
CREATE POLICY "Admins manage bonus plans"
ON public.bonus_plans FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role IN ('admin', 'super_admin', 'hr_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role IN ('admin', 'super_admin', 'hr_admin')
  )
);

DROP POLICY IF EXISTS "Admins manage bonus runs" ON public.bonus_runs;
CREATE POLICY "Admins manage bonus runs"
ON public.bonus_runs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role IN ('admin', 'super_admin', 'hr_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role IN ('admin', 'super_admin', 'hr_admin')
  )
);

-- ──────────────────────────────────────────────────────────────────────────
-- 6. Seed bonus plans from the contracted bonus sheet
--    These configs mirror the Q4 2025 PDF breakdowns exactly.
--    Guarded with WHERE NOT EXISTS so re-running the migration is safe.
-- ──────────────────────────────────────────────────────────────────────────

-- 6a. Dr. Michael Geist — production categories
INSERT INTO public.bonus_plans (employee_name, plan_type, period_type, description, config)
SELECT 'Dr. Michael Geist', 'production_categories', 'quarterly',
  'Quarterly production bonus. Each category is a % of Total Earned (incl) where Geist is Staff Member or Case Owner per the rule.',
  jsonb_build_object(
    'match_staff_aliases', jsonb_build_array('Dr. Michael Geist', 'Michael Geist', 'Geist'),
    'revenue_field', 'total_earned',
    'categories', jsonb_build_array(
      jsonb_build_object(
        'key',  'annual_net',
        'label','Annual Bonus (1% Net)',
        'rate', 0.01,
        'match_mode', 'all_invoice_revenue',
        'note',  'Applied once per quarter against total net revenue'
      ),
      jsonb_build_object(
        'key',  'internal_med',
        'label','Internal Med Service (Personal)',
        'rate', 0.32,
        'match_mode', 'staff_member',
        'product_groups', jsonb_build_array('Internal Medicine Service','Internal Med','Internal Med Service')
      ),
      jsonb_build_object(
        'key',  'labs',
        'label','Laboratories - Internal/External',
        'rate', 0.20,
        'match_mode', 'case_owner',
        'product_groups', jsonb_build_array('Laboratories','Labs','Laboratory','*Laboratories','Lab')
      ),
      jsonb_build_object(
        'key',  'ct',
        'label','Radiography - CT',
        'rate', 0.32,
        'match_mode', 'staff_or_case_owner',
        'product_groups', jsonb_build_array('Advanced Imaging','CT','Cone Beam CT')
      ),
      jsonb_build_object(
        'key',  'ultrasound_radiology',
        'label','Ultrasounds (all) / Non-CT Radiology',
        'rate', 0.32,
        'match_mode', 'staff_or_case_owner',
        'product_groups', jsonb_build_array('Ultrasound','*Radiography','Radiography')
      ),
      jsonb_build_object(
        'key',  'exams_uc_procedures',
        'label','Other Exams / UC / Procedures',
        'rate', 0.20,
        'match_mode', 'case_owner',
        'product_groups', jsonb_build_array(
          '*Services','Services','Urgent Care Appointments',
          '*Surgical Procedure','Surgical Procedure','Tech Services',
          'Traveling Services','Administrative'
        )
      ),
      jsonb_build_object(
        'key',  'other_dvm_exotics',
        'label','Other DVM - Exotics',
        'rate', 0.02,
        'match_mode', 'case_owner_is_other_dvm',
        'product_groups', jsonb_build_array('Exotics','*Exotics')
      ),
      jsonb_build_object(
        'key',  'other_dvm_surgeries',
        'label','Other DVM Surgeries (non-dental)',
        'rate', 0.02,
        'match_mode', 'case_owner_is_other_dvm',
        'product_groups', jsonb_build_array('*Surgical Procedure','Surgical Procedure'),
        'exclude_contains', jsonb_build_array('Dental')
      )
    )
  )
WHERE NOT EXISTS (SELECT 1 FROM public.bonus_plans WHERE employee_name = 'Dr. Michael Geist');

-- 6b. Rally — revenue / attendance (SO location)
INSERT INTO public.bonus_plans (employee_name, plan_type, period_type, description, config)
SELECT
  'Rally',
  'revenue_attendance',
  'quarterly',
  'Base bonus scaled by % of scheduled shifts worked in the quarter. Revenue must cross a minimum threshold at the SO location.',
  jsonb_build_object(
    'base_bonus_amount', 8000,
    'location_filter', 'Green Dog - Sherman Oaks',
    'min_revenue_threshold', 500000,
    'payout_formula', 'base * (work_days - days_out) / work_days',
    'inputs', jsonb_build_array(
      jsonb_build_object('key','work_days','label','Scheduled Work Days','default',66),
      jsonb_build_object('key','days_out','label','Days Out (PTO / missed)','default',0)
    )
  )
WHERE NOT EXISTS (SELECT 1 FROM public.bonus_plans WHERE employee_name = 'Rally');

-- 6c. Marc Mercury — revenue percentage (semi-annual)
INSERT INTO public.bonus_plans (employee_name, plan_type, period_type, description, config)
SELECT
  'Marc Mercury',
  'revenue_percentage',
  'semi_annual',
  'Percentage of net revenue across all invoices in the semi-annual period.',
  jsonb_build_object(
    'rate', 0.01,
    'revenue_field', 'total_earned',
    'location_filter', null
  )
WHERE NOT EXISTS (SELECT 1 FROM public.bonus_plans WHERE employee_name = 'Marc Mercury');

-- 6d. Cynthia Garcia — revenue percentage (semi-annual)
INSERT INTO public.bonus_plans (employee_name, plan_type, period_type, description, config)
SELECT
  'Cynthia Garcia',
  'revenue_percentage',
  'semi_annual',
  'Percentage of net revenue across all invoices in the semi-annual period.',
  jsonb_build_object(
    'rate', 0.003,
    'revenue_field', 'total_earned',
    'location_filter', null
  )
WHERE NOT EXISTS (SELECT 1 FROM public.bonus_plans WHERE employee_name = 'Cynthia Garcia');

-- 6e. Robertson — threshold surplus (exotics)
INSERT INTO public.bonus_plans (employee_name, plan_type, period_type, description, config)
SELECT
  'Robertson',
  'threshold_surplus',
  'quarterly',
  'Bonus paid on exotics revenue above a quarterly baseline minimum.',
  jsonb_build_object(
    'baseline_per_period', 195669,
    'rate_above_baseline', 0.10,
    'revenue_field', 'total_earned',
    'product_groups', jsonb_build_array('Exotics','*Exotics'),
    'match_mode', 'staff_or_case_owner',
    'staff_aliases', jsonb_build_array('Dr. Robertson','Robertson')
  )
WHERE NOT EXISTS (SELECT 1 FROM public.bonus_plans WHERE employee_name = 'Robertson');

COMMENT ON TABLE public.bonus_plans IS 'Per-employee bonus agreements. config JSONB varies by plan_type.';
COMMENT ON TABLE public.bonus_runs  IS 'Saved bonus calculation results per plan/period.';
