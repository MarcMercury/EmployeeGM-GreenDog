-- =====================================================
-- SEED DATA: Locations, Roles, Departments, Job Positions
-- =====================================================

-- =====================================================
-- 0. COMPANY SETTINGS (Required base configuration)
-- =====================================================
INSERT INTO public.company_settings (legal_name, display_name, industry, timezone, locale) VALUES
('Green Dog Dental, Inc.', 'Green Dog Dental', 'Veterinary', 'America/Los_Angeles', 'en-US');

-- =====================================================
-- 1. LOCATIONS
-- =====================================================
INSERT INTO public.locations (name, code, address_line1, city, state, postal_code, phone) VALUES
('Sherman Oaks', 'SO', '13907 Ventura Blvd Suite #101', 'Sherman Oaks', 'CA', '91423', '(310) 606-2407'),
('Venice', 'VEN', '210 Main Street', 'Venice', 'CA', '90291', '(310) 606-2407'),
('The Valley', 'VAL', '14661 Aetna St.', 'Van Nuys', 'CA', '91411', '(310) 606-2407');

-- =====================================================
-- 2. ROLES
-- =====================================================
INSERT INTO public.roles (key, name, description, is_system) VALUES
('super_admin', 'Super Admin', 'Full system access with all permissions', true),
('admin', 'Admin', 'Administrative access to manage users and settings', true),
('manager', 'Manager', 'Can manage team members and approve requests', false),
('employee', 'Employee', 'Standard employee access', false);

-- =====================================================
-- 3. DEPARTMENTS
-- =====================================================
INSERT INTO public.departments (name, code) VALUES
('General Practice / Wellness', 'GEN'),
('Surgery', 'SURG'),
('Dentistry', 'DENT'),
('Exotics', 'EXOT'),
('Emergency / Urgent Care', 'ER'),
('Internal Medicine', 'IM'),
('Diagnostics / Imaging', 'DIAG'),
('Pharmacy', 'PHARM'),
('Treatment / ICU / Inpatient Care', 'ICU'),
('Anesthesia', 'ANES'),
('Rehabilitation / Physical Therapy', 'REHAB'),
('Front Desk / Client Services (CSR)', 'CSR'),
('Marketing & Community Outreach', 'MKT'),
('Billing / Finance', 'FIN'),
('Human Resources', 'HR'),
('Training & Continuing Education', 'TRAIN'),
('Recruiting / Talent Acquisition', 'RECRUIT'),
('Inventory / Purchasing', 'INV'),
('Facilities / Maintenance', 'FAC'),
('IT & Systems Administration', 'IT'),
('Compliance & Quality Assurance', 'QA'),
('Operations Management / Practice Manager Office', 'OPS'),
('Medical Director / Leadership', 'LEAD'),
('Executive', 'EXEC');

