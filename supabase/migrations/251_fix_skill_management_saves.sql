-- Migration: Fix skill management saves
-- 1. Add missing is_core column to skill_library (causes 400 error)
-- 2. Add admin write policies to role_skill_expectations (causes 403 error)

-- ============================================================
-- 1. Add is_core column to skill_library
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'skill_library'
      AND column_name = 'is_core'
  ) THEN
    ALTER TABLE public.skill_library ADD COLUMN is_core BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================================
-- 2. Add admin write policies to role_skill_expectations
-- ============================================================

-- Drop existing restrictive policies if they exist, then recreate with proper access
DO $$
BEGIN
  -- Drop the old service-role-only ALL policy
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'role_skill_expectations'
      AND policyname = 'service_role_role_skill_exp'
  ) THEN
    DROP POLICY service_role_role_skill_exp ON public.role_skill_expectations;
  END IF;

  -- Drop the old authenticated read-only policy
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'role_skill_expectations'
      AND policyname = 'authenticated_read_role_skill_exp'
  ) THEN
    DROP POLICY authenticated_read_role_skill_exp ON public.role_skill_expectations;
  END IF;
END $$;

-- Service role: full access
CREATE POLICY service_role_role_skill_exp ON public.role_skill_expectations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Authenticated users: read access
CREATE POLICY authenticated_read_role_skill_exp ON public.role_skill_expectations
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admin users: full write access (insert, update, delete)
CREATE POLICY admin_write_role_skill_exp ON public.role_skill_expectations
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
