-- =====================================================
-- APP SETTINGS TABLE
-- Migration: 104_app_settings.sql
-- Description: Create app_settings table for storing
--              application configuration like Slack channels
-- =====================================================

-- Create app_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add description column if it doesn't exist
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS description TEXT;

-- Create index on key for fast lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage app settings" ON app_settings;
DROP POLICY IF EXISTS "Authenticated users can view app settings" ON app_settings;

-- Create policies
CREATE POLICY "Admins can manage app settings"
  ON app_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can view app settings"
  ON app_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON app_settings TO authenticated;

-- Insert default Slack settings (without description to handle existing tables)
INSERT INTO app_settings (key, value) VALUES
  ('slack_visitor_announcements_channel', NULL),
  ('slack_time_off_requests_channel', NULL),
  ('slack_ce_events_channel', NULL),
  ('slack_schedule_changes_channel', NULL),
  ('slack_general_notifications_channel', NULL)
ON CONFLICT (key) DO NOTHING;

-- Add comment
COMMENT ON TABLE app_settings IS 'Application-wide settings and configuration';
