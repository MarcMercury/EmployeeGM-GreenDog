-- =====================================================
-- VISITOR CRM EXPANSION
-- Migration: 079_visitor_crm_expansion.sql
-- Description: Add missing fields to education_visitors table
--              and seed visitor data from Green Dog PDFs
-- =====================================================

-- =====================================================
-- 1. ADD NEW COLUMNS TO education_visitors
-- =====================================================

-- Add coordinator field
ALTER TABLE education_visitors 
ADD COLUMN IF NOT EXISTS coordinator TEXT;

-- Add first_greeter field
ALTER TABLE education_visitors 
ADD COLUMN IF NOT EXISTS first_greeter TEXT;

-- Add mentor field
ALTER TABLE education_visitors 
ADD COLUMN IF NOT EXISTS mentor TEXT;

-- Add location field (clinic location)
ALTER TABLE education_visitors 
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add visit_status field (Upcoming Arrival, Done, Currently w/ us, No Show)
ALTER TABLE education_visitors 
ADD COLUMN IF NOT EXISTS visit_status TEXT DEFAULT 'upcoming';

-- Add recruitment_announced field
ALTER TABLE education_visitors 
ADD COLUMN IF NOT EXISTS recruitment_announced BOOLEAN DEFAULT false;

-- Add recruitment_channel field
ALTER TABLE education_visitors 
ADD COLUMN IF NOT EXISTS recruitment_channel TEXT;

-- Add file_link field (link to visitor file)
ALTER TABLE education_visitors 
ADD COLUMN IF NOT EXISTS file_link TEXT;

-- =====================================================
-- 2. CREATE INDEXES FOR NEW COLUMNS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_education_visitors_status 
ON education_visitors(visit_status);

CREATE INDEX IF NOT EXISTS idx_education_visitors_location 
ON education_visitors(location);

CREATE INDEX IF NOT EXISTS idx_education_visitors_coordinator 
ON education_visitors(coordinator);

-- =====================================================
-- 3. SEED VISITOR DATA FROM MASTER LIST PDF
-- =====================================================

-- Clear existing data to avoid duplicates (optional - comment out if you want to keep existing data)
-- DELETE FROM education_visitors;

-- Insert visitors from Master List (Upcoming and Recent)
INSERT INTO education_visitors (
  first_name, last_name, program_name, visit_start_date, visit_end_date,
  visitor_type, visit_status, coordinator, first_greeter, mentor, location,
  recruitment_announced, school_of_origin, is_active
) VALUES
-- CVM 7070 Dentistry Rotation - January 2026
('Maddalena', 'Shapiro', 'CVM 7070 Dentistry Rotation', '2026-01-20', '2026-01-22', 'extern', 'upcoming', 'Christina', 'Jenn', 'DOC', 'The Valley', false, NULL, true),
('Alexander', 'Pena', 'CVM 7070 Dentistry Rotation', '2026-01-20', '2026-01-22', 'extern', 'upcoming', 'Christina', 'Jenn', 'DOC', 'The Valley', false, NULL, true),
('Yubitza', 'Millot-Audetat', 'CVM 7070 Dentistry Rotation', '2026-01-20', '2026-01-22', 'extern', 'upcoming', 'Christina', 'Jenn', 'DOC', 'The Valley', false, NULL, true),
('Kassandra', 'Medrano', 'CVM 7070 Dentistry Rotation', '2026-01-20', '2026-01-22', 'extern', 'upcoming', 'Christina', 'Jenn', 'DOC', 'The Valley', false, NULL, true),
('Ria', 'Malhotra', 'CVM 7070 Dentistry Rotation', '2026-01-20', '2026-01-22', 'extern', 'upcoming', 'Christina', 'Jenn', 'DOC', 'The Valley', false, NULL, true),
('Ryan', 'Lo', 'CVM 7070 Dentistry Rotation', '2026-01-20', '2026-01-22', 'extern', 'upcoming', 'Christina', 'Jenn', 'DOC', 'The Valley', false, NULL, true),
('Natalie', 'Kossuth', 'CVM 7070 Dentistry Rotation', '2026-01-20', '2026-01-22', 'extern', 'upcoming', 'Christina', 'Jenn', 'DOC', 'The Valley', false, NULL, true),
('Alex', 'Garcia', 'CVM 7070 Dentistry Rotation', '2026-01-20', '2026-01-22', 'extern', 'upcoming', 'Christina', 'Jenn', 'DOC', 'The Valley', false, NULL, true),
('Desiree', 'Fang', 'CVM 7070 Dentistry Rotation', '2026-01-20', '2026-01-22', 'extern', 'upcoming', 'Christina', 'Jenn', 'DOC', 'The Valley', false, NULL, true),
('Taylor', 'Doole', 'CVM 7070 Dentistry Rotation', '2026-01-20', '2026-01-22', 'extern', 'upcoming', 'Christina', 'Jenn', 'DOC', 'The Valley', false, NULL, true),
('Crystal', 'Castillo', 'CVM 7070 Dentistry Rotation', '2026-01-20', '2026-01-22', 'extern', 'upcoming', 'Christina', 'Jenn', 'DOC', 'The Valley', false, NULL, true),
('Miriam', 'Briceno', 'CVM 7070 Dentistry Rotation', '2026-01-20', '2026-01-22', 'extern', 'upcoming', 'Christina', 'Jenn', 'DOC', 'The Valley', false, NULL, true),
('Priscila', 'Bautista', 'CVM 7070 Dentistry Rotation', '2026-01-20', '2026-01-22', 'extern', 'upcoming', 'Christina', 'Jenn', 'DOC', 'The Valley', false, NULL, true),