-- =====================================================
-- 4. JOB POSITIONS
-- =====================================================
INSERT INTO public.job_positions (title, code, is_manager) VALUES
('Veterinary Assistant', 'VA', false),
('Client Service Representative (CSR)', 'CSR', false),
('Veterinary Technician', 'VT', false),
('Registered Veterinary Technician (RVT)', 'RVT', false),
('Lead Veterinary Technician', 'LEAD_VT', true),
('Senior Veterinary Technician', 'SR_VT', false),
('Technician Supervisor', 'TECH_SUP', true),
('Training Manager', 'TRAIN_MGR', true),
('Surgery Technician', 'SURG_TECH', false),
('Dental Technician', 'DENT_TECH', false),
('Emergency Technician', 'ER_TECH', false),
('Anesthesia Technician', 'ANES_TECH', false),
('ICU Technician', 'ICU_TECH', false),
('Triage Nurse', 'TRIAGE', false),
('Exotic Animal Technician', 'EXOT_TECH', false),
('Oncology Technician', 'ONC_TECH', false),
('Cardiology Technician', 'CARD_TECH', false),
('Ophthalmology Technician', 'OPH_TECH', false),
('Rehabilitation Technician', 'REHAB_TECH', false),
('Behavior Technician', 'BEH_TECH', false),
('Chemotherapy Technician', 'CHEMO_TECH', false),
('Blood Bank Technician', 'BLOOD_TECH', false),
('Mobile Technician', 'MOB_TECH', false),
('Veterinarian (DVM)', 'DVM', false),
('Associate Veterinarian', 'ASSOC_DVM', false),
('Relief Veterinarian', 'RELIEF_DVM', false),
('Locum Veterinarian', 'LOCUM_DVM', false),
('Specialist Veterinarian', 'SPEC_DVM', false),
('Telemedicine Veterinarian', 'TELE_DVM', false),
('Overnight ER Veterinarian', 'ER_DVM', false),
('Medical Director', 'MED_DIR', true),
('Area Medical Director', 'AREA_MED_DIR', true),
('Regional Medical Director', 'REG_MED_DIR', true),
('Chief Medical Officer (CMO)', 'CMO', true),
('Chief Client Officer', 'CCO', true),
('Practice Director', 'PRAC_DIR', true),
('Practice Manager', 'PRAC_MGR', true),
('Assistant Practice Manager', 'ASST_PRAC_MGR', true),
('Clinic Supervisor', 'CLIN_SUP', true),
('Clinical Staff Manager', 'CLIN_STAFF_MGR', true),
('Hospital Administrator', 'HOSP_ADMIN', true),
('Doctor''s Assistant', 'DOC_ASST', false),
('Chief Operations Officer (COO)', 'COO', true),
('Facilities Technician', 'FAC_TECH', false),
('Chief Marketing Officer', 'CMO_MKT', true),
('Marketing Director', 'MKT_DIR', true),
('Creative Director', 'CREAT_DIR', true),
('Graphic Designer', 'GRAPH_DES', false),
('Content Writer', 'CONTENT', false),
('Legal Counsel', 'LEGAL', false),
('Chief Legal Counsel', 'CLO', true),
('Director of Veterinary Education', 'VET_ED_DIR', true),
('Veterinary Skills Trainer', 'VET_TRAIN', false),
('Clinical Instructor', 'CLIN_INST', false),
('Internship Program Director', 'INTERN_DIR', true),
('Residency Program Director', 'RES_DIR', true),
('CE Program Coordinator', 'CE_COORD', false),
('Telehealth Coordinator', 'TELE_COORD', false),
('Patient Care Coordinator', 'PAT_COORD', false);

-- =====================================================
-- 5. TIME OFF TYPES
-- =====================================================
INSERT INTO public.time_off_types (name, code, requires_approval, is_paid, default_hours_per_day) VALUES
('Paid Time Off', 'PTO', true, true, 8),
('Sick Leave', 'SICK', true, true, 8),
('Vacation', 'VAC', true, true, 8),
('Personal Day', 'PERS', true, true, 8),
('Bereavement', 'BRV', true, true, 8),
('Jury Duty', 'JURY', true, true, 8),
('Unpaid Leave', 'UNPAID', true, false, 8),
('FMLA', 'FMLA', true, false, 8),
('Maternity/Paternity', 'PARENTAL', true, true, 8),
('Holiday', 'HOL', false, true, 8);

