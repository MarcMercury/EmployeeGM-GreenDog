-- =====================================================
-- Migration: Credential Expiration Tracking & Notifications
-- Description: Adds never_expires field and notification tracking
--              for licenses and certifications, plus CRON support
-- =====================================================

-- =====================================================
-- 1. ADD NEVER_EXPIRES TO EMPLOYEE_LICENSES
-- =====================================================
ALTER TABLE public.employee_licenses
  ADD COLUMN IF NOT EXISTS never_expires BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_90 BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_60 BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_30 BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_14 BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_7 BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.employee_licenses.never_expires IS 'If true, this license does not expire and reminders are disabled';
COMMENT ON COLUMN public.employee_licenses.reminder_sent_90 IS 'True if 90-day expiration reminder was sent';
COMMENT ON COLUMN public.employee_licenses.reminder_sent_60 IS 'True if 60-day expiration reminder was sent';
COMMENT ON COLUMN public.employee_licenses.reminder_sent_30 IS 'True if 30-day expiration reminder was sent';
COMMENT ON COLUMN public.employee_licenses.reminder_sent_14 IS 'True if 14-day expiration reminder was sent';
COMMENT ON COLUMN public.employee_licenses.reminder_sent_7 IS 'True if 7-day expiration reminder was sent';

-- =====================================================
-- 2. ADD NEVER_EXPIRES TO EMPLOYEE_CERTIFICATIONS
-- =====================================================
ALTER TABLE public.employee_certifications
  ADD COLUMN IF NOT EXISTS never_expires BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_90 BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_60 BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_30 BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_14 BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_7 BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.employee_certifications.never_expires IS 'If true, this certification does not expire and reminders are disabled';
COMMENT ON COLUMN public.employee_certifications.reminder_sent_90 IS 'True if 90-day expiration reminder was sent';
COMMENT ON COLUMN public.employee_certifications.reminder_sent_60 IS 'True if 60-day expiration reminder was sent';
COMMENT ON COLUMN public.employee_certifications.reminder_sent_30 IS 'True if 30-day expiration reminder was sent';
COMMENT ON COLUMN public.employee_certifications.reminder_sent_14 IS 'True if 14-day expiration reminder was sent';
COMMENT ON COLUMN public.employee_certifications.reminder_sent_7 IS 'True if 7-day expiration reminder was sent';

-- =====================================================
-- 3. CREATE VIEW FOR EXPIRING CREDENTIALS
-- =====================================================
CREATE OR REPLACE VIEW public.expiring_credentials AS
WITH license_data AS (
  SELECT 
    'license' as credential_type,
    el.id as credential_id,
    el.employee_id,
    el.license_type as credential_name,
    el.license_number as credential_number,
    el.expiration_date,
    el.never_expires,
    'active' as status,  -- licenses don't have status, assume active
    el.reminder_sent_90,
    el.reminder_sent_60,
    el.reminder_sent_30,
    el.reminder_sent_14,
    el.reminder_sent_7,
    el.last_reminder_sent_at,
    CASE 
      WHEN el.never_expires THEN NULL
      WHEN el.expiration_date IS NULL THEN NULL
      ELSE (el.expiration_date - CURRENT_DATE)::INTEGER
    END as days_until_expiry,
    e.first_name || ' ' || e.last_name as employee_name,
    p.id as profile_id,
    p.email as employee_email,
    e.manager_employee_id,
    e.location_id as location,
    e.department_id as department
  FROM public.employee_licenses el
  JOIN public.employees e ON e.id = el.employee_id
  JOIN public.profiles p ON p.id = e.profile_id
  WHERE e.employment_status = 'active'
    AND el.never_expires = false
    AND el.expiration_date IS NOT NULL
),
certification_data AS (
  SELECT 
    'certification' as credential_type,
    ec.id as credential_id,
    ec.employee_id,
    COALESCE(c.name, 'Unknown Certification') as credential_name,
    ec.certification_number as credential_number,
    ec.expiration_date,
    ec.never_expires,
    ec.status,
    ec.reminder_sent_90,
    ec.reminder_sent_60,
    ec.reminder_sent_30,
    ec.reminder_sent_14,
    ec.reminder_sent_7,
    ec.last_reminder_sent_at,
    CASE 
      WHEN ec.never_expires THEN NULL
      WHEN ec.expiration_date IS NULL THEN NULL
      ELSE (ec.expiration_date - CURRENT_DATE)::INTEGER
    END as days_until_expiry,
    e.first_name || ' ' || e.last_name as employee_name,
    p.id as profile_id,
    p.email as employee_email,
    e.manager_employee_id,
    e.location_id as location,
    e.department_id as department
  FROM public.employee_certifications ec
  LEFT JOIN public.certifications c ON c.id = ec.certification_id
  JOIN public.employees e ON e.id = ec.employee_id
  JOIN public.profiles p ON p.id = e.profile_id
  WHERE e.employment_status = 'active'
    AND (ec.status IS NULL OR ec.status = 'active')
    AND ec.never_expires = false
    AND ec.expiration_date IS NOT NULL
)
SELECT * FROM license_data
UNION ALL
SELECT * FROM certification_data
ORDER BY days_until_expiry ASC NULLS LAST;