-- Zoo/Exotics Wildlife Course - January 2026
('Kayla', 'Tran', 'Zoo/Exotics Wildlife Course 2wks', '2026-01-19', '2026-01-30', 'extern', 'upcoming', 'Christina', 'Jenn', 'Robertson', 'The Valley', false, NULL, true),
('Sona', 'Radhakrishnan', 'Zoo/Exotics Wildlife Course 2wks', '2026-01-19', '2026-01-30', 'extern', 'upcoming', 'Christina', 'Jenn', 'Robertson', 'The Valley', false, NULL, true),
('Rachel', 'Sanders', 'Zoo/Exotics Wildlife Course 2wks', '2026-01-05', '2026-01-16', 'extern', 'upcoming', 'Christina', 'Jenn', 'Robertson', 'The Valley', false, NULL, true),
('Laura', 'Callison', 'Zoo/Exotics Wildlife Course 2wks', '2026-01-05', '2026-01-16', 'extern', 'upcoming', 'Christina', 'Jenn', 'Robertson', 'The Valley', false, NULL, true),

-- SAPIII/IV 3 weeks - January 2026
('Diba', 'Bagheri-Nowrozani', 'SAPIII/IV 3 weeks', '2026-01-12', '2026-01-30', 'extern', 'upcoming', 'Christina', 'Jenn', 'Any DVM', 'The Valley', false, NULL, true),
('Alondra', 'Aldana', 'SAPIII/IV 3 weeks', '2026-01-12', '2026-01-30', 'extern', 'upcoming', 'Christina', 'Jenn', 'Any DVM', 'The Valley', false, NULL, true),

-- Western Extern - Internal Medicine
('Andreas', 'Munoz', 'Western Extern 4wk Internal Med', '2026-01-05', '2026-02-01', 'extern', 'upcoming', 'Christina', 'Jenn', 'Dr. Geist', 'Venice', false, 'Western University', true),

-- Shadow Interviews - Completed
('Nubia', 'Hernanadez', 'Shadow Interview', '2025-12-17', '2025-12-17', 'shadow', 'done', 'Jenn', 'Esme', 'Esme', 'Venice', true, NULL, false),
('Grant', '', 'Dr. Alzates Visitor', '2025-12-30', '2026-01-12', 'other', 'upcoming', 'Cynthia', 'Dr. Alzate', 'Dr. Alzate', 'The Valley', true, NULL, true),
('Saul', 'Garcia', 'Shadow Interview', '2025-11-24', '2025-11-24', 'shadow', 'done', 'Jenn', 'Carmen', 'Carmen', 'The Valley', true, NULL, false),
('Victoria', 'Portillo', 'Shadow Interview', '2025-11-21', '2025-11-21', 'shadow', 'done', 'Jenn', 'Bianca', 'Bianca', 'The Valley', true, NULL, false),

