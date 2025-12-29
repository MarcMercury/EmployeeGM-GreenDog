-- =====================================================
-- SLACK INTEGRATION
-- Migration: 103_slack_user_integration.sql
-- Description: Add slack_user_id to employees and profiles
--              for matching users to their Slack accounts
-- =====================================================

-- Add slack_user_id to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS slack_user_id TEXT;

-- Add slack_user_id to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS slack_user_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_slack_user_id 
ON employees(slack_user_id) WHERE slack_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_slack_user_id 
ON profiles(slack_user_id) WHERE slack_user_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN employees.slack_user_id IS 'Slack User ID (e.g., U1234567890) for sending DMs and mentions';
COMMENT ON COLUMN profiles.slack_user_id IS 'Slack User ID (e.g., U1234567890) for sending DMs and mentions';
