-- =====================================================
-- Migration: Fix Employee Assets RLS and Constraints
-- Description: Fix the asset_type constraint to match UI values
--   and ensure RLS policies allow admin inserts
-- =====================================================

-- =====================================================
-- STEP 1: Fix asset_type constraint to accept UI values
-- =====================================================

-- First drop the existing constraint
ALTER TABLE public.employee_assets DROP CONSTRAINT IF EXISTS employee_assets_asset_type_check;

-- Add new constraint with all allowed values (both UI and onboarding values)
ALTER TABLE public.employee_assets ADD CONSTRAINT employee_assets_asset_type_check 
  CHECK (asset_type IN (
    -- Original UI values
    'Key', 'Badge', 'Device', 'Equipment', 'Uniform', 'Other',
    -- Onboarding wizard values (lowercase)
    'laptop', 'phone', 'tablet', 'uniform', 'badge', 'keys', 'vehicle', 'equipment', 'other'
  ));

-- =====================================================
-- STEP 2: Fix RLS policies with WITH CHECK clause
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage employee assets" ON public.employee_assets;
DROP POLICY IF EXISTS "Admins manage assets" ON public.employee_assets;
DROP POLICY IF EXISTS "Users view own assets" ON public.employee_assets;

-- Create proper admin policy with WITH CHECK for INSERT
CREATE POLICY "Admins can manage employee assets"
ON public.employee_assets
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Users can view their own assets
CREATE POLICY "Users can view own assets"
ON public.employee_assets
FOR SELECT
USING (
  employee_id IN (
    SELECT e.id FROM public.employees e
    JOIN public.profiles p ON e.profile_id = p.id
    WHERE p.auth_user_id = auth.uid()
  )
);

-- =====================================================
-- STEP 3: Add missing columns if needed
-- =====================================================

-- Ensure all needed columns exist
ALTER TABLE public.employee_assets ADD COLUMN IF NOT EXISTS expected_return_date DATE;
ALTER TABLE public.employee_assets ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;
ALTER TABLE public.employee_assets ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMPTZ DEFAULT NOW();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_assets TO authenticated;
