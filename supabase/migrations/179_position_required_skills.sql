-- =====================================================
-- Migration 179: Position Required Skills System
-- Purpose: Create junction table for positions to skills mapping
--          and seed baseline data for veterinary practice
-- =====================================================

-- =====================================================
-- 1. CREATE POSITION REQUIRED SKILLS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.position_required_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES public.job_positions(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skill_library(id) ON DELETE CASCADE,
  required_level INTEGER DEFAULT 3 CHECK (required_level >= 1 AND required_level <= 5),
  is_core BOOLEAN DEFAULT true, -- Core vs nice-to-have skills
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(position_id, skill_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_position_required_skills_position 
  ON public.position_required_skills(position_id);
CREATE INDEX IF NOT EXISTS idx_position_required_skills_skill 
  ON public.position_required_skills(skill_id);

-- Add RLS policies
ALTER TABLE public.position_required_skills ENABLE ROW LEVEL SECURITY;

-- Everyone can read position requirements
CREATE POLICY "position_required_skills_select" ON public.position_required_skills
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "position_required_skills_admin_all" ON public.position_required_skills
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- 2. SEED DEPARTMENTS (if empty)
-- =====================================================
-- First add unique constraint on code if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'departments_code_key'
  ) THEN
    ALTER TABLE public.departments ADD CONSTRAINT departments_code_key UNIQUE (code);
  END IF;
END $$;

INSERT INTO public.departments (name, code, is_active) VALUES
  ('Veterinary Medicine', 'VET', true),
  ('Veterinary Technicians', 'TECH', true),
  ('Client Services', 'CSR', true),
  ('Administration', 'ADMIN', true),
  ('Management', 'MGMT', true),
  ('Surgery', 'SURG', true),
  ('Emergency & Critical Care', 'ECC', true),
  ('Grooming & Boarding', 'GROOM', true)
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active;

-- =====================================================
-- 3. SEED JOB POSITIONS (using INSERT with conflict handling via code)
-- =====================================================

-- First add unique constraint on code if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'job_positions_code_key'
  ) THEN
    ALTER TABLE public.job_positions ADD CONSTRAINT job_positions_code_key UNIQUE (code);
  END IF;
END $$;

INSERT INTO public.job_positions (title, code, job_family, is_manager, description) VALUES
  -- Veterinary Medicine
  ('Veterinarian', 'DVM', 'Veterinary Medicine', false, 'Licensed veterinarian providing patient care'),
  ('Associate Veterinarian', 'DVM-ASSOC', 'Veterinary Medicine', false, 'Associate veterinarian under supervision'),
  ('Chief Medical Officer', 'CMO', 'Veterinary Medicine', true, 'Lead veterinarian overseeing medical operations'),
  ('Emergency Veterinarian', 'DVM-ER', 'Emergency & Critical Care', false, 'Emergency and critical care veterinarian'),
  
  -- Technicians
  ('Registered Veterinary Technician', 'RVT', 'Veterinary Technicians', false, 'Licensed/registered veterinary technician'),
  ('Veterinary Technician Specialist', 'VTS', 'Veterinary Technicians', false, 'Specialty-certified veterinary technician'),
  ('Veterinary Assistant', 'VA', 'Veterinary Technicians', false, 'Veterinary assistant providing support'),
  ('Kennel Technician', 'KT', 'Veterinary Technicians', false, 'Animal care and kennel maintenance'),
  ('Surgery Technician', 'SURG-TECH', 'Surgery', false, 'Surgical suite technician'),
  ('Lead Technician', 'LEAD-TECH', 'Veterinary Technicians', true, 'Lead technician supervising tech team'),
  
  -- Client Services
  ('Client Service Representative', 'CSR', 'Client Services', false, 'Front desk and client support'),
  ('Client Service Lead', 'CSR-LEAD', 'Client Services', true, 'Lead client service representative'),
  ('Client Relations Manager', 'CRM', 'Client Services', true, 'Client relations and retention manager'),
  
  -- Administration
  ('Practice Manager', 'PM', 'Management', true, 'Overall practice management and operations'),
  ('Hospital Administrator', 'HA', 'Administration', true, 'Administrative operations manager'),
  ('Office Manager', 'OM', 'Administration', true, 'Office and administrative management'),
  ('Medical Records Clerk', 'MRC', 'Administration', false, 'Medical records management'),
  ('Inventory Coordinator', 'IC', 'Administration', false, 'Inventory and supply chain management'),
  
  -- Specialty
  ('Groomer', 'GROOM', 'Grooming & Boarding', false, 'Professional pet grooming'),
  ('Boarding Attendant', 'BOARD', 'Grooming & Boarding', false, 'Boarding facility care'),
  
  -- Training/Academy
  ('Veterinary Extern', 'EXTERN', 'Veterinary Medicine', false, 'Veterinary student extern'),
  ('Technician Trainee', 'TECH-TRAIN', 'Veterinary Technicians', false, 'Veterinary technician in training')
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  job_family = EXCLUDED.job_family,
  is_manager = EXCLUDED.is_manager,
  description = EXCLUDED.description;