-- CVM 7070 Dentistry Rotation - December 2025 (Done)
('Dorothy', 'Bell', 'CVM 7070 Dentistry Rotation', '2025-12-02', '2025-12-04', 'extern', 'done', 'Christina', 'Jenn', 'DOC', 'The Valley', true, NULL, false),
('Mizuki', 'Chipman', 'CVM 7070 Dentistry Rotation', '2025-12-02', '2025-12-04', 'extern', 'done', 'Christina', 'Jenn', 'DOC', 'The Valley', true, NULL, false),
('Aaftaab', 'Dadwal', 'CVM 7070 Dentistry Rotation', '2025-12-02', '2025-12-04', 'extern', 'done', 'Christina', 'Jenn', 'DOC', 'The Valley', true, NULL, false),
('Brianna', 'Etienne', 'CVM 7070 Dentistry Rotation', '2025-12-02', '2025-12-04', 'extern', 'done', 'Christina', 'Jenn', 'DOC', 'The Valley', true, NULL, false),
('Jane', 'Gonzales', 'CVM 7070 Dentistry Rotation', '2025-12-02', '2025-12-04', 'extern', 'done', 'Christina', 'Jenn', 'DOC', 'The Valley', true, NULL, false),
('Patricia', 'Gonzalez Cruz', 'CVM 7070 Dentistry Rotation', '2025-12-02', '2025-12-04', 'extern', 'done', 'Christina', 'Jenn', 'DOC', 'The Valley', true, NULL, false),
('Bharath', 'Guduri', 'CVM 7070 Dentistry Rotation', '2025-12-02', '2025-12-04', 'extern', 'done', 'Christina', 'Jenn', 'DOC', 'The Valley', true, NULL, false),
('Alyssa', 'Janini', 'CVM 7070 Dentistry Rotation', '2025-12-02', '2025-12-04', 'extern', 'no_show', 'Christina', 'Jenn', 'DOC', 'The Valley', true, NULL, false),
('Melania', 'Khanian', 'CVM 7070 Dentistry Rotation', '2025-12-02', '2025-12-04', 'extern', 'done', 'Christina', 'Jenn', 'DOC', 'The Valley', true, NULL, false),
('Kevin', 'Lin', 'CVM 7070 Dentistry Rotation', '2025-12-02', '2025-12-04', 'extern', 'done', 'Christina', 'Jenn', 'DOC', 'The Valley', true, NULL, false),
('Michael', 'Rafla', 'CVM 7070 Dentistry Rotation', '2025-12-02', '2025-12-04', 'extern', 'done', 'Christina', 'Jenn', 'DOC', 'The Valley', true, NULL, false),
('Sydney', 'Ross', 'CVM 7070 Dentistry Rotation', '2025-12-02', '2025-12-04', 'extern', 'done', 'Christina', 'Jenn', 'DOC', 'The Valley', true, NULL, false),
('Melissa', 'Vasquez', 'CVM 7070 Dentistry Rotation', '2025-12-02', '2025-12-04', 'extern', 'done', 'Christina', 'Jenn', 'DOC', 'The Valley', true, NULL, false),
('Christina', 'Bautist', 'CVM 7070 Dentistry Rotation', '2025-12-02', '2025-12-04', 'extern', 'done', 'Christina', 'Jenn', 'DOC', 'The Valley', true, NULL, false),

-- Western Externs - December 2025
('Logan', 'Dietrich', 'Western Extern iii', '2025-12-03', '2025-12-12', 'extern', 'current', 'Christina', 'Robertson', 'Robertson', 'The Valley', true, 'Western University', true),
('Phuong Nhi', 'Do', 'Western Extern iii', '2025-12-03', '2025-12-12', 'extern', 'no_show', 'Christina', 'Robertson', 'Robertson', 'The Valley', true, 'Western University', false),
('Taylor', 'Smallwood', 'Western Extern iiii', '2025-12-08', '2025-12-19', 'extern', 'current', 'Christina', 'TBD', 'TBD', NULL, true, 'Western University', true),
('Britney', 'Pham', 'Western Student', '2025-11-17', '2025-12-12', 'extern', 'current', 'Christina', 'Jenn', 'Rally', 'The Valley', true, 'Western University', true),

-- Shadow Interviews - November 2025
('Leticia', 'Ceja', 'Shadow Interview', '2025-11-14', '2025-11-14', 'shadow', 'done', 'Catherine', 'Esme', 'Esme', 'Venice', true, NULL, false),
('Natalie', 'Ulloa', 'Shadow Interview', '2025-11-08', '2025-11-08', 'shadow', 'done', 'Brandon', 'Catherine', 'Catherine', 'The Valley', true, NULL, false),
('Jessica', 'Raymundo', 'Shadow Interview', '2025-11-07', '2025-11-07', 'shadow', 'done', 'Brandon', 'Dejia', 'Dejia', 'The Valley', true, NULL, false),
('Jessica', 'Basulto', 'Shadow Interview', '2025-11-12', '2025-11-12', 'shadow', 'done', 'Brandon', 'Catherine', 'Catherine', 'The Valley', true, NULL, false),
('Angelly', 'Lopez', 'Shadow Interview', '2025-11-06', '2025-11-06', 'shadow', 'done', 'Brandon', 'Catherine', 'Catherine', 'The Valley', true, NULL, false);

