-- =====================================================
-- Migration: Fix Profiles Trigger
-- Drops ALL triggers on profiles and recreates clean versions
-- This fixes the "record old has no field hire_date" error
-- =====================================================

-- STEP 1: Drop ALL triggers on profiles to start fresh
DROP TRIGGER IF EXISTS trigger_notify_profile_change ON public.profiles;
DROP TRIGGER IF EXISTS update_profiles_modtime ON public.profiles;
DROP TRIGGER IF EXISTS trg_audit_role_changes ON public.profiles;
DROP TRIGGER IF EXISTS track_employee_changes ON public.profiles;
DROP TRIGGER IF EXISTS audit_employee_changes ON public.profiles;
DROP TRIGGER IF EXISTS sync_employee_profile ON public.profiles;
DROP TRIGGER IF EXISTS trg_sync_employee_data ON public.profiles;
DROP TRIGGER IF EXISTS employee_data_sync ON public.profiles;
DROP TRIGGER IF EXISTS trigger_employee_audit ON public.profiles;
DROP TRIGGER IF EXISTS profiles_audit_trigger ON public.profiles;
DROP TRIGGER IF EXISTS track_profile_changes ON public.profiles;

-- STEP 2: Drop any functions that might be referencing hire_date
DROP FUNCTION IF EXISTS track_employee_changes() CASCADE;
DROP FUNCTION IF EXISTS audit_employee_changes() CASCADE;
DROP FUNCTION IF EXISTS sync_employee_profile() CASCADE;
DROP FUNCTION IF EXISTS track_profile_changes() CASCADE;

-- STEP 3: Recreate update_modified_column if needed (generic, no hire_date)
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 4: Recreate the modtime trigger  
CREATE TRIGGER update_profiles_modtime 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_modified_column();

-- STEP 5: Recreate notify_profile_change function (no hire_date)
CREATE OR REPLACE FUNCTION notify_profile_change()
RETURNS trigger AS $$
BEGIN
  -- Skip if no significant changes (only check columns that exist on profiles)
  IF TG_OP = 'UPDATE' AND 
     OLD.first_name IS NOT DISTINCT FROM NEW.first_name AND 
     OLD.last_name IS NOT DISTINCT FROM NEW.last_name AND
     OLD.role IS NOT DISTINCT FROM NEW.role AND
     OLD.email IS NOT DISTINCT FROM NEW.email THEN
    RETURN NEW;
  END IF;

  -- Insert notification (with error handling)
  BEGIN
    INSERT INTO public.notifications (
      profile_id,
      type,
      category,
      title,
      body,
      data,
      requires_action
    ) VALUES (
      NEW.id,
      'profile_updated',
      'profile',
      'Profile Updated',
      CASE 
        WHEN TG_OP = 'INSERT' THEN 'Welcome! Your profile has been created.'
        ELSE 'Your profile information has been updated.'
      END,
      jsonb_build_object(
        'changed_fields', CASE 
          WHEN TG_OP = 'INSERT' THEN '["created"]'::jsonb
          ELSE '["profile"]'::jsonb
        END,
        'url', '/profile'
      ),
      false
    );
  EXCEPTION WHEN OTHERS THEN
    -- Don't fail profile update if notification fails
    RAISE WARNING 'notify_profile_change warning: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 6: Recreate the notification trigger
CREATE TRIGGER trigger_notify_profile_change
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_profile_change();

-- STEP 7: Recreate audit_role_changes function (no hire_date)
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log role changes
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    BEGIN
      INSERT INTO audit_log (
        entity_type,
        entity_id,
        entity_name,
        action,
        action_category,
        old_values,
        new_values,
        changes
      ) VALUES (
        'profile',
        NEW.id,
        COALESCE(NEW.email, 'Unknown'),
        'role_change',
        'security',
        jsonb_build_object('role', OLD.role, 'email', OLD.email),
        jsonb_build_object('role', NEW.role, 'email', NEW.email),
        jsonb_build_object('role', jsonb_build_object('old', OLD.role, 'new', NEW.role))
      );
    EXCEPTION WHEN OTHERS THEN
      -- Don't fail the update if audit fails
      RAISE WARNING 'Audit logging failed: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- STEP 8: Recreate the audit trigger
CREATE TRIGGER trg_audit_role_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_role_changes();

COMMENT ON FUNCTION notify_profile_change() IS 'Notifies on profile changes - does not reference hire_date';
COMMENT ON FUNCTION public.audit_role_changes() IS 'Audits role changes on profiles - does not reference hire_date';
