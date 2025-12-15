-- =====================================================
-- MIGRATION: Manager/Reports-To Hierarchy
-- Sets up manager_employee_id for all employees based on
-- their position/role in the organization
-- =====================================================

-- =====================================================
-- HIERARCHY STRUCTURE (Green Dog Dental):
-- =====================================================
-- CEO/Owner (not in system currently)
--   ├── COO (Marc Mercury - EMP049)
--   │     ├── Practice Director (Bianca Alfonso - EMP013)
--   │     │     ├── Asst Practice Manager (Brandon Orange - EMP014)
--   │     │     ├── CSR Supervisor (Catherine Ramirez - EMP019)
--   │     │     │     └── All CSRs
--   │     │     └── Facilities Techs
--   │     └── Clinical Staff Manager (Deija Lighon - EMP023)
--   │           ├── RVTs
--   │           ├── VAs
--   │           └── Doctor's Assistants
--   │
--   ├── CMO (Dr. Michael Geist - EMP032)
--   │     ├── Medical Director (Dr. Heather Rally Webb - EMP030)
--   │     │     └── All DVMs
--   │     └── Dir Vet Education (Dr. Andre de Mattos Faro - EMP025)
--   │
--   ├── CLO (Cynthia Garcia - EMP022) - Reports to COO
--   │
--   └── CMO Marketing (Andrea Rehrig - EMP007) - Reports to COO
--         └── Graphic Designer (Lauren Corallo - EMP072)
-- =====================================================

-- First, let's assign the C-suite and directors
-- C-suite reports to COO (Marc Mercury) except CMO who is peer
-- COO and CMO are top-level (no manager)

-- =====================================================
-- C-SUITE & LEADERSHIP (Reports to COO except CMO)
-- =====================================================

-- CLO reports to COO
UPDATE public.employees
SET manager_employee_id = (SELECT id FROM public.employees WHERE employee_number = 'EMP049')
WHERE employee_number = 'EMP022'; -- Cynthia Garcia (CLO)

-- CMO Marketing reports to COO
UPDATE public.employees
SET manager_employee_id = (SELECT id FROM public.employees WHERE employee_number = 'EMP049')
WHERE employee_number = 'EMP007'; -- Andrea Rehrig (CMO_MKT)

-- =====================================================
-- DIRECTORS (Report to appropriate C-suite)
-- =====================================================

-- Practice Director reports to COO
UPDATE public.employees
SET manager_employee_id = (SELECT id FROM public.employees WHERE employee_number = 'EMP049')
WHERE employee_number = 'EMP013'; -- Bianca Alfonso (PRAC_DIR)

-- Clinical Staff Manager reports to COO
UPDATE public.employees
SET manager_employee_id = (SELECT id FROM public.employees WHERE employee_number = 'EMP049')
WHERE employee_number = 'EMP023'; -- Deija Lighon (CLIN_STAFF_MGR)

-- Medical Director reports to CMO
UPDATE public.employees
SET manager_employee_id = (SELECT id FROM public.employees WHERE employee_number = 'EMP032')
WHERE employee_number = 'EMP030'; -- Dr. Heather Rally Webb (MED_DIR)

-- Director of Veterinary Education reports to CMO
UPDATE public.employees
SET manager_employee_id = (SELECT id FROM public.employees WHERE employee_number = 'EMP032')
WHERE employee_number = 'EMP025'; -- Dr. Andre de Mattos Faro (VET_ED_DIR)

-- =====================================================
-- MID-LEVEL MANAGEMENT
-- =====================================================

-- Assistant Practice Manager reports to Practice Director
UPDATE public.employees
SET manager_employee_id = (SELECT id FROM public.employees WHERE employee_number = 'EMP013')
WHERE employee_number = 'EMP014'; -- Brandon Orange (ASST_PRAC_MGR)

