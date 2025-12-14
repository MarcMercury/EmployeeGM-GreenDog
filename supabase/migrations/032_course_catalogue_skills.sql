-- =====================================================
-- MIGRATION 032: Course Catalogue with Skill Training Resources
-- Links training courses/resources to skills for level 0→1 progression
-- =====================================================

-- Add skill linking columns to training_courses
ALTER TABLE public.training_courses 
  ADD COLUMN IF NOT EXISTS skill_id UUID REFERENCES public.skill_library(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS skill_level_target INTEGER DEFAULT 1 CHECK (skill_level_target >= 1 AND skill_level_target <= 5),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS external_url TEXT,
  ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'course' CHECK (content_type IN ('course', 'video', 'document', 'article', 'webinar', 'certification')),
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for skill-based course lookup
CREATE INDEX IF NOT EXISTS idx_training_courses_skill ON public.training_courses(skill_id);
CREATE INDEX IF NOT EXISTS idx_training_courses_category ON public.training_courses(category);

-- =====================================================
-- SEED: Foundation Level Training Resources (0→1)
-- Each skill gets an introductory resource to move from 0 to 1
-- =====================================================

-- Clinical Skills Training Resources
INSERT INTO public.training_courses (title, description, category, skill_id, external_url, content_type, difficulty_level, duration_minutes, is_active) 
SELECT 
  'Introduction to ' || sl.name,
  'Learn the fundamentals of ' || sl.name || '. ' || sl.description,
  'Clinical Skills',
  sl.id,
  CASE sl.name
    WHEN 'Physical Examination' THEN 'https://www.youtube.com/watch?v=VzPD009qTN4'
    WHEN 'Patient Triage' THEN 'https://www.veterinarypracticenews.com/triage-protocols'
    WHEN 'History Taking' THEN 'https://www.msdvetmanual.com/management-and-nutrition/veterinary-history-and-physical-examination'
    WHEN 'Fear-Free Handling' THEN 'https://fearfreepets.com/resources'
    WHEN 'Animal Behavior Assessment' THEN 'https://www.aspcapro.org/resource/animal-behavior'
    WHEN 'Basic Restraint' THEN 'https://www.youtube.com/watch?v=1TYp6_vQ_lI'
    WHEN 'Advanced Restraint' THEN 'https://www.youtube.com/watch?v=advanced-restraint-vet'
    WHEN 'Nursing Care' THEN 'https://todaysveterinarynurse.com/articles/fundamentals-of-veterinary-nursing-care'
    WHEN 'Patient Monitoring' THEN 'https://www.youtube.com/watch?v=vet-monitoring'
    WHEN 'Pain Scoring' THEN 'https://www.colorado.edu/research/animal-resources/iacuc/pain-assessment'
    WHEN 'Medical Note Accuracy' THEN 'https://www.avma.org/resources/practice-management/veterinary-medical-records'
    WHEN 'SOAP Documentation' THEN 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7158205/'
    WHEN 'Bandaging Techniques' THEN 'https://www.youtube.com/watch?v=vet-bandaging-101'
    WHEN 'Wound Care' THEN 'https://www.veterinarypracticenews.com/wound-management-basics'
    WHEN 'Fluid Therapy' THEN 'https://www.youtube.com/watch?v=fluid-therapy-basics'
    WHEN 'Catheter Placement (IV)' THEN 'https://www.youtube.com/watch?v=iv-catheter-placement'
    WHEN 'Catheter Placement (Urinary)' THEN 'https://www.youtube.com/watch?v=urinary-catheter-vet'
    WHEN 'Oxygen Therapy' THEN 'https://www.msdvetmanual.com/emergency-medicine-and-critical-care/oxygen-therapy'
    WHEN 'Feeding Tube Placement' THEN 'https://www.youtube.com/watch?v=ng-tube-placement'
    WHEN 'Nail Trimming' THEN 'https://www.youtube.com/watch?v=dog-nail-trim-vet'
    WHEN 'Anal Gland Expression' THEN 'https://www.youtube.com/watch?v=anal-gland-expression'
    WHEN 'Vaccination Protocols' THEN 'https://www.aaha.org/aaha-guidelines/vaccination-canine-configuration/vaccination-canine/'
    WHEN 'Parasite Prevention Knowledge' THEN 'https://www.capcvet.org/guidelines'
    WHEN 'Common Disease Recognition' THEN 'https://www.msdvetmanual.com/'
    WHEN 'Toxicology Basics' THEN 'https://www.aspca.org/pet-care/animal-poison-control'
    WHEN 'Post-Operative Monitoring' THEN 'https://todaysveterinarypractice.com/anesthesia-analgesia/postoperative-monitoring/'
    WHEN 'Treatment Sheet Accuracy' THEN 'https://www.veterinaryteambrief.com/article/treatment-sheet-best-practices'
    ELSE 'https://www.msdvetmanual.com/'
  END,
  'video',
  'beginner',
  30,
  true
FROM public.skill_library sl 
WHERE sl.category = 'Clinical Skills'
ON CONFLICT DO NOTHING;

-- Diagnostics & Imaging Training Resources
INSERT INTO public.training_courses (title, description, category, skill_id, external_url, content_type, difficulty_level, duration_minutes, is_active)
SELECT 
  'Introduction to ' || sl.name,
  'Learn the fundamentals of ' || sl.name || '. ' || sl.description,
  'Diagnostics & Imaging',
  sl.id,
  CASE sl.name
    WHEN 'Radiology Positioning' THEN 'https://www.youtube.com/watch?v=vet-xray-positioning'
    WHEN 'Radiographic Safety' THEN 'https://www.osha.gov/radiation'
    WHEN 'Ultrasound Operation' THEN 'https://www.youtube.com/watch?v=vet-ultrasound-basics'
    WHEN 'Sample Collection – Blood' THEN 'https://www.youtube.com/watch?v=blood-draw-dogs'
    WHEN 'Sample Collection – Urine Cystocentesis' THEN 'https://www.youtube.com/watch?v=cystocentesis'
    WHEN 'Sample Collection – FNA' THEN 'https://www.youtube.com/watch?v=fna-technique'
    WHEN 'Cytology Preparation' THEN 'https://www.idexx.com/en/veterinary/reference-laboratories/cytology/'
    WHEN 'Microscope Use' THEN 'https://www.youtube.com/watch?v=microscope-basics'
    WHEN 'POC Testing' THEN 'https://www.idexx.com/en/veterinary/analyzers/snap-tests/'
    WHEN 'Lab Equipment Operation' THEN 'https://www.idexx.com/en/veterinary/analyzers/'
    WHEN 'CBC Reading' THEN 'https://eclinpath.com/hematology/tests/cbc/'
    WHEN 'Chemistry Panel Interpretation' THEN 'https://eclinpath.com/chemistry/'
    WHEN 'EKG Operation' THEN 'https://www.youtube.com/watch?v=ekg-basics-vet'
    WHEN 'EKG Interpretation' THEN 'https://ecgwaves.com/topic/ekg-ecg-interpretation-dogs-cats-veterinary/'
    ELSE 'https://www.msdvetmanual.com/'
  END,
  'video',
  'beginner',
  30,
  true
FROM public.skill_library sl 
WHERE sl.category = 'Diagnostics & Imaging'
ON CONFLICT DO NOTHING;

-- Surgical & Procedural Training Resources  
INSERT INTO public.training_courses (title, description, category, skill_id, external_url, content_type, difficulty_level, duration_minutes, is_active)
SELECT 
  'Introduction to ' || sl.name,
  'Learn the fundamentals of ' || sl.name || '. ' || sl.description,
  'Surgical & Procedural',
  sl.id,
  CASE sl.name
    WHEN 'Anesthesia Monitoring' THEN 'https://www.aaha.org/aaha-guidelines/anesthesia-and-monitoring-configuration/anesthesia-and-monitoring/'
    WHEN 'Anesthesia Induction' THEN 'https://www.youtube.com/watch?v=anesthesia-induction'
    WHEN 'Anesthesia Recovery' THEN 'https://todaysveterinarypractice.com/anesthesia-analgesia/anesthetic-recovery/'
    WHEN 'Aseptic Technique' THEN 'https://www.youtube.com/watch?v=aseptic-technique-surgery'
    WHEN 'Surgical Assisting' THEN 'https://www.youtube.com/watch?v=surgical-assistant-basics'
    WHEN 'Instrument Handling' THEN 'https://www.youtube.com/watch?v=surgical-instruments'
    WHEN 'Dental Prophylaxis' THEN 'https://www.aaha.org/aaha-guidelines/dental-care/dental-care/'
    WHEN 'Dental Radiographs' THEN 'https://www.youtube.com/watch?v=dental-xrays-vet'
    WHEN 'Dental Charting' THEN 'https://www.avdc.org/nomenclature.html'
    WHEN 'Intubation' THEN 'https://www.youtube.com/watch?v=intubation-dogs'
    ELSE 'https://www.msdvetmanual.com/'
  END,
  'video',
  'intermediate',
  45,
  true
FROM public.skill_library sl 
WHERE sl.category = 'Surgical & Procedural'
ON CONFLICT DO NOTHING;

-- Emergency & Critical Care Training Resources
INSERT INTO public.training_courses (title, description, category, skill_id, external_url, content_type, difficulty_level, duration_minutes, is_active)
SELECT 
  'Introduction to ' || sl.name,
  'Learn the fundamentals of ' || sl.name || '. ' || sl.description,
  'Emergency & Critical Care',
  sl.id,
  CASE sl.name
    WHEN 'Rapid Triage' THEN 'https://todaysveterinarypractice.com/emergency-medicine-critical-care/triage-in-the-emergency-room/'
    WHEN 'Shock Protocols' THEN 'https://www.msdvetmanual.com/emergency-medicine-and-critical-care/shock'
    WHEN 'Crash Cart Management' THEN 'https://www.veterinaryteambrief.com/article/organizing-crash-cart'
    WHEN 'CPR (RECOVER Certified)' THEN 'https://www.recoverinitiative.org/'
    WHEN 'Fluid Shock Dosing' THEN 'https://www.msdvetmanual.com/emergency-medicine-and-critical-care/fluid-therapy'
    WHEN 'Emergency Drug Knowledge' THEN 'https://www.plumbsveterinarydrugs.com/'
    WHEN 'Oxygen Cage Setup' THEN 'https://www.msdvetmanual.com/emergency-medicine-and-critical-care/oxygen-therapy'
    WHEN 'ICU Monitoring' THEN 'https://todaysveterinarynurse.com/articles/intensive-care-unit-monitoring/'
    WHEN 'Toxicity Protocols' THEN 'https://www.aspca.org/pet-care/animal-poison-control'
    WHEN 'GDV Protocol Knowledge' THEN 'https://www.acvs.org/small-animal/gastric-dilatation-volvulus'
    WHEN 'Seizure Management' THEN 'https://www.msdvetmanual.com/nervous-system/seizure-disorders'
    ELSE 'https://www.msdvetmanual.com/'
  END,
  'video',
  'intermediate',
  45,
  true
FROM public.skill_library sl 
WHERE sl.category = 'Emergency & Critical Care'
ON CONFLICT DO NOTHING;

-- Pharmacy & Treatment Training Resources
INSERT INTO public.training_courses (title, description, category, skill_id, external_url, content_type, difficulty_level, duration_minutes, is_active)
SELECT 
  'Introduction to ' || sl.name,
  'Learn the fundamentals of ' || sl.name || '. ' || sl.description,
  'Pharmacy & Treatment',
  sl.id,
  CASE sl.name
    WHEN 'Medication Math' THEN 'https://www.veterinaryteambrief.com/article/drug-calculation-basics'
    WHEN 'Dose Conversion' THEN 'https://www.merckvetmanual.com/appendixes/conversion-tables'
    WHEN 'Prescription Accuracy' THEN 'https://www.avma.org/resources/practice-management/veterinary-prescription-requirements'
    WHEN 'Controlled Substance Logging' THEN 'https://www.deadiversion.usdoj.gov/21cfr/cfr/1304/1304_04.htm'
    WHEN 'Injection Technique IM' THEN 'https://www.youtube.com/watch?v=im-injection-vet'
    WHEN 'Injection Technique SQ' THEN 'https://www.youtube.com/watch?v=sq-injection-vet'
    WHEN 'Injection Technique IV' THEN 'https://www.youtube.com/watch?v=iv-injection-vet'
    WHEN 'Drug Interaction Awareness' THEN 'https://www.plumbsveterinarydrugs.com/'
    ELSE 'https://www.plumbsveterinarydrugs.com/'
  END,
  'document',
  'beginner',
  30,
  true
FROM public.skill_library sl 
WHERE sl.category = 'Pharmacy & Treatment'
ON CONFLICT DO NOTHING;

-- Client Service Training Resources
INSERT INTO public.training_courses (title, description, category, skill_id, external_url, content_type, difficulty_level, duration_minutes, is_active)
SELECT 
  'Introduction to ' || sl.name,
  'Learn the fundamentals of ' || sl.name || '. ' || sl.description,
  'Client Service',
  sl.id,
  CASE sl.name
    WHEN 'Phone Communication' THEN 'https://www.veterinaryteambrief.com/article/telephone-etiquette'
    WHEN 'Client Empathy' THEN 'https://www.dvm360.com/view/building-empathy-veterinary-medicine'
    WHEN 'De-escalation' THEN 'https://www.veterinaryteambrief.com/article/handling-angry-clients'
    WHEN 'Service Recovery' THEN 'https://www.aaha.org/practice-resources/practice-management-topics/client-relations/'
    WHEN 'Estimate Presentation' THEN 'https://www.aaha.org/practice-resources/practice-management-topics/financial-management/'
    WHEN 'Financial Conversations' THEN 'https://www.veterinaryteambrief.com/article/discussing-money-clients'
    WHEN 'Client Education' THEN 'https://www.aaha.org/your-pet/pet-owner-education/'
    ELSE 'https://www.aaha.org/practice-resources/'
  END,
  'article',
  'beginner',
  20,
  true
FROM public.skill_library sl 
WHERE sl.category = 'Client Service'
ON CONFLICT DO NOTHING;

-- Soft Skills Training Resources
INSERT INTO public.training_courses (title, description, category, skill_id, external_url, content_type, difficulty_level, duration_minutes, is_active)
SELECT 
  'Introduction to ' || sl.name,
  'Learn the fundamentals of ' || sl.name || '. ' || sl.description,
  'Soft Skills',
  sl.id,
  CASE sl.name
    WHEN 'Communication' THEN 'https://www.linkedin.com/learning/communication-foundations-2'
    WHEN 'Empathy' THEN 'https://www.linkedin.com/learning/developing-your-emotional-intelligence'
    WHEN 'Problem Solving' THEN 'https://www.linkedin.com/learning/problem-solving-techniques'
    WHEN 'Adaptability' THEN 'https://www.linkedin.com/learning/developing-adaptability-as-a-manager'
    WHEN 'Time Management' THEN 'https://www.linkedin.com/learning/time-management-fundamentals'
    WHEN 'Teamwork' THEN 'https://www.linkedin.com/learning/teamwork-foundations'
    WHEN 'Professionalism' THEN 'https://www.linkedin.com/learning/developing-your-professional-image'
    WHEN 'Critical Thinking' THEN 'https://www.linkedin.com/learning/critical-thinking-for-better-judgment-and-decision-making'
    WHEN 'Stress Tolerance' THEN 'https://www.linkedin.com/learning/managing-stress-for-positive-change'
    ELSE 'https://www.linkedin.com/learning/'
  END,
  'video',
  'beginner',
  30,
  true
FROM public.skill_library sl 
WHERE sl.category = 'Soft Skills'
ON CONFLICT DO NOTHING;

-- Technology Skills Training Resources
INSERT INTO public.training_courses (title, description, category, skill_id, external_url, content_type, difficulty_level, duration_minutes, is_active)
SELECT 
  'Introduction to ' || sl.name,
  'Learn the fundamentals of ' || sl.name || '. ' || sl.description,
  'Technology Skills',
  sl.id,
  CASE sl.name
    WHEN 'PIMS Mastery' THEN 'https://www.idexx.com/en/veterinary/software-services/'
    WHEN 'Telemedicine Tools' THEN 'https://www.avma.org/resources-tools/animal-health-and-welfare/telehealth'
    WHEN 'Data Entry Mastery' THEN 'https://www.linkedin.com/learning/data-entry-fundamentals'
    WHEN 'Cloud File Management' THEN 'https://www.linkedin.com/learning/google-drive-essential-training'
    WHEN 'Troubleshooting' THEN 'https://www.linkedin.com/learning/it-help-desk-for-beginners'
    WHEN 'Cybersecurity Basics' THEN 'https://www.linkedin.com/learning/cybersecurity-awareness-security-basics'
    ELSE 'https://www.linkedin.com/learning/'
  END,
  'video',
  'beginner',
  30,
  true
FROM public.skill_library sl 
WHERE sl.category = 'Technology Skills'
ON CONFLICT DO NOTHING;

-- Leadership & Management Training Resources
INSERT INTO public.training_courses (title, description, category, skill_id, external_url, content_type, difficulty_level, duration_minutes, is_active)
SELECT 
  'Introduction to ' || sl.name,
  'Learn the fundamentals of ' || sl.name || '. ' || sl.description,
  'Leadership Skills',
  sl.id,
  CASE sl.name
    WHEN 'Strategic Decision-Making' THEN 'https://www.linkedin.com/learning/making-decisions'
    WHEN 'Crisis Management' THEN 'https://www.linkedin.com/learning/crisis-management'
    WHEN 'Team Motivation' THEN 'https://www.linkedin.com/learning/motivating-and-engaging-employees'
    WHEN 'Delegation' THEN 'https://www.linkedin.com/learning/delegating-tasks'
    WHEN 'Leadership Communication' THEN 'https://www.linkedin.com/learning/communicating-as-a-leader'
    WHEN 'Change Management' THEN 'https://www.linkedin.com/learning/change-management-foundations'
    WHEN 'Goal Setting' THEN 'https://www.linkedin.com/learning/goal-setting-objectives-and-key-results-okrs'
    ELSE 'https://www.linkedin.com/learning/'
  END,
  'video',
  'intermediate',
  45,
  true
FROM public.skill_library sl 
WHERE sl.category = 'Leadership Skills'
ON CONFLICT DO NOTHING;

-- HR / People Ops Training Resources
INSERT INTO public.training_courses (title, description, category, skill_id, external_url, content_type, difficulty_level, duration_minutes, is_active)
SELECT 
  'Introduction to ' || sl.name,
  'Learn the fundamentals of ' || sl.name || '. ' || sl.description,
  'HR / People Ops',
  sl.id,
  CASE sl.name
    WHEN 'Interviewing' THEN 'https://www.linkedin.com/learning/interviewing-techniques'
    WHEN 'Candidate Screening' THEN 'https://www.linkedin.com/learning/recruiting-foundations'
    WHEN 'Onboarding' THEN 'https://www.linkedin.com/learning/onboarding-new-hires-as-a-manager'
    WHEN 'Training Delivery' THEN 'https://www.linkedin.com/learning/instructional-design-adult-learners'
    WHEN 'Conflict Resolution' THEN 'https://www.linkedin.com/learning/conflict-resolution-foundations'
    WHEN 'Performance Coaching' THEN 'https://www.linkedin.com/learning/coaching-and-developing-employees'
    WHEN 'Employment Law Basics' THEN 'https://www.shrm.org/resourcesandtools/tools-and-samples'
    ELSE 'https://www.shrm.org/'
  END,
  'video',
  'intermediate',
  30,
  true
FROM public.skill_library sl 
WHERE sl.category = 'HR / People Ops'
ON CONFLICT DO NOTHING;

-- Practice Management Training Resources
INSERT INTO public.training_courses (title, description, category, skill_id, external_url, content_type, difficulty_level, duration_minutes, is_active)
SELECT 
  'Introduction to ' || sl.name,
  'Learn the fundamentals of ' || sl.name || '. ' || sl.description,
  'Practice Management',
  sl.id,
  CASE sl.name
    WHEN 'KPI Interpretation' THEN 'https://www.aaha.org/practice-resources/practice-management-topics/analytics-benchmarking/'
    WHEN 'Budget Management' THEN 'https://www.aaha.org/practice-resources/practice-management-topics/financial-management/'
    WHEN 'Revenue Forecasting' THEN 'https://www.linkedin.com/learning/financial-forecasting'
    WHEN 'Cost Control' THEN 'https://www.aaha.org/practice-resources/practice-management-topics/financial-management/'
    WHEN 'Quality Assurance' THEN 'https://www.aaha.org/accreditation-standards/'
    WHEN 'Strategic Planning' THEN 'https://www.linkedin.com/learning/strategic-planning-foundations'
    ELSE 'https://www.aaha.org/practice-resources/'
  END,
  'article',
  'advanced',
  45,
  true
FROM public.skill_library sl 
WHERE sl.category = 'Practice Management'
ON CONFLICT DO NOTHING;

-- Add remaining categories with generic training
INSERT INTO public.training_courses (title, description, category, skill_id, external_url, content_type, difficulty_level, duration_minutes, is_active)
SELECT 
  'Introduction to ' || sl.name,
  'Learn the fundamentals of ' || sl.name || '. ' || sl.description,
  sl.category,
  sl.id,
  'https://www.msdvetmanual.com/',
  'document',
  'beginner',
  30,
  true
FROM public.skill_library sl 
WHERE sl.category IN ('Specialty Skills', 'Operations & Admin', 'Training & Education', 'Financial Skills', 
                       'Inventory Skills', 'Facilities Skills', 'Gameplay Attributes', 'Creative / Marketing', 
                       'Legal / Compliance', 'Remote Work Skills')
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON COLUMN public.training_courses.skill_id IS 'Links course to a specific skill for progression tracking';
COMMENT ON COLUMN public.training_courses.skill_level_target IS 'Skill level this course helps achieve (1-5)';
COMMENT ON COLUMN public.training_courses.external_url IS 'URL to external training resource (video, article, etc.)';
COMMENT ON COLUMN public.training_courses.content_type IS 'Type of training content: course, video, document, article, webinar, certification';