-- =====================================================
-- 6. PERMISSIONS (Core system permissions)
-- =====================================================
INSERT INTO public.permissions (key, description) VALUES
-- Profile permissions
('profiles.view', 'View user profiles'),
('profiles.edit', 'Edit user profiles'),
('profiles.delete', 'Delete user profiles'),
-- Employee permissions
('employees.view', 'View employee records'),
('employees.create', 'Create new employees'),
('employees.edit', 'Edit employee records'),
('employees.delete', 'Delete employees'),
-- Schedule permissions
('schedules.view', 'View schedules'),
('schedules.create', 'Create schedules'),
('schedules.edit', 'Edit schedules'),
('schedules.publish', 'Publish schedules'),
-- Time off permissions
('timeoff.view', 'View time off requests'),
('timeoff.request', 'Request time off'),
('timeoff.approve', 'Approve time off requests'),
('timeoff.deny', 'Deny time off requests'),
-- Skills permissions
('skills.view', 'View skills and ratings'),
('skills.rate', 'Rate employee skills'),
('skills.certify', 'Certify skill levels'),
-- Training permissions
('training.view', 'View training courses'),
('training.create', 'Create training courses'),
('training.enroll', 'Enroll employees in training'),
('training.complete', 'Mark training complete'),
-- Marketing permissions (Admin only)
('marketing.view', 'View marketing data'),
('marketing.create', 'Create marketing campaigns'),
('marketing.edit', 'Edit marketing campaigns'),
('marketing.delete', 'Delete marketing data'),
-- Leads permissions
('leads.view', 'View leads'),
('leads.create', 'Create leads'),
('leads.edit', 'Edit leads'),
('leads.delete', 'Delete leads'),
-- Settings permissions
('settings.view', 'View system settings'),
('settings.edit', 'Edit system settings'),
-- Reports permissions
('reports.view', 'View reports'),
('reports.export', 'Export reports'),
-- Admin permissions
('admin.users', 'Manage users'),
('admin.roles', 'Manage roles'),
('admin.audit', 'View audit logs');

-- =====================================================
-- 7. ROLE-PERMISSION MAPPINGS
-- =====================================================
-- Super Admin gets ALL permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'super_admin';

-- Admin gets most permissions except some admin-only
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'admin'
AND p.key NOT IN ('admin.roles', 'settings.edit');

-- Manager gets team management permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'manager'
AND p.key IN (
  'profiles.view', 'employees.view', 'employees.edit',
  'schedules.view', 'schedules.create', 'schedules.edit', 'schedules.publish',
  'timeoff.view', 'timeoff.request', 'timeoff.approve', 'timeoff.deny',
  'skills.view', 'skills.rate',
  'training.view', 'training.enroll',
  'reports.view'
);

-- Employee gets basic self-service permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'employee'
AND p.key IN (
  'profiles.view',
  'schedules.view',
  'timeoff.view', 'timeoff.request',
  'skills.view',
  'training.view'
);

-- =====================================================
-- 8. SKILL CATEGORIES (Normalized from skill_library)
-- =====================================================
INSERT INTO public.skill_categories (name, description, display_order) VALUES
('Clinical Skills', 'Core veterinary clinical competencies', 1),
('Diagnostics & Imaging', 'Lab work, radiology, and diagnostic procedures', 2),
('Surgical & Procedural', 'Surgery, anesthesia, and procedural skills', 3),
('Emergency & Critical Care', 'Emergency response and ICU skills', 4),
('Pharmacy & Treatment', 'Medication and treatment administration', 5),
('Specialty Skills', 'Advanced specialty area competencies', 6),
('Client Service', 'Customer service and communication skills', 7),
('Operations & Admin', 'Administrative and operational skills', 8),
('HR / People Ops', 'Human resources and people management', 9),
('Practice Management', 'Business and practice management skills', 10),
('Training & Education', 'Teaching and training competencies', 11),
('Leadership Skills', 'Management and leadership competencies', 12),
('Financial Skills', 'Financial management and analysis', 13),
('Inventory Skills', 'Inventory and supply chain management', 14),
('Facilities Skills', 'Facility maintenance and safety', 15),
('Technology Skills', 'Technical and software proficiency', 16),
('Soft Skills', 'Interpersonal and communication skills', 17),
('Gameplay Attributes', 'Performance metrics and attributes', 18),
('Creative / Marketing', 'Marketing and creative skills', 19),
('Legal / Compliance', 'Regulatory and compliance knowledge', 20),
('Remote Work Skills', 'Remote work and virtual collaboration', 21);