-- CSR Supervisors report to Practice Director
UPDATE public.employees
SET manager_employee_id = (SELECT id FROM public.employees WHERE employee_number = 'EMP013')
WHERE employee_number IN ('EMP019', 'EMP064'); -- Catherine Ramirez, Taylor Fox (CLIN_SUP)

-- =====================================================
-- ALL DVMs & SPECIALIST DVMs - Report to Medical Director
-- =====================================================
UPDATE public.employees
SET manager_employee_id = (SELECT id FROM public.employees WHERE employee_number = 'EMP030')
WHERE position_id IN (
    SELECT id FROM public.job_positions WHERE code IN ('DVM', 'ASSOC_DVM', 'SPEC_DVM', 'ER_DVM', 'RELIEF_DVM', 'LOCUM_DVM', 'TELE_DVM')
)
AND employee_number NOT IN ('EMP030', 'EMP032'); -- Exclude Medical Director and CMO themselves

-- =====================================================
-- RVTs, VAs, VTs - Report to Clinical Staff Manager
-- =====================================================
UPDATE public.employees
SET manager_employee_id = (SELECT id FROM public.employees WHERE employee_number = 'EMP023')
WHERE position_id IN (
    SELECT id FROM public.job_positions WHERE code IN ('RVT', 'VA', 'VT', 'DOC_ASST', 'SR_VT', 'LEAD_VT')
)
AND employee_number != 'EMP023'; -- Exclude Clinical Staff Manager herself

-- =====================================================
-- CSRs - Report to CSR Supervisor (Catherine Ramirez)
-- =====================================================
UPDATE public.employees
SET manager_employee_id = (SELECT id FROM public.employees WHERE employee_number = 'EMP019')
WHERE position_id IN (
    SELECT id FROM public.job_positions WHERE code = 'CSR'
)
AND department_id IN (
    SELECT id FROM public.departments WHERE code = 'CSR'
);

-- OPS CSRs / Admin staff report to Practice Director
UPDATE public.employees
SET manager_employee_id = (SELECT id FROM public.employees WHERE employee_number = 'EMP013')
WHERE position_id IN (
    SELECT id FROM public.job_positions WHERE code = 'CSR'
)
AND department_id IN (
    SELECT id FROM public.departments WHERE code = 'OPS'
);

-- =====================================================
-- MARKETING STAFF - Report to CMO Marketing
-- =====================================================
UPDATE public.employees
SET manager_employee_id = (SELECT id FROM public.employees WHERE employee_number = 'EMP007')
WHERE position_id IN (
    SELECT id FROM public.job_positions WHERE code IN ('GRAPH_DES', 'CONTENT', 'CREAT_DIR', 'MKT_DIR')
);

-- =====================================================
-- FACILITIES TECHS - Report to Practice Director
-- =====================================================
UPDATE public.employees
SET manager_employee_id = (SELECT id FROM public.employees WHERE employee_number = 'EMP013')
WHERE position_id IN (
    SELECT id FROM public.job_positions WHERE code = 'FAC_TECH'
);

-- =====================================================
-- PATIENT CARE COORDINATORS - Report to Clinical Staff Manager
-- =====================================================
UPDATE public.employees
SET manager_employee_id = (SELECT id FROM public.employees WHERE employee_number = 'EMP023')
WHERE position_id IN (
    SELECT id FROM public.job_positions WHERE code = 'PAT_COORD'
);

-- =====================================================
-- VERIFY: Show the hierarchy
-- =====================================================
-- SELECT 
--   e.employee_number,
--   e.first_name || ' ' || e.last_name as employee_name,
--   jp.title as position,
--   m.employee_number as manager_emp_number,
--   m.first_name || ' ' || m.last_name as manager_name,
--   mp.title as manager_position
-- FROM public.employees e
-- LEFT JOIN public.job_positions jp ON e.position_id = jp.id
-- LEFT JOIN public.employees m ON e.manager_employee_id = m.id
-- LEFT JOIN public.job_positions mp ON m.position_id = mp.id
-- ORDER BY m.employee_number NULLS FIRST, e.employee_number;
