-- Migration: Activity Hub Enhancement
-- Adds notification seeding and improved categorization support

-- Add category column for easier filtering if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'category'
  ) THEN
    ALTER TABLE public.notifications 
    ADD COLUMN category text DEFAULT 'system';
  END IF;
END $$;

-- Add priority/requires_action column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'requires_action'
  ) THEN
    ALTER TABLE public.notifications 
    ADD COLUMN requires_action boolean DEFAULT false;
  END IF;
END $$;

-- Add index on category for filtering
CREATE INDEX IF NOT EXISTS idx_notifications_category 
ON public.notifications(category);

-- Add index on requires_action for priority filtering
CREATE INDEX IF NOT EXISTS idx_notifications_requires_action 
ON public.notifications(requires_action) WHERE requires_action = true;

-- Create function to generate notifications from profile changes
CREATE OR REPLACE FUNCTION notify_profile_change()
RETURNS trigger AS $$
BEGIN
  -- Skip if no significant changes
  IF TG_OP = 'UPDATE' AND 
     OLD.first_name = NEW.first_name AND 
     OLD.last_name = NEW.last_name AND
     OLD.phone = NEW.phone AND
     OLD.role = NEW.role THEN
    RETURN NEW;
  END IF;

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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for profile notifications
DROP TRIGGER IF EXISTS trigger_notify_profile_change ON public.profiles;
CREATE TRIGGER trigger_notify_profile_change
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_profile_change();

-- Create function to generate notifications from schedule changes
CREATE OR REPLACE FUNCTION notify_schedule_change()
RETURNS trigger AS $$
DECLARE
  shift_employee_id uuid;
  shift_date date;
  shift_template text;