-- =====================================================
-- 4. ENSURE SKILL LIBRARY HAS DATA
-- (Re-run taxonomy insert in case migration 126 wasn't applied)
-- =====================================================
INSERT INTO public.skill_library (name, category, description) VALUES
-- Clinical Skills
('Physical Examination', 'Clinical', 'Comprehensive patient physical examination and assessment'),
('Vital Signs Monitoring', 'Clinical', 'Monitoring and recording temperature, pulse, respiration, blood pressure'),
('Patient Restraint', 'Clinical', 'Safe and humane animal restraint techniques'),
('Triage Assessment', 'Clinical', 'Emergency triage and patient prioritization'),
('Pain Assessment', 'Clinical', 'Recognizing and evaluating pain in animals'),
('Patient History Taking', 'Clinical', 'Obtaining thorough medical history from clients'),
('Blood Collection', 'Clinical', 'Venipuncture and blood sample collection'),
('Laboratory Testing', 'Clinical', 'In-house laboratory diagnostics and sample processing'),
('Urinalysis', 'Clinical', 'Urine sample collection and analysis'),
('Fecal Analysis', 'Clinical', 'Fecal examination and parasite identification'),
('Cytology', 'Clinical', 'Sample preparation and microscopic examination'),
('Radiology', 'Clinical', 'X-ray positioning, exposure, and image quality'),
('Ultrasound', 'Clinical', 'Diagnostic ultrasound scanning and image interpretation'),
('ECG/EKG', 'Clinical', 'Electrocardiogram monitoring and interpretation'),
('Microscopy', 'Clinical', 'Microscope operation and sample examination'),
('IV Catheter Placement', 'Clinical', 'Intravenous catheter insertion and maintenance'),
('Fluid Therapy', 'Clinical', 'IV fluid administration and monitoring'),
('Medication Administration', 'Clinical', 'Oral, injectable, topical medication delivery'),
('Wound Care', 'Clinical', 'Wound cleaning, bandaging, and management'),
('Suture Removal', 'Clinical', 'Surgical suture and staple removal'),
('Nail Trimming', 'Clinical', 'Safe nail trimming and bleeding control'),
('Ear Cleaning', 'Clinical', 'Ear examination and cleaning procedures'),
('Anal Gland Expression', 'Clinical', 'Manual anal gland expression'),
('Dental Prophylaxis', 'Clinical', 'Dental cleaning and polishing'),
('Oxygen Therapy', 'Clinical', 'Oxygen supplementation and monitoring'),

-- Surgical Skills
('Surgical Assisting', 'Surgical', 'Surgical assistance and instrument handling'),
('Surgical Preparation', 'Surgical', 'Patient prep, positioning, and draping'),
('Instrument Sterilization', 'Surgical', 'Autoclave operation and sterility maintenance'),
('Surgical Pack Preparation', 'Surgical', 'Surgical pack assembly and sterilization'),
('Surgical Monitoring', 'Surgical', 'Intra-operative patient monitoring'),
('Recovery Monitoring', 'Surgical', 'Post-operative patient care and monitoring'),
('Surgical Instrument Knowledge', 'Surgical', 'Identification and proper use of surgical instruments'),
('Suturing Techniques', 'Surgical', 'Basic suturing and tissue handling'),

-- Anesthesia
('Anesthesia Induction', 'Anesthesia', 'Anesthetic agent administration and induction'),
('Anesthesia Monitoring', 'Anesthesia', 'Continuous anesthetic monitoring'),
('Intubation', 'Anesthesia', 'Endotracheal intubation and airway management'),
('Anesthetic Machine Operation', 'Anesthesia', 'Anesthesia machine setup and operation'),
('Anesthetic Recovery', 'Anesthesia', 'Post-anesthetic recovery monitoring'),
('Pain Management', 'Anesthesia', 'Pain assessment and analgesic administration'),

-- Dentistry
('Dental Radiography', 'Dentistry', 'Dental x-ray positioning and technique'),
('Dental Scaling', 'Dentistry', 'Calculus removal and tooth scaling'),
('Dental Polishing', 'Dentistry', 'Tooth polishing and finishing'),
('Dental Charting', 'Dentistry', 'Comprehensive dental charting and documentation'),

-- Pharmacy
('Pharmacy Management', 'Pharmacy', 'Medication inventory and dispensing'),
('Drug Calculations', 'Pharmacy', 'Accurate medication dosage calculations'),
('Controlled Substances', 'Pharmacy', 'Controlled drug handling and documentation'),
('Prescription Filling', 'Pharmacy', 'Accurate prescription preparation'),
('Client Education - Medications', 'Pharmacy', 'Medication administration instruction'),

-- Emergency
('CPR - Dogs', 'Emergency', 'Canine cardiopulmonary resuscitation'),
('CPR - Cats', 'Emergency', 'Feline cardiopulmonary resuscitation'),
('Emergency Triage', 'Emergency', 'Emergency patient assessment and prioritization'),
('Shock Management', 'Emergency', 'Recognition and treatment of shock'),
('Trauma Care', 'Emergency', 'Traumatic injury assessment and stabilization'),
('Critical Care Monitoring', 'Emergency', 'ICU patient monitoring and care'),
('Emergency Medications', 'Emergency', 'Emergency drug administration'),

-- Animal Care
('Dog Handling', 'Animal Care', 'Safe and humane dog handling'),
('Cat Handling', 'Animal Care', 'Safe and humane cat handling'),
('Exotic Animal Handling', 'Animal Care', 'Exotic pet restraint and handling'),
('Low-Stress Handling', 'Animal Care', 'Fear-free and low-stress techniques'),
('Animal Behavior Recognition', 'Animal Care', 'Reading animal body language and stress signals'),

-- Client Services
('Client Communication', 'Client Services', 'Effective client interaction and education'),
('Discharge Instructions', 'Client Services', 'Post-procedure client education'),
('Grief Support', 'Client Services', 'Supporting clients through pet loss'),
('Phone Triage', 'Client Services', 'Telephone assessment and advice'),
('Appointment Scheduling', 'Client Services', 'Efficient appointment management'),
('Treatment Plan Presentation', 'Client Services', 'Explaining treatment options and costs'),

-- Administrative
('Medical Records', 'Administrative', 'Accurate medical record keeping'),
('SOAP Notes', 'Administrative', 'SOAP format medical documentation'),
('Practice Management Software', 'Administrative', 'Veterinary software proficiency'),
('Inventory Management', 'Administrative', 'Medical supply inventory control'),
('Billing & Invoicing', 'Administrative', 'Accurate client billing'),
('Reception Duties', 'Administrative', 'Front desk and client check-in/out'),

-- Safety & Compliance
('Infection Control', 'Safety & Compliance', 'Disease prevention and sanitation'),
('Zoonotic Disease Prevention', 'Safety & Compliance', 'Zoonotic disease awareness and prevention'),
('Personal Protective Equipment', 'Safety & Compliance', 'Proper PPE selection and use'),
('OSHA Compliance', 'Safety & Compliance', 'Workplace safety regulations'),
('Sharps Safety', 'Safety & Compliance', 'Needle and sharps handling protocols'),

-- Specialized
('Grooming Services', 'Specialized', 'Basic grooming and coat care'),
('Microchipping', 'Specialized', 'Microchip implantation'),
('Euthanasia Assistance', 'Specialized', 'Humane euthanasia procedures')

ON CONFLICT (name, category) DO UPDATE SET
  description = EXCLUDED.description;

-- =====================================================
-- 5. ASSIGN SKILLS TO POSITIONS
-- =====================================================

-- Helper function to assign skills by category/name
CREATE OR REPLACE FUNCTION assign_position_skills(
  p_position_code TEXT,
  p_skill_names TEXT[],
  p_required_level INTEGER DEFAULT 3,
  p_is_core BOOLEAN DEFAULT true
) RETURNS void AS $$
DECLARE
  v_position_id UUID;
  v_skill_name TEXT;
  v_skill_id UUID;
BEGIN
  -- Get position ID
  SELECT id INTO v_position_id FROM public.job_positions WHERE code = p_position_code;
  IF v_position_id IS NULL THEN
    RAISE NOTICE 'Position not found: %', p_position_code;
    RETURN;
  END IF;
  
  -- Insert each skill
  FOREACH v_skill_name IN ARRAY p_skill_names LOOP
    SELECT id INTO v_skill_id FROM public.skill_library WHERE name = v_skill_name;
    IF v_skill_id IS NOT NULL THEN
      INSERT INTO public.position_required_skills (position_id, skill_id, required_level, is_core)
      VALUES (v_position_id, v_skill_id, p_required_level, p_is_core)
      ON CONFLICT (position_id, skill_id) DO UPDATE SET
        required_level = EXCLUDED.required_level,
        is_core = EXCLUDED.is_core;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VETERINARIAN (DVM) - Highest skill requirements
-- =====================================================
SELECT assign_position_skills('DVM', ARRAY[
  -- Clinical - Core (Level 5)
  'Physical Examination', 'Vital Signs Monitoring', 'Triage Assessment',
  'Pain Assessment', 'Patient History Taking', 'Blood Collection',
  'Laboratory Testing', 'Urinalysis', 'Fecal Analysis', 'Cytology',
  'Radiology', 'Ultrasound', 'ECG/EKG', 'Microscopy',
  'IV Catheter Placement', 'Fluid Therapy', 'Medication Administration',
  'Wound Care', 'Dental Prophylaxis'
], 5, true);

SELECT assign_position_skills('DVM', ARRAY[
  -- Surgical
  'Surgical Assisting', 'Suturing Techniques'
], 5, true);

SELECT assign_position_skills('DVM', ARRAY[
  -- Anesthesia
  'Anesthesia Induction', 'Anesthesia Monitoring', 'Intubation', 
  'Pain Management'
], 5, true);

SELECT assign_position_skills('DVM', ARRAY[
  -- Pharmacy
  'Drug Calculations', 'Controlled Substances', 'Prescription Filling'
], 5, true);

SELECT assign_position_skills('DVM', ARRAY[
  -- Emergency
  'CPR - Dogs', 'CPR - Cats', 'Emergency Triage', 'Shock Management',
  'Trauma Care', 'Emergency Medications'
], 5, true);

SELECT assign_position_skills('DVM', ARRAY[
  -- Client & Admin
  'Client Communication', 'Treatment Plan Presentation', 
  'SOAP Notes', 'Medical Records'
], 4, true);

-- =====================================================
-- REGISTERED VETERINARY TECHNICIAN (RVT)
-- =====================================================
SELECT assign_position_skills('RVT', ARRAY[
  -- Clinical - Core
  'Physical Examination', 'Vital Signs Monitoring', 'Patient Restraint',
  'Triage Assessment', 'Pain Assessment', 'Blood Collection',
  'Laboratory Testing', 'Urinalysis', 'Fecal Analysis', 'Cytology',
  'Radiology', 'Microscopy', 'IV Catheter Placement', 'Fluid Therapy',
  'Medication Administration', 'Wound Care', 'Suture Removal',
  'Nail Trimming', 'Ear Cleaning', 'Anal Gland Expression', 'Dental Prophylaxis'
], 4, true);

SELECT assign_position_skills('RVT', ARRAY[
  -- Surgical
  'Surgical Assisting', 'Surgical Preparation', 'Instrument Sterilization',
  'Surgical Monitoring', 'Recovery Monitoring', 'Surgical Instrument Knowledge'
], 4, true);

SELECT assign_position_skills('RVT', ARRAY[
  -- Anesthesia
  'Anesthesia Induction', 'Anesthesia Monitoring', 'Intubation',
  'Anesthetic Machine Operation', 'Anesthetic Recovery'
], 4, true);

SELECT assign_position_skills('RVT', ARRAY[
  -- Dentistry
  'Dental Radiography', 'Dental Scaling', 'Dental Polishing', 'Dental Charting'
], 3, true);

SELECT assign_position_skills('RVT', ARRAY[
  -- Pharmacy & Emergency
  'Drug Calculations', 'Controlled Substances',
  'CPR - Dogs', 'CPR - Cats', 'Emergency Triage'
], 4, true);

SELECT assign_position_skills('RVT', ARRAY[
  -- Animal Care & Client Services
  'Dog Handling', 'Cat Handling', 'Low-Stress Handling',
  'Client Communication', 'Client Education - Medications'
], 4, true);

SELECT assign_position_skills('RVT', ARRAY[
  -- Admin & Safety
  'Medical Records', 'SOAP Notes', 'Practice Management Software',
  'Infection Control', 'OSHA Compliance', 'Sharps Safety'
], 3, true);

-- =====================================================
-- VETERINARY ASSISTANT (VA)
-- =====================================================
SELECT assign_position_skills('VA', ARRAY[
  -- Clinical - Basic
  'Vital Signs Monitoring', 'Patient Restraint', 'Medication Administration',
  'Wound Care', 'Suture Removal', 'Nail Trimming', 'Ear Cleaning',
  'Anal Gland Expression'
], 3, true);

SELECT assign_position_skills('VA', ARRAY[
  -- Surgical Support
  'Surgical Preparation', 'Instrument Sterilization', 'Surgical Pack Preparation',
  'Recovery Monitoring'
], 3, true);

SELECT assign_position_skills('VA', ARRAY[
  -- Animal Care
  'Dog Handling', 'Cat Handling', 'Low-Stress Handling', 
  'Animal Behavior Recognition'
], 4, true);

SELECT assign_position_skills('VA', ARRAY[
  -- Admin & Safety
  'Medical Records', 'Practice Management Software',
  'Infection Control', 'Sharps Safety'
], 3, true);

-- =====================================================
-- CLIENT SERVICE REPRESENTATIVE (CSR)
-- =====================================================
SELECT assign_position_skills('CSR', ARRAY[
  -- Client Services - Core
  'Client Communication', 'Appointment Scheduling', 'Treatment Plan Presentation',
  'Discharge Instructions', 'Grief Support', 'Phone Triage'
], 4, true);

SELECT assign_position_skills('CSR', ARRAY[
  -- Administrative
  'Medical Records', 'Practice Management Software', 'Billing & Invoicing',
  'Reception Duties'
], 4, true);

SELECT assign_position_skills('CSR', ARRAY[
  -- Basic Animal Handling
  'Dog Handling', 'Cat Handling', 'Animal Behavior Recognition'
], 2, false);

-- =====================================================
-- KENNEL TECHNICIAN (KT)
-- =====================================================
SELECT assign_position_skills('KT', ARRAY[
  -- Animal Care - Core
  'Dog Handling', 'Cat Handling', 'Low-Stress Handling',
  'Animal Behavior Recognition'
], 4, true);

SELECT assign_position_skills('KT', ARRAY[
  -- Basic Clinical
  'Patient Restraint', 'Vital Signs Monitoring', 'Medication Administration'
], 2, true);

SELECT assign_position_skills('KT', ARRAY[
  -- Safety
  'Infection Control', 'Zoonotic Disease Prevention'
], 3, true);

-- =====================================================
-- PRACTICE MANAGER (PM)
-- =====================================================
SELECT assign_position_skills('PM', ARRAY[
  -- Administrative - Core
  'Practice Management Software', 'Inventory Management', 
  'Billing & Invoicing', 'Medical Records'
], 4, true);

SELECT assign_position_skills('PM', ARRAY[
  -- Client Services
  'Client Communication', 'Treatment Plan Presentation', 'Grief Support'
], 4, true);

SELECT assign_position_skills('PM', ARRAY[
  -- Safety & Compliance
  'OSHA Compliance', 'Infection Control'
], 4, true);

-- =====================================================
-- SURGERY TECHNICIAN (SURG-TECH)
-- =====================================================
SELECT assign_position_skills('SURG-TECH', ARRAY[
  -- Surgical - Core
  'Surgical Assisting', 'Surgical Preparation', 'Instrument Sterilization',
  'Surgical Pack Preparation', 'Surgical Monitoring', 'Recovery Monitoring',
  'Surgical Instrument Knowledge'
], 5, true);

SELECT assign_position_skills('SURG-TECH', ARRAY[
  -- Anesthesia
  'Anesthesia Monitoring', 'Intubation', 'Anesthetic Machine Operation',
  'Anesthetic Recovery'
], 4, true);

SELECT assign_position_skills('SURG-TECH', ARRAY[
  -- Clinical Support
  'IV Catheter Placement', 'Medication Administration', 'Pain Management'
], 4, true);

SELECT assign_position_skills('SURG-TECH', ARRAY[
  -- Safety
  'Infection Control', 'Sharps Safety', 'OSHA Compliance'
], 4, true);

-- =====================================================
-- GROOMER
-- =====================================================
SELECT assign_position_skills('GROOM', ARRAY[
  'Grooming Services', 'Dog Handling', 'Cat Handling', 
  'Low-Stress Handling', 'Animal Behavior Recognition',
  'Nail Trimming', 'Ear Cleaning'
], 4, true);

SELECT assign_position_skills('GROOM', ARRAY[
  'Client Communication'
], 3, true);

-- =====================================================
-- TECHNICIAN TRAINEE
-- =====================================================
SELECT assign_position_skills('TECH-TRAIN', ARRAY[
  'Patient Restraint', 'Dog Handling', 'Cat Handling',
  'Low-Stress Handling', 'Animal Behavior Recognition'
], 2, true);

SELECT assign_position_skills('TECH-TRAIN', ARRAY[
  'Vital Signs Monitoring', 'Medication Administration',
  'Infection Control', 'Sharps Safety'
], 1, true);

-- Cleanup helper function
DROP FUNCTION IF EXISTS assign_position_skills(TEXT, TEXT[], INTEGER, BOOLEAN);

-- =====================================================
-- 6. ADD COMMENT FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE public.position_required_skills IS 
  'Junction table mapping job positions to required skills with proficiency levels. Level 1-5 where 5 is expert.';

COMMENT ON COLUMN public.position_required_skills.required_level IS 
  'Required proficiency level: 1=Awareness, 2=Beginner, 3=Intermediate, 4=Advanced, 5=Expert';

COMMENT ON COLUMN public.position_required_skills.is_core IS 
  'True if this is a core/required skill, False if nice-to-have/optional';
