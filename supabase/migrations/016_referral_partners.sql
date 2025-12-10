-- Migration: Create referral_partners table
-- Description: Table for tracking referral partners (hospitals/practices that send patients)

CREATE TABLE IF NOT EXISTS referral_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  total_referrals INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_referral_partners_tier ON referral_partners(tier);
CREATE INDEX IF NOT EXISTS idx_referral_partners_is_active ON referral_partners(is_active);

-- Enable RLS
ALTER TABLE referral_partners ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage referral partners"
ON referral_partners
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('super_admin', 'admin')
  )
);

-- Managers can view referral partners
CREATE POLICY "Managers can view referral partners"
ON referral_partners
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'manager'
  )
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_referral_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER referral_partners_updated_at
  BEFORE UPDATE ON referral_partners
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_partners_updated_at();

-- Seed some sample data
INSERT INTO referral_partners (hospital_name, contact_person, email, phone, tier, total_referrals, is_active) VALUES
('Valley Veterinary Clinic', 'Dr. Sarah Johnson', 'sjohnson@valleyvet.com', '(818) 555-0101', 'gold', 67, true),
('Westside Animal Hospital', 'Dr. Michael Chen', 'mchen@westsideah.com', '(310) 555-0202', 'platinum', 142, true),
('Marina Pet Care', 'Dr. Lisa Patel', 'lpatel@marinapetcare.com', '(424) 555-0303', 'silver', 34, true),
('Hollywood Animal Clinic', 'Dr. James Wilson', 'jwilson@hollywoodac.com', '(323) 555-0404', 'bronze', 12, true),
('Burbank Veterinary Center', 'Dr. Emily Rodriguez', 'erodriguez@burbankvet.com', '(818) 555-0505', 'gold', 89, true),
('Santa Monica Vet Partners', 'Dr. David Kim', 'dkim@smvetpartners.com', '(310) 555-0606', 'silver', 28, false),
('Glendale Pet Hospital', 'Dr. Amanda Foster', 'afoster@glendalepet.com', '(818) 555-0707', 'bronze', 8, true),
('Pasadena Animal Medical', 'Dr. Robert Taylor', 'rtaylor@pasadenaam.com', '(626) 555-0808', 'platinum', 203, true)
ON CONFLICT DO NOTHING;
