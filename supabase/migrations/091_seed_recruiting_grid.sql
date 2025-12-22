-- =====================================================
-- Migration: Seed Real Recruiting Data from 2025 GD Grid
-- Generated: 2025-12-21T09:00:12.301Z
-- Total Candidates: 122
-- =====================================================

-- First, ensure JANITOR and MKT job positions exist
INSERT INTO public.job_positions (title, code, is_manager) 
SELECT 'Janitor/Facilities', 'JANITOR', false
WHERE NOT EXISTS (SELECT 1 FROM public.job_positions WHERE code = 'JANITOR');

INSERT INTO public.job_positions (title, code, is_manager) 
SELECT 'Marketing Coordinator', 'MKT', false
WHERE NOT EXISTS (SELECT 1 FROM public.job_positions WHERE code = 'MKT');

-- Clear existing mock/seed data ONLY (preserving any real data)
DELETE FROM public.onboarding_checklist WHERE candidate_id IN (
  SELECT id FROM public.candidates 
  WHERE email LIKE '%@email.com' OR email LIKE 'candidate%@greendog.vet'
);
DELETE FROM public.candidate_notes WHERE candidate_id IN (
  SELECT id FROM public.candidates 
  WHERE email LIKE '%@email.com' OR email LIKE 'candidate%@greendog.vet'
);
DELETE FROM public.candidate_documents WHERE candidate_id IN (
  SELECT id FROM public.candidates 
  WHERE email LIKE '%@email.com' OR email LIKE 'candidate%@greendog.vet'
);
DELETE FROM public.candidate_skills WHERE candidate_id IN (
  SELECT id FROM public.candidates 
  WHERE email LIKE '%@email.com' OR email LIKE 'candidate%@greendog.vet'
);
DELETE FROM public.candidates 
WHERE email LIKE '%@email.com' OR email LIKE 'candidate%@greendog.vet';

-- Insert real candidates from 2025 GD Recruiting Grid
-- Using INSERT ... SELECT WHERE NOT EXISTS to avoid conflicts

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Jessica',
  'Norris',
  'jesswnorris430@gmail.com',
  '(805) 587-5859',
  'rejected',
  'Indeed',
  '12/17/25-JV Feedback from Gladys No hireand DOC per kleametz',
  (SELECT id FROM public.job_positions WHERE code = 'EXOT_TECH' LIMIT 1),
  NOW() - INTERVAL '57 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'jesswnorris430@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Sonora',
  'Chavez',
  'issonorachavez11@gmail.com',
  '(818) 454-8342',
  'new',
  'Indeed',
  '8/26/25-JV Sonora signed herHire offer letter and issonorachavez11',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '7 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'issonorachavez11@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Jessica',
  'Salazar',
  'jessicasal12@yahoo.com',
  NULL,
  'interview',
  'Indeed',
  '8/26/25-JV candidate came in Hire for shadow interview Jessicasal12',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '12 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'jessicasal12@yahoo.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Rei',
  'Pineda',
  'reipineda00@yahoo.com',
  '(818) 668-4206',
  'interview',
  'Indeed',
  '11/6/25-JV Dejia reached outReached to candidate out - to Pending',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '15 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'reipineda00@yahoo.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Racine',
  'Hopkins',
  'racinehopkins@gmail.com',
  NULL,
  'rejected',
  'Indeed',
  '8/19/25_GF Schedule her for Declined a shadowOffer day 7/29/25_JV racinehopkins',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '50 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'racinehopkins@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Kristen',
  'Gray',
  'cassiopeiea@gmail.com',
  NULL,
  'rejected',
  'Indeed',
  '9/30/25_JV Shadown rescheduled Declined perOffer Dejia 9/16/25_JV ca',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '50 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'cassiopeiea@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Ricky',
  'Prieto',
  'hiringrickyprieto92@gmail.com',
  NULL,
  'new',
  'Indeed',
  '10/15/25_JV Hold and keep for Nofuture, Response no hiringrickyprieto92',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '5 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'hiringrickyprieto92@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'David',
  'Rice',
  'drice4urlife@gmail.com',
  '(323) 994-3855',
  'rejected',
  'Indeed',
  '9/17/25_JV candidate never responsed No Response 8/26/25_JV drice4urlife',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '65 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'drice4urlife@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Yara',
  'Galsim',
  'yara.galsim@candidate.greendog.vet',
  NULL,
  'rejected',
  'Indeed',
  '9/5/25_JV pass no response No 8/29/25_JV ResponseBradon NEED',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '67 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'yara.galsim@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Claire',
  'Wilson',
  'clairew0708@gmail.com',
  '(559) 759-5992',
  'rejected',
  'Indeed',
  '9/5/25_JV pass no response No 8/29/25_JV ResponseBradon Clairew0708',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '53 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'clairew0708@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Roberto',
  'Hernandez',
  'roberto.hernandez@candidate.greendog.vet',
  NULL,
  'rejected',
  'Indeed',
  '8/26/25_JV No Response I posted on slack pending.... - Bradon',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '49 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'roberto.hernandez@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Belen',
  'Gonzalez',
  'belen.gonzalez@candidate.greendog.vet',
  NULL,
  'rejected',
  'Indeed',
  '8/26/25_JV No Response No more updates pending...... on candidate',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '32 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'belen.gonzalez@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'George',
  'Markis',
  'gmak1994@gmail.com',
  '(805) 803-4887',
  'rejected',
  'Indeed',
  '8/26/25_JV Pass no reponseNo 8/16/25-JV Responsecandidate gmak1994',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '17 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'gmak1994@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Jason',
  'Varley',
  'postedjasonvarley2001@yahoo.com',
  '(310) 529-3947',
  'new',
  'Indeed',
  '8/5/25_JV Candidate appliedNo viaResponse Indeed, postedjasonvarley2001',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '2 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'postedjasonvarley2001@yahoo.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Cristal',
  'Villa',
  'trista.villa48@gmail.com',
  NULL,
  'rejected',
  'Indeed',
  '8/26/25_JV candidate had a phoner No Response with Brandon trista.villa48',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '27 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'trista.villa48@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Susana',
  'Salazar',
  'susanasalazar1004@yahoo.com',
  NULL,
  'rejected',
  'Indeed',
  '8/26/25_JV no response fromNo candidate Response- passing susanasalazar1004',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '33 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'susanasalazar1004@yahoo.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Bruce',
  'Johnson',
  'bjkj0430@gmail.com',
  '(323) 627-3161',
  'rejected',
  'Indeed',
  '8/7/25_JV old lead - per GF follow No Response up - reached bjkj0430',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '36 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'bjkj0430@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Dennis',
  'Villalobos',
  'dennisvillalobos1111@gmail.com',
  '(323) 898-7886',
  'new',
  'Indeed',
  '8/7/25_JV Followed up via text Nomesssage Responsepending dennisvillalobos1111',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '5 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'dennisvillalobos1111@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Angela',
  'Woods',
  'angela.woods3005@gmail.com',
  '(213) 610-4230',
  'new',
  'Indeed',
  '8/7/25-JV Followed up via text Nopending Response response',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '4 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'angela.woods3005@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Brandy',
  'Orellana',
  'brandy.orellana@candidate.greendog.vet',
  '(818) 271-8163',
  'rejected',
  'Indeed',
  '8/7/25_JV Followed up with candidate via text, pending old lead read notes and FU!!! 6/17/24_GF',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '50 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'brandy.orellana@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Tatyanna',
  'Sneed',
  'tatyanasneed@yahoo.com',
  '(803) 386-4615',
  'new',
  'Indeed',
  '8/1/25_GF_ NEW! old lead read Response and FU!!! 07/22/24_DA tatyanasneed',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '3 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'tatyanasneed@yahoo.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Olivia',
  'Leverenz',
  'olivialeverenz@gmail.com',
  '(818) 259-2223',
  'new',
  'Indeed',
  '8/1/25_JV candidate applied No via Response Indeed, has 2+olivialeverenz',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '6 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'olivialeverenz@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Mary',
  'Vincent',
  'mary.vincent@candidate.greendog.vet',
  NULL,
  'new',
  'Indeed',
  '8/1/25_JV candidate applied No via Response Indeed for NAD Email',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '1 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'mary.vincent@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Angel',
  'Serrano',
  'weangel.serr98@gmail.com',
  '(714) 270-0844',
  'rejected',
  'Indeed',
  '8/26/25_JV No response from Nocandidate Responseso weangel.serr98',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '25 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'weangel.serr98@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Indira',
  'Ortiz',
  'indira.ortiz@candidate.greendog.vet',
  NULL,
  'new',
  'Indeed',
  '7/29/25_JV Candidate F/U and Nowants Response to schedule indiraortiz',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '2 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'indira.ortiz@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Savannah',
  'Stafseth',
  'savannahstafseth@yahoo.com',
  '(661) 600-5331',
  'rejected',
  'GreenDog Website',
  '7/19/25-JV applied via GDD page, No Response texted candidate savannahstafseth',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '58 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'savannahstafseth@yahoo.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Ashley',
  'Gonzalez',
  'ashlayygon33@gmail.com',
  '(747) 296-4042',
  'new',
  'GreenDog Website',
  '7/19/25_JV texted candidateNo to see Response if they are still',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '1 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'ashlayygon33@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Marni',
  'Brown',
  'tonkababy9@yahoo.com',
  NULL,
  'interview',
  'GreenDog Website',
  '7/29/25_JV - Brandon reached Noout Response to schedule tonkababy9',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '9 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'tonkababy9@yahoo.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Claudia',
  'Andrade',
  'aura.mogollon@yahoo.com',
  '(323) 559-7204',
  'new',
  'Indeed',
  '7/25/25_JV Never respondedNew NotoResponse Christina me Lead to set- 5/10/25_GF',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '7 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'aura.mogollon@yahoo.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Cayla',
  'Myers',
  'mybusiness2088@yahoo.com',
  '(818) 400-6708',
  'rejected',
  'Indeed',
  '7/16/25_BO: Candidate non responsive No Response 6/27/25_BO: mybusiness2088',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '19 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'mybusiness2088@yahoo.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Brandy',
  'Orellano',
  'brandyorellana50@gmail.com',
  NULL,
  'rejected',
  'Indeed',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '27 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'brandyorellana50@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Michelle',
  'Sen',
  'msen2025@ucla.edu',
  '(858) 231-1003',
  'rejected',
  'Indeed',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '21 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'msen2025@ucla.edu');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Daniell',
  'Taylor',
  'daniell.taylor@candidate.greendog.vet',
  '(323) 272-5607',
  'new',
  'Indeed',
  '8/7/25_JV followed up via text, Nopending Response response',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '1 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'daniell.taylor@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Kaitlin',
  'Weller',
  'keweller84@hotmail.com',
  '(661) 383-3963',
  'rejected',
  'ZipRecruiter',
  '8/5/25_JV candidate never responded No Response to any communication KeWeller84',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '26 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'keweller84@hotmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Yaritza',
  'Lopez',
  'lopezyaritza1@gmail.com',
  NULL,
  'interview',
  'Personal Referral',
  '9/16/25_JV candidate opted No to not hirecontinue with lopezyaritza1',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '20 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'lopezyaritza1@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Jesse',
  'Chavez',
  'jessechavz228@gmail.com',
  '(818) 770-9562',
  'rejected',
  'Indeed',
  '7/29/25_JV Brandon scheduledFile a phoner interview for 7/30/25',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '15 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'jessechavz228@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Aris',
  'Achilla',
  'arismilla4747@gmail.com',
  '(323) 403-1131',
  'interview',
  'Indeed',
  '9/8/25_JV Candidate no longer Nointrested hire in position arismilla4747',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '9 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'arismilla4747@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Samantha',
  'Diaz',
  'wasdisa94@yahoo.com',
  NULL,
  'rejected',
  'GreenDog Website',
  '7/21/25_JV texted candidate toFile F/U, just verifying the location of this candidate her resume reflects',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '52 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'wasdisa94@yahoo.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Ronny',
  'Moscoso',
  'ronmosnurse@gmail.com',
  '(626) 824-2410',
  'new',
  'Personal Referral',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '5 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'ronmosnurse@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Alana',
  'Jennings',
  'jawznut@gmail.com',
  '(818) 632-2203',
  'new',
  'MASH Referral',
  '6/12/25_GF - Alana is an RVTNo from hireMASH worked jawznut',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '4 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'jawznut@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Ashley',
  'Rodriguez',
  'ashrod5387@yahoo.com',
  NULL,
  'rejected',
  'MASH Referral',
  '5/9/25_GF_ sent text to set up phoner (508) with',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '31 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'ashrod5387@yahoo.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Kelsey',
  'Flurry',
  'kelsey.hasick@gmail.com',
  '(310) 403-7010',
  'rejected',
  'Indeed',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '53 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'kelsey.hasick@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Karina',
  'Duenas',
  'karina.duenas@candidate.greendog.vet',
  '(424) 207-7919',
  'rejected',
  'Indeed',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '66 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'karina.duenas@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Brittney',
  'Sellers',
  'bsellers988@gmail.com',
  '(925) 381-1244',
  'rejected',
  'Indeed',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '48 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'bsellers988@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Trinity',
  'Green',
  'trinitygreen37@gmail.com',
  NULL,
  'interview',
  'Indeed',
  '7/31/25_JV Brandon scheudled No ahire shadow interview Trinitygreen37',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '19 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'trinitygreen37@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Parhan',
  'Sattari',
  'parhan.sattari@candidate.greendog.vet',
  '(747) 237-0750',
  'rejected',
  'Indeed',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '15 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'parhan.sattari@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Genesis',
  'Arriaga',
  'genesis.arriaga@candidate.greendog.vet',
  '(323) 866-9559',
  'rejected',
  'Indeed',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '23 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'genesis.arriaga@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Aolani',
  'Valladares',
  'aolani.valladares@candidate.greendog.vet',
  '(213) 393-4959',
  'rejected',
  'Indeed',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '66 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'aolani.valladares@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Kayla',
  'De Camp',
  'kayla.decamp@candidate.greendog.vet',
  NULL,
  'rejected',
  'Indeed',
  '7/31/25_JV candidate did a phoner No hirewith Brandon Email and never followed up with him about',
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '18 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'kayla.decamp@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Boris',
  'Khaimchaev',
  'boris.khaimchaev@candidate.greendog.vet',
  '(323) 304-2984',
  'rejected',
  'Indeed',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'VT' LIMIT 1),
  NOW() - INTERVAL '69 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'boris.khaimchaev@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Ethan',
  'Young',
  'ethanyoung0@gmail.com',
  '(323) 830-8867',
  'hired',
  'Indeed',
  '8/26/25_JV candidate was hired Hireat entry level position ethanyoung0',
  (SELECT id FROM public.job_positions WHERE code = 'DENT_TECH' LIMIT 1),
  NOW() - INTERVAL '53 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'ethanyoung0@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Saul',
  'Garcia',
  'saul61613@gmail.com',
  '(213) 461-3934',
  'rejected',
  'Indeed',
  '11/14/25_JV candidate has 5Decision years of needed expierence saul61613',
  (SELECT id FROM public.job_positions WHERE code = 'DENT_TECH' LIMIT 1),
  NOW() - INTERVAL '22 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'saul61613@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Eduardo',
  'Soto',
  'sotoh93@yahoo.com',
  NULL,
  'rejected',
  'Indeed',
  '8/26/25_JV last note for this No candidate Response was to schedule',
  (SELECT id FROM public.job_positions WHERE code = 'DENT_TECH' LIMIT 1),
  NOW() - INTERVAL '27 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'sotoh93@yahoo.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Dov',
  'Boss',
  'dbass228@outlook.com',
  '(747) 254-9994',
  'rejected',
  'Indeed',
  '8/26/25_JV Pass no response Noafter Response phoner to scheudle DBass228',
  (SELECT id FROM public.job_positions WHERE code = 'DENT_TECH' LIMIT 1),
  NOW() - INTERVAL '15 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'dbass228@outlook.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Jessica',
  'Raymundo',
  'expertjess@gmail.com',
  '(661) 208-2688',
  'rejected',
  'Indeed',
  '11/22/25_JV candidate no showed No hirefor final interiew expertjess',
  (SELECT id FROM public.job_positions WHERE code = 'DENT_TECH' LIMIT 1),
  NOW() - INTERVAL '57 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'expertjess@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Miguel',
  'Guerrero',
  'bidroe88@gmail.com',
  '(323) 420-1057',
  'rejected',
  'Indeed',
  '11/12/25-JV candidate accepted No hire offer elsewherer bidroe88',
  (SELECT id FROM public.job_positions WHERE code = 'DENT_TECH' LIMIT 1),
  NOW() - INTERVAL '40 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'bidroe88@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Angeles',
  'Quero',
  'angeles.quero@candidate.greendog.vet',
  '(818) 272-6892',
  'rejected',
  'Indeed',
  '9/5/25_JV Pass - Brandon said Noher hireresponse were NEEDvery short and vauge not much 818-272-6892',
  (SELECT id FROM public.job_positions WHERE code = 'DENT_TECH' LIMIT 1),
  NOW() - INTERVAL '56 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'angeles.quero@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Gerardo',
  'Damian',
  'gerardo.damian@candidate.greendog.vet',
  NULL,
  'rejected',
  'Indeed',
  '8/26/25_JV Bradon seemed to Nohave hire passed on this candidate NEED has NAD experience, is a lead at Double',
  (SELECT id FROM public.job_positions WHERE code = 'DENT_TECH' LIMIT 1),
  NOW() - INTERVAL '59 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'gerardo.damian@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Natalie',
  'Ulloa',
  'nulloa0115@gmail.com',
  NULL,
  'new',
  'Indeed',
  '10/23/25_JV Candidate has almost Hire 2 years of vet nulloa0115',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '6 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'nulloa0115@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Victoria',
  'Portillo',
  'anna.portillo16@gmail.com',
  NULL,
  'interview',
  'Indeed',
  '11/22/25-JV candidate cameHire in for her interview, anna.portillo16',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '7 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'anna.portillo16@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Yasmin',
  'Gutierrez',
  'andyasmingutierrez81@gmail.com',
  NULL,
  'rejected',
  'Indeed',
  '11/25/26_JV B O tried to contact No Response candidate andyasmingutierrez81',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '40 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'andyasmingutierrez81@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Hannah',
  'Rosas',
  'rosashannah640@gmail.com',
  '(818) 403-8911',
  'new',
  'Indeed',
  '11/7/25_JV candidate appliedNo viaResponse indeed, worked rosashannah640',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '1 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'rosashannah640@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Sophia',
  'Alfano',
  'alfano_sophia@icloud.com',
  NULL,
  'new',
  'Indeed',
  '11/14/25_JV Candidate did not Norepsond Response 10/17/25_JV alfano_sophia',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '3 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'alfano_sophia@icloud.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Heaven',
  'Criss',
  'heaven.criss@candidate.greendog.vet',
  NULL,
  'rejected',
  'Indeed',
  '10/22/25_JV NO RESPONSE!No 10/17/25_JV Response candidate NEED applied via indeed, reached out',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '52 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'heaven.criss@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Nataly',
  'Espinoza',
  'nataly.espinoza@candidate.greendog.vet',
  '(661) 860-2198',
  'rejected',
  'Indeed',
  '9/5/25_JV PASS NO RESPONSE No Response 8/29/25_JV Bradon NEED reached out - pending response 8/28/25_JV candidate has 3+ years of',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '52 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'nataly.espinoza@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Devany',
  'Ruiz',
  'devany.ruiz@candidate.greendog.vet',
  NULL,
  'rejected',
  'Indeed',
  '8/26/25_JV No Response I posted candidate pending...... on slack - Brand',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '70 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'devany.ruiz@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Trinity',
  'Flores',
  'trinity.flores@candidate.greendog.vet',
  NULL,
  'rejected',
  'Indeed',
  '8/26/25_JV No Response Bradon reached pending...... out to candidate pending',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '26 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'trinity.flores@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Shukran',
  'Akram',
  'shukranakram41@gmail.com',
  '(559) 575-4209',
  'rejected',
  'ZipRecruiter',
  '7/21/25_BO: Reached out viaNo textResponse ||| 7/21/25_JV shukranakram41',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '50 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'shukranakram41@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Brandon',
  'Huitz',
  'brandonhuitz21@gmail.com',
  NULL,
  'rejected',
  'GreenDog Website',
  '7/21/25_JV applied via GDD website No Response back in march, Brandonhuitz21',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '72 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'brandonhuitz21@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Shawn',
  'Pinkham',
  '25_jvshawnpinkham00@gmail.com',
  '(408) 596-1507',
  'screening',
  'GreenDog Website',
  '7/21/25_BO: Reached out viaNo textResponse |||7/19/25_JVshawnpinkham00',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '7 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = '25_jvshawnpinkham00@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Brianna',
  'Cartagena Ibarra',
  'briannacartagena2@gmail.com',
  '(818) 747-6972',
  'rejected',
  'GreenDog Website',
  '7/29/25_JV Candidate never No responded Response - this one briannacartag',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '26 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'briannacartagena2@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Endri',
  'Edith Gonzalez',
  'sheendriedithgonzalez@gmail.com',
  NULL,
  'screening',
  'Personal Referral',
  '7/21/25_BO: Reached out viaNo textResponse ||| 7/17/25_JV Email',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '7 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'sheendriedithgonzalez@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Tayler',
  'Malloy',
  'alltaylermalloy25@gmail.com',
  '(702) 449-3730',
  'hired',
  'Indeed',
  '8/26/25_JV Candidate was HIRED QUIT - updating alltaylermalloy25',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '42 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'alltaylermalloy25@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Jessica',
  'Basulto',
  'jessica.basulto@candidate.greendog.vet',
  NULL,
  'rejected',
  'Indeed',
  '11/22/25_JV NO show!! 10/23/25_JV No hire candidate NEED has 8 years of expiernce, has been',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '67 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'jessica.basulto@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Angelly',
  'Lopez',
  'angellylopez14@gmail.com',
  '(818) 724-1367',
  'rejected',
  'Indeed',
  '11/14/25_JV Candidate is a PASS No hire 11/4/25_JV candidate Angellylopez14',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '54 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'angellylopez14@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Amanda',
  'Alcala Lopez',
  'amandaalcala356@gmail.com',
  '(818) 571-8823',
  'rejected',
  'Indeed',
  '11/11/25-JV Candidate accepted No hire offer else where amandaalcala356',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '69 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'amandaalcala356@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Amber',
  'Jorgensen',
  'amberjor2011@yahoo.com',
  '(818) 216-3635',
  'interview',
  'Indeed',
  '10/18/25_JV Brandon reached Noback hire out to candidate, amberjor2011',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '7 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'amberjor2011@yahoo.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Emily',
  'Chavez Lopez',
  'emilychavez101@icloud.com',
  '(818) 394-5140',
  'rejected',
  'Indeed',
  '9/5/25_JV candidate came inNo forhire observation - Emilychavez101',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '70 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'emilychavez101@icloud.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Jose',
  'Chavarria',
  'hireprofessionalperezart23@gmail.com',
  NULL,
  'rejected',
  'Indeed',
  '8/28/25-JV Jose was solid, but Nohis hireprofessionalperezart23',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '33 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'hireprofessionalperezart23@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Edgar',
  'Garrido',
  'atgarridoe@outlook.com',
  '(323) 536-6407',
  'new',
  'Indeed',
  '8/11/25_JV strong candidate,No has hire been a DA atgarridoe',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '1 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'atgarridoe@outlook.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Vivian',
  'Robles',
  'roblesvivian98@gmail.com',
  '(562) 810-9291',
  'rejected',
  'Indeed',
  '7/31/25_JV Has 4 years of expierence No hire and is a roblesvivian98',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '43 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'roblesvivian98@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Karen',
  'Bowman',
  'kola2a@msn.com',
  NULL,
  'new',
  'Indeed',
  '8/5/25_JV Brandon conducted Noinhire person interview..pending Kola2a',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '3 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'kola2a@msn.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Sarah',
  'Grace Garcia',
  'thysarahg@gmail.com',
  '(310) 482-0217',
  'rejected',
  'Indeed',
  '8/5/25_JV came in for in person No hire interview, not very thysarahg',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '54 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'thysarahg@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Jeannine',
  'Estrada',
  'jeannineestradaguardado@hotmail.com',
  '(818) 720-2316',
  'rejected',
  'Indeed',
  '8/19/25-JV HOUSE CSR candiadte',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '19 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'jeannineestradaguardado@hotmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Tania',
  'Martinez',
  'taniamtnz92@gmail.com',
  NULL,
  'screening',
  'Personal Referral',
  '7/18/25_BO: Scheduled a callNo forhire 7/21/25',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '12 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'taniamtnz92@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Amalia',
  'Garcia',
  'aamaliagarcia963@gmail.com',
  '(323) 600-7479',
  'rejected',
  'Indeed',
  '8/5/25_JV Pending final notes Nofrom hireBrandon, but 8/2/2025 she was11:00:0',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '56 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'aamaliagarcia963@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Jeff',
  'Pepper',
  'calljpepfin@gmail.com',
  NULL,
  'rejected',
  'ZipRecruiter',
  '7/21/25_BO: Observaion scheduled No hire7/24',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '28 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'calljpepfin@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Suzanne',
  'J. Garcia',
  'suzannejgarcia@yahoo.com',
  NULL,
  'rejected',
  'ZipRecruiter',
  '7/17/25-JV texted this candidate, No hire responded, no Email longer intrest',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '59 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'suzannejgarcia@yahoo.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Oliver',
  'Parker',
  'panther00@me.com',
  '(818) 681-4042',
  'new',
  'ZipRecruiter',
  '7/17/25_JV texted candidated, Nopending hire response Email panther00',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '5 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'panther00@me.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Natasha',
  'Jones',
  'tashjones91@outlook.com',
  '(201) 349-7013',
  'rejected',
  'GreenDog Website',
  '7/17/25_JV texted candidate,No She hire responded and Email',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '18 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'tashjones91@outlook.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Maria',
  'Mendizabal',
  'snoopy_lupe@gmail.com',
  NULL,
  'rejected',
  'Personal Referral',
  '6/27/25_BO: Tiffany to interview No hire on Tuesday 7/1/25 Emailvia phone |||| 6/24/25_BO:snoopy_lupe',
  (SELECT id FROM public.job_positions WHERE code = 'CSR' LIMIT 1),
  NOW() - INTERVAL '17 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'snoopy_lupe@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'JANITOR',
  '',
  'janitor.@candidate.greendog.vet',
  NULL,
  'new',
  'Indeed',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '3 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'janitor.@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Leticia',
  'Ceja',
  'leticia.ceja@candidate.greendog.vet',
  '(323) 667-5758',
  'interview',
  'Indeed',
  '11/11/25_JV Catherine had aDecision phoner with needed this candidate, NEED n',
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '20 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'leticia.ceja@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Nubia',
  'Hernandez',
  'nubia.hernandez@candidate.greendog.vet',
  '(949) 741-0541',
  'interview',
  'Indeed',
  '12/15/25_JV candidate messaged Shadow us InterviewNEED on indeed about the position reached out will323',
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '17 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'nubia.hernandez@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Margarita',
  'Cabezas',
  'mrgarita@live.com',
  '(323) 718-6858',
  'interview',
  'Indeed',
  '12/11/25_JV candidate was sought Phone Interview out on Indeed Mrgarita',
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '16 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'mrgarita@live.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Darrell',
  'Walker',
  'darrell.walker@candidate.greendog.vet',
  '(213) 566-5459',
  'screening',
  'Indeed',
  '12/17/25_JV reached out no No response Response 12/8/25_JV NEEDcandidate cuurently works for Spa',
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '11 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'darrell.walker@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Maurice',
  'Booker',
  'mekbooker@gmail.com',
  NULL,
  'rejected',
  'Indeed',
  '12/17/25_JV reached out to candidate No Response and no response mekbooker',
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '36 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'mekbooker@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Dion',
  'Holston',
  'deon.holston@yahoo.com',
  '(747) 250-0803',
  'rejected',
  'Indeed',
  '12/17/25_JV reached out to candidate No Response and no response. deon.holston',
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '54 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'deon.holston@yahoo.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Ana',
  'Mena',
  'ana.mena@candidate.greendog.vet',
  '(323) 556-4391',
  'screening',
  'Indeed',
  '11/6/25_JV candidate appliedNo viaResponse indeed months NEED ago reached out t',
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '12 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'ana.mena@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Daniel',
  'Lepe',
  'dlepe198095@gmail.com',
  '(323) 286-9394',
  'screening',
  'Indeed',
  '11/6/25_JV candidate appliedNo viaResponse indeed, several dlepe198095',
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '3 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'dlepe198095@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Dina',
  'Siliezar',
  'dina.siliezar@candidate.greendog.vet',
  NULL,
  'rejected',
  'Indeed',
  '12/17/25_JV Candidate delcined No hire to come in forNEED shadow interiew, indicated she did not',
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '59 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'dina.siliezar@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Cely',
  'Lopez Silvia',
  'cely.lopezsilvia@candidate.greendog.vet',
  NULL,
  'rejected',
  'Indeed',
  '12/17/25_JV candidate accepted No hire job offer elsewhere. NEED 12/11/25-JV Candadidate applied',
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '57 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'cely.lopezsilvia@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Kody',
  'Luther',
  'etherealangel2622@gmail.com',
  NULL,
  'rejected',
  'Indeed',
  '12/11/25-JV DOC said Pass 12/8/25_JV No hire candidate etherealangel2622',
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '64 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'etherealangel2622@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Robert',
  'Brown',
  'robert.brown@candidate.greendog.vet',
  NULL,
  'rejected',
  'Indeed',
  '11/26/25_JV BO did a phonerNo with hire candidate and NEED',
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '61 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'robert.brown@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Nicholas',
  'Paul',
  'nicholas_ray.p@hotmail.com',
  '(323) 385-7303',
  'rejected',
  'Indeed',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '53 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'nicholas_ray.p@hotmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Juan',
  'Martinez',
  'juanmm6175@icloud.com',
  NULL,
  'new',
  'Indeed',
  '10/18/25_JV candidate applied Novia hireIndeed, intrested juanmm6175',
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '5 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'juanmm6175@icloud.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Aris',
  'Garcia',
  'garciaaris34@gmail.com',
  '(323) 283-6410',
  'interview',
  'Personal Referral',
  '7/25/25_JV Did shadow with No Esme hire- penidng offer 7/16/2025 letter 7/5/25_B',
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '7 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'garciaaris34@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Vanessa',
  'Trujillo',
  'vanessa.trujillo.609@my.csun.edu',
  '(818) 645-5092',
  'rejected',
  'ZipRecruiter',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '34 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'vanessa.trujillo.609@my.csun.edu');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Myra',
  'Alvarez',
  'andmayrita161109@gmail.com',
  '(424) 309-4715',
  'rejected',
  'Indeed',
  '10/17/25-JV candidate scheduled No hire interview andmayrita161109',
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '31 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'andmayrita161109@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Ronnie',
  'Daniels',
  'danielsronnie44@gmail.com',
  '(570) 921-0734',
  'rejected',
  'Indeed',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '45 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'danielsronnie44@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Lisa',
  'Butterfly',
  'lisa.butterfly@candidate.greendog.vet',
  NULL,
  'rejected',
  'Indeed',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '42 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'lisa.butterfly@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Tahra',
  'Davis',
  'tahra.davis@candidate.greendog.vet',
  NULL,
  'rejected',
  'Indeed',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '42 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'tahra.davis@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Maria',
  'Julia Garcia',
  'phantomscomet@gmail.com',
  '(213) 429-8494',
  'rejected',
  'Indeed',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '49 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'phantomscomet@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Anthony',
  'Crawford',
  'blueragg700@gmail.com',
  '(323) 399-9362',
  'interview',
  'ZipRecruiter',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '7 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'blueragg700@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Joseph',
  'Rivera',
  'joseph.rivera@candidate.greendog.vet',
  NULL,
  'rejected',
  'Indeed',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '60 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'joseph.rivera@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Nashly',
  'Avila',
  'mike.a.pombo@gmail.com',
  '(310) 713-0427',
  'rejected',
  'ZipRecruiter',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '31 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'mike.a.pombo@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Eric',
  'Valdez',
  'ericvaldez02@gmail.com',
  '(213) 513-9292',
  'rejected',
  'Indeed',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '37 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'ericvaldez02@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Francine',
  'Roman',
  'chavaluv4@gmail.com',
  '(213) 523-0862',
  'rejected',
  'Indeed',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '21 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'chavaluv4@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Alma',
  'Willis',
  'akwil847@gmail.com',
  '(213) 284-6983',
  'interview',
  'ZipRecruiter',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'JANITOR' LIMIT 1),
  NOW() - INTERVAL '13 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'akwil847@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'MARKETING',
  '',
  'marketing.@candidate.greendog.vet',
  NULL,
  'new',
  'Indeed',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'MKT' LIMIT 1),
  NOW() - INTERVAL '7 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'marketing.@candidate.greendog.vet');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Heather',
  'Dawn Worden',
  'buttrflysound@gmail.com',
  '(617) 651-6999',
  'new',
  'Indeed',
  NULL,
  (SELECT id FROM public.job_positions WHERE code = 'MKT' LIMIT 1),
  NOW() - INTERVAL '7 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'buttrflysound@gmail.com');

INSERT INTO public.candidates (
  first_name, last_name, email, phone, status, source, notes, 
  target_position_id, applied_at, created_at, updated_at
)
SELECT 
  'Mallorie',
  'Wilson',
  'mallorie.wilson718@gmail.com',
  NULL,
  'rejected',
  'Indeed',
  '11/26/25_JV No need for follow No hire up, DOC hired someone Mallorie.Wilson718',
  (SELECT id FROM public.job_positions WHERE code = 'MKT' LIMIT 1),
  NOW() - INTERVAL '37 days',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.candidates WHERE email = 'mallorie.wilson718@gmail.com');


-- Create onboarding checklists for hired candidates
INSERT INTO public.onboarding_checklist (candidate_id, contract_sent, contract_signed, background_check, uniform_ordered, email_created, start_date)
SELECT 
  c.id, 
  true, 
  true, 
  true, 
  true, 
  false,
  CURRENT_DATE + INTERVAL '7 days'
FROM public.candidates c
WHERE c.status = 'hired' 
  AND c.source LIKE '%GD Grid%'
  AND NOT EXISTS (SELECT 1 FROM public.onboarding_checklist oc WHERE oc.candidate_id = c.id);

-- Create onboarding checklists for offer-stage candidates
INSERT INTO public.onboarding_checklist (candidate_id, contract_sent, contract_signed, background_check, start_date)
SELECT 
  c.id, 
  true, 
  false, 
  false,
  CURRENT_DATE + INTERVAL '14 days'
FROM public.candidates c
WHERE c.status = 'offer' 
  AND c.source LIKE '%GD Grid%'
  AND NOT EXISTS (SELECT 1 FROM public.onboarding_checklist oc WHERE oc.candidate_id = c.id);
