-- =====================================================
-- SEED DATA: Employee Records
-- Green Dog Dental Staff as of December 2025
-- =====================================================
-- This seeds the employees table with profile links
-- Run AFTER 007_seed_org_data.sql (needs departments/positions)
-- =====================================================

-- Helper function to parse wages (handles both hourly and salary)
-- Note: Wages > 500 are assumed to be annual salary, otherwise hourly

-- =====================================================
-- INSERT EMPLOYEES
-- =====================================================

INSERT INTO public.employees (
  employee_number,
  first_name,
  last_name,
  preferred_name,
  date_of_birth,
  hire_date,
  department_id,
  position_id,
  employment_type,
  employment_status,
  location_id,
  email_work,
  notes_internal
) VALUES
-- Adriana Gutierrez
('EMP001', 'Adriana', 'Gutierrez', NULL, '1997-11-13', '2020-07-13',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'adriana.gutierrez@greendogdental.com',
  'In House'),

-- Aislinn Dickey
('EMP002', 'Aislinn', 'Dickey', NULL, '1996-04-16', '2024-01-05',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'aislinn.dickey@greendogdental.com',
  'In House CSR'),

-- Alexandra Martin
('EMP003', 'Alexandra', 'Martin', NULL, '1994-09-25', '2021-08-12',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  NULL, -- Remote
  'alexandra.martin@greendogdental.com',
  'Remote - DA / CSR Admin'),

-- Alysia Sanford
('EMP004', 'Alysia', 'Sanford', NULL, '1998-10-19', '2021-07-12',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'alysia.sanford@greendogdental.com',
  'In House'),

-- Ana Livia Fraga
('EMP005', 'Ana Livia', 'Fraga', NULL, '1972-12-07', '2024-04-01',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'analivia.fraga@greendogdental.com',
  'In House'),

-- Ana Victoria Portillo
('EMP006', 'Ana Victoria', 'Portillo', NULL, '1997-11-16', '2025-11-24',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'anavictoria.portillo@greendogdental.com',
  'In House CSR'),

