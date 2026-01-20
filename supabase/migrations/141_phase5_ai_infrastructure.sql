-- =====================================================
-- PHASE 5: AI INFRASTRUCTURE - Tables for AI Features
-- Migration: 141_phase5_ai_infrastructure.sql
-- Priority: 🟢 MEDIUM - Nice to Have
-- Purpose: Database support for AI-powered features
-- =====================================================

-- This phase creates tables and functions to support
-- AI-powered features like scheduling and document parsing.

-- -----------------------------------------------------
-- 5.1 AI USAGE TRACKING TABLE
-- -----------------------------------------------------

-- Track AI API usage for cost monitoring and optimization
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who used the feature
  user_id uuid REFERENCES auth.users(id),
  profile_id uuid,
  
  -- What feature was used
  feature text NOT NULL,  -- 'schedule_suggest', 'document_parse', 'query', etc.
  model text NOT NULL,    -- 'gpt-4-turbo', 'gpt-3.5-turbo', etc.
  
  -- Usage metrics
  input_tokens int,
  output_tokens int,
  total_tokens int,
  estimated_cost_usd numeric(10, 6),
  
  -- Context
  request_metadata jsonb DEFAULT '{}',
  response_summary text,
  success boolean DEFAULT true,
  error_message text,
  
  -- Timing
  duration_ms int,
  created_at timestamptz DEFAULT now()
);

-- Indexes for usage analysis
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature 
  ON ai_usage_log(feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user 
  ON ai_usage_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_date 
  ON ai_usage_log(created_at DESC);

-- RLS
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all usage
DROP POLICY IF EXISTS "Admins can view AI usage" ON public.ai_usage_log;
CREATE POLICY "Admins can view AI usage"
  ON public.ai_usage_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Users can view their own usage
DROP POLICY IF EXISTS "Users can view own AI usage" ON public.ai_usage_log;
CREATE POLICY "Users can view own AI usage"
  ON public.ai_usage_log FOR SELECT
  USING (user_id = auth.uid());

-- System can insert
DROP POLICY IF EXISTS "System can log AI usage" ON public.ai_usage_log;
CREATE POLICY "System can log AI usage"
  ON public.ai_usage_log FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.ai_usage_log IS 'Tracks AI API usage for cost monitoring and optimization';

-- -----------------------------------------------------
-- 5.2 AI GENERATED SCHEDULES TABLE
-- -----------------------------------------------------

-- Store AI-generated schedule suggestions for review
CREATE TABLE IF NOT EXISTS public.ai_schedule_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  week_start date NOT NULL,
  department_id uuid,
  location_id uuid,
  
  -- Generator
  requested_by uuid REFERENCES auth.users(id),
  
  -- Suggestion data
  suggested_shifts jsonb NOT NULL,  -- Array of shift assignments
  coverage_analysis jsonb,          -- Coverage metrics
  warnings text[],                   -- Any issues detected
  confidence_score numeric(3, 2),   -- 0.00 to 1.00
  
  -- Status
  status text DEFAULT 'pending',    -- 'pending', 'approved', 'modified', 'rejected'
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  
  -- Tracking
  created_at timestamptz DEFAULT now(),
  applied_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_schedules_week 
  ON ai_schedule_suggestions(week_start, department_id);
CREATE INDEX IF NOT EXISTS idx_ai_schedules_status 
  ON ai_schedule_suggestions(status, created_at DESC);

-- RLS
ALTER TABLE public.ai_schedule_suggestions ENABLE ROW LEVEL SECURITY;

-- Managers and admins can view/manage
DROP POLICY IF EXISTS "Managers can view AI schedules" ON public.ai_schedule_suggestions;
CREATE POLICY "Managers can view AI schedules"
  ON public.ai_schedule_suggestions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'manager', 'hr_admin')
    )
  );

COMMENT ON TABLE public.ai_schedule_suggestions IS 'Stores AI-generated schedule suggestions for review before applying';

-- -----------------------------------------------------
-- 5.3 DOCUMENT PARSING RESULTS TABLE
-- -----------------------------------------------------

-- Store parsed document data for recruiting
CREATE TABLE IF NOT EXISTS public.ai_parsed_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source document
  storage_path text,
  original_filename text,
  file_type text,
  
  -- Parsing context
  parsed_by uuid REFERENCES auth.users(id),
  document_type text,  -- 'resume', 'certification', 'transcript', etc.
  
  -- Extracted data
  extracted_person jsonb,       -- { firstName, lastName, email, phone }
  extracted_experience jsonb,   -- Array of work history
  extracted_education jsonb,    -- Array of education
  extracted_certifications jsonb, -- Array of certs
  extracted_skills jsonb,       -- Array of skills
  
  -- Quality metrics
  confidence_score numeric(3, 2),
  raw_text_preview text,        -- First 2000 chars for verification
  
  -- Linking
  linked_to_candidate_id uuid,
  linked_to_employee_id uuid,
  
  -- Tracking
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parsed_docs_type 
  ON ai_parsed_documents(document_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parsed_docs_candidate 
  ON ai_parsed_documents(linked_to_candidate_id) 
  WHERE linked_to_candidate_id IS NOT NULL;

-- RLS
ALTER TABLE public.ai_parsed_documents ENABLE ROW LEVEL SECURITY;

-- HR and recruiting can view
DROP POLICY IF EXISTS "HR can view parsed documents" ON public.ai_parsed_documents;
CREATE POLICY "HR can view parsed documents"
  ON public.ai_parsed_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'manager', 'hr_admin', 'marketing_admin')
    )
  );

COMMENT ON TABLE public.ai_parsed_documents IS 'Stores AI-extracted data from uploaded documents';

-- -----------------------------------------------------
-- 5.4 AI USAGE STATISTICS FUNCTION
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_ai_usage_stats(
  p_days int DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Only admins can view stats
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  ) THEN
    RETURN jsonb_build_object('error', 'Admin access required');
  END IF;

  SELECT jsonb_build_object(
    'period_days', p_days,
    'total_requests', count(*),
    'total_tokens', sum(COALESCE(total_tokens, 0)),
    'estimated_cost_usd', sum(COALESCE(estimated_cost_usd, 0)),
    'by_feature', (
      SELECT jsonb_object_agg(feature, cnt)
      FROM (
        SELECT feature, count(*) as cnt
        FROM ai_usage_log
        WHERE created_at > now() - (p_days || ' days')::interval
        GROUP BY feature
      ) sub
    ),
    'success_rate', (
      SELECT round(100.0 * sum(CASE WHEN success THEN 1 ELSE 0 END) / NULLIF(count(*), 0), 2)
      FROM ai_usage_log
      WHERE created_at > now() - (p_days || ' days')::interval
    )
  ) INTO v_result
  FROM ai_usage_log
  WHERE created_at > now() - (p_days || ' days')::interval;
  
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ai_usage_stats(int) TO authenticated;

COMMENT ON FUNCTION public.get_ai_usage_stats IS 
  'Returns AI usage statistics for cost monitoring (admin only)';

-- -----------------------------------------------------
-- PHASE 5 COMPLETE
-- -----------------------------------------------------

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 5 Complete: AI infrastructure tables created';
END $$;
