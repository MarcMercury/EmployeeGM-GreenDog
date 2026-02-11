-- ================================================
-- Migration: Add department_id FK to job_positions
-- ================================================
-- The job_positions table currently uses a free-text `job_family` column
-- to loosely categorize positions. This migration adds a proper `department_id`
-- foreign key so positions are formally linked to departments — enabling
-- proper scheduling, skill-gap analysis, and org-chart features.
--
-- It also backfills existing positions by matching `job_family` text against
-- department names, and populates employee department_id from their position's
-- department where the employee doesn't already have a department set.

-- 1. Add department_id column to job_positions
ALTER TABLE public.job_positions
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- 2. Create index for FK lookups
CREATE INDEX IF NOT EXISTS idx_job_positions_department_id ON public.job_positions(department_id);

-- 3. Backfill department_id from job_family text matching
--    Match job_family against department names (case-insensitive, partial match)
UPDATE public.job_positions jp
SET department_id = d.id
FROM public.departments d
WHERE jp.department_id IS NULL
  AND jp.job_family IS NOT NULL
  AND (
    LOWER(jp.job_family) = LOWER(d.name)
    OR LOWER(jp.job_family) = LOWER(d.code)
    OR LOWER(d.name) LIKE '%' || LOWER(jp.job_family) || '%'
    OR LOWER(jp.job_family) LIKE '%' || LOWER(d.name) || '%'
  );

-- 4. Handle specific known job_family values that don't exactly match dept names
UPDATE public.job_positions SET department_id = (SELECT id FROM public.departments WHERE code = 'VET' LIMIT 1)
WHERE department_id IS NULL AND job_family IN ('Veterinary', 'Veterinary Medicine', 'Clinical', 'DVM');

UPDATE public.job_positions SET department_id = (SELECT id FROM public.departments WHERE code = 'TECH' OR name ILIKE '%Veterinary Tech%' LIMIT 1)
WHERE department_id IS NULL AND job_family IN ('Technician', 'Veterinary Technicians', 'Tech');

UPDATE public.job_positions SET department_id = (SELECT id FROM public.departments WHERE code = 'CSR' OR name ILIKE '%Client Services%' LIMIT 1)
WHERE department_id IS NULL AND job_family IN ('Client Services', 'Front Desk', 'Reception');

UPDATE public.job_positions SET department_id = (SELECT id FROM public.departments WHERE code = 'ADMIN' OR name ILIKE '%Administration%' LIMIT 1)
WHERE department_id IS NULL AND job_family IN ('Administration', 'Admin', 'Administrative');

UPDATE public.job_positions SET department_id = (SELECT id FROM public.departments WHERE code = 'MGMT' OR name ILIKE '%Management%' LIMIT 1)
WHERE department_id IS NULL AND job_family IN ('Management', 'Executive', 'Leadership');

UPDATE public.job_positions SET department_id = (SELECT id FROM public.departments WHERE code = 'SURG' OR name ILIKE '%Surgery%' LIMIT 1)
WHERE department_id IS NULL AND job_family IN ('Surgery', 'Surgical');

UPDATE public.job_positions SET department_id = (SELECT id FROM public.departments WHERE code = 'ECC' OR code = 'ER' OR name ILIKE '%Emergency%' LIMIT 1)
WHERE department_id IS NULL AND job_family IN ('Emergency', 'Emergency & Critical Care', 'ER', 'Critical Care');

UPDATE public.job_positions SET department_id = (SELECT id FROM public.departments WHERE code = 'GROOM' OR name ILIKE '%Groom%' LIMIT 1)
WHERE department_id IS NULL AND job_family IN ('Grooming', 'Grooming & Boarding', 'Boarding');

UPDATE public.job_positions SET department_id = (SELECT id FROM public.departments WHERE code = 'EDU' OR code = 'TRAIN' OR name ILIKE '%Education%' OR name ILIKE '%Training%' LIMIT 1)
WHERE department_id IS NULL AND job_family IN ('Education', 'Training', 'Training & Continuing Education');

UPDATE public.job_positions SET department_id = (SELECT id FROM public.departments WHERE code = 'MKT' OR name ILIKE '%Marketing%' LIMIT 1)
WHERE department_id IS NULL AND job_family IN ('Marketing', 'Marketing & Community Outreach');

-- 5. For employees who have a position but no department, 
--    set their department from their position's department
UPDATE public.employees e
SET department_id = jp.department_id
FROM public.job_positions jp
WHERE e.position_id = jp.id
  AND e.department_id IS NULL
  AND jp.department_id IS NOT NULL;

-- 6. Log the results
DO $$
DECLARE
  pos_with_dept INT;
  pos_without_dept INT;
  emp_updated INT;
BEGIN
  SELECT COUNT(*) INTO pos_with_dept FROM public.job_positions WHERE department_id IS NOT NULL;
  SELECT COUNT(*) INTO pos_without_dept FROM public.job_positions WHERE department_id IS NULL;
  
  RAISE NOTICE '✅ job_positions.department_id migration complete:';
  RAISE NOTICE '   Positions with department: %', pos_with_dept;
  RAISE NOTICE '   Positions without department: % (will need manual assignment)', pos_without_dept;
END $$;
