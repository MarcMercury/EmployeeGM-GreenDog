-- =====================================================
-- SLACK PERSONAL NOTIFICATION BRIDGE
-- Migration: 287_slack_personal_notification_bridge.sql
-- Description:
--   1. Fixes the broken RLS policies from migration 105 that used
--      `profiles.id = auth.uid()` instead of this codebase's
--      convention `profiles.auth_user_id = auth.uid()`. The wrong
--      column silently blocked admins from reading sync logs,
--      conflicts, triggers and the notification queue, which made the
--      Admin -> Slack Integration page appear broken.
--   2. Bridges in-app notifications (public.notifications) to Slack so
--      that every notification created for a user is pushed to that
--      user's Slack DM ("a channel just for the matching user"), and
--      optionally mirrored to a shared channel.
-- =====================================================

-- -----------------------------------------------------
-- 1. FIX RLS POLICIES (column mismatch from migration 105)
-- -----------------------------------------------------

-- slack_sync_logs ------------------------------------------------
DROP POLICY IF EXISTS "Admins can view sync logs" ON slack_sync_logs;
CREATE POLICY "Admins can view sync logs" ON slack_sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- slack_sync_conflicts -------------------------------------------
DROP POLICY IF EXISTS "Admins can view conflicts" ON slack_sync_conflicts;
CREATE POLICY "Admins can view conflicts" ON slack_sync_conflicts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update conflicts" ON slack_sync_conflicts;
CREATE POLICY "Admins can update conflicts" ON slack_sync_conflicts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- notification_triggers ------------------------------------------
DROP POLICY IF EXISTS "Admins can manage notification triggers" ON notification_triggers;
CREATE POLICY "Admins can manage notification triggers" ON notification_triggers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- notification_queue ---------------------------------------------
DROP POLICY IF EXISTS "Admins can view notification queue" ON notification_queue;
CREATE POLICY "Admins can view notification queue" ON notification_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- -----------------------------------------------------
-- 2. NOTIFICATION -> SLACK BRIDGE
-- -----------------------------------------------------

-- Default (empty) setting for the optional shared mirror channel.
-- When set to a Slack channel ID, personal notifications are also
-- posted to that channel. Left empty by default so that, out of the
-- box, notifications only go to the user's private DM.
INSERT INTO app_settings (key, value)
VALUES ('slack_personal_notifications_mirror_channel', NULL)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.enqueue_slack_for_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slack_user_id  text;
  v_slack_status   text;
  v_mirror_channel text;
  v_message        text;
  v_skip           boolean := false;
  v_dm_only        boolean := false;
BEGIN
  -- Per-notification opt-outs (callers may set these in data JSONB)
  IF NEW.data IS NOT NULL THEN
    v_skip    := lower(COALESCE(NEW.data->>'slack_skip', ''))    IN ('true', 't', '1');
    v_dm_only := lower(COALESCE(NEW.data->>'slack_dm_only', '')) IN ('true', 't', '1');
  END IF;

  IF v_skip THEN
    RETURN NEW;
  END IF;

  -- Build the Slack message from the in-app notification
  v_message := '*' || COALESCE(NULLIF(NEW.title, ''), 'Notification') || '*';
  IF NEW.body IS NOT NULL AND NEW.body <> '' THEN
    v_message := v_message || E'\n' || NEW.body;
  END IF;

  -- Resolve the recipient's linked Slack account
  SELECT slack_user_id, slack_status
    INTO v_slack_user_id, v_slack_status
  FROM public.profiles
  WHERE id = NEW.profile_id;

  -- DM the matching user (their own private channel) when linked & active
  IF v_slack_user_id IS NOT NULL AND COALESCE(v_slack_status, '') <> 'deactivated' THEN
    INSERT INTO public.notification_queue
      (slack_user_id, message, status, priority, scheduled_for, metadata)
    VALUES (
      v_slack_user_id,
      v_message,
      'pending',
      0,
      now(),
      jsonb_build_object(
        'source', 'notifications',
        'notification_id', NEW.id,
        'profile_id', NEW.profile_id,
        'type', NEW.type,
        'delivery', 'dm'
      )
    );
  END IF;

  -- Optionally mirror to a shared channel (opt-in via app_settings)
  IF NOT v_dm_only THEN
    SELECT value INTO v_mirror_channel
    FROM public.app_settings
    WHERE key = 'slack_personal_notifications_mirror_channel';

    IF v_mirror_channel IS NOT NULL AND v_mirror_channel <> '' THEN
      INSERT INTO public.notification_queue
        (channel, message, status, priority, scheduled_for, metadata)
      VALUES (
        v_mirror_channel,
        v_message,
        'pending',
        0,
        now(),
        jsonb_build_object(
          'source', 'notifications',
          'notification_id', NEW.id,
          'profile_id', NEW.profile_id,
          'type', NEW.type,
          'delivery', 'channel'
        )
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never let a Slack enqueue failure block the in-app notification
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enqueue_slack_for_notification() IS
  'Pushes each in-app notification to the recipient''s Slack DM (and optional shared channel) via notification_queue.';

DROP TRIGGER IF EXISTS trg_enqueue_slack_for_notification ON public.notifications;
CREATE TRIGGER trg_enqueue_slack_for_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_slack_for_notification();
