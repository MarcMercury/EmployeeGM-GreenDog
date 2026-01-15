-- =====================================================
-- Migration 126: Veterinary Skills Taxonomy
-- Purpose: Replace existing skills with comprehensive veterinary industry skills
-- =====================================================

-- First, clear existing non-veterinary skills
DELETE FROM public.skill_library 
WHERE category NOT IN ('Clinical', 'Surgical', 'Medical', 'Veterinary', 'Animal Care');

-- Insert comprehensive veterinary skills organized by category

-- =====================================================
-- CLINICAL SKILLS
-- =====================================================
INSERT INTO public.skill_library (name, category, description) VALUES
-- Patient Assessment & Care
('Physical Examination', 'Clinical', 'Comprehensive patient physical examination and assessment'),
('Vital Signs Monitoring', 'Clinical', 'Monitoring and recording temperature, pulse, respiration, blood pressure'),
('Patient Restraint', 'Clinical', 'Safe and humane animal restraint techniques'),
('Triage Assessment', 'Clinical', 'Emergency triage and patient prioritization'),
('Pain Assessment', 'Clinical', 'Recognizing and evaluating pain in animals'),
('Patient History Taking', 'Clinical', 'Obtaining thorough medical history from clients'),

-- Diagnostic
('Blood Collection', 'Clinical', 'Venipuncture and blood sample collection'),
('Laboratory Testing', 'Clinical', 'In-house laboratory diagnostics and sample processing'),
('Urinalysis', 'Clinical', 'Urine sample collection and analysis'),
('Fecal Analysis', 'Clinical', 'Fecal examination and parasite identification'),
('Cytology', 'Clinical', 'Sample preparation and microscopic examination'),
('Radiology', 'Clinical', 'X-ray positioning, exposure, and image quality'),
('Ultrasound', 'Clinical', 'Diagnostic ultrasound scanning and image interpretation'),
('ECG/EKG', 'Clinical', 'Electrocardiogram monitoring and interpretation'),
('Microscopy', 'Clinical', 'Microscope operation and sample examination'),

-- Treatment & Procedures
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

-- =====================================================
-- SURGICAL SKILLS
-- =====================================================
('Surgical Assisting', 'Surgical', 'Surgical assistance and instrument handling'),
('Surgical Preparation', 'Surgical', 'Patient prep, positioning, and draping'),
('Instrument Sterilization', 'Surgical', 'Autoclave operation and sterility maintenance'),
('Surgical Pack Preparation', 'Surgical', 'Surgical pack assembly and sterilization'),
('Surgical Monitoring', 'Surgical', 'Intra-operative patient monitoring'),
('Recovery Monitoring', 'Surgical', 'Post-operative patient care and monitoring'),
('Surgical Instrument Knowledge', 'Surgical', 'Identification and proper use of surgical instruments'),
('Suturing Techniques', 'Surgical', 'Basic suturing and tissue handling'),
('Spay/Neuter Assistance', 'Surgical', 'Spay and neuter surgical assistance'),
('Soft Tissue Surgery', 'Surgical', 'Soft tissue surgical procedures assistance'),
('Orthopedic Surgery', 'Surgical', 'Orthopedic procedure assistance'),
('Emergency Surgery', 'Surgical', 'Emergency surgical procedure assistance'),

-- =====================================================
-- ANESTHESIA & PAIN MANAGEMENT
-- =====================================================
('Anesthesia Induction', 'Anesthesia', 'Anesthetic agent administration and induction'),
('Anesthesia Monitoring', 'Anesthesia', 'Continuous anesthetic monitoring'),
('Intubation', 'Anesthesia', 'Endotracheal intubation and airway management'),
('Anesthetic Machine Operation', 'Anesthesia', 'Anesthesia machine setup and operation'),
('Anesthetic Recovery', 'Anesthesia', 'Post-anesthetic recovery monitoring'),
('Pain Management', 'Anesthesia', 'Pain assessment and analgesic administration'),
('Local/Regional Anesthesia', 'Anesthesia', 'Local and regional anesthetic techniques'),