BEGIN
  -- Get relevant info
  IF TG_OP = 'DELETE' THEN
    shift_employee_id := OLD.employee_id;
    shift_date := OLD.schedule_date;
  ELSE
    shift_employee_id := NEW.employee_id;
    shift_date := NEW.schedule_date;
  END IF;

  -- Get template name if available
  SELECT name INTO shift_template
  FROM public.shift_templates
  WHERE id = COALESCE(NEW.template_id, OLD.template_id);

  INSERT INTO public.notifications (
    profile_id,
    type,
    category,
    title,
    body,
    data,
    requires_action
  ) VALUES (
    shift_employee_id,
    CASE TG_OP
      WHEN 'INSERT' THEN 'schedule_assigned'
      WHEN 'UPDATE' THEN 'schedule_changed'
      WHEN 'DELETE' THEN 'schedule_removed'
    END,
    'schedule',
    CASE TG_OP
      WHEN 'INSERT' THEN 'New Shift Assigned'
      WHEN 'UPDATE' THEN 'Shift Updated'
      WHEN 'DELETE' THEN 'Shift Removed'
    END,
    CASE TG_OP
      WHEN 'INSERT' THEN format('You have been assigned a shift on %s', to_char(shift_date, 'Mon DD, YYYY'))
      WHEN 'UPDATE' THEN format('Your shift on %s has been updated', to_char(shift_date, 'Mon DD, YYYY'))
      WHEN 'DELETE' THEN format('Your shift on %s has been removed', to_char(shift_date, 'Mon DD, YYYY'))
    END,
    jsonb_build_object(
      'schedule_date', shift_date,
      'template_name', COALESCE(shift_template, 'Custom'),
      'url', '/my-schedule'
    ),
    TG_OP = 'INSERT'  -- New shifts require acknowledgement
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for schedule notifications
DROP TRIGGER IF EXISTS trigger_notify_schedule_change ON public.employee_schedules;
CREATE TRIGGER trigger_notify_schedule_change
  AFTER INSERT OR UPDATE OR DELETE ON public.employee_schedules
  FOR EACH ROW
  EXECUTE FUNCTION notify_schedule_change();

-- Create function to generate notifications from PTO changes
CREATE OR REPLACE FUNCTION notify_pto_change()
RETURNS trigger AS $$
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
    NEW.profile_id,
    CASE 
      WHEN NEW.status = 'approved' THEN 'pto_approved'
      WHEN NEW.status = 'denied' THEN 'pto_denied'
      WHEN NEW.status = 'pending' THEN 'pto_submitted'
      ELSE 'pto_updated'
    END,
    'pto',
    CASE 
      WHEN NEW.status = 'approved' THEN '🎉 PTO Approved!'
      WHEN NEW.status = 'denied' THEN 'PTO Request Denied'
      WHEN NEW.status = 'pending' AND TG_OP = 'INSERT' THEN 'PTO Request Submitted'
      ELSE 'PTO Status Updated'
    END,
    CASE 
      WHEN NEW.status = 'approved' THEN format('Your time off request for %s - %s has been approved!', to_char(NEW.start_date, 'Mon DD'), to_char(NEW.end_date, 'Mon DD'))
      WHEN NEW.status = 'denied' THEN format('Your time off request for %s - %s was not approved.', to_char(NEW.start_date, 'Mon DD'), to_char(NEW.end_date, 'Mon DD'))
      WHEN NEW.status = 'pending' AND TG_OP = 'INSERT' THEN format('Your request for %s - %s is pending review.', to_char(NEW.start_date, 'Mon DD'), to_char(NEW.end_date, 'Mon DD'))
      ELSE format('Your time off request for %s - %s has been updated.', to_char(NEW.start_date, 'Mon DD'), to_char(NEW.end_date, 'Mon DD'))
    END,
    jsonb_build_object(
      'start_date', NEW.start_date,
      'end_date', NEW.end_date,
      'status', NEW.status,
      'url', '/my-time-off'
    ),
    NEW.status = 'pending'  -- Pending items may need follow-up
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for PTO notifications
DROP TRIGGER IF EXISTS trigger_notify_pto_change ON public.pto_requests;
CREATE TRIGGER trigger_notify_pto_change
  AFTER INSERT OR UPDATE ON public.pto_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_pto_change();

-- Create function to generate notifications from skill changes
CREATE OR REPLACE FUNCTION notify_skill_change()
RETURNS trigger AS $$
DECLARE
  skill_name text;
BEGIN
  -- Get skill name
  SELECT name INTO skill_name
  FROM public.skills
  WHERE id = NEW.skill_id;

  INSERT INTO public.notifications (
    profile_id,
    type,
    category,
    title,
    body,
    data,
    requires_action
  ) VALUES (
    NEW.employee_id,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'skill_added'
      WHEN NEW.rating > COALESCE(OLD.rating, 0) THEN 'skill_improved'
      ELSE 'skill_updated'
    END,
    'skills',
    CASE 
      WHEN TG_OP = 'INSERT' THEN '⭐ New Skill Added!'
      WHEN NEW.rating > COALESCE(OLD.rating, 0) THEN '🎯 Skill Level Up!'
      ELSE 'Skill Updated'
    END,
    CASE 
      WHEN TG_OP = 'INSERT' THEN format('"%s" has been added to your skill profile.', skill_name)
      WHEN NEW.rating > COALESCE(OLD.rating, 0) THEN format('Your "%s" skill has improved to level %s!', skill_name, NEW.rating)
      ELSE format('Your "%s" skill has been updated.', skill_name)
    END,
    jsonb_build_object(
      'skill_name', skill_name,
      'skill_id', NEW.skill_id,
      'rating', NEW.rating,
      'url', '/my-skills'
    ),
    false
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for skill notifications
DROP TRIGGER IF EXISTS trigger_notify_skill_change ON public.employee_skills;
CREATE TRIGGER trigger_notify_skill_change
  AFTER INSERT OR UPDATE ON public.employee_skills
  FOR EACH ROW
  EXECUTE FUNCTION notify_skill_change();

-- Seed some initial notifications for testing (for existing profiles)
INSERT INTO public.notifications (profile_id, type, category, title, body, data, requires_action, created_at)
SELECT 
  p.id,
  'system_welcome',
  'system',
  '👋 Welcome to TeamOS!',
  'Your Activity Hub is ready. Here you''ll see updates about your schedule, skills, and more.',
  jsonb_build_object('url', '/activity', 'action_label', 'Explore'),
  false,
  NOW() - INTERVAL '5 minutes'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.notifications n 
  WHERE n.profile_id = p.id AND n.type = 'system_welcome'
)
LIMIT 20;

-- Add some variety notifications for demo
INSERT INTO public.notifications (profile_id, type, category, title, body, data, requires_action, created_at)
SELECT 
  p.id,
  'training_reminder',
  'training',
  '📚 Training Reminder',
  'You have upcoming training courses to complete this month.',
  jsonb_build_object('url', '/academy', 'action_label', 'View Courses'),
  true,
  NOW() - INTERVAL '1 hour'
FROM public.profiles p
WHERE p.role = 'employee'
  AND NOT EXISTS (
    SELECT 1 FROM public.notifications n 
    WHERE n.profile_id = p.id AND n.type = 'training_reminder'
  )
LIMIT 10;

-- HR notification for new hires
INSERT INTO public.notifications (profile_id, type, category, title, body, data, requires_action, created_at)
SELECT 
  p.id,
  'hr_onboarding',
  'hr',
  '📋 Complete Your Onboarding',
  'Please review and complete your onboarding documents.',
  jsonb_build_object('url', '/profile', 'action_label', 'Complete Now'),
  true,
  NOW() - INTERVAL '2 days'
FROM public.profiles p
WHERE p.created_at > NOW() - INTERVAL '30 days'
  AND NOT EXISTS (
    SELECT 1 FROM public.notifications n 
    WHERE n.profile_id = p.id AND n.type = 'hr_onboarding'
  )
LIMIT 5;

COMMENT ON TABLE public.notifications IS 'User notifications and activity feed with real-time updates';
