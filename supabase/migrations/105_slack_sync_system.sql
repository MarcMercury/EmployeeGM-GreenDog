-- =====================================================
-- SLACK SYNCHRONIZATION SYSTEM
-- Migration: 105_slack_sync_system.sql
-- Description: Comprehensive Slack sync, notification queue,
--              and status tracking tables
-- =====================================================

-- Add slack_status to employees table for tracking sync status
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS slack_status TEXT DEFAULT 'unlinked';

-- Valid values: 'linked', 'unlinked', 'deactivated', 'pending_review', 'mismatch'
COMMENT ON COLUMN employees.slack_status IS 'Slack integration status: linked, unlinked, deactivated, pending_review, mismatch';

-- Add slack_status to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS slack_status TEXT DEFAULT 'unlinked';

COMMENT ON COLUMN profiles.slack_status IS 'Slack integration status: linked, unlinked, deactivated, pending_review, mismatch';

-- Add last_slack_sync timestamp
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS last_slack_sync TIMESTAMPTZ;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_slack_sync TIMESTAMPTZ;

COMMENT ON COLUMN employees.last_slack_sync IS 'Last successful Slack sync timestamp';
COMMENT ON COLUMN profiles.last_slack_sync IS 'Last successful Slack sync timestamp';

-- =====================================================
-- SLACK SYNC LOGS TABLE
-- Tracks all synchronization operations and their outcomes
-- =====================================================
CREATE TABLE IF NOT EXISTS slack_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL, -- 'scheduled', 'manual', 'user_update', 'deactivation'
  status TEXT NOT NULL, -- 'success', 'partial', 'failed'
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  total_employees INTEGER DEFAULT 0,
  matched_count INTEGER DEFAULT 0,
  new_links_count INTEGER DEFAULT 0,
  deactivated_count INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  pending_review_count INTEGER DEFAULT 0,
  error_details JSONB, -- Array of error objects
  summary JSONB, -- Detailed summary of operations
  triggered_by TEXT, -- 'system', 'admin', profile_id
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slack_sync_logs_started_at ON slack_sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_slack_sync_logs_status ON slack_sync_logs(status);

COMMENT ON TABLE slack_sync_logs IS 'Audit log for Slack synchronization operations';

-- =====================================================
-- SLACK SYNC CONFLICTS TABLE
-- Tracks users that need manual review
-- =====================================================
CREATE TABLE IF NOT EXISTS slack_sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  conflict_type TEXT NOT NULL, -- 'no_match', 'multiple_matches', 'email_mismatch', 'deactivated_in_slack'
  employee_email TEXT,
  slack_user_id TEXT,
  slack_email TEXT,
  slack_display_name TEXT,
  details JSONB,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'resolved', 'ignored'
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slack_sync_conflicts_status ON slack_sync_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_slack_sync_conflicts_employee ON slack_sync_conflicts(employee_id);
CREATE INDEX IF NOT EXISTS idx_slack_sync_conflicts_type ON slack_sync_conflicts(conflict_type);

COMMENT ON TABLE slack_sync_conflicts IS 'Pending conflicts requiring admin review for Slack user matching';

-- =====================================================
-- NOTIFICATION TRIGGERS TABLE
-- Defines which events trigger Slack notifications
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  event_type TEXT NOT NULL, -- 'employee_onboarding', 'visitor_arrival', 'schedule_update', etc.
  is_active BOOLEAN DEFAULT true,
  channel_target TEXT, -- Default channel for this trigger (can be overridden)
  send_dm BOOLEAN DEFAULT false, -- Also send DM to relevant user
  message_template TEXT, -- Template with placeholders like {{employee_name}}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_triggers_event ON notification_triggers(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_triggers_active ON notification_triggers(is_active) WHERE is_active = true;

COMMENT ON TABLE notification_triggers IS 'Configuration for events that trigger Slack notifications';

-- =====================================================
-- NOTIFICATION QUEUE TABLE
-- Queue for pending Slack notifications
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id UUID REFERENCES notification_triggers(id) ON DELETE SET NULL,
  channel TEXT, -- Target channel ID or name
  slack_user_id TEXT, -- Target user for DM (optional)
  message TEXT NOT NULL,
  blocks JSONB, -- Optional Block Kit blocks for rich formatting
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
  priority INTEGER DEFAULT 0, -- Higher = more urgent
  scheduled_for TIMESTAMPTZ, -- For scheduled notifications
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  metadata JSONB, -- Additional context (employee_id, event details, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_pending ON notification_queue(status, scheduled_for) 
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_queue_created ON notification_queue(created_at DESC);

COMMENT ON TABLE notification_queue IS 'Queue for Slack notifications to be processed';

-- =====================================================
-- SEED DEFAULT NOTIFICATION TRIGGERS
-- =====================================================
INSERT INTO notification_triggers (name, event_type, description, channel_target, send_dm, message_template)
VALUES 
  ('New Employee Onboarding', 'employee_onboarding', 'Notification when a new employee starts onboarding', '#new-hires', false, '🎉 Welcome {{employee_name}} to the team! They are joining as {{position}} starting {{start_date}}.'),
  ('Visitor Arrival', 'visitor_arrival', 'Notification when a visitor/shadow arrives', '#visitors', false, '👋 {{visitor_name}} has arrived for their {{visit_type}} visit. Contact: {{coordinator}}'),
  ('Schedule Published', 'schedule_published', 'Notification when a new schedule is published', '#schedule', false, '📅 New schedule published for {{period}}. Check your assignments!'),
  ('Time Off Approved', 'time_off_approved', 'Notification when time off is approved', NULL, true, '✅ Your time off request for {{dates}} has been approved!'),
  ('Time Off Requested', 'time_off_requested', 'Notification to manager when time off is requested', NULL, true, '📝 {{employee_name}} has requested time off for {{dates}}. Please review.'),
  ('Training Completed', 'training_completed', 'Notification when employee completes training', '#training', false, '🏆 {{employee_name}} has completed training: {{training_name}}'),
  ('Certification Expiring', 'certification_expiring', 'Alert for expiring certifications', NULL, true, '⚠️ Your {{certification_name}} certification expires on {{expiry_date}}. Please renew.')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE slack_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Slack sync logs: Admin read-only
CREATE POLICY "Admins can view sync logs" ON slack_sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "System can insert sync logs" ON slack_sync_logs
  FOR INSERT WITH CHECK (true);

-- Slack sync conflicts: Admin full access
CREATE POLICY "Admins can view conflicts" ON slack_sync_conflicts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update conflicts" ON slack_sync_conflicts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "System can insert conflicts" ON slack_sync_conflicts
  FOR INSERT WITH CHECK (true);

-- Notification triggers: Admin manage, all can read
CREATE POLICY "Anyone can view notification triggers" ON notification_triggers
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage notification triggers" ON notification_triggers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Notification queue: Admin full access
CREATE POLICY "Admins can view notification queue" ON notification_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "System can manage notification queue" ON notification_queue
  FOR ALL WITH CHECK (true);

-- =====================================================
-- UPDATE TRIGGER FOR updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_slack_sync_conflicts_updated_at
  BEFORE UPDATE ON slack_sync_conflicts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_triggers_updated_at
  BEFORE UPDATE ON notification_triggers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_queue_updated_at
  BEFORE UPDATE ON notification_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