-- =====================================================
-- DENTISTRY
-- =====================================================
('Dental Radiography', 'Dentistry', 'Dental x-ray positioning and technique'),
('Dental Scaling', 'Dentistry', 'Calculus removal and tooth scaling'),
('Dental Polishing', 'Dentistry', 'Tooth polishing and finishing'),
('Dental Charting', 'Dentistry', 'Comprehensive dental charting and documentation'),
('Dental Extractions', 'Dentistry', 'Tooth extraction procedures'),
('Oral Surgery', 'Dentistry', 'Oral surgical procedures'),
('Periodontal Assessment', 'Dentistry', 'Periodontal disease evaluation'),

-- =====================================================
-- PHARMACY & MEDICATIONS
-- =====================================================
('Pharmacy Management', 'Pharmacy', 'Medication inventory and dispensing'),
('Drug Calculations', 'Pharmacy', 'Accurate medication dosage calculations'),
('Controlled Substances', 'Pharmacy', 'Controlled drug handling and documentation'),
('Prescription Filling', 'Pharmacy', 'Accurate prescription preparation'),
('Client Education - Medications', 'Pharmacy', 'Medication administration instruction'),
('Adverse Drug Reactions', 'Pharmacy', 'Recognition and management of drug reactions'),
('Compounding', 'Pharmacy', 'Medication compounding and preparation'),

-- =====================================================
-- EMERGENCY & CRITICAL CARE
-- =====================================================
('CPR - Dogs', 'Emergency', 'Canine cardiopulmonary resuscitation'),
('CPR - Cats', 'Emergency', 'Feline cardiopulmonary resuscitation'),
('Emergency Triage', 'Emergency', 'Emergency patient assessment and prioritization'),
('Shock Management', 'Emergency', 'Recognition and treatment of shock'),
('Trauma Care', 'Emergency', 'Traumatic injury assessment and stabilization'),
('Critical Care Monitoring', 'Emergency', 'ICU patient monitoring and care'),
('Emergency Medications', 'Emergency', 'Emergency drug administration'),
('Ventilator Operation', 'Emergency', 'Mechanical ventilation management'),
('Blood Transfusion', 'Emergency', 'Blood typing and transfusion procedures'),

-- =====================================================
-- DIAGNOSTIC IMAGING
-- =====================================================
('Digital Radiography', 'Imaging', 'Digital x-ray systems and PACS'),
('Contrast Studies', 'Imaging', 'Contrast radiography procedures'),
('Fluoroscopy', 'Imaging', 'Real-time fluoroscopic imaging'),
('CT Scan', 'Imaging', 'CT imaging and positioning'),
('MRI', 'Imaging', 'MRI safety and patient preparation'),
('Radiation Safety', 'Imaging', 'Radiation safety protocols and dosimetry'),

-- =====================================================
-- ANIMAL HANDLING & BEHAVIOR
-- =====================================================
('Dog Handling', 'Animal Care', 'Safe and humane dog handling'),
('Cat Handling', 'Animal Care', 'Safe and humane cat handling'),
('Exotic Animal Handling', 'Animal Care', 'Exotic pet restraint and handling'),
('Large Animal Handling', 'Animal Care', 'Equine and livestock handling'),
('Aggressive Animal Protocol', 'Animal Care', 'Safe handling of aggressive patients'),
('Low-Stress Handling', 'Animal Care', 'Fear-free and low-stress techniques'),
('Animal Behavior Recognition', 'Animal Care', 'Reading animal body language and stress signals'),
('Enrichment Activities', 'Animal Care', 'Patient enrichment and comfort'),

-- =====================================================
-- NUTRITION & WELLNESS
-- =====================================================
('Nutritional Counseling', 'Nutrition', 'Diet recommendations and counseling'),
('Feeding Tube Management', 'Nutrition', 'Enteral feeding and tube care'),
('Weight Management', 'Nutrition', 'Obesity assessment and management'),
('Therapeutic Diets', 'Nutrition', 'Prescription diet recommendations'),
('Puppy/Kitten Care', 'Nutrition', 'Pediatric patient care and nutrition'),
('Senior Pet Care', 'Nutrition', 'Geriatric patient care and management'),

