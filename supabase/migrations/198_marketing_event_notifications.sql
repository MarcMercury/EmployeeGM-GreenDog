-- Migration: Marketing Event Notifications
-- Creates notifications when marketing events are created
-- Notifies all users with marketing calendar access

-- =====================================================
-- 1. Create function to notify marketing users about new events
-- =====================================================
CREATE OR REPLACE FUNCTION notify_marketing_event_created()
RETURNS TRIGGER AS $$
DECLARE
  profile_record RECORD;
  event_type TEXT;
  event_icon TEXT;
BEGIN
  -- Determine event type for display
  IF NEW.event_type = 'ce_event' THEN
    event_type := 'CE Event';
    event_icon := '🎓';
  ELSE
    event_type := 'Marketing Event';
    event_icon := '📅';
  END IF;

  -- Notify all users with marketing calendar access
  -- Roles: super_admin, admin, manager, marketing_admin, sup_admin
  FOR profile_record IN
    SELECT id, first_name, last_name
    FROM profiles
    WHERE role IN ('super_admin', 'admin', 'manager', 'marketing_admin', 'sup_admin')
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
      created_at
    ) VALUES (
      profile_record.id,
      'marketing_event_created',
      'marketing',
      event_icon || ' New ' || event_type || ' Created',
      'A new event "' || NEW.name || '" has been scheduled for ' || 
        TO_CHAR(NEW.event_date, 'Month DD, YYYY') || '.',
      jsonb_build_object(
        'event_id', NEW.id,
        'event_name', NEW.name,
        'event_date', NEW.event_date,
        'event_type', COALESCE(NEW.event_type, 'marketing'),
        'location', NEW.location,
        'url', '/marketing/calendar',
        'action_label', 'View Calendar'
      ),
      false,
      NOW()
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. Create trigger on marketing_events table
-- =====================================================
DROP TRIGGER IF EXISTS trigger_notify_marketing_event_created ON marketing_events;
CREATE TRIGGER trigger_notify_marketing_event_created
  AFTER INSERT ON marketing_events
  FOR EACH ROW
  EXECUTE FUNCTION notify_marketing_event_created();

-- =====================================================
-- 3. Also notify on CE events (gdu_events table) if it exists
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gdu_events') THEN
    -- Create function for GDU/CE events
    CREATE OR REPLACE FUNCTION notify_gdu_event_created()
    RETURNS TRIGGER AS $func$
    DECLARE
      profile_record RECORD;
    BEGIN
      -- Notify all users with marketing/GDU access
      FOR profile_record IN
        SELECT id
        FROM profiles
        WHERE role IN ('super_admin', 'admin', 'manager', 'marketing_admin', 'hr_admin', 'sup_admin')
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
          created_at
        ) VALUES (
          profile_record.id,
          'ce_event_created',
          'marketing',
          '🎓 New CE Event Created',
          'A new CE event "' || NEW.title || '" has been scheduled for ' || 
            TO_CHAR(NEW.event_date_start, 'Month DD, YYYY') || '.',
          jsonb_build_object(
            'event_id', NEW.id,
            'event_title', NEW.title,
            'event_date', NEW.event_date_start,
            'url', '/gdu/events',
            'action_label', 'View Event'
          ),
          false,
          NOW()
        );
      END LOOP;

      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Create trigger on gdu_events
    DROP TRIGGER IF EXISTS trigger_notify_gdu_event_created ON gdu_events;
    CREATE TRIGGER trigger_notify_gdu_event_created
      AFTER INSERT ON gdu_events
      FOR EACH ROW
      EXECUTE FUNCTION notify_gdu_event_created();
  END IF;
END $$;

-- =====================================================
-- 4. Add comments
-- =====================================================
COMMENT ON FUNCTION notify_marketing_event_created() IS 'Notifies users with marketing access when a new marketing event is created';
