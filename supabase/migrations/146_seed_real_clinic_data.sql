-- =====================================================
-- Seed Real Clinic Data for Green Dog Dental Veterinary Center
-- =====================================================

-- Clear existing data (if any)
DELETE FROM public.locations;
DELETE FROM public.departments;
DELETE FROM public.job_positions;

-- =====================================================
-- LOCATIONS
-- =====================================================
INSERT INTO public.locations (id, name, code, address_line1, city, state, postal_code, phone, is_active)
VALUES
  (gen_random_uuid(), 'Green Dog Dental Veterinary Center', 'GDVC', '14661 Aetna St', 'Van Nuys', 'CA', '91411', '(818) 282-6663', true);

-- =====================================================
-- DEPARTMENTS
-- =====================================================
INSERT INTO public.departments (id, name, code, is_active)
VALUES
  (gen_random_uuid(), 'Veterinary Services', 'VET', true),
  (gen_random_uuid(), 'Client Services', 'CS', true),
  (gen_random_uuid(), 'Administration', 'ADMIN', true),
  (gen_random_uuid(), 'Medical Staff', 'MED', true),
  (gen_random_uuid(), 'Marketing', 'MKT', true),
  (gen_random_uuid(), 'Legal', 'LEGAL', true),
  (gen_random_uuid(), 'Operations', 'OPS', true),
  (gen_random_uuid(), 'Education', 'EDU', true),
  (gen_random_uuid(), 'Remote Services', 'REMOTE', true);

-- =====================================================
-- JOB POSITIONS
-- Based on actual employee data from CSV
-- =====================================================
INSERT INTO public.job_positions (id, title, code, description, job_family, is_manager)
VALUES
  -- Clinical Staff
  (gen_random_uuid(), 'Doctor of Veterinary Medicine', 'DVM', 'Licensed veterinarian providing medical care', 'Veterinary', true),
  (gen_random_uuid(), 'Registered Veterinary Technician', 'RVT', 'Licensed vet tech performing clinical duties', 'Veterinary', false),
  (gen_random_uuid(), 'Veterinary Assistant', 'VA', 'Support staff assisting with animal care', 'Veterinary', false),
  (gen_random_uuid(), 'Veterinary Intern', 'VINT', 'Veterinary intern/externship position', 'Veterinary', false),
  (gen_random_uuid(), 'Cardiologist', 'CARD', 'Veterinary cardiology specialist', 'Veterinary', false),
  
  -- Client Services
  (gen_random_uuid(), 'Client Services Representative', 'CSR', 'In-house customer service representative', 'Client Services', false),
  (gen_random_uuid(), 'Remote Client Services Representative', 'RCSR', 'Remote customer service representative', 'Client Services', false),
  (gen_random_uuid(), 'CSR Lead', 'CSRL', 'Client services team lead', 'Client Services', true),
  
  -- Administration
  (gen_random_uuid(), 'Remote Administrator', 'RADM', 'Remote administrative support', 'Administration', false),
  (gen_random_uuid(), 'Remote HR', 'RHR', 'Remote human resources support', 'Administration', false),
  
  -- Management
  (gen_random_uuid(), 'Practice Director', 'PD', 'Overall practice management', 'Management', true),
  (gen_random_uuid(), 'Assistant Practice Manager', 'APM', 'Assistant to practice management', 'Management', true),
  (gen_random_uuid(), 'Clinical Director', 'CD', 'Clinical staff management', 'Management', true),
  (gen_random_uuid(), 'Clinic Supervisor', 'CSUP', 'Day-to-day clinic supervision', 'Management', true),
  
  -- Executive
  (gen_random_uuid(), 'Chief Medical Officer', 'CMO', 'Chief medical officer', 'Executive', true),
  (gen_random_uuid(), 'Medical Director', 'MDIR', 'Medical director overseeing veterinary care', 'Executive', true),
  (gen_random_uuid(), 'Chief of Staff', 'COS', 'Chief of staff', 'Executive', true),
  (gen_random_uuid(), 'Chief Legal Counsel', 'CLC', 'Head of legal department', 'Executive', true),
  (gen_random_uuid(), 'Chief Creative Officer', 'CCO', 'Chief creative officer', 'Executive', true),
  (gen_random_uuid(), 'Marketing Director', 'MKTD', 'Head of marketing department', 'Executive', true),
  (gen_random_uuid(), 'Director of Veterinary Education', 'DVE', 'Head of veterinary education program', 'Executive', true);

-- =====================================================
-- Verify data was inserted
-- =====================================================
DO $$
DECLARE
  loc_count INTEGER;
  dept_count INTEGER;
  pos_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO loc_count FROM public.locations;
  SELECT COUNT(*) INTO dept_count FROM public.departments;
  SELECT COUNT(*) INTO pos_count FROM public.job_positions;
  
  RAISE NOTICE 'Seeded % locations, % departments, % positions', loc_count, dept_count, pos_count;
END $$;
