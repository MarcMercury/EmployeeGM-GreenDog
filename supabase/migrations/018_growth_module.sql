-- Migration: Create Growth Module Tables
-- Description: Tables for marketing events, leads, and enhanced referral partners

-- ============================================
-- Table: marketing_events
-- Purpose: Track marketing events and staffing
-- ============================================
CREATE TABLE IF NOT EXISTS marketing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  staffing_needs TEXT,
  staffing_status TEXT DEFAULT 'planned' CHECK (staffing_status IN ('planned', 'confirmed')),
  budget DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_events_date ON marketing_events(event_date);
CREATE INDEX IF NOT EXISTS idx_marketing_events_status ON marketing_events(status);

-- ============================================
-- Table: marketing_leads
-- Purpose: Track leads from events and campaigns
-- ============================================
CREATE TABLE IF NOT EXISTS marketing_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES marketing_events(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  lead_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  contact_info TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'lost')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_leads_event ON marketing_leads(event_id);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_status ON marketing_leads(status);

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE marketing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_leads ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================
CREATE POLICY "Admins can manage marketing events"
ON marketing_events FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('super_admin', 'admin')
  )
);

CREATE POLICY "Admins can manage marketing leads"
ON marketing_leads FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('super_admin', 'admin')
  )
);

-- ============================================
-- Updated_at triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_marketing_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER marketing_events_updated_at
  BEFORE UPDATE ON marketing_events
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_events_updated_at();

CREATE OR REPLACE FUNCTION update_marketing_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER marketing_leads_updated_at
  BEFORE UPDATE ON marketing_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_leads_updated_at();

-- ============================================
-- Seed sample events
-- ============================================
INSERT INTO marketing_events (name, description, event_date, start_time, end_time, location, staffing_needs, staffing_status, status) VALUES
('City Dog Fair 2025', 'Annual dog fair with vendor booths and pet services', CURRENT_DATE + INTERVAL '14 days', '09:00', '17:00', 'Griffith Park, Los Angeles', '4 staff members, 1 veterinarian', 'confirmed', 'planned'),
('Pet Wellness Weekend', 'Free pet health screenings and consultations', CURRENT_DATE + INTERVAL '21 days', '10:00', '16:00', 'Sherman Oaks Galleria', '3 technicians, 2 receptionists', 'planned', 'planned'),
('Holiday Adoption Event', 'Partner adoption event with local shelters', CURRENT_DATE + INTERVAL '45 days', '11:00', '15:00', 'Venice Beach Boardwalk', '2 staff members', 'planned', 'planned'),
('Puppy Training Seminar', 'Free puppy training tips and socialization', CURRENT_DATE + INTERVAL '7 days', '14:00', '16:00', 'Green Dog Dental - Sherman Oaks', '1 trainer, 1 receptionist', 'confirmed', 'confirmed'),
('Community Outreach Day', 'Neighborhood pet care education', CURRENT_DATE - INTERVAL '7 days', '10:00', '14:00', 'Burbank Town Center', '3 staff members', 'confirmed', 'completed')
ON CONFLICT DO NOTHING;

-- Seed sample leads
INSERT INTO marketing_leads (lead_name, email, phone, source, status, event_id) 
SELECT 
  'John Smith', 'john.smith@email.com', '(555) 111-2222', 'City Dog Fair', 'new', id
FROM marketing_events WHERE name = 'City Dog Fair 2025'
ON CONFLICT DO NOTHING;

INSERT INTO marketing_leads (lead_name, email, phone, source, status) VALUES
('Sarah Johnson', 'sarah.j@email.com', '(555) 222-3333', 'Website', 'contacted'),
('Mike Davis', 'mike.d@email.com', '(555) 333-4444', 'Referral', 'new'),
('Emily Chen', 'emily.c@email.com', '(555) 444-5555', 'Social Media', 'converted'),
('Robert Taylor', 'robert.t@email.com', '(555) 555-6666', 'Walk-in', 'new'),
('Lisa Wong', 'lisa.w@email.com', '(555) 666-7777', 'Pet Wellness Weekend', 'contacted')
ON CONFLICT DO NOTHING;