-- =====================================================
-- 4. SEED VISITOR DATA FROM PAST VISITORS PDF
-- =====================================================

INSERT INTO education_visitors (
  first_name, last_name, program_name, visit_start_date, visit_end_date,
  visitor_type, visit_status, coordinator, first_greeter, mentor, location,
  recruitment_announced, school_of_origin, is_active
) VALUES
-- Past Visitors from 2024-2025
('Alejandro', 'Lamadrid Hernandez', 'Vet Assistant', '2024-04-20', '2024-10-05', 'other', 'done', 'Angie', NULL, NULL, NULL, false, 'Not Applicable', false),
('Ella', 'Scott', 'Externship', '2024-07-15', '2024-07-26', 'extern', 'done', 'Dannia', NULL, NULL, 'Venice', false, 'Massey University', false),
('Yoora', 'Kim', 'Externship', '2024-07-22', '2024-08-18', 'extern', 'done', 'Dannia', 'Deija', 'Deija', 'Venice', false, 'Western University', false),
('Michelle', 'Tercero', 'Interviewee/Shadow', '2024-07-26', '2024-07-26', 'shadow', 'done', 'Dannia', 'Deija', 'Nick', 'Venice', false, 'Not Applicable', false),
('Sherry', 'Vartanian', 'Externship', '2024-08-12', '2024-08-16', 'extern', 'done', 'Dannia', 'Dr. Lau', 'Doc', 'Venice', false, 'Massey University', false),
('Ronny', 'Moscoso', 'Interviewee/Shadow', '2024-09-04', '2024-09-04', 'shadow', 'done', 'Dannia', 'Deija', NULL, 'Venice', false, 'Not Applicable', false),
('Celestine', 'Hoh', 'Internship', '2024-07-29', '2024-09-15', 'intern', 'current', 'Dannia', 'Deija', 'Doc', 'Venice', false, 'Not Applicable', true),
('Oscar', 'Tirado', 'Interviewee/Shadow', '2024-09-12', '2024-09-12', 'shadow', 'done', 'Dannia', 'Doc', NULL, 'Venice', false, 'Not Applicable', false),
('Carlos Alexie', 'Marquez', 'Pre-Intern', '2024-07-17', NULL, 'intern', 'current', 'Gladys', 'Carmen Chan', NULL, 'Venice', false, 'Not Applicable', true),
('Cosimo', 'Culotti', 'Volunteer', '2024-06-07', '2024-09-06', 'other', 'done', 'Angie', 'Marc', NULL, 'Venice', false, 'Not Applicable', false),
('Marianna', 'Grillo', 'Internship', '2024-09-03', NULL, 'intern', 'done', 'Angie', 'Deija', NULL, 'Venice', false, 'Not Applicable', false),
('Laura', 'Lucia', 'Vet Assistant', '2024-07-10', NULL, 'other', 'current', 'Angie', 'Diana M.', NULL, 'Venice', false, 'Not Applicable', true),
('Wenchuan', 'Zhao', 'Volunteer', '2024-08-19', '2025-01-03', 'other', 'done', 'Cynthia', 'Deija', 'DA(Alysia) and Clinic', 'Venice', false, 'Other', false),
('Lizbeth', 'Gallegos', 'Pre-Intern', '2024-08-26', NULL, 'intern', 'current', 'Dannia', 'Deija', NULL, 'Venice', false, 'Not Applicable', true),
('Venus', 'Pun', 'Externship', '2024-10-07', '2024-10-20', 'extern', 'done', 'Dannia', 'Deija', NULL, 'Venice', false, 'Western University', false),
('Pamina', 'Chong', 'Externship', '2024-10-21', '2024-11-17', 'extern', 'done', 'Dannia', 'Deija', NULL, 'Venice', false, 'Western University', false),
('Celestine', 'Hoh', 'New Graduate DVM', '2024-12-11', NULL, 'other', 'current', 'Cynthia', NULL, NULL, 'Venice', false, 'Not Applicable', true),
('Sherry', 'Vartanian', 'New Graduate DVM', '2025-03-03', NULL, 'other', 'current', 'Cynthia', NULL, NULL, 'Venice', false, 'Massey University', true),
('Alexander', 'Fu', 'Externship 4wk Dentistry', '2025-03-03', '2025-03-30', 'extern', 'done', 'Dannia', NULL, NULL, 'Venice', false, 'Western University', false),
('Shelby', 'Suzuki', 'Externship 4wk Dentistry', '2025-03-31', '2025-04-27', 'extern', 'done', 'Dannia', NULL, NULL, 'Venice', false, 'Western University', false),
('Alana C.', 'Jennings', 'Interviewee/Shadow', '2025-06-19', '2025-06-19', 'shadow', 'done', 'Gladys', 'Bianca', NULL, NULL, false, 'Not Applicable', false),
('Miranda', 'Rivera', 'Western Extern 4wk Dentistry', '2025-06-09', '2025-07-06', 'extern', 'done', 'Gladys', 'Deija', 'Deija', 'The Valley', false, 'Western University', false),
('Jesse', '', 'Interviewee/Shadow', '2025-06-12', '2025-06-12', 'shadow', 'done', 'Gladys', 'Bianca', 'Deija & Carmen', 'The Valley', false, 'Not Applicable', false),
('Karen', 'Bowman', 'Interviewee/Shadow', '2025-07-30', '2025-07-30', 'shadow', 'done', 'Jenn', 'Brandon', 'Brandon', 'Venice', false, 'Not Applicable', false),
('Tania', 'Martinez', 'Interviewee/Shadow', '2025-07-31', '2025-07-31', 'shadow', 'done', 'Jenn', 'Catherine', 'Catherine', 'Sherman Oaks', false, 'Not Applicable', false),
('Aris', 'Archilla', 'Interviewee/Shadow', '2025-07-15', '2025-07-15', 'shadow', 'done', 'Jenn', 'Brandon', 'Brandon', 'Venice', false, 'Not Applicable', false),
('Jeff', 'Pepper', 'Interviewee/Shadow', '2025-07-24', '2025-07-24', 'shadow', 'done', 'Jenn', 'Brandon', 'Brandon', 'Venice', false, 'Not Applicable', false),
('Amalia', 'Garcia', 'Interviewee/Shadow', '2025-08-02', '2025-08-02', 'shadow', 'done', 'Jenn', 'Brandon', 'Brandon', 'Aetna', false, 'Not Applicable', false),
('Sonora', 'Chavez', 'Interviewee/Shadow', '2025-08-01', '2025-08-01', 'shadow', 'done', 'Jenn', 'Brandon', 'Brandon', 'Aetna', false, 'Not Applicable', false),
('Beatriz', 'Argueta', 'Interviewee/Shadow', '2025-07-31', '2025-07-31', 'shadow', 'done', 'Jenn', 'Catherine', 'Catherine', 'Sherman Oaks', false, 'Not Applicable', false),
('Ethan', 'Young', 'Interviewee/Shadow', '2025-07-29', '2025-07-29', 'shadow', 'done', 'Jenn', 'Brandon', 'Brandon', 'Venice', false, 'Not Applicable', false),
('Sarah Grace', 'Garcia', 'Interviewee/Shadow', '2025-08-05', '2025-08-05', 'shadow', 'done', 'Jenn', 'Brandon', 'Jenn', 'Venice', false, 'Not Applicable', false),
('Vivian', 'Robles', 'Interviewee/Shadow', '2025-08-05', '2025-08-05', 'shadow', 'done', 'Jenn', 'Brandon', 'Jenn', 'Venice', false, 'Not Applicable', false),
('Trinity', 'Green', 'Interviewee/Shadow', '2025-08-06', '2025-08-06', 'shadow', 'done', 'Jenn', 'Brandon', 'Brandon', 'Venice', false, 'Not Applicable', false),
('Emily', 'Rue', 'Externship', '2025-07-22', '2025-07-25', 'extern', 'done', NULL, NULL, NULL, NULL, false, 'Other', false),
('Ella', 'Scott', 'New Graduate DVM', '2025-06-01', NULL, 'other', 'current', 'Cynthia', NULL, NULL, NULL, false, 'Not Applicable', true);

-- =====================================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN education_visitors.coordinator IS 'Staff member coordinating the visitor visit';
COMMENT ON COLUMN education_visitors.first_greeter IS 'Staff member who greets visitor on arrival';
COMMENT ON COLUMN education_visitors.mentor IS 'Assigned mentor during the visit (DVM or staff)';
COMMENT ON COLUMN education_visitors.location IS 'Clinic location (Venice, The Valley, Sherman Oaks, Aetna)';
COMMENT ON COLUMN education_visitors.visit_status IS 'Status: upcoming, current, done, no_show';
COMMENT ON COLUMN education_visitors.recruitment_announced IS 'Whether recruitment/arrival was announced';
COMMENT ON COLUMN education_visitors.recruitment_channel IS 'Channel used for recruitment';
COMMENT ON COLUMN education_visitors.file_link IS 'Link to visitor file/document';

-- =====================================================
-- End of Migration
-- =====================================================
