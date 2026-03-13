-- =====================================================
-- 275: Link Safety Logs to Employee Profiles
-- Connects safety/compliance logs to the employees they
-- relate to (subject, attendee, reporter, witness, etc.)
-- =====================================================

-- 1. Junction table: safety_log ↔ employee (many-to-many)
CREATE TABLE IF NOT EXISTS public.safety_log_employees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  safety_log_id   UUID NOT NULL REFERENCES public.safety_logs(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'subject'
                    CHECK (role IN ('subject', 'attendee', 'reporter', 'reviewer', 'witness')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(safety_log_id, employee_id, role)
);

COMMENT ON TABLE public.safety_log_employees IS
  'Junction table linking safety/compliance logs to the employee(s) they relate to.';
COMMENT ON COLUMN public.safety_log_employees.role IS
  'Relationship of the employee to the log: subject (log is about them), attendee (attended meeting/training), reporter (filed the report), reviewer (reviewed/signed off), witness.';

-- 2. Indexes for efficient lookups in both directions
CREATE INDEX IF NOT EXISTS idx_sle_safety_log_id ON public.safety_log_employees (safety_log_id);
CREATE INDEX IF NOT EXISTS idx_sle_employee_id   ON public.safety_log_employees (employee_id);
CREATE INDEX IF NOT EXISTS idx_sle_role          ON public.safety_log_employees (role);

-- 3. Row-Level Security
ALTER TABLE public.safety_log_employees ENABLE ROW LEVEL SECURITY;

-- Managers+ can view all links
CREATE POLICY sle_select_manager ON public.safety_log_employees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin')
    )
  );

-- Users can view links to their own employee record
CREATE POLICY sle_select_own ON public.safety_log_employees
  FOR SELECT USING (
    employee_id IN (
      SELECT e.id FROM public.employees e
      JOIN public.profiles p ON p.id = e.profile_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- Authenticated users can insert links (server-side API controls authorization)
CREATE POLICY sle_insert ON public.safety_log_employees
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Only managers+ can delete links
CREATE POLICY sle_delete ON public.safety_log_employees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'manager', 'hr_admin')
    )
  );