COMMENT ON VIEW public.expiring_credentials IS 'Combined view of all expiring licenses and certifications with days until expiry';

-- =====================================================
-- 4. CREATE NOTIFICATION FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_credential_expiration_notifications()
RETURNS TABLE(
  notifications_created INTEGER,
  licenses_processed INTEGER,
  certifications_processed INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notifications_created INTEGER := 0;
  v_licenses_processed INTEGER := 0;
  v_certifications_processed INTEGER := 0;
  v_credential RECORD;
  v_notification_title TEXT;
  v_notification_body TEXT;
  v_notification_type TEXT;
  v_manager_profile_id UUID;
  v_admin_profile_ids UUID[];
BEGIN
  -- Get all admin profile IDs for system notifications
  SELECT ARRAY_AGG(id) INTO v_admin_profile_ids
  FROM public.profiles
  WHERE role IN ('admin', 'super_admin');

  -- Process each credential that needs notifications
  FOR v_credential IN 
    SELECT * FROM public.expiring_credentials
    WHERE days_until_expiry IS NOT NULL
      AND days_until_expiry >= -30  -- Include recently expired (up to 30 days ago)
      AND days_until_expiry <= 90   -- Only within 90 days
  LOOP
    -- Determine notification tier and check if already sent
    IF v_credential.days_until_expiry <= 0 THEN
      -- EXPIRED
      v_notification_type := 'credential_expired';
      v_notification_title := v_credential.credential_type || ' Expired: ' || v_credential.credential_name;
      v_notification_body := v_credential.employee_name || '''s ' || v_credential.credential_type || 
        ' (' || v_credential.credential_name || ') expired on ' || 
        TO_CHAR(v_credential.expiration_date, 'Mon DD, YYYY') || '. Immediate action required.';
    ELSIF v_credential.days_until_expiry <= 7 AND NOT v_credential.reminder_sent_7 THEN
      v_notification_type := 'credential_expiring_7';
      v_notification_title := 'URGENT: ' || v_credential.credential_type || ' expires in ' || v_credential.days_until_expiry || ' days';
      v_notification_body := v_credential.employee_name || '''s ' || v_credential.credential_name || 
        ' (#' || COALESCE(v_credential.credential_number, 'N/A') || ') expires on ' || 
        TO_CHAR(v_credential.expiration_date, 'Mon DD, YYYY') || '.';
      
      -- Mark as sent
      IF v_credential.credential_type = 'license' THEN
        UPDATE public.employee_licenses SET reminder_sent_7 = true, last_reminder_sent_at = NOW()
        WHERE id = v_credential.credential_id;
        v_licenses_processed := v_licenses_processed + 1;
      ELSE
        UPDATE public.employee_certifications SET reminder_sent_7 = true, last_reminder_sent_at = NOW()
        WHERE id = v_credential.credential_id;
        v_certifications_processed := v_certifications_processed + 1;
      END IF;
    ELSIF v_credential.days_until_expiry <= 14 AND NOT v_credential.reminder_sent_14 THEN
      v_notification_type := 'credential_expiring_14';
      v_notification_title := v_credential.credential_type || ' expires in ' || v_credential.days_until_expiry || ' days';
      v_notification_body := v_credential.employee_name || '''s ' || v_credential.credential_name || 
        ' (#' || COALESCE(v_credential.credential_number, 'N/A') || ') expires on ' || 
        TO_CHAR(v_credential.expiration_date, 'Mon DD, YYYY') || '.';
      
      IF v_credential.credential_type = 'license' THEN
        UPDATE public.employee_licenses SET reminder_sent_14 = true, last_reminder_sent_at = NOW()
        WHERE id = v_credential.credential_id;
        v_licenses_processed := v_licenses_processed + 1;
      ELSE
        UPDATE public.employee_certifications SET reminder_sent_14 = true, last_reminder_sent_at = NOW()
        WHERE id = v_credential.credential_id;
        v_certifications_processed := v_certifications_processed + 1;
      END IF;
    ELSIF v_credential.days_until_expiry <= 30 AND NOT v_credential.reminder_sent_30 THEN
      v_notification_type := 'credential_expiring_30';
      v_notification_title := v_credential.credential_type || ' expires in ' || v_credential.days_until_expiry || ' days';
      v_notification_body := v_credential.employee_name || '''s ' || v_credential.credential_name || 
        ' (#' || COALESCE(v_credential.credential_number, 'N/A') || ') expires on ' || 
        TO_CHAR(v_credential.expiration_date, 'Mon DD, YYYY') || '. Please renew soon.';
      
      IF v_credential.credential_type = 'license' THEN
        UPDATE public.employee_licenses SET reminder_sent_30 = true, last_reminder_sent_at = NOW()
        WHERE id = v_credential.credential_id;
        v_licenses_processed := v_licenses_processed + 1;
      ELSE
        UPDATE public.employee_certifications SET reminder_sent_30 = true, last_reminder_sent_at = NOW()
        WHERE id = v_credential.credential_id;
        v_certifications_processed := v_certifications_processed + 1;
      END IF;
    ELSIF v_credential.days_until_expiry <= 60 AND NOT v_credential.reminder_sent_60 THEN
      v_notification_type := 'credential_expiring_60';
      v_notification_title := v_credential.credential_type || ' expires in ' || v_credential.days_until_expiry || ' days';
      v_notification_body := v_credential.employee_name || '''s ' || v_credential.credential_name || 
        ' (#' || COALESCE(v_credential.credential_number, 'N/A') || ') expires on ' || 
        TO_CHAR(v_credential.expiration_date, 'Mon DD, YYYY') || '.';
      
      IF v_credential.credential_type = 'license' THEN
        UPDATE public.employee_licenses SET reminder_sent_60 = true, last_reminder_sent_at = NOW()
        WHERE id = v_credential.credential_id;
        v_licenses_processed := v_licenses_processed + 1;
      ELSE
        UPDATE public.employee_certifications SET reminder_sent_60 = true, last_reminder_sent_at = NOW()
        WHERE id = v_credential.credential_id;
        v_certifications_processed := v_certifications_processed + 1;
      END IF;
    ELSIF v_credential.days_until_expiry <= 90 AND NOT v_credential.reminder_sent_90 THEN
      v_notification_type := 'credential_expiring_90';
      v_notification_title := v_credential.credential_type || ' expires in ' || v_credential.days_until_expiry || ' days';
      v_notification_body := v_credential.employee_name || '''s ' || v_credential.credential_name || 
        ' (#' || COALESCE(v_credential.credential_number, 'N/A') || ') expires on ' || 
        TO_CHAR(v_credential.expiration_date, 'Mon DD, YYYY') || '.';
      
      IF v_credential.credential_type = 'license' THEN
        UPDATE public.employee_licenses SET reminder_sent_90 = true, last_reminder_sent_at = NOW()
        WHERE id = v_credential.credential_id;
        v_licenses_processed := v_licenses_processed + 1;
      ELSE
        UPDATE public.employee_certifications SET reminder_sent_90 = true, last_reminder_sent_at = NOW()
        WHERE id = v_credential.credential_id;
        v_certifications_processed := v_certifications_processed + 1;
      END IF;
    ELSE
      CONTINUE; -- Skip if no notification needed
    END IF;
    
    -- Create notification for the EMPLOYEE
    INSERT INTO public.notifications (profile_id, type, title, body, data)
    VALUES (
      v_credential.profile_id,
      v_notification_type,
      v_notification_title,
      v_notification_body,
      jsonb_build_object(
        'credential_type', v_credential.credential_type,
        'credential_id', v_credential.credential_id,
        'credential_name', v_credential.credential_name,
        'expiration_date', v_credential.expiration_date,
        'days_until_expiry', v_credential.days_until_expiry,
        'employee_id', v_credential.employee_id
      )
    );
    v_notifications_created := v_notifications_created + 1;
    
    -- Create notification for MANAGER (if exists)
    IF v_credential.manager_employee_id IS NOT NULL THEN
      SELECT p.id INTO v_manager_profile_id
      FROM public.employees e
      JOIN public.profiles p ON p.id = e.profile_id
      WHERE e.id = v_credential.manager_employee_id;
      
      IF v_manager_profile_id IS NOT NULL THEN
        INSERT INTO public.notifications (profile_id, type, title, body, data)
        VALUES (
          v_manager_profile_id,
          v_notification_type,
          '[Team] ' || v_notification_title,
          v_notification_body,
          jsonb_build_object(
            'credential_type', v_credential.credential_type,
            'credential_id', v_credential.credential_id,
            'credential_name', v_credential.credential_name,
            'expiration_date', v_credential.expiration_date,
            'days_until_expiry', v_credential.days_until_expiry,
            'employee_id', v_credential.employee_id,
            'employee_name', v_credential.employee_name,
            'is_manager_notification', true
          )
        );
        v_notifications_created := v_notifications_created + 1;
      END IF;
    END IF;
    
    -- Create notifications for ADMINS (for urgent cases: 30 days or less)
    IF v_credential.days_until_expiry <= 30 AND v_admin_profile_ids IS NOT NULL THEN
      INSERT INTO public.notifications (profile_id, type, title, body, data)
      SELECT 
        admin_id,
        v_notification_type,
        '[HR Alert] ' || v_notification_title,
        v_notification_body,
        jsonb_build_object(
          'credential_type', v_credential.credential_type,
          'credential_id', v_credential.credential_id,
          'credential_name', v_credential.credential_name,
          'expiration_date', v_credential.expiration_date,
          'days_until_expiry', v_credential.days_until_expiry,
          'employee_id', v_credential.employee_id,
          'employee_name', v_credential.employee_name,
          'is_admin_notification', true
        )
      FROM unnest(v_admin_profile_ids) as admin_id
      WHERE admin_id != v_credential.profile_id; -- Don't notify if admin is the employee
      
      v_notifications_created := v_notifications_created + COALESCE(array_length(v_admin_profile_ids, 1), 0);
    END IF;
    
  END LOOP;
  
  RETURN QUERY SELECT v_notifications_created, v_licenses_processed, v_certifications_processed;
END;
$$;

COMMENT ON FUNCTION public.create_credential_expiration_notifications() IS 
'Checks all licenses and certifications for upcoming expirations and creates notifications for employees, managers, and admins';

-- =====================================================
-- 5. RESET REMINDER FLAGS WHEN EXPIRATION DATE CHANGES
-- =====================================================
CREATE OR REPLACE FUNCTION public.reset_license_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.expiration_date IS DISTINCT FROM NEW.expiration_date THEN
    NEW.reminder_sent_90 := false;
    NEW.reminder_sent_60 := false;
    NEW.reminder_sent_30 := false;
    NEW.reminder_sent_14 := false;
    NEW.reminder_sent_7 := false;
    NEW.last_reminder_sent_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reset_license_reminders_trigger ON public.employee_licenses;
CREATE TRIGGER reset_license_reminders_trigger
  BEFORE UPDATE ON public.employee_licenses
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_license_reminders();

CREATE OR REPLACE FUNCTION public.reset_certification_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.expiration_date IS DISTINCT FROM NEW.expiration_date THEN
    NEW.reminder_sent_90 := false;
    NEW.reminder_sent_60 := false;
    NEW.reminder_sent_30 := false;
    NEW.reminder_sent_14 := false;
    NEW.reminder_sent_7 := false;
    NEW.last_reminder_sent_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reset_certification_reminders_trigger ON public.employee_certifications;
CREATE TRIGGER reset_certification_reminders_trigger
  BEFORE UPDATE ON public.employee_certifications
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_certification_reminders();

-- =====================================================
-- 6. ADD INDEX FOR EFFICIENT EXPIRY QUERIES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_employee_licenses_expiration 
  ON public.employee_licenses(expiration_date) 
  WHERE never_expires = false;

CREATE INDEX IF NOT EXISTS idx_employee_certifications_expiration 
  ON public.employee_certifications(expiration_date) 
  WHERE (status IS NULL OR status = 'active') AND never_expires = false;

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================
GRANT SELECT ON public.expiring_credentials TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_credential_expiration_notifications() TO service_role;