-- Andrea Rehrig
('EMP007', 'Andrea', 'Rehrig', NULL, '1979-04-05', '2025-10-27',
  (SELECT id FROM public.departments WHERE code = 'MKT'),
  (SELECT id FROM public.job_positions WHERE code = 'CMO_MKT'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'andrea.rehrig@greendogdental.com',
  'Marketing Director / Chief Marketing Officer'),

-- Angela Fraga
('EMP008', 'Angela', 'Fraga', NULL, '1971-11-08', '2017-08-31',
  (SELECT id FROM public.departments WHERE code = 'OPS'),
  (SELECT id FROM public.job_positions WHERE code = 'VT'),
  'full-time', 'active',
  NULL, -- Remote
  'angela.fraga@greendogdental.com',
  'Remote Administrator / Veterinary Technician'),

-- Angela Lina Perez
('EMP009', 'Angela Lina', 'Perez', NULL, '1999-08-25', '2024-03-10',
  (SELECT id FROM public.departments WHERE code = 'OPS'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'angelalina.perez@greendogdental.com',
  'In House Admin'),

-- Arron Bryant
('EMP010', 'Arron', 'Bryant', NULL, '1980-03-09', '2024-08-07',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'arron.bryant@greendogdental.com',
  'In House'),

-- Ashley Paredes
('EMP011', 'Ashley', 'Paredes', NULL, '1994-08-18', '2024-07-30',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  NULL, -- Remote
  'ashley.paredes@greendogdental.com',
  'Remote CSR'),

-- Batia Blank
('EMP012', 'Batia', 'Blank', NULL, '2000-05-01', '2025-02-27',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'batia.blank@greendogdental.com',
  'In House'),

-- Bianca Alfonso
('EMP013', 'Bianca', 'Alfonso', NULL, '1993-01-20', '2014-02-03',
  (SELECT id FROM public.departments WHERE code = 'OPS'),
  (SELECT id FROM public.job_positions WHERE code = 'PRAC_DIR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'bianca.alfonso@greendogdental.com',
  'Practice Director'),

-- Brandon Orange
('EMP014', 'Brandon', 'Orange', NULL, '1994-12-10', '2021-04-26',
  (SELECT id FROM public.departments WHERE code = 'OPS'),
  (SELECT id FROM public.job_positions WHERE code = 'ASST_PRAC_MGR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'brandon.orange@greendogdental.com',
  'Assistant Practice Manager'),

-- Brittany Finch
('EMP015', 'Brittany', 'Finch', NULL, '2000-08-28', '2022-01-10',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'brittany.finch@greendogdental.com',
  'Client Services Representative'),

-- Caitlin Quinn
('EMP016', 'Caitlin', 'Quinn', NULL, '1993-08-30', '2023-07-21',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  NULL, -- Remote
  'caitlin.quinn@greendogdental.com',
  'Remote CSR'),

-- Carlos Alexei Marquez
('EMP017', 'Carlos Alexei', 'Marquez', NULL, '1989-02-12', '2024-11-15',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'carlos.marquez@greendogdental.com',
  'Foreign Vet Graduate Intern'),

-- Carmen Chan
('EMP018', 'Carmen', 'Chan', NULL, '1992-06-21', '2020-07-22',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'RVT'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'carmen.chan@greendogdental.com',
  'Registered Veterinary Technician'),

-- Catherine Ramirez
('EMP019', 'Catherine', 'Ramirez', NULL, '1991-05-16', '2020-11-06',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CLIN_SUP'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'catherine.ramirez@greendogdental.com',
  'Lead CSR Supervisor'),

-- Christina Earnest
('EMP020', 'Christina', 'Earnest', NULL, '1981-05-24', '2013-10-03',
  (SELECT id FROM public.departments WHERE code = 'OPS'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  NULL, -- Remote
  'christina.earnest@greendogdental.com',
  'Remote Administrator'),

-- Crystal Barrom
('EMP021', 'Crystal', 'Barrom', NULL, '1995-02-12', '2023-01-09',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'crystal.barrom@greendogdental.com',
  'In House'),

-- Cynthia Garcia
('EMP022', 'Cynthia', 'Garcia', NULL, '1993-05-11', '2021-11-01',
  (SELECT id FROM public.departments WHERE code = 'EXEC'),
  (SELECT id FROM public.job_positions WHERE code = 'CLO'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'cynthia.garcia@greendogdental.com',
  'Chief Legal Counsel'),

-- Deija Lighon
('EMP023', 'Deija', 'Lighon', NULL, '1990-11-04', '2021-04-13',
  (SELECT id FROM public.departments WHERE code = 'LEAD'),
  (SELECT id FROM public.job_positions WHERE code = 'CLIN_STAFF_MGR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'deija.lighon@greendogdental.com',
  'Clinical Director / Clinical Staff Manager'),

-- Diana Monterde
('EMP024', 'Diana', 'Monterde', NULL, '1993-11-17', '2016-05-12',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'RVT'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'diana.monterde@greendogdental.com',
  'Registered Veterinary Technician'),

-- Dr. Andre de Mattos Faro
('EMP025', 'Andre', 'de Mattos Faro', 'Dr. Andre', '1976-04-15', '2024-03-18',
  (SELECT id FROM public.departments WHERE code = 'TRAIN'),
  (SELECT id FROM public.job_positions WHERE code = 'VET_ED_DIR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'andre.faro@greendogdental.com',
  'Director of Veterinary Education'),

-- Dr. Candice Habawel
('EMP026', 'Candice', 'Habawel', 'Dr. Candice', '1991-07-28', '2017-10-09',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'DVM'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'candice.habawel@greendogdental.com',
  'Doctor of Veterinary Medicine'),

-- Dr. Celestine Hoh
('EMP027', 'Celestine', 'Hoh', 'Dr. Celestine', '1997-05-29', '2024-12-12',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'DVM'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'celestine.hoh@greendogdental.com',
  'Veterinarian'),

-- Dr. Claudia Lau
('EMP028', 'Claudia', 'Lau', 'Dr. Claudia', '1995-01-31', '2023-02-06',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'DVM'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'claudia.lau@greendogdental.com',
  'Doctor of Veterinary Medicine'),

-- Dr. Ella Scott
('EMP029', 'Ella', 'Scott', 'Dr. Ella', '2000-05-17', '2025-06-01',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'DVM'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'ella.scott@greendogdental.com',
  'Doctor of Veterinary Medicine'),

-- Dr. Heather Rally Webb
('EMP030', 'Heather', 'Rally Webb', 'Dr. Heather', '1987-01-09', '2022-10-25',
  (SELECT id FROM public.departments WHERE code = 'LEAD'),
  (SELECT id FROM public.job_positions WHERE code = 'MED_DIR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'heather.webb@greendogdental.com',
  'Medical Director'),

-- Dr. Jessica Robertson
('EMP031', 'Jessica', 'Robertson', 'Dr. Jessica', '1987-05-26', '2025-06-15',
  (SELECT id FROM public.departments WHERE code = 'EXOT'),
  (SELECT id FROM public.job_positions WHERE code = 'SPEC_DVM'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'jessica.robertson@greendogdental.com',
  'Head of Zoological Medicine and Surgery'),

-- Dr. Michael Geist
('EMP032', 'Michael', 'Geist', 'Dr. Michael', '1981-04-15', '2021-07-12',
  (SELECT id FROM public.departments WHERE code = 'EXEC'),
  (SELECT id FROM public.job_positions WHERE code = 'CMO'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'michael.geist@greendogdental.com',
  'Chief Medical Officer'),

-- Dr. Niko Alzate
('EMP033', 'Niko', 'Alzate', 'Dr. Niko', '1997-06-27', '2025-11-03',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'DVM'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'niko.alzate@greendogdental.com',
  'DVM'),

-- Dr. Sherry Vartanian
('EMP034', 'Sherry', 'Vartanian', 'Dr. Sherry', '1995-09-25', '2025-03-03',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'DVM'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'sherry.vartanian@greendogdental.com',
  'Doctor of Veterinary Medicine'),

-- Ethan Young
('EMP035', 'Ethan', 'Young', NULL, '1995-08-21', '2025-08-18',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'ethan.young@greendogdental.com',
  'In House'),

-- Fidel Fraga
('EMP036', 'Fidel', 'Fraga', NULL, '1997-08-15', '2019-05-26',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'fidel.fraga@greendogdental.com',
  'Vet Assistant'),

-- Gladys Castro
('EMP037', 'Gladys', 'Castro', NULL, '2001-08-20', '2025-06-02',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'RVT'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'gladys.castro@greendogdental.com',
  'RVT'),

-- Jennifer Velasquez
('EMP038', 'Jennifer', 'Velasquez', NULL, '1995-10-06', '2025-02-03',
  (SELECT id FROM public.departments WHERE code = 'OPS'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'jennifer.velasquez@greendogdental.com',
  'In House Administrator'),

-- Jessica Lucra
('EMP039', 'Jessica', 'Lucra', NULL, '1986-07-28', '2014-08-25',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'DOC_ASST'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'jessica.lucra@greendogdental.com',
  'Doctor''s Assistant'),

-- Jessica Salazar
('EMP040', 'Jessica', 'Salazar', NULL, '1993-02-12', '2025-09-08',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'RVT'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'jessica.salazar@greendogdental.com',
  'RVT'),

-- Joseph Reyes
('EMP041', 'Joseph', 'Reyes', NULL, '1989-09-30', '2022-05-24',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'joseph.reyes@greendogdental.com',
  'In House'),

-- Karen Cuestas
('EMP042', 'Karen', 'Cuestas', NULL, '1990-12-09', '2022-12-17',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'karen.cuestas@greendogdental.com',
  'In House'),

-- Ken Padilla
('EMP043', 'Ken', 'Padilla', NULL, '1998-03-25', '2025-05-08',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'ken.padilla@greendogdental.com',
  'In House'),

-- Kirtlynn Moller
('EMP044', 'Kirtlynn', 'Moller', NULL, '2001-12-11', '2025-09-08',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'kirtlynn.moller@greendogdental.com',
  'CSR'),

-- Laurence Marai
('EMP045', 'Laurence', 'Marai', NULL, '1977-05-14', '2023-04-03',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'PAT_COORD'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'laurence.marai@greendogdental.com',
  'Referral Coordinator'),

-- Lisa Girtain
('EMP046', 'Lisa', 'Girtain', NULL, '1969-09-25', '2024-05-27',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  NULL, -- Remote
  'lisa.girtain@greendogdental.com',
  'Remote CSR'),

-- Marelyn Ventura
('EMP047', 'Marelyn', 'Ventura', NULL, '1997-02-27', '2025-10-06',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'marelyn.ventura@greendogdental.com',
  'In House'),

-- Maria Portillo
('EMP048', 'Maria', 'Portillo', NULL, '1970-11-21', '2025-04-07',
  (SELECT id FROM public.departments WHERE code = 'FAC'),
  (SELECT id FROM public.job_positions WHERE code = 'FAC_TECH'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'maria.portillo@greendogdental.com',
  'Facilities'),

-- Marc Mercury (COO - Admin User)
('EMP049', 'Marc', 'Mercury', NULL, '1980-11-06', '2021-02-15',
  (SELECT id FROM public.departments WHERE code = 'EXEC'),
  (SELECT id FROM public.job_positions WHERE code = 'COO'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'marc.mercury@greendogdental.com',
  'Chief Operations Officer'),

-- Markie Perez
('EMP050', 'Markie', 'Perez', NULL, '1988-12-29', '2021-02-22',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'RVT'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'markie.perez@greendogdental.com',
  'RVT'),

-- Megan Rolnik
('EMP051', 'Megan', 'Rolnik', NULL, '1992-02-09', '2025-05-12',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'RVT'),
  'part-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'megan.rolnik@greendogdental.com',
  'RVT'),

-- Miguel Antonio Gonzalez
('EMP052', 'Miguel Antonio', 'Gonzalez', NULL, '1995-12-12', '2024-03-10',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VT'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'miguel.gonzalez@greendogdental.com',
  'Vet Technician'),

-- Natalie Ulloa
('EMP053', 'Natalie', 'Ulloa', NULL, '2003-01-15', '2025-11-17',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'natalie.ulloa@greendogdental.com',
  'CSR'),

-- Nauman Ali
('EMP054', 'Nauman', 'Ali', NULL, '1992-02-25', '2023-11-06',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'nauman.ali@greendogdental.com',
  'CSR'),

-- Nichole Gibbs
('EMP055', 'Nichole', 'Gibbs', NULL, '1990-09-22', '2024-10-04',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  NULL, -- Remote
  'nichole.gibbs@greendogdental.com',
  'Remote CSR'),

-- Nick Bermudez
('EMP056', 'Nick', 'Bermudez', NULL, '1986-05-01', '2021-01-11',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VT'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'nick.bermudez@greendogdental.com',
  'Veterinary Technician'),

-- Rachael Banyasz
('EMP057', 'Rachael', 'Banyasz', NULL, '1994-01-21', '2023-02-09',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'DOC_ASST'),
  'part-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'rachael.banyasz@greendogdental.com',
  'Doctor''s Assistant'),

-- Raquel Velez
('EMP058', 'Raquel', 'Velez', NULL, '1997-10-01', '2025-01-01',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'raquel.velez@greendogdental.com',
  'In House'),

-- Sara Drickman
('EMP059', 'Sara', 'Drickman', NULL, '1990-10-05', '2025-01-16',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  NULL, -- Remote
  'sara.drickman@greendogdental.com',
  'Remote CSR'),

-- Shelby Ackerman
('EMP060', 'Shelby', 'Ackerman', NULL, '1994-03-29', '2021-04-07',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  NULL, -- Remote
  'shelby.ackerman@greendogdental.com',
  'RCSR'),

-- Sierra Frasier
('EMP061', 'Sierra', 'Frasier', NULL, '1984-12-06', '2021-04-02',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  NULL, -- Remote
  'sierra.frasier@greendogdental.com',
  'Remote CSR / My Pet Admin'),

-- Sierra Mendez
('EMP062', 'Sierra', 'Mendez', NULL, '1996-08-24', '2025-09-09',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  NULL, -- Remote
  'sierra.mendez@greendogdental.com',
  'Remote CSR'),

-- Sonora Chavez
('EMP063', 'Sonora', 'Chavez', NULL, '1999-05-18', '2025-09-02',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'sonora.chavez@greendogdental.com',
  'CSR / Vet Assistant'),

-- Taylor Fox
('EMP064', 'Taylor', 'Fox', NULL, '1989-11-05', '2019-02-11',
  (SELECT id FROM public.departments WHERE code = 'OPS'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'taylor.fox@greendogdental.com',
  'My Pet Admin'),

-- Tiffany Tesoro
('EMP065', 'Tiffany', 'Tesoro', NULL, '1996-01-25', '2022-10-27',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CLIN_SUP'),
  'full-time', 'active',
  NULL, -- Remote
  'tiffany.tesoro@greendogdental.com',
  'Remote CSR Manager'),

-- Verenice Mendoza
('EMP066', 'Verenice', 'Mendoza', NULL, '1992-08-27', '2024-01-05',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'verenice.mendoza@greendogdental.com',
  'In House CSR'),

-- Veronica Rios
('EMP067', 'Veronica', 'Rios', NULL, '1989-10-03', '2019-01-27',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'veronica.rios@greendogdental.com',
  'In House'),

-- Yasuko Sano
('EMP068', 'Yasuko', 'Sano', NULL, '1964-06-23', '2023-01-23',
  (SELECT id FROM public.departments WHERE code = 'FAC'),
  (SELECT id FROM public.job_positions WHERE code = 'FAC_TECH'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'yasuko.sano@greendogdental.com',
  'Facilities'),

-- Zuleyka Chuc
('EMP069', 'Zuleyka', 'Chuc', NULL, '1991-09-07', '2024-06-24',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'zuleyka.chuc@greendogdental.com',
  'In House CSR'),

-- Ervin Tenorio
('EMP070', 'Ervin', 'Tenorio', NULL, '1996-10-14', '2023-09-18',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'ervin.tenorio@greendogdental.com',
  'In House'),

-- Rachel Moreno
('EMP071', 'Rachel', 'Moreno', NULL, '1995-03-23', '2024-10-08',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'rachel.moreno@greendogdental.com',
  'In House'),

-- Lauren Corallo
('EMP072', 'Lauren', 'Corallo', NULL, '1990-12-11', '2017-03-02',
  (SELECT id FROM public.departments WHERE code = 'MKT'),
  (SELECT id FROM public.job_positions WHERE code = 'GRAPH_DES'),
  'contract', 'active',
  NULL, -- Remote
  'lauren.corallo@greendogdental.com',
  'Graphic Designer - Contractor');


-- =====================================================
-- INSERT PAY SETTINGS FOR ALL EMPLOYEES
-- =====================================================

INSERT INTO public.employee_pay_settings (
  employee_id,
  pay_type,
  hourly_rate,
  annual_salary,
  currency,
  effective_from
)
SELECT 
  e.id,
  CASE 
    -- Salaried employees (annual amounts)
    WHEN e.employee_number IN ('EMP007', 'EMP009', 'EMP013', 'EMP018', 'EMP022', 'EMP023', 'EMP024', 'EMP025', 'EMP026', 'EMP027', 'EMP028', 'EMP029', 'EMP030', 'EMP031', 'EMP032', 'EMP033', 'EMP034', 'EMP040', 'EMP049') THEN 'salary'
    ELSE 'hourly'
  END,
  CASE 
    -- Hourly rates
    WHEN e.employee_number = 'EMP001' THEN 20.50  -- Adriana Gutierrez
    WHEN e.employee_number = 'EMP002' THEN 22.50  -- Aislinn Dickey
    WHEN e.employee_number = 'EMP003' THEN 25.00  -- Alexandra Martin
    WHEN e.employee_number = 'EMP004' THEN 23.50  -- Alysia Sanford
    WHEN e.employee_number = 'EMP005' THEN 18.00  -- Ana Livia Fraga
    WHEN e.employee_number = 'EMP006' THEN 21.00  -- Ana Victoria Portillo
    WHEN e.employee_number = 'EMP008' THEN 23.00  -- Angela Fraga
    WHEN e.employee_number = 'EMP010' THEN 27.00  -- Arron Bryant
    WHEN e.employee_number = 'EMP011' THEN 20.00  -- Ashley Paredes
    WHEN e.employee_number = 'EMP012' THEN 20.00  -- Batia Blank
    WHEN e.employee_number = 'EMP014' THEN 21.50  -- Brandon Orange
    WHEN e.employee_number = 'EMP015' THEN 26.00  -- Brittany Finch
    WHEN e.employee_number = 'EMP016' THEN 19.50  -- Caitlin Quinn
    WHEN e.employee_number = 'EMP017' THEN 17.87  -- Carlos Alexei Marquez
    WHEN e.employee_number = 'EMP019' THEN 28.00  -- Catherine Ramirez
    WHEN e.employee_number = 'EMP020' THEN 21.91  -- Christina Earnest
    WHEN e.employee_number = 'EMP021' THEN 22.00  -- Crystal Barrom
    WHEN e.employee_number = 'EMP035' THEN 18.50  -- Ethan Young
    WHEN e.employee_number = 'EMP036' THEN 28.13  -- Fidel Fraga
    WHEN e.employee_number = 'EMP037' THEN 30.00  -- Gladys Castro
    WHEN e.employee_number = 'EMP038' THEN 26.00  -- Jennifer Velasquez
    WHEN e.employee_number = 'EMP039' THEN 24.00  -- Jessica Lucra
    WHEN e.employee_number = 'EMP041' THEN 27.00  -- Joseph Reyes
    WHEN e.employee_number = 'EMP042' THEN 20.50  -- Karen Cuestas
    WHEN e.employee_number = 'EMP043' THEN 17.87  -- Ken Padilla
    WHEN e.employee_number = 'EMP044' THEN 22.00  -- Kirtlynn Moller
    WHEN e.employee_number = 'EMP045' THEN 31.00  -- Laurence Marai
    WHEN e.employee_number = 'EMP046' THEN 22.50  -- Lisa Girtain
    WHEN e.employee_number = 'EMP047' THEN 24.50  -- Marelyn Ventura
    WHEN e.employee_number = 'EMP048' THEN 18.00  -- Maria Portillo
    WHEN e.employee_number = 'EMP050' THEN 27.00  -- Markie Perez
    WHEN e.employee_number = 'EMP051' THEN 29.00  -- Megan Rolnik
    WHEN e.employee_number = 'EMP052' THEN 17.87  -- Miguel Antonio Gonzalez
    WHEN e.employee_number = 'EMP053' THEN 21.50  -- Natalie Ulloa
    WHEN e.employee_number = 'EMP054' THEN 21.00  -- Nauman Ali
    WHEN e.employee_number = 'EMP055' THEN 19.00  -- Nichole Gibbs
    WHEN e.employee_number = 'EMP056' THEN 37.00  -- Nick Bermudez
    WHEN e.employee_number = 'EMP057' THEN 25.00  -- Rachael Banyasz
    WHEN e.employee_number = 'EMP058' THEN 31.00  -- Raquel Velez
    WHEN e.employee_number = 'EMP059' THEN 23.50  -- Sara Drickman
    WHEN e.employee_number = 'EMP060' THEN 24.50  -- Shelby Ackerman
    WHEN e.employee_number = 'EMP061' THEN 30.00  -- Sierra Frasier
    WHEN e.employee_number = 'EMP062' THEN 20.00  -- Sierra Mendez
    WHEN e.employee_number = 'EMP063' THEN 19.00  -- Sonora Chavez
    WHEN e.employee_number = 'EMP064' THEN 28.00  -- Taylor Fox
    WHEN e.employee_number = 'EMP065' THEN 25.00  -- Tiffany Tesoro
    WHEN e.employee_number = 'EMP066' THEN 20.00  -- Verenice Mendoza
    WHEN e.employee_number = 'EMP067' THEN 28.40  -- Veronica Rios
    WHEN e.employee_number = 'EMP068' THEN 18.50  -- Yasuko Sano
    WHEN e.employee_number = 'EMP069' THEN 19.00  -- Zuleyka Chuc
    WHEN e.employee_number = 'EMP070' THEN 22.00  -- Ervin Tenorio
    WHEN e.employee_number = 'EMP071' THEN 17.27  -- Rachel Moreno
    WHEN e.employee_number = 'EMP072' THEN 50.00  -- Lauren Corallo (contractor)
    ELSE NULL
  END,
  CASE 
    -- Annual salaries
    WHEN e.employee_number = 'EMP007' THEN 110000.00  -- Andrea Rehrig
    WHEN e.employee_number = 'EMP009' THEN 49400.00   -- Angela Lina Perez
    WHEN e.employee_number = 'EMP013' THEN 65000.00   -- Bianca Alfonso
    WHEN e.employee_number = 'EMP018' THEN 69160.00   -- Carmen Chan
    WHEN e.employee_number = 'EMP022' THEN 100000.00  -- Cynthia Garcia
    WHEN e.employee_number = 'EMP023' THEN 83200.00   -- Deija Lighon
    WHEN e.employee_number = 'EMP024' THEN 52000.00   -- Diana Monterde
    WHEN e.employee_number = 'EMP025' THEN 64201.02   -- Dr. Andre de Mattos Faro
    WHEN e.employee_number = 'EMP026' THEN 125000.00  -- Dr. Candice Habawel
    WHEN e.employee_number = 'EMP027' THEN 82000.10   -- Dr. Celestine Hoh
    WHEN e.employee_number = 'EMP028' THEN 120000.00  -- Dr. Claudia Lau
    WHEN e.employee_number = 'EMP029' THEN 95000.00   -- Dr. Ella Scott
    WHEN e.employee_number = 'EMP030' THEN 156000.00  -- Dr. Heather Rally Webb
    WHEN e.employee_number = 'EMP031' THEN 180000.08  -- Dr. Jessica Robertson
    WHEN e.employee_number = 'EMP032' THEN 225000.10  -- Dr. Michael Geist
    WHEN e.employee_number = 'EMP033' THEN 140000.00  -- Dr. Niko Alzate
    WHEN e.employee_number = 'EMP034' THEN 100000.00  -- Dr. Sherry Vartanian
    WHEN e.employee_number = 'EMP040' THEN 70000.00   -- Jessica Salazar
    WHEN e.employee_number = 'EMP049' THEN 120000.14  -- Marc Mercury
    ELSE NULL
  END,
  'USD',
  e.hire_date
FROM public.employees e;


-- =====================================================
-- UPDATE Marc Mercury's profile to link to employee record
-- (Assumes profile was created via auth signup)
-- =====================================================
-- This links the profile to the employee record when they log in
-- UPDATE public.employees 
-- SET profile_id = (SELECT id FROM public.profiles WHERE email ILIKE '%marc%mercury%' LIMIT 1)
-- WHERE employee_number = 'EMP049';

-- =====================================================
-- SUMMARY
-- =====================================================
-- Total Employees: 72
-- Full-Time: 69
-- Part-Time: 2 (Megan Rolnik, Rachael Banyasz)
-- Contractors: 1 (Lauren Corallo)
-- Remote Workers: 14
-- In-House: 58
-- DVMs: 10
-- RVTs: 7
-- Vet Assistants: 20
-- CSRs: 22
-- Management/Admin: 13
-- =====================================================
