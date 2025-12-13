-- Migration: Add CRM fields to referral_partners table
-- Description: Adds key decision maker, preferences, visit history, and additional CRM fields

-- Add new CRM columns
ALTER TABLE referral_partners 
ADD COLUMN IF NOT EXISTS key_decision_maker TEXT,
ADD COLUMN IF NOT EXISTS key_decision_maker_title TEXT,
ADD COLUMN IF NOT EXISTS key_decision_maker_email TEXT,
ADD COLUMN IF NOT EXISTS key_decision_maker_phone TEXT;

ALTER TABLE referral_partners 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS communication_preference TEXT DEFAULT 'email' CHECK (communication_preference IN ('email', 'phone', 'text', 'in_person'));

ALTER TABLE referral_partners 
ADD COLUMN IF NOT EXISTS relationship_status TEXT DEFAULT 'new' CHECK (relationship_status IN ('new', 'developing', 'established', 'at_risk', 'churned')),
ADD COLUMN IF NOT EXISTS last_contact_date DATE,
ADD COLUMN IF NOT EXISTS next_followup_date DATE;

ALTER TABLE referral_partners 
ADD COLUMN IF NOT EXISTS specialty_areas TEXT[],
ADD COLUMN IF NOT EXISTS referral_value_monthly NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS contract_end_date DATE;

-- Create partner_visit_log table for tracking visits
CREATE TABLE IF NOT EXISTS partner_visit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES referral_partners(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  visit_type TEXT NOT NULL DEFAULT 'in_person' CHECK (visit_type IN ('in_person', 'phone', 'video', 'email')),
  contacted_person TEXT,
  summary TEXT,
  outcome TEXT,
  next_steps TEXT,
  logged_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for visit lookups
CREATE INDEX IF NOT EXISTS idx_partner_visit_logs_partner_id ON partner_visit_logs(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_visit_logs_visit_date ON partner_visit_logs(visit_date);

-- Enable RLS on visit logs
ALTER TABLE partner_visit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can manage visit logs
CREATE POLICY "Admins can manage partner visit logs"
ON partner_visit_logs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('super_admin', 'admin')
  )
);

-- Managers can view and add visit logs
CREATE POLICY "Managers can view and add partner visit logs"
ON partner_visit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'manager'
  )
);

CREATE POLICY "Managers can insert partner visit logs"
ON partner_visit_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'manager'
  )
);

-- Add comment for documentation
COMMENT ON TABLE partner_visit_logs IS 'Tracks all visits and interactions with referral partners';
COMMENT ON COLUMN referral_partners.preferences IS 'JSON object for partner preferences (e.g., {"preferred_contact_time": "morning", "prefers_texts": true})';
COMMENT ON COLUMN referral_partners.specialty_areas IS 'Array of medical specialties the partner focuses on';
