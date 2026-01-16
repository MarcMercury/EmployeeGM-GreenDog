-- =====================================================
-- MIGRATION 130: RBAC Role System Enhancement
-- =====================================================
-- This migration:
-- 1. Updates the user role enum with new roles (manager, hr_admin)
-- 2. Creates transaction-safe RPC functions for multi-table updates
-- 3. Updates RLS policies to support the new role hierarchy
-- =====================================================

-- =====================================================
-- 1. ADD NEW ROLES TO ENUM (if not exists)
-- =====================================================

-- Create a temporary type with all roles
DO $$
BEGIN
  -- First check if we need to add the new roles
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'manager' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    -- Add manager role
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'hr_admin' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    -- Add hr_admin role
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hr_admin';
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- user_role type doesn't exist, we'll work with TEXT column
    RAISE NOTICE 'user_role enum does not exist, using TEXT column for roles';
END $$;

-- =====================================================
-- 2. ROLE HIERARCHY FUNCTION
-- =====================================================

-- Create a function to get role hierarchy level
CREATE OR REPLACE FUNCTION public.get_role_level(role_name TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN CASE role_name
    WHEN 'super_admin' THEN 200
    WHEN 'admin' THEN 100
    WHEN 'manager' THEN 80
    WHEN 'hr_admin' THEN 60
    WHEN 'office_admin' THEN 50
    WHEN 'marketing_admin' THEN 40
    WHEN 'user' THEN 10
    ELSE 0
  END;
END;
$$;

-- Check if user has minimum role level
CREATE OR REPLACE FUNCTION public.has_minimum_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_name TEXT;
BEGIN
  SELECT role INTO user_role_name
  FROM public.profiles
  WHERE auth_user_id = auth.uid();
  
  RETURN get_role_level(user_role_name) >= get_role_level(required_role);
END;
$$;

-- =====================================================
-- 3. ROLE-BASED ACCESS FUNCTIONS
-- =====================================================

-- Check if user can access HR features
CREATE OR REPLACE FUNCTION public.can_access_hr()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_name TEXT;
BEGIN
  SELECT role INTO user_role_name
  FROM public.profiles
  WHERE auth_user_id = auth.uid();
  
  -- Admin, manager, and hr_admin can access HR
  RETURN user_role_name IN ('super_admin', 'admin', 'manager', 'hr_admin');
END;
$$;

-- Check if user can access Marketing features
CREATE OR REPLACE FUNCTION public.can_access_marketing()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_name TEXT;
BEGIN
  SELECT role INTO user_role_name
  FROM public.profiles
  WHERE auth_user_id = auth.uid();
  
  -- Admin, manager, and marketing_admin can access Marketing
  RETURN user_role_name IN ('super_admin', 'admin', 'manager', 'marketing_admin');
END;
$$;

-- Check if user can access Schedule (write)
CREATE OR REPLACE FUNCTION public.can_manage_schedule()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_name TEXT;
BEGIN
  SELECT role INTO user_role_name
  FROM public.profiles
  WHERE auth_user_id = auth.uid();
  
  -- Admin, manager, hr_admin can manage schedules
  RETURN user_role_name IN ('super_admin', 'admin', 'manager', 'hr_admin');
END;
$$;

-- Check if user can view schedule (read)
CREATE OR REPLACE FUNCTION public.can_view_schedule()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_name TEXT;
BEGIN
  SELECT role INTO user_role_name
  FROM public.profiles
  WHERE auth_user_id = auth.uid();
  
  -- Everyone can view schedules
  RETURN user_role_name IN ('super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'marketing_admin', 'user');
END;
$$;

-- =====================================================
-- 4. TRANSACTION-SAFE EMPLOYEE UPDATE RPC
-- =====================================================

-- Update employee with profile sync in a single transaction
CREATE OR REPLACE FUNCTION public.update_employee_with_profile_sync(
  p_employee_id UUID,
  p_employee_data JSONB,
  p_sync_to_profile BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_employee_result JSONB;
  v_profile_result JSONB;
  v_old_employee RECORD;
  v_sync_fields TEXT[] := ARRAY['first_name', 'last_name', 'phone_mobile', 'avatar_url'];
  v_field TEXT;
  v_profile_update JSONB := '{}'::jsonb;
BEGIN
  -- Get current employee record and profile_id
  SELECT e.*, e.profile_id 
  INTO v_old_employee
  FROM public.employees e
  WHERE e.id = p_employee_id;
  
  IF v_old_employee IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Employee not found'
    );
  END IF;
  
  v_profile_id := v_old_employee.profile_id;
  
  -- Update employee record
  UPDATE public.employees
  SET 
    first_name = COALESCE((p_employee_data->>'first_name')::text, first_name),
    last_name = COALESCE((p_employee_data->>'last_name')::text, last_name),
    preferred_name = COALESCE((p_employee_data->>'preferred_name')::text, preferred_name),
    email_work = COALESCE((p_employee_data->>'email_work')::text, email_work),
    email_personal = COALESCE((p_employee_data->>'email_personal')::text, email_personal),
    phone_work = COALESCE((p_employee_data->>'phone_work')::text, phone_work),
    phone_mobile = COALESCE((p_employee_data->>'phone_mobile')::text, phone_mobile),
    date_of_birth = COALESCE((p_employee_data->>'date_of_birth')::date, date_of_birth),
    hire_date = COALESCE((p_employee_data->>'hire_date')::date, hire_date),
    employment_status = COALESCE((p_employee_data->>'employment_status')::text, employment_status),
    employment_type = COALESCE((p_employee_data->>'employment_type')::text, employment_type),
    position_id = COALESCE((p_employee_data->>'position_id')::uuid, position_id),
    department_id = COALESCE((p_employee_data->>'department_id')::uuid, department_id),
    location_id = COALESCE((p_employee_data->>'location_id')::uuid, location_id),
    manager_employee_id = COALESCE((p_employee_data->>'manager_employee_id')::uuid, manager_employee_id),
    notes_internal = COALESCE((p_employee_data->>'notes_internal')::text, notes_internal),
    updated_at = NOW()
  WHERE id = p_employee_id
  RETURNING to_jsonb(employees.*) INTO v_employee_result;
  
  -- Sync to profile if requested and profile exists
  IF p_sync_to_profile AND v_profile_id IS NOT NULL THEN
    -- Build profile update from synced fields
    FOREACH v_field IN ARRAY v_sync_fields
    LOOP
      IF p_employee_data ? v_field THEN
        -- Map employee field to profile field
        CASE v_field
          WHEN 'phone_mobile' THEN
            v_profile_update := v_profile_update || jsonb_build_object('phone', p_employee_data->>v_field);
          ELSE
            v_profile_update := v_profile_update || jsonb_build_object(v_field, p_employee_data->>v_field);
        END CASE;
      END IF;
    END LOOP;
    
    -- Update profile if there are fields to sync
    IF v_profile_update != '{}'::jsonb THEN
      UPDATE public.profiles
      SET 
        first_name = COALESCE((v_profile_update->>'first_name')::text, first_name),
        last_name = COALESCE((v_profile_update->>'last_name')::text, last_name),
        phone = COALESCE((v_profile_update->>'phone')::text, phone),
        avatar_url = COALESCE((v_profile_update->>'avatar_url')::text, avatar_url),
        updated_at = NOW()
      WHERE id = v_profile_id
      RETURNING to_jsonb(profiles.*) INTO v_profile_result;
    END IF;
  END IF;
  
  -- Log the change
  INSERT INTO public.employee_change_log (
    employee_id,
    changed_by,
    change_type,
    old_values,
    new_values,
    created_at
  ) VALUES (
    p_employee_id,
    auth.uid(),
    'update',
    to_jsonb(v_old_employee),
    p_employee_data,
    NOW()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'employee', v_employee_result,
    'profile', v_profile_result,
    'synced_to_profile', p_sync_to_profile AND v_profile_id IS NOT NULL
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Transaction will rollback automatically
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- =====================================================
-- 5. UPDATE RLS POLICIES FOR NEW ROLES
-- =====================================================

-- Marketing Leads: Allow manager and marketing_admin
DROP POLICY IF EXISTS "Marketing leads admin access" ON public.marketing_leads;
CREATE POLICY "Marketing leads role access" ON public.marketing_leads
  FOR ALL
  USING (public.can_access_marketing() OR public.is_admin());

-- Marketing Partners: Allow manager and marketing_admin
DROP POLICY IF EXISTS "Marketing partners admin access" ON public.marketing_partners;
CREATE POLICY "Marketing partners role access" ON public.marketing_partners
  FOR ALL
  USING (public.can_access_marketing() OR public.is_admin());

-- Candidates: Allow manager and hr_admin
DROP POLICY IF EXISTS "Candidates admin access" ON public.candidates;
CREATE POLICY "Candidates role access" ON public.candidates
  FOR ALL
  USING (public.can_access_hr() OR public.is_admin());

-- Schedules: Different policies for view vs manage
DROP POLICY IF EXISTS "Schedule view access" ON public.schedules;
CREATE POLICY "Schedule view access" ON public.schedules
  FOR SELECT
  USING (public.can_view_schedule());

DROP POLICY IF EXISTS "Schedule manage access" ON public.schedules;
CREATE POLICY "Schedule manage access" ON public.schedules
  FOR ALL
  USING (public.can_manage_schedule());

-- Employee Skills: Allow HR roles to manage
DROP POLICY IF EXISTS "Employee skills hr access" ON public.employee_skills;
CREATE POLICY "Employee skills role access" ON public.employee_skills
  FOR ALL
  USING (
    public.is_admin() OR 
    public.can_access_hr() OR 
    employee_id = public.current_employee_id()
  );

-- Education/GDU: Allow manager, hr_admin, and marketing_admin
DROP POLICY IF EXISTS "Education visitors role access" ON public.education_visitors;
CREATE POLICY "Education visitors role access" ON public.education_visitors
  FOR ALL
  USING (
    public.is_admin() OR 
    public.can_access_marketing() OR 
    public.can_access_hr()
  );

-- =====================================================
-- 6. GRANT EXECUTE PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.get_role_level(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_minimum_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_hr() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_marketing() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_schedule() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_schedule() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_employee_with_profile_sync(UUID, JSONB, BOOLEAN) TO authenticated;

-- =====================================================
-- SUMMARY OF ROLE ACCESS
-- =====================================================
-- 
-- super_admin (200): Full access to everything (superuser bypass)
-- admin (100): Full access to all features
-- manager (80): HR + Marketing + Recruiting + Schedules + Education
-- hr_admin (60): HR + Recruiting + Schedules + Education (courses)
-- office_admin (50): Roster, Schedules, Time Off, Med Ops
-- marketing_admin (40): Marketing + GDU + Schedules (view only)
-- user (10): Dashboard, Own Profile, Own Schedule, Med Ops
-- 
-- =====================================================
