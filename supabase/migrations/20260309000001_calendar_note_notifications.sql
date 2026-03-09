-- Migration: Marketing Calendar Note Notifications
-- Creates notifications when calendar notes are created by the Scout agent or scrapers
-- Notifies marketing_admin, admin, and super_admin users

-- =====================================================
-- 1. Create function to notify admins about new calendar notes
-- =====================================================
CREATE OR REPLACE FUNCTION notify_calendar_note_created()
RETURNS TRIGGER AS $$
DECLARE
  profile_record RECORD;
BEGIN
  -- Only notify for auto-generated notes (scout/scraper notes start with 🔍)
  -- Skip manual notes created by humans to avoid notification spam
  IF NEW.title NOT LIKE '🔍%' THEN
    RETURN NEW;
  END IF;

  -- Notify all users with marketing admin access
  FOR profile_record IN
    SELECT id
    FROM profiles
    WHERE role IN ('super_admin', 'admin', 'marketing_admin', 'sup_admin')
      AND status = 'active'
  LOOP
    INSERT INTO notifications (
      profile_id,
      type,
      category,
      title,
      body,
      data,
      requires_action,
      is_read,
      created_at
    ) VALUES (
      profile_record.id,
      'calendar_note_added',
      'marketing',
      '📝 New Calendar Note: ' || SUBSTRING(NEW.title FROM 3),
      'A new note "' || NEW.title || '" has been added to the Marketing Calendar for ' ||
        TO_CHAR(NEW.note_date, 'Month DD, YYYY') || '.' ||
        CASE WHEN NEW.content IS NOT NULL THEN E'\n' || LEFT(NEW.content, 200) ELSE '' END,
      jsonb_build_object(
        'note_id', NEW.id,
        'note_title', NEW.title,
        'note_date', NEW.note_date,
        'note_color', NEW.color,
        'url', '/marketing/calendar',
        'action_label', 'View Calendar'
      ),
      false,
      false,
      NOW()
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. Create trigger on marketing_calendar_notes table
-- =====================================================
DROP TRIGGER IF EXISTS trigger_notify_calendar_note_created ON marketing_calendar_notes;
CREATE TRIGGER trigger_notify_calendar_note_created
  AFTER INSERT ON marketing_calendar_notes
  FOR EACH ROW
  EXECUTE FUNCTION notify_calendar_note_created();