-- =====================================================
-- CLIENT SERVICES & COMMUNICATION
-- =====================================================
('Client Communication', 'Client Services', 'Effective client interaction and education'),
('Discharge Instructions', 'Client Services', 'Post-procedure client education'),
('Grief Support', 'Client Services', 'Supporting clients through pet loss'),
('Difficult Conversations', 'Client Services', 'Handling challenging client interactions'),
('Phone Triage', 'Client Services', 'Telephone assessment and advice'),
('Appointment Scheduling', 'Client Services', 'Efficient appointment management'),
('Treatment Plan Presentation', 'Client Services', 'Explaining treatment options and costs'),
('Consent Form Procedures', 'Client Services', 'Obtaining informed consent'),

-- =====================================================
-- ADMINISTRATIVE & PRACTICE MANAGEMENT
-- =====================================================
('Medical Records', 'Administrative', 'Accurate medical record keeping'),
('SOAP Notes', 'Administrative', 'SOAP format medical documentation'),
('Practice Management Software', 'Administrative', 'Veterinary software proficiency'),
('Inventory Management', 'Administrative', 'Medical supply inventory control'),
('Insurance Claims', 'Administrative', 'Pet insurance claim processing'),
('Billing & Invoicing', 'Administrative', 'Accurate client billing'),
('Reception Duties', 'Administrative', 'Front desk and client check-in/out'),
('Multi-line Phone System', 'Administrative', 'Professional phone handling'),

-- =====================================================
-- INFECTION CONTROL & SAFETY
-- =====================================================
('Infection Control', 'Safety & Compliance', 'Disease prevention and sanitation'),
('Biosecurity', 'Safety & Compliance', 'Biosecurity protocols and procedures'),
('Zoonotic Disease Prevention', 'Safety & Compliance', 'Zoonotic disease awareness and prevention'),
('Personal Protective Equipment', 'Safety & Compliance', 'Proper PPE selection and use'),
('Hazardous Waste Disposal', 'Safety & Compliance', 'Medical waste handling and disposal'),
('OSHA Compliance', 'Safety & Compliance', 'Workplace safety regulations'),
('Chemical Safety', 'Safety & Compliance', 'Safe handling of chemicals and drugs'),
('Sharps Safety', 'Safety & Compliance', 'Needle and sharps handling protocols'),

-- =====================================================
-- SPECIALIZED SERVICES
-- =====================================================
('Rehabilitation Therapy', 'Specialized', 'Physical therapy and rehabilitation'),
('Acupuncture Assistance', 'Specialized', 'Acupuncture procedure assistance'),
('Laser Therapy', 'Specialized', 'Therapeutic laser treatment'),
('Hospice & Palliative Care', 'Specialized', 'End-of-life care and support'),
('Grooming Services', 'Specialized', 'Basic grooming and coat care'),
('Microchipping', 'Specialized', 'Microchip implantation'),
('Euthanasia Assistance', 'Specialized', 'Humane euthanasia procedures'),
('Necropsy Assistance', 'Specialized', 'Post-mortem examination assistance'),

-- =====================================================
-- SPECIES-SPECIFIC EXPERTISE
-- =====================================================
('Canine Medicine', 'Species Expertise', 'Dog-specific medical knowledge'),
('Feline Medicine', 'Species Expertise', 'Cat-specific medical knowledge'),
('Avian Medicine', 'Species Expertise', 'Bird care and medicine'),
('Reptile Medicine', 'Species Expertise', 'Reptile care and medicine'),
('Small Mammals', 'Species Expertise', 'Rabbit, guinea pig, ferret care'),
('Equine Medicine', 'Species Expertise', 'Horse care and medicine'),
('Bovine Medicine', 'Species Expertise', 'Cattle care and medicine'),
('Wildlife Medicine', 'Species Expertise', 'Wildlife rehabilitation and care')

ON CONFLICT (name, category) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

-- =====================================================
-- Update employee_skills to use new skill library
-- Note: This preserves ratings but updates skill references
-- =====================================================

-- Archive old skill associations that don't match new taxonomy
UPDATE public.employee_skills es
SET is_archived = true
WHERE NOT EXISTS (
  SELECT 1 FROM public.skill_library sl
  WHERE sl.id = es.skill_id
);

COMMENT ON TABLE public.skill_library IS 'Comprehensive veterinary industry skill taxonomy';

-- Mark migration as complete
INSERT INTO supabase_migrations.schema_migrations (version, name, statements_applied)
VALUES ('126', 'veterinary_skills_taxonomy', 1)
ON CONFLICT (version) DO NOTHING;
