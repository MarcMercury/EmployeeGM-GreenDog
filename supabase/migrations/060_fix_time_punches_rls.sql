-- =====================================================
-- Migration: Fix Time Punches RLS Policies
-- Description: Add RLS policies to allow employees to clock in/out
--   and admins to manage all time punches
-- =====================================================

-- Ensure RLS is enabled
ALTER TABLE public.time_punches ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Drop existing policies if any
-- =====================================================
DROP POLICY IF EXISTS "Users can view own time punches" ON public.time_punches;
DROP POLICY IF EXISTS "Users can insert own time punches" ON public.time_punches;
DROP POLICY IF EXISTS "Admins can manage all time punches" ON public.time_punches;

-- =====================================================
-- Create policies
-- =====================================================

-- Users can view their own time punches
CREATE POLICY "Users can view own time punches"
ON public.time_punches
FOR SELECT
USING (
  employee_id = public.current_employee_id()
  OR public.is_admin()
);

-- Users can insert their own time punches (clock in/out)
CREATE POLICY "Users can insert own time punches"
ON public.time_punches
FOR INSERT
WITH CHECK (
  employee_id = public.current_employee_id()
  OR public.is_admin()
);

-- Admins can update and delete time punches (for corrections)
CREATE POLICY "Admins can manage time punches"
ON public.time_punches
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- =====================================================
-- Also fix time_entries table RLS (used for tracked hours)
-- =====================================================

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Admins can manage all time entries" ON public.time_entries;

-- Users can view their own time entries
CREATE POLICY "Users can view own time entries"
ON public.time_entries
FOR SELECT
USING (
  employee_id = public.current_employee_id()
  OR public.is_admin()
);

-- Users can insert their own time entries
CREATE POLICY "Users can insert own time entries"
ON public.time_entries
FOR INSERT
WITH CHECK (
  employee_id = public.current_employee_id()
  OR public.is_admin()
);

-- Admins can fully manage time entries
CREATE POLICY "Admins can manage time entries"
ON public.time_entries
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- =====================================================
-- Grant permissions
-- =====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_punches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
