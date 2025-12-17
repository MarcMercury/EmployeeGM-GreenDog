-- =====================================================
-- Migration: Fix All Employee Skills Triggers
-- Description: Drop and recreate all triggers on employee_skills
--   to use correct column names (level instead of rating/proficiency_level)
-- =====================================================

-- Drop ALL existing triggers on employee_skills
DROP TRIGGER IF EXISTS trigger_notify_skill_change ON public.employee_skills;
DROP TRIGGER IF EXISTS trigger_notify_employee_skill_change ON public.employee_skills;

-- Drop old function that uses 'rating' column
DROP FUNCTION IF EXISTS notify_skill_change();

-- Recreate the notification function with correct column name
CREATE OR REPLACE FUNCTION notify_employee_skill_change()
RETURNS TRIGGER AS $$
DECLARE
  employee_profile_id UUID;
  skill_name TEXT;
BEGIN
  -- Get the profile_id for the employee
  SELECT p.id INTO employee_profile_id
  FROM public.profiles p
  WHERE p.employee_id = NEW.employee_id
  LIMIT 1;

  -- Get skill name
  SELECT name INTO skill_name
  FROM public.skill_library
  WHERE id = NEW.skill_id;

  -- If no profile found, skip notification
  IF employee_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only create notification if level actually changed or is new
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.level IS DISTINCT FROM OLD.level) THEN
    INSERT INTO public.notifications (
      profile_id,
      type,
      category,
      title,
      body,
      data,
      requires_action
    ) VALUES (
      employee_profile_id,
      CASE 
        WHEN TG_OP = 'INSERT' THEN 'skill_added'
        WHEN NEW.level > COALESCE(OLD.level, 0) THEN 'skill_improved'
        ELSE 'skill_updated'
      END,
      'skills',
      CASE 
        WHEN TG_OP = 'INSERT' THEN '⭐ New Skill Added!'
        WHEN NEW.level > COALESCE(OLD.level, 0) THEN '🎯 Skill Level Up!'
        ELSE 'Skill Updated'
      END,
      CASE 
        WHEN TG_OP = 'INSERT' THEN format('"%s" has been added to your skill profile.', COALESCE(skill_name, 'A skill'))
        WHEN NEW.level > COALESCE(OLD.level, 0) THEN format('Your "%s" skill has improved to level %s!', COALESCE(skill_name, 'skill'), NEW.level)
        ELSE format('Your "%s" skill has been updated.', COALESCE(skill_name, 'skill'))
      END,
      jsonb_build_object(
        'skill_name', skill_name,
        'skill_id', NEW.skill_id,
        'level', NEW.level,
        'url', '/skills'
      ),
      false
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't let notification errors block the skill update
    RAISE WARNING 'Notification trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create single trigger for skill notifications
CREATE TRIGGER trigger_notify_employee_skill_change
  AFTER INSERT OR UPDATE ON public.employee_skills
  FOR EACH ROW
  EXECUTE FUNCTION notify_employee_skill_change();
