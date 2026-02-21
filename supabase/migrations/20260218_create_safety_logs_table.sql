-- Migration: Create safety_logs table for digital workplace safety logging
-- Date: February 18, 2026
-- Supports Cal/OSHA, AVMA, AAHA compliance logging

CREATE TABLE IF NOT EXISTS public.safety_logs (
  -- Identification
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Type and Location
  log_type text NOT NULL,  -- e.g., 'training_attendance', 'injury_illness', 'incident_near_miss'
  location text NOT NULL,  -- 'venice', 'sherman_oaks', 'van_nuys'
  
  -- Content
  form_data jsonb NOT NULL DEFAULT '{}',  -- Dynamic form fields as JSON
  photo_urls text[] DEFAULT '{}',  -- Array of S3 URLs for photos
  
  -- Submission metadata
  submitted_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'submitted',  -- 'draft', 'submitted', 'reviewed', 'flagged'
  
  -- Compliance tracking
  osha_recordable boolean DEFAULT false,
  flagged_reason text,  -- Why was this flagged?

  -- Review tracking
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_log_type CHECK (log_type != ''),
  CONSTRAINT valid_location CHECK (location IN ('venice', 'sherman_oaks', 'van_nuys')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'submitted', 'reviewed', 'flagged'))
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_safety_logs_log_type ON public.safety_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_safety_logs_location ON public.safety_logs(location);
CREATE INDEX IF NOT EXISTS idx_safety_logs_submitted_at ON public.safety_logs(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_logs_submitted_by ON public.safety_logs(submitted_by);
CREATE INDEX IF NOT EXISTS idx_safety_logs_status ON public.safety_logs(status);
CREATE INDEX IF NOT EXISTS idx_safety_logs_osha ON public.safety_logs(osha_recordable);

-- RLS: Enable for data access control
ALTER TABLE public.safety_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- 1. Users can see their own entries
DROP POLICY IF EXISTS "Users can view own safety logs" ON public.safety_logs;
CREATE POLICY "Users can view own safety logs" ON public.safety_logs
  FOR SELECT
  USING (submitted_by IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- 2. Managers/admins can see all entries
DROP POLICY IF EXISTS "Managers can view all safety logs" ON public.safety_logs;
CREATE POLICY "Managers can view all safety logs" ON public.safety_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin')
    )
  );

-- 3. Users can create entries (submit)
DROP POLICY IF EXISTS "Users can submit safety logs" ON public.safety_logs;
CREATE POLICY "Users can submit safety logs" ON public.safety_logs
  FOR INSERT
  WITH CHECK (submitted_by IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- 4. Admins can update entries (review, flag)
DROP POLICY IF EXISTS "Admins can update safety logs" ON public.safety_logs;
CREATE POLICY "Admins can update safety logs" ON public.safety_logs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.safety_logs TO authenticated;
GRANT REFERENCES ON public.safety_logs TO authenticated;

-- Comments
COMMENT ON TABLE public.safety_logs IS 'Workplace safety and compliance logging — Cal/OSHA, AVMA, AAHA standards';
COMMENT ON COLUMN public.safety_logs.form_data IS 'Dynamic form data stored as JSONB — structure varies by log_type';
COMMENT ON COLUMN public.safety_logs.status IS 'Workflow status: draft (in progress), submitted (awaiting review), reviewed (manager approved), flagged (requires follow-up)';
