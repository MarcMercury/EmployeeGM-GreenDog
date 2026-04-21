-- =====================================================
-- Migration: employee_password_assets
-- Description: Add password-specific fields to employee_assets and
--   restrict password visibility to privileged management roles.
-- =====================================================

ALTER TABLE public.employee_assets
  ADD COLUMN IF NOT EXISTS credential_site TEXT,
  ADD COLUMN IF NOT EXISTS credential_program TEXT,
  ADD COLUMN IF NOT EXISTS credential_username TEXT,
  ADD COLUMN IF NOT EXISTS credential_password TEXT;

ALTER TABLE public.employee_assets DROP CONSTRAINT IF EXISTS employee_assets_asset_type_check;

ALTER TABLE public.employee_assets
  ADD CONSTRAINT employee_assets_asset_type_check
  CHECK (
    asset_type IN (
      'Key', 'Badge', 'Device', 'Equipment', 'Uniform', 'Other', 'Password',
      'laptop', 'phone', 'tablet', 'uniform', 'badge', 'keys', 'vehicle', 'equipment', 'other'
    )
  );

DROP POLICY IF EXISTS "Users view own assets" ON public.employee_assets;
DROP POLICY IF EXISTS "Users can view own assets" ON public.employee_assets;
DROP POLICY IF EXISTS "Privileged roles can view employee assets" ON public.employee_assets;

CREATE POLICY "Privileged roles can view employee assets"
ON public.employee_assets
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role IN ('super_admin', 'admin', 'manager', 'hr_admin')
  )
);

CREATE POLICY "Users can view own assets"
ON public.employee_assets
FOR SELECT
USING (
  COALESCE(asset_type, '') <> 'Password'
  AND employee_id IN (
    SELECT e.id
    FROM public.employees e
    JOIN public.profiles p ON e.profile_id = p.id
    WHERE p.auth_user_id = auth.uid()
  )
);