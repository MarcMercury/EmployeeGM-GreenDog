-- =====================================================
-- SEED DATA: Default Shift Templates
-- Green Dog Dental Veterinary Center
-- =====================================================
-- Each row represents one hiring slot / shift template
-- =====================================================

-- Add raw_shift and is_remote columns if they don't exist
ALTER TABLE public.shift_templates 
ADD COLUMN IF NOT EXISTS raw_shift TEXT,
ADD COLUMN IF NOT EXISTS is_remote BOOLEAN NOT NULL DEFAULT false;

-- Clear existing shift templates (if any) to avoid duplicates
DELETE FROM public.shift_templates;

-- =====================================================
-- INSERT SHIFT TEMPLATES
-- =====================================================

INSERT INTO public.shift_templates (role_name, name, raw_shift, is_remote, start_time, end_time) VALUES
-- Management & Admin
('Manager', 'Manager Shift', '10-6:30', false, '10:00', '18:30'),
('Manager', 'Manager Shift', '10-6:30', false, '10:00', '18:30'),
('In House Admin', 'Admin Shift', '10-6:30', false, '10:00', '18:30'),
('Inventory', 'Inventory Shift', '9:30-6 (8)', false, '09:30', '18:00'),
('Sch Admin', 'Scheduling Admin Shift', '9:30-6 (8)', false, '09:30', '18:00'),
('Office Admin', 'Office Admin Shift', '9-5:30 // 8-5:30', false, '09:00', '17:30'),

-- Surgery Department
('VET-SURGERY', 'Surgery Vet Shift', '9-6:30 (9)', false, '09:00', '18:30'),
('Intern', 'Surgery Intern Shift', '9-6:30 (9)', false, '09:00', '18:30'),
('Extern/Student', 'Surgery Extern Shift', '9-5:30 (8)', false, '09:00', '17:30'),
('Surgery Lead', 'Surgery Lead Shift', '8:30-5 (8)', false, '08:30', '17:00'),
('Surgery Tech 1', 'Surgery Tech 1 Shift', '9-5:30 (8)', false, '09:00', '17:30'),
('Surgery Tech 2', 'Surgery Tech 2 Shift', '9-5:30 (8)', false, '09:00', '17:30'),

-- AP (Animal Production) Department
('VET-AP', 'AP Vet Shift', '9-6:30 (9)', false, '09:00', '18:30'),
('Intern', 'AP Intern Shift', '9-6:30 (9)', false, '09:00', '18:30'),
('Extern/Student', 'AP Extern Shift', '9-5:30 (8)', false, '09:00', '17:30'),
('AP Lead', 'AP Lead Shift', '10-6:30 (8)', false, '10:00', '18:30'),
('AP Tech', 'AP Tech Early Shift', '8:30-5 (8)', false, '08:30', '17:00'),
('AP Tech', 'AP Tech Morning Shift', '9-5:30 (8)', false, '09:00', '17:30'),
('AP Tech', 'AP Tech Late Shift', '10-6:30 (8)', false, '10:00', '18:30'),
('AP Tech', 'AP Tech Mid Shift', '9:30-6 (8)', false, '09:30', '18:00'),
('Remote AP Tech', 'Remote AP Tech Shift', '9-5:30 (8)', true, '09:00', '17:30'),

-- NAD (Non-Anesthetic Dentistry) Department
('VET-NAD', 'NAD Vet Shift', '9-6:30 (9)', false, '09:00', '18:30'),
('Intern', 'NAD Intern Shift', '9-6:30 (9)', false, '09:00', '18:30'),
('Extern/Student', 'NAD Extern Shift', '9-5:30 (8)', false, '09:00', '17:30'),
('DA - NAD', 'Dental Assistant NAD Shift', '9-6:30', false, '09:00', '18:30'),
('DA - TRAINING', 'Dental Assistant Training Shift', '9-6:30', false, '09:00', '18:30'),

-- Clinic Technicians
('Clinic Tech', 'Clinic Tech Early Shift', '8:30-5 (8)', false, '08:30', '17:00'),
('Clinic Tech', 'Clinic Tech Morning Shift', '9-5:30 (8)', false, '09:00', '17:30'),
('Clinic Tech', 'Clinic Tech Late Shift', '10-6:30 (8)', false, '10:00', '18:30'),
('Float/Lead', 'Float/Lead Shift', '10-6:30 (8)', false, '10:00', '18:30'),

-- Dentals Department
('Dentals', 'Dentals Morning Shift', '9-5:30 (8)', false, '09:00', '17:30'),
('Dentals', 'Dentals Mid Shift', '9:30-6 (8)', false, '09:30', '18:00'),
('Dentals (trainee)', 'Dentals Trainee Shift', '9:30-6 (8)', false, '09:30', '18:00'),

-- IM (Internal Medicine) Department
('VET-IM', 'IM Vet Shift', '9-6:30 (9)', false, '09:00', '18:30'),
('Intern', 'IM Intern Shift', '9-6:30 (9)', false, '09:00', '18:30'),
('Extern/Student', 'IM Extern Shift', '9-5:30 (8)', false, '09:00', '17:30'),
('IM Tech/DA', 'IM Tech/DA Shift', '9-5:30 (8)', false, '09:00', '17:30'),
('IM Tech', 'IM Tech Morning Shift', '9-5:30 (8)', false, '09:00', '17:30'),
('IM Tech', 'IM Tech Mid Shift', '9:30-6 (8)', false, '09:30', '18:00'),

-- Exotics Department
('VET-EXOTICS', 'Exotics Vet Shift', '9-6:30 (9)', false, '09:00', '18:30'),
('Intern', 'Exotics Intern Shift', '9-6:30 (9)', false, '09:00', '18:30'),
('Extern/Student', 'Exotics Extern Shift', '9-5:30 (8)', false, '09:00', '17:30'),
('Exotic Tech/DA', 'Exotic Tech/DA Shift', '9-5:30 (8)', false, '09:00', '17:30'),
('Exotics Tech', 'Exotics Tech Morning Shift', '9-5:30 (8)', false, '09:00', '17:30'),
('Exotics Tech', 'Exotics Tech Mid Shift', '9:30-6 (8)', false, '09:30', '18:00'),

-- MPMV Department
('VET-MPMV', 'MPMV Vet Shift', '9-6:30 (9)', false, '09:00', '18:30'),
('MPMV TECH', 'MPMV Tech Shift 1', '9-5:30 (8)', false, '09:00', '17:30'),
('MPMV TECH', 'MPMV Tech Shift 2', '9-5:30 (8)', false, '09:00', '17:30'),
('MPMV TECH', 'MPMV Tech Shift 3', '9-5:30 (8)', false, '09:00', '17:30'),

-- Cardio
('VET-CARDIO', 'Cardio Vet Shift', '9-5:30 (8)', false, '09:00', '17:30'),

-- CSR (Customer Service Representatives)
('CSR Lead', 'CSR Lead Shift', '8-4:30 (8)', false, '08:00', '16:30'),
('CSR', 'CSR Early Shift', '8-4:30 (8)', false, '08:00', '16:30'),
('CSR', 'CSR Morning Shift', '9-5:30 (8)', false, '09:00', '17:30'),
('CSR', 'CSR Late Shift', '10-6:30 (8)', false, '10:00', '18:30'),
('CSR', 'CSR Mid Shift', '9:30-6 (8)', false, '09:30', '18:00'),

-- Facilities & Support
('FAC', 'Facilities Shift', '8:30-5 (8)', false, '08:30', '17:00'),
('Referral C', 'Referral Coordinator Shift', '9:30-6p', false, '09:30', '18:00'),
('Marketing Assist', 'Marketing Assistant Shift', '9:30-6p', false, '09:30', '18:00'),

-- Remote CSR Team
('RCSR Manager', 'Remote CSR Manager Shift', '9-5:30', true, '09:00', '17:30'),
('Morning Lead', 'Remote Morning Lead Shift', '7:30-4', true, '07:30', '16:00'),
('Mid', 'Remote Mid Shift', '8-4:30', true, '08:00', '16:30'),
('AP/SX', 'Remote AP/SX Shift', '8:45-5:15', true, '08:45', '17:15'),
('Support', 'Remote Support Shift', '9-5:30pm', true, '09:00', '17:30'),
('Closer', 'Remote Closer Shift', '9:45-6:15', true, '09:45', '18:15'),
('ERASE SX/Specialty', 'Remote ERASE SX/Specialty Shift', '8:45-6:15 (8)', true, '08:45', '18:15'),
('Float', 'Remote Float Shift', '10:30-7', true, '10:30', '19:00'),
('Texting/Tidio', 'Remote Texting/Tidio Shift', '8-5:30', true, '08:00', '17:30'),
('Admin/Backend', 'Remote Admin/Backend Shift', '10-7', true, '10:00', '19:00'),

-- MPMV Med Team (additional slots)
('MPMV MED TEAM', 'MPMV Med Team Late Shift 1', '10-6:30 (8)', false, '10:00', '18:30'),
('MPMV MED TEAM', 'MPMV Med Team Late Shift 2', '10-6:30 (8)', false, '10:00', '18:30'),
('MPMV MED TEAM', 'MPMV Med Team Morning Shift', '9-5:30 (8)', false, '09:00', '17:30');

-- =====================================================
-- Verify insertion
-- =====================================================
-- SELECT role_name, raw_shift, is_remote, start_time, end_time 
-- FROM public.shift_templates 
-- ORDER BY role_name, start_time;
