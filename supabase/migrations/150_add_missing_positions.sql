-- =====================================================
-- ADD MISSING JOB POSITIONS
-- Based on complete employee data from CSV
-- =====================================================

-- Add any missing positions found in employee data
INSERT INTO public.job_positions (id, title, code, description, job_family, is_manager)
SELECT gen_random_uuid(), title, code, description, job_family, is_manager
FROM (VALUES
  -- Additional positions from CSV
  ('Facilities', 'FAC', 'Facilities and maintenance', 'Operations', false),
  ('My Pet Admin', 'MPA', 'My Pet administrative staff', 'Administration', false),
  ('Remote CSR Manager', 'RCSRM', 'Remote client services manager', 'Client Services', true),
  ('Referral Coordinator', 'RC', 'Coordinates client referrals', 'Client Services', false),
  ('In House Administrator', 'IHADM', 'In-house administrative support', 'Administration', false),
  ('COO', 'COO', 'Chief Operating Officer', 'Executive', true),
  ('Videologist', 'VID', 'Video and media production', 'Marketing', false)
) AS new_positions(title, code, description, job_family, is_manager)
WHERE NOT EXISTS (
  SELECT 1 FROM public.job_positions jp WHERE LOWER(jp.title) = LOWER(new_positions.title)
);

-- Update any positions that may be using wrong codes or missing data
UPDATE public.job_positions SET job_family = 'Executive', is_manager = true WHERE LOWER(title) LIKE '%director%';
UPDATE public.job_positions SET job_family = 'Executive', is_manager = true WHERE LOWER(title) LIKE '%chief%';
UPDATE public.job_positions SET job_family = 'Executive', is_manager = true WHERE code IN ('CMO', 'CCO', 'COO', 'COS');

-- Verify positions
DO $$
DECLARE
  pos_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pos_count FROM public.job_positions;
  RAISE NOTICE 'Total job positions: %', pos_count;
END $$;