-- =====================================================
-- 9. BASE CERTIFICATIONS (Common veterinary certifications)
-- =====================================================
INSERT INTO public.certifications (name, code, description, issuing_authority, validity_months, is_required) VALUES
('Registered Veterinary Technician', 'RVT', 'State-licensed veterinary technician credential', 'California Veterinary Medical Board', 24, false),
('Veterinary Technician Specialist - Emergency & Critical Care', 'VTS-ECC', 'Academy of Veterinary Emergency and Critical Care Technicians', 'NAVTA', 60, false),
('Veterinary Technician Specialist - Dentistry', 'VTS-DENT', 'Academy of Veterinary Dental Technicians', 'NAVTA', 60, false),
('Veterinary Technician Specialist - Anesthesia', 'VTS-ANES', 'Academy of Veterinary Technicians in Anesthesia and Analgesia', 'NAVTA', 60, false),
('RECOVER CPR Certification', 'RECOVER', 'Veterinary CPR certification following RECOVER guidelines', 'RECOVER Initiative', 24, false),
('Fear Free Certified Professional', 'FFCP', 'Fear Free animal handling certification', 'Fear Free', 12, false),
('Low Stress Handling Certification', 'LSH', 'Low Stress Handling University certification', 'Low Stress Handling', 24, false),
('DEA Registration', 'DEA', 'Federal controlled substance registration', 'Drug Enforcement Administration', 36, false),
('Radiation Safety Certificate', 'RAD-SAFE', 'Radiation safety and X-ray operation certification', 'State Radiation Control', 24, false),
('OSHA Bloodborne Pathogens', 'OSHA-BBP', 'OSHA bloodborne pathogen training certification', 'OSHA', 12, true);

-- =====================================================
-- 10. BASE ACHIEVEMENTS (Gamification)
-- =====================================================
INSERT INTO public.achievements (name, code, description, category, points) VALUES
-- Skill achievements
('First Skill Mastered', 'FIRST_SKILL_5', 'Reached level 5 in your first skill', 'skills', 100),
('Skill Collector', 'SKILLS_10', 'Rated in 10 different skills', 'skills', 50),
('Jack of All Trades', 'SKILLS_25', 'Rated in 25 different skills', 'skills', 150),
('Master Technician', 'SKILLS_50', 'Rated in 50 different skills', 'skills', 300),
('Mentor Badge', 'MENTOR_FIRST', 'Completed your first mentorship as a mentor', 'skills', 200),
-- Training achievements
('Training Initiate', 'TRAIN_FIRST', 'Completed your first training course', 'training', 50),
('Continuous Learner', 'TRAIN_5', 'Completed 5 training courses', 'training', 100),
('Training Champion', 'TRAIN_10', 'Completed 10 training courses', 'training', 200),
('Perfect Score', 'QUIZ_100', 'Scored 100% on a training quiz', 'training', 75),
-- Attendance achievements
('Perfect Week', 'ATTEND_WEEK', 'Perfect attendance for one week', 'attendance', 25),
('Perfect Month', 'ATTEND_MONTH', 'Perfect attendance for one month', 'attendance', 100),
('Iron Employee', 'ATTEND_QUARTER', 'Perfect attendance for one quarter', 'attendance', 300),
-- Performance achievements
('Rising Star', 'PERF_FIRST', 'Received first positive performance review', 'performance', 100),
('Consistently Excellent', 'PERF_STREAK', 'Three consecutive positive reviews', 'performance', 250),
-- Tenure achievements
('Welcome Aboard', 'TENURE_30', '30 days with the company', 'tenure', 25),
('One Year Strong', 'TENURE_1Y', 'One year anniversary', 'tenure', 200),
('Veteran', 'TENURE_3Y', 'Three year anniversary', 'tenure', 500),
('Decade of Dedication', 'TENURE_10Y', 'Ten year anniversary', 'tenure', 1000),
-- Special achievements
('Team Player', 'TEAM_HELP', 'Helped a colleague complete a challenging task', 'special', 50),
('Innovation Award', 'INNOVATE', 'Suggested an implemented improvement', 'special', 150),
('Client Hero', 'CLIENT_HERO', 'Received exceptional client feedback', 'special', 100);