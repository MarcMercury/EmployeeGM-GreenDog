-- =====================================================
-- CE TRACKER PDF MIGRATION
-- Generated: 2025-12-19T21:24:54.955Z
-- Source: CE Tracker - Registration Responses.pdf
-- Total Records: 58
-- =====================================================


-- Mezti Alberto
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Mezti', 'Alberto', 'mezti_alberto@hotmail.com', '(323) 572-2768', 'Green dog Dental and wellness', 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', 'States: CA', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'mezti_alberto@hotmail.com');

-- Manuel Boado
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Manuel', 'Boado', 'dadmann76@gmail.com', '(562) 773-6567', 'Veterinary Association (Please enter which association in "other")', 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', 'Role: RVT | License: RVT-3525', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'dadmann76@gmail.com');

-- Rolando Villanueva
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Rolando', 'Villanueva', 'rvilla221@sbcglobal.net', '(818) 458-5032', 'Los Angeles Animal Services', 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', 'Role: DVM | License: RVT3780', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'rvilla221@sbcglobal.net');

-- Gladys Castro Duenas
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Gladys', 'Castro Duenas', 'castrogladys20@gmail.com', '(323) 495-7998', 'Email from Green Dog Dental', 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', 'Role: RVT | States: CA | License: RVT17250', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'castrogladys20@gmail.com');

-- Elmer Arambulo
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Elmer', 'Arambulo', 'jearambulo@yahoo.com', '(562) 505-7766', 'Bloomfield Animal Hospital', 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', 'Role: DVM | States: CA', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'jearambulo@yahoo.com');

-- Winston Ramos
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Winston', 'Ramos', 'wramos6804@gmail.com', '(626) 436-4922', 'Animal clinic of La Mirada', 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', 'Role: DVM | States: CA | License: DVM-9136', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'wramos6804@gmail.com');

-- Nelwina Arambulo
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Nelwina', 'Arambulo', 'wingarambulo@gmail.com', '(562) 822-1605', 'Bloomfield Animal Hospital', 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', 'Role: DVM', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'wingarambulo@gmail.com');

-- Rodolfo Lizardo
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Rodolfo', 'Lizardo', 'roliza2@aol.com', '(410) 207-3398', 'Veterinary Association (Please enter which association in "other"), SCFVMA', 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', 'Role: DVM | License: DVM-1538', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'roliza2@aol.com');

-- Candice Habawel
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Candice', 'Habawel', 'candicehdvm@gmail.com', '(951) 265-9015', NULL, 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', 'Role: DVM', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'candicehdvm@gmail.com');

-- Lizbeth Gallegos
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Lizbeth', 'Gallegos', 'greendoglizbeth@gmail.com', '(424) 410-1503', 'Email from Green Dog Dental', 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', '', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'greendoglizbeth@gmail.com');

-- Mezti Alberto
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Mezti', 'Alberto', 'greendogmezti@gmail.com', NULL, 'Email from Green Dog Dental', 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', 'Role: DVM', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'greendogmezti@gmail.com');

-- Nick Bermudez
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Nick', 'Bermudez', 'greendognickb@gmail.com', '(818) 403-1941', 'Email from Green Dog Dental', 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', '', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'greendognickb@gmail.com');

-- Jessica Salazar
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Jessica', 'Salazar', 'greendogrvtjess@gmail.com', '(818) 321-1581', 'No Mayo pleaseGreen Dog', 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', 'Role: DVM', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'greendogrvtjess@gmail.com');

-- Celestine Hoh Jia Min
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Celestine', 'Hoh Jia Min', 'greendogcelestine@gmail.com', '(310) 460-9439', 'GreenDog Dental and Veterinary Center', 'Green Dog CE - Dental, Yes, lestine Hoh Jia Min 	greendogcelestine@gmail.com 	paid by Green Dog CE 	YES', 'CE Tracker PDF Import - Unknown', 'Role: DVM | States: CA | Payment: Paid', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'greendogcelestine@gmail.com');

-- Maria Salazar
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Maria', 'Salazar', 'riabasketball@yahoo.com', '(562) 826-1533', 'Green dog dental', 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', '', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'riabasketball@yahoo.com');

-- Ken Padilla
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Ken', 'Padilla', 'greendogkpadilla@gmail.com', '(818) 813-1999', 'Veterinary Association (Please enter which association in "other"), green dog', 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', '', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'greendogkpadilla@gmail.com');

-- Helene DEWYNTER
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Helene', 'DEWYNTER', 'h-letessier@hotmail.com', '(818) 451-5622', NULL, 'Green Dog CE - Dental, Yes, lestine Hoh Jia Min 	greendogcelestine@gmail.com 	paid by Green Dog CE 	YES', 'CE Tracker PDF Import - Unknown', 'Role: DVM | States: CA |  Gifted ticket. | Payment: Paid', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'h-letessier@hotmail.com');

-- Heather Rally Webb
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Heather', 'Rally Webb', 'heatherrally@gmail.com', '(310) 309-9041', 'Email from Green Dog Dental', 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', 'Role: DVM | States: CA | Allergies: Email from Green Dog Dental', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'heatherrally@gmail.com');

-- Jasmin Bardales
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Jasmin', 'Bardales', 'jabardales4@gmail.com', '(818) 631-0086', 'Crater Animal Clinic', 'Green Dog CE - Dental, Yes', 'CE Tracker PDF Import - Unknown', 'States: OR | Payment: Paid', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'jabardales4@gmail.com');

-- Helene Dewynter
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Helene', 'Dewynter', 'porachoi@gmail.com', '(702) 883-1453', 'Angel City Animal HospitalNo', 'Green Dog CE - Dental, Yes', 'CE Tracker PDF Import - Unknown', 'Payment: Paid', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'porachoi@gmail.com');

-- Yoonhyung Lee
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Yoonhyung', 'Lee', 'yoonleevet@gmail.com', '(714) 519-8222', 'Park community animal hospital', 'Green Dog CE - Dental, Yes', 'CE Tracker PDF Import - Unknown', 'States: CA | Payment: Paid', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'yoonleevet@gmail.com');

-- Anthony Vartorella
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Anthony', 'Vartorella', 'amv711uf@gmail.com', '(440) 822-2127', 'VET.203533', 'Green Dog CE - Dental, Yes', 'CE Tracker PDF Import - Unknown', ' Gifted ticket. | Payment: Refunded/Gifted', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'amv711uf@gmail.com');

-- Claudia Lau
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Claudia', 'Lau', 'greendogdrclau@gmail.com', '(424) 410-5139', 'Green Dog Dental and WellnessYes', 'Green Dog CE - Dental, Yes', 'CE Tracker PDF Import - Unknown', 'Role: DVM | States: CA | Payment: Paid', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'greendogdrclau@gmail.com');

-- Leigh Gallegos Leigh Gallegos
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Leigh', 'Gallegos Leigh Gallegos', 'drgallegos@msn.com', '(661) 965-5182', 'Lancaster Pet Clinic', 'Green Dog CE - Dental, Yes', 'CE Tracker PDF Import - Unknown', 'Role: DVM | States: CA |  Gifted ticket. | Payment: Refunded/Gifted', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'drgallegos@msn.com');

-- Inez Del Pino
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Inez', 'Del Pino', 'idelpino@dvm.com', '(530) 304-5329', 'Banfield Pet Hospital', 'Green Dog CE - Dental, Yes', 'CE Tracker PDF Import - Unknown', 'Role: DVM | Payment: Paid', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'idelpino@dvm.com');

-- John "Winston" Weigand
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'John', '"Winston" Weigand', 'winstonweigand@gmail.com', '(360) 790-8624', 'P.V. Village Pet Hospital', 'Green Dog CE - Dental, Yes', 'CE Tracker PDF Import - Unknown', 'States: CA | Payment: Paid', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'winstonweigand@gmail.com');

-- Karen Halligan
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Karen', 'Halligan', 'dochalligan@dochalligan.com', '(310) 625-6046', 'Marina Veterinary Center Yes', 'Green Dog CE - Dental, Yes', 'CE Tracker PDF Import - Unknown', 'Payment: Paid', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'dochalligan@dochalligan.com');

-- Michael Chae
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Michael', 'Chae', 'vetchae@gmail.com', '(747) 252-6524', 'Animal Medical Center', 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', 'States: CA', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'vetchae@gmail.com');

-- Emma Kaiser
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Emma', 'Kaiser', 'cyclinemma@mac.com', '(808) 343-0706', NULL, 'Green Dog CE - Dental, Yes', 'CE Tracker PDF Import - Unknown', 'States: CA, HI | Dietary: , but no other meat) 	Website/Online Search | Payment: Paid', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'cyclinemma@mac.com');

-- Darlene Geekie
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Darlene', 'Geekie', 'dgeekiervt@gmail.com', '(818) 337-8565', NULL, 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', 'Role: RVT | License: RVT5966 | Allergies: Email from Green Dog Dental', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'dgeekiervt@gmail.com');
-- Skipped: No name - Email: drxxx@gmail.com

-- Samuel Park
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Samuel', 'Park', 'samparkdvm@gmail.com', NULL, NULL, 'Yes', 'CE Tracker PDF Import - Unknown', 'Role: DVM | Payment: Paid', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'samparkdvm@gmail.com');

-- Darlene Geekie
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Darlene', 'Geekie', 'dgeekie@westernvetpartners.com', NULL, NULL, 'Yes', 'CE Tracker PDF Import - Unknown', 'Role: RVT | Payment: Paid', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'dgeekie@westernvetpartners.com');

-- Heather Rally
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Heather', 'Rally', 'greendogrally@gmail.com', NULL, NULL, 'Yes', 'CE Tracker PDF Import - Unknown', 'Role: DVM | Payment: Paid', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'greendogrally@gmail.com');

-- Joe Fong
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Joe', 'Fong', 'joefong@comcast.net', '(208) 263-5846', NULL, 'Yes', 'CE Tracker PDF Import - Unknown', 'Payment: Refunded/Gifted | Attendance: cancelled', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'joefong@comcast.net');

-- Armaiti May
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Armaiti', 'May', 'veganvet@gmail.com', '(310) 614-3530', NULL, 'Yes', 'CE Tracker PDF Import - Unknown', 'States: ID |  Gifted ticket. | Payment: Refunded/Gifted', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'veganvet@gmail.com');

-- The hands-on labs It was difficult to see any of the demonstrations. (no email)
INSERT INTO education_visitors (first_name, last_name, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'The', 'hands-on labs It was difficult to see any of the demonstrations.', NULL, NULL, 'Green Dog CE - Dental', 'CE Tracker PDF Import - procedures also felt out of', 'Role: DVM |  Gifted ticket. | Payment: Refunded/Gifted', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE first_name = 'The' AND last_name = 'hands-on labs It was difficult to see any of the demonstrations.' AND (phone = '' OR phone IS NULL));

-- Darvi Michell B. Sergio (no email)
INSERT INTO education_visitors (first_name, last_name, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Darvi', 'Michell B. Sergio', '(205) 440-0990', NULL, 'Green Dog CE - Dental', 'CE Tracker PDF Import - (Please enter by who in "other"), Dr. Ren Garcia', 'Role: DVM | States: CA', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE first_name = 'Darvi' AND last_name = 'Michell B. Sergio' AND (phone = '(205) 440-0990' OR phone IS NULL));

-- Helene Dewynter (no email)
INSERT INTO education_visitors (first_name, last_name, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Helene', 'Dewynter', '(818) 451-5622', NULL, 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', 'States: CA', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE first_name = 'Helene' AND last_name = 'Dewynter' AND (phone = '(818) 451-5622' OR phone IS NULL));

-- Mark Nichols (no email)
INSERT INTO education_visitors (first_name, last_name, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Mark', 'Nichols', '(919) 602-1153', 'Physical Advertisement (Please enter where in "other"), Western Vet
Conference', 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', '', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE first_name = 'Mark' AND last_name = 'Nichols' AND (phone = '(919) 602-1153' OR phone IS NULL));

-- Raymond de Villa (no email)
INSERT INTO education_visitors (first_name, last_name, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Raymond', 'de Villa', '(310) 986-5279', 'Downey Veterinary Hospital', 'Green Dog CE - Dental', 'CE Tracker PDF Import - (Please enter by who in "other"), Dr Habawel', 'Role: DVM | States: CA', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE first_name = 'Raymond' AND last_name = 'de Villa' AND (phone = '(310) 986-5279' OR phone IS NULL));

-- Robert Rizon (no email)
INSERT INTO education_visitors (first_name, last_name, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Robert', 'Rizon', '(951) 858-1110', 'Pets Ver', 'Green Dog CE - Dental', 'CE Tracker PDF Import - (Please enter by who in "other"), Dr Candace Habawel', 'Role: DVM', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE first_name = 'Robert' AND last_name = 'Rizon' AND (phone = '(951) 858-1110' OR phone IS NULL));

-- Celestine Hoh Jia Min (no email)
INSERT INTO education_visitors (first_name, last_name, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Celestine', 'Hoh Jia Min', '(310) 460-9439', 'GreenDog Dental Veterinary CenterYes', 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', '', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE first_name = 'Celestine' AND last_name = 'Hoh Jia Min' AND (phone = '(310) 460-9439' OR phone IS NULL));

-- Rachel Leeson (no email)
INSERT INTO education_visitors (first_name, last_name, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Rachel', 'Leeson', '(520) 265-0216', 'Banfield Pet Hospital', 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', '', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE first_name = 'Rachel' AND last_name = 'Leeson' AND (phone = '(520) 265-0216' OR phone IS NULL));

-- Sherry Vartanian (no email)
INSERT INTO education_visitors (first_name, last_name, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Sherry', 'Vartanian', '(442) 452-1868', 'Green Dog Dental', 'Green Dog CE - Dental', 'CE Tracker PDF Import - (Please enter by who in "other"), Dr. Hab', 'Role: DVM', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE first_name = 'Sherry' AND last_name = 'Vartanian' AND (phone = '(442) 452-1868' OR phone IS NULL));

-- Dianne Fahey (no email)
INSERT INTO education_visitors (first_name, last_name, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Dianne', 'Fahey', '(207) 233-3854', 'Baycrest Veterinary Hospital', 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', '', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE first_name = 'Dianne' AND last_name = 'Fahey' AND (phone = '(207) 233-3854' OR phone IS NULL));

-- Marc Leo G. Bautista (no email)
INSERT INTO education_visitors (first_name, last_name, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Marc', 'Leo G. Bautista', '(562) 923-0763', 'Downey Veterinary Hospital', 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', '', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE first_name = 'Marc' AND last_name = 'Leo G. Bautista' AND (phone = '(562) 923-0763' OR phone IS NULL));

-- Adrienne Verayo (no email)
INSERT INTO education_visitors (first_name, last_name, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Adrienne', 'Verayo', '(818) 974-7963', 'Five star veterinary clinic', 'Green Dog CE - Dental', 'CE Tracker PDF Import - Unknown', '', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE first_name = 'Adrienne' AND last_name = 'Verayo' AND (phone = '(818) 974-7963' OR phone IS NULL));

-- Adrienne Verayo
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Adrienne', 'Verayo', 'draverayo@gmail.com', '12107452893', NULL, 'Green Dog CE Event', 'CE Tracker PDF Import - Unknown', 'Role: DVM |  Gifted ticket. | Payment: Refunded/Gifted', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'draverayo@gmail.com');

-- Marc Leo Bautista
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Marc', 'Leo Bautista', 'drmarcleobautista@gmail.com', '12035137993', NULL, 'Green Dog CE Event', 'CE Tracker PDF Import - Unknown', 'Role: DVM |  Gifted ticket. | Payment: Refunded/Gifted', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'drmarcleobautista@gmail.com');

-- Rachel Leeson
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Rachel', 'Leeson', 'raclauswalker@gmail.com', '12005339183', NULL, 'Green Dog CE Event', 'CE Tracker PDF Import - Unknown', 'Role: DVM |  Gifted ticket. | Payment: Refunded/Gifted', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'raclauswalker@gmail.com');

-- Dianne Fahey
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Dianne', 'Fahey', 'dlynnef98@gmail.com', '11997069723', NULL, 'Green Dog CE Event', 'CE Tracker PDF Import - Unknown', 'Role: DVM |  Gifted ticket. | Payment: Refunded/Gifted', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'dlynnef98@gmail.com');

-- Robert Rizon
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Robert', 'Rizon', 'rrizon@hotmail.com', '11970378523', NULL, 'Green Dog CE Event', 'CE Tracker PDF Import - Unknown', 'Role: DVM |  Gifted ticket. | Payment: Refunded/Gifted', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'rrizon@hotmail.com');
-- Skipped: No name - Email: darvi.sergio@labcorp.com
-- Skipped: No name - Email: crystal.lala@labcorp.com
-- Skipped: No name - Email: russell.nichols@labcorp.com

-- Raymond De Villa
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Raymond', 'De Villa', 'rmcnv@yahoo.com', '11804622863', NULL, 'lestine Hoh Jia Min 	greendogcelestine@gmail.com 	paid by Green Dog CE 	YES', 'CE Tracker PDF Import - Unknown', ' Gifted ticket. | Payment: Refunded/Gifted', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'rmcnv@yahoo.com');

-- Sherry Vartanian
INSERT INTO education_visitors (first_name, last_name, email, phone, organization_name, program_name, lead_source, notes, visitor_type, is_active)
SELECT 'Sherry', 'Vartanian', 'greendogsherry@gmail.com', NULL, NULL, 'lestine Hoh Jia Min 	greendogcelestine@gmail.com 	paid by Green Dog CE 	YES', 'CE Tracker PDF Import - Unknown', 'Role: DVM | Payment: Paid', 'ce_attendee', true
WHERE NOT EXISTS (SELECT 1 FROM education_visitors WHERE email = 'greendogsherry@gmail.com');