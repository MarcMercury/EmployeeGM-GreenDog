-- =====================================================
-- Migration: Referral Contact Notification Triggers
-- =====================================================
-- Adds database-level triggers so that Admins, Managers,
-- and Marketing Admins receive Activity Hub notifications
-- whenever a referral partner's contact information is
-- updated — whether from a visit, report upload, or
-- direct edit.
--
-- Target roles: super_admin, admin, manager, marketing_admin
-- Notification category: 'referrals'
-- =====================================================

-- =====================================================
-- 1. FUNCTION: Notify admins on referral partner contact update
-- =====================================================
CREATE OR REPLACE FUNCTION notify_referral_contact_update()
RETURNS trigger AS $$
DECLARE
  target_profile RECORD;
  change_summary TEXT := '';
  partner_name TEXT;
BEGIN
  partner_name := COALESCE(NEW.name, OLD.name, 'Unknown Partner');

  -- Build a summary of what changed (contact-related fields only)
  IF OLD.contact_name IS DISTINCT FROM NEW.contact_name THEN
    change_summary := change_summary || 'contact name, ';
  END IF;
  IF OLD.best_contact_person IS DISTINCT FROM NEW.best_contact_person THEN
    change_summary := change_summary || 'best contact person, ';
  END IF;
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    change_summary := change_summary || 'email, ';
  END IF;
  IF OLD.phone IS DISTINCT FROM NEW.phone THEN
    change_summary := change_summary || 'phone, ';
  END IF;
  IF OLD.address IS DISTINCT FROM NEW.address THEN
    change_summary := change_summary || 'address, ';
  END IF;
  -- Also track referral data changes from uploads/visits
  IF OLD.last_referral_date IS DISTINCT FROM NEW.last_referral_date THEN
    change_summary := change_summary || 'last referral date, ';
  END IF;
  IF OLD.total_referrals_all_time IS DISTINCT FROM NEW.total_referrals_all_time THEN
    change_summary := change_summary || 'referral count, ';
  END IF;
  IF OLD.total_revenue_all_time IS DISTINCT FROM NEW.total_revenue_all_time THEN
    change_summary := change_summary || 'revenue, ';
  END IF;
  IF OLD.last_contact_date IS DISTINCT FROM NEW.last_contact_date THEN
    change_summary := change_summary || 'last contact date, ';
  END IF;

  -- If nothing relevant changed, skip
  IF change_summary = '' THEN
    RETURN NEW;
  END IF;

  -- Trim trailing ", "
  change_summary := rtrim(change_summary, ', ');

  -- Notify all users with admin / manager / marketing_admin roles
  FOR target_profile IN
    SELECT p.id FROM public.profiles p
    WHERE p.role IN ('super_admin', 'admin', 'manager', 'marketing_admin')
  LOOP
    INSERT INTO public.notifications (
      profile_id,
      type,
      category,
      title,
      body,
      data,
      requires_action,
      is_read
    ) VALUES (
      target_profile.id,
      'referral_contact_updated',
      'referrals',
      '🤝 Referral Updated: ' || partner_name,
      partner_name || ' was updated: ' || change_summary || '.',
      jsonb_build_object(
        'partner_id', NEW.id,
        'partner_name', partner_name,
        'changed_fields', change_summary,
        'url', '/marketing/partnerships',
        'action_label', 'View Partner',
        'source', 'db_trigger'
      ),
      false,
      false
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. TRIGGER: Fire on referral_partners UPDATE
-- =====================================================
DROP TRIGGER IF EXISTS trigger_notify_referral_contact_update ON public.referral_partners;
CREATE TRIGGER trigger_notify_referral_contact_update
  AFTER UPDATE ON public.referral_partners
  FOR EACH ROW
  EXECUTE FUNCTION notify_referral_contact_update();

-- =====================================================
-- 3. FUNCTION: Notify admins on clinic visit insert
-- =====================================================
CREATE OR REPLACE FUNCTION notify_referral_visit_logged()
RETURNS trigger AS $$
DECLARE
  target_profile RECORD;
  visitor_name TEXT := 'A team member';
  clinic TEXT;
  spoke_info TEXT := '';
BEGIN
  clinic := COALESCE(NEW.clinic_name, 'Unknown Clinic');

  -- Try to get the visitor's name from profiles
  IF NEW.profile_id IS NOT NULL THEN
    SELECT COALESCE(p.first_name || ' ' || p.last_name, p.email, 'A team member')
    INTO visitor_name
    FROM public.profiles p
    WHERE p.id = NEW.profile_id;
  END IF;

  IF NEW.spoke_to IS NOT NULL AND NEW.spoke_to != '' THEN
    spoke_info := ' — spoke with ' || NEW.spoke_to;
  END IF;

  -- Notify all admin / manager / marketing_admin roles
  FOR target_profile IN
    SELECT p.id FROM public.profiles p
    WHERE p.role IN ('super_admin', 'admin', 'manager', 'marketing_admin')
      AND p.id IS DISTINCT FROM NEW.profile_id  -- Don't notify the person who logged the visit
  LOOP
    INSERT INTO public.notifications (
      profile_id,
      type,
      category,
      title,
      body,
      data,
      requires_action,
      is_read
    ) VALUES (
      target_profile.id,
      'referral_visit_logged',
      'referrals',
      '🤝 Referral Visit: ' || clinic,
      visitor_name || ' logged a visit to ' || clinic || ' on ' || to_char(NEW.visit_date, 'Mon DD, YYYY') || spoke_info || '.',
      jsonb_build_object(
        'partner_id', NEW.partner_id,
        'clinic_name', clinic,
        'spoke_to', NEW.spoke_to,
        'visit_date', NEW.visit_date,
        'url', '/marketing/partnerships',
        'action_label', 'View Partnership',
        'source', 'clinic_visit'
      ),
      false,
      false
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. TRIGGER: Fire on clinic_visits INSERT
-- =====================================================
DROP TRIGGER IF EXISTS trigger_notify_referral_visit_logged ON public.clinic_visits;
CREATE TRIGGER trigger_notify_referral_visit_logged
  AFTER INSERT ON public.clinic_visits
  FOR EACH ROW
  EXECUTE FUNCTION notify_referral_visit_logged();

-- =====================================================
-- 5. Add index on notifications for referrals category
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_notifications_referrals
ON public.notifications(category)
WHERE category = 'referrals';

-- =====================================================
-- 6. COMMENTS
-- =====================================================
COMMENT ON FUNCTION notify_referral_contact_update IS
  'Fires Activity Hub notifications to admin/manager/marketing_admin when a referral partner record is updated.';

COMMENT ON FUNCTION notify_referral_visit_logged IS
  'Fires Activity Hub notifications to admin/manager/marketing_admin when a clinic visit is logged.';
