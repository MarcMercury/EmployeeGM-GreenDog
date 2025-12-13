-- Migration: Create Recruiting Module Tables
-- Description: Tables for candidate tracking, skill ratings, and onboarding checklists

-- ============================================
-- Table: candidates
-- Purpose: Track job applicants through the hiring pipeline
-- ============================================
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  resume_url TEXT,
  target_position_id UUID REFERENCES job_positions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'screening', 'interview', 'offer', 'hired', 'rejected')),
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_position ON candidates(target_position_id);
CREATE INDEX IF NOT EXISTS idx_candidates_applied_at ON candidates(applied_at);

-- ============================================
-- Table: candidate_skills
-- Purpose: Store interview skill ratings (0-5 scale)
-- ============================================
CREATE TABLE IF NOT EXISTS candidate_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skill_library(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  notes TEXT,
  rated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(candidate_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_skills_candidate ON candidate_skills(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_skills_skill ON candidate_skills(skill_id);

-- ============================================
-- Table: onboarding_checklist
-- Purpose: Track onboarding task completion for new hires
-- ============================================
CREATE TABLE IF NOT EXISTS onboarding_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL UNIQUE REFERENCES candidates(id) ON DELETE CASCADE,
  contract_sent BOOLEAN NOT NULL DEFAULT false,
  contract_signed BOOLEAN NOT NULL DEFAULT false,
  background_check BOOLEAN NOT NULL DEFAULT false,
  uniform_ordered BOOLEAN NOT NULL DEFAULT false,
  email_created BOOLEAN NOT NULL DEFAULT false,
  start_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_candidate ON onboarding_checklist(candidate_id);

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_checklist ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for candidates
-- ============================================
CREATE POLICY "Admins can manage candidates"
ON candidates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('super_admin', 'admin')
  )
);

-- ============================================
-- RLS Policies for candidate_skills
-- ============================================
CREATE POLICY "Admins can manage candidate skills"
ON candidate_skills FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('super_admin', 'admin')
  )
);

-- ============================================
-- RLS Policies for onboarding_checklist
-- ============================================
CREATE POLICY "Admins can manage onboarding"
ON onboarding_checklist FOR ALL
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
CREATE OR REPLACE FUNCTION update_candidates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_candidates_updated_at();

CREATE OR REPLACE FUNCTION update_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER onboarding_updated_at
  BEFORE UPDATE ON onboarding_checklist
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_updated_at();

-- ============================================
-- Seed sample candidates
-- ============================================
INSERT INTO candidates (first_name, last_name, email, phone, status, applied_at) VALUES
('Emily', 'Thompson', 'emily.thompson@email.com', '(555) 123-4567', 'new', NOW() - INTERVAL '2 days'),
('Michael', 'Rodriguez', 'michael.r@email.com', '(555) 234-5678', 'screening', NOW() - INTERVAL '5 days'),
('Sarah', 'Chen', 'sarah.chen@email.com', '(555) 345-6789', 'interview', NOW() - INTERVAL '10 days'),
('David', 'Williams', 'david.w@email.com', '(555) 456-7890', 'interview', NOW() - INTERVAL '8 days'),
('Jessica', 'Martinez', 'jessica.m@email.com', '(555) 567-8901', 'offer', NOW() - INTERVAL '15 days'),
('James', 'Brown', 'james.brown@email.com', '(555) 678-9012', 'new', NOW() - INTERVAL '12 days'),
('Amanda', 'Davis', 'amanda.d@email.com', '(555) 789-0123', 'rejected', NOW() - INTERVAL '20 days'),
('Christopher', 'Wilson', 'chris.w@email.com', '(555) 890-1234', 'hired', NOW() - INTERVAL '30 days')
ON CONFLICT DO NOTHING;

-- Create onboarding checklists for offer/hired candidates
INSERT INTO onboarding_checklist (candidate_id, contract_sent, contract_signed, background_check, start_date)
SELECT id, true, false, false, CURRENT_DATE + INTERVAL '14 days'
FROM candidates WHERE status = 'offer'
ON CONFLICT DO NOTHING;

INSERT INTO onboarding_checklist (candidate_id, contract_sent, contract_signed, background_check, uniform_ordered, email_created, start_date)
SELECT id, true, true, true, true, true, CURRENT_DATE - INTERVAL '7 days'
FROM candidates WHERE status = 'hired'
ON CONFLICT DO NOTHING;
