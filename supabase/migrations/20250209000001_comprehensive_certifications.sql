-- =====================================================
-- Comprehensive Veterinary Certifications Seed Data
-- Adds ~250+ certification/credential options to the
-- certifications pick list for employee profiles.
-- Uses ON CONFLICT to skip existing entries.
-- =====================================================

INSERT INTO public.certifications (name, code, description, issuing_authority, validity_months, is_required) VALUES

-- =====================================================
-- VETERINARY DEGREES (Global)
-- =====================================================
('Doctor of Veterinary Medicine', 'DVM', 'Standard US/Canadian veterinary medical degree', 'AVMA-accredited veterinary school', NULL, false),
('Veterinary Medical Doctor', 'VMD', 'University of Pennsylvania veterinary degree', 'University of Pennsylvania', NULL, false),
('Bachelor of Veterinary Science', 'BVSc', 'Undergraduate veterinary degree (Australia, India, South Africa)', 'Accredited veterinary university', NULL, false),
('Bachelor of Veterinary Medicine', 'BVM', 'Undergraduate veterinary medicine degree', 'Accredited veterinary university', NULL, false),
('Bachelor of Veterinary Medicine & Surgery', 'BVMS', 'UK/international veterinary degree (Glasgow style)', 'Accredited veterinary university', NULL, false),
('Bachelor of Veterinary Medicine & Bachelor of Surgery', 'BVMBVS', 'UK veterinary degree variant', 'Accredited veterinary university', NULL, false),
('Bachelor of Veterinary Medicine & Surgery (Edinburgh)', 'BVM&S', 'Edinburgh-style veterinary degree', 'Accredited veterinary university', NULL, false),
('Master of Veterinary Science', 'MVSc', 'Postgraduate veterinary research degree', 'Accredited veterinary university', NULL, false),
('Master of Veterinary Medicine', 'MVetMed', 'Postgraduate clinical veterinary degree (e.g. RVC London)', 'Accredited veterinary university', NULL, false),
('Master of Veterinary Clinical Studies', 'MVCS', 'Postgraduate clinical studies degree', 'Accredited veterinary university', NULL, false),
('Doctor of Veterinary Science', 'DVSc', 'Higher doctorate / research veterinary degree', 'Accredited veterinary university', NULL, false),
('PhD in Veterinary / Comparative Biomedical Sciences', 'PhD-VET', 'Doctoral research degree in veterinary or comparative biomedical sciences', 'Accredited university', NULL, false),

-- =====================================================
-- US VETERINARY BOARD CERTIFICATIONS (AVMA ABVS recognized)
-- =====================================================
('Diplomate – American Board of Veterinary Practitioners', 'DABVP', 'Board certification in veterinary practice specialties', 'American Board of Veterinary Practitioners', 120, false),
('Diplomate – American Board of Veterinary Toxicology', 'DABVT', 'Board certification in veterinary toxicology', 'American Board of Veterinary Toxicology', 120, false),
('Diplomate – American College of Animal Welfare', 'DACAW', 'Board certification in animal welfare', 'American College of Animal Welfare', 120, false),
('Diplomate – American College of Laboratory Animal Medicine', 'DACLAM', 'Board certification in laboratory animal medicine', 'American College of Laboratory Animal Medicine', 120, false),
('Diplomate – American College of Poultry Veterinarians', 'DACPV', 'Board certification in poultry veterinary medicine', 'American College of Poultry Veterinarians', 120, false),
('Diplomate – American College of Theriogenologists', 'DACT', 'Board certification in animal reproduction', 'American College of Theriogenologists', 120, false),
('Diplomate – American College of Veterinary Anesthesia and Analgesia', 'DACVAA', 'Board certification in veterinary anesthesia and analgesia', 'American College of Veterinary Anesthesia and Analgesia', 120, false),
('Diplomate – American College of Veterinary Behaviorists', 'DACVBeh', 'Board certification in veterinary behavior', 'American College of Veterinary Behaviorists', 120, false),
('Diplomate – American College of Veterinary Clinical Pharmacology', 'DACVCP', 'Board certification in veterinary clinical pharmacology', 'American College of Veterinary Clinical Pharmacology', 120, false),
('Diplomate – American College of Veterinary Dermatology', 'DACVD', 'Board certification in veterinary dermatology', 'American College of Veterinary Dermatology', 120, false),
('Diplomate – American College of Veterinary Internal Medicine', 'DACVIM', 'Board certification in veterinary internal medicine', 'American College of Veterinary Internal Medicine', 120, false),
('Diplomate – American College of Veterinary Microbiologists', 'DACVM', 'Board certification in veterinary microbiology', 'American College of Veterinary Microbiologists', 120, false),
('Diplomate – American College of Veterinary Ophthalmologists', 'DACVO', 'Board certification in veterinary ophthalmology', 'American College of Veterinary Ophthalmologists', 120, false),
('Diplomate – American College of Veterinary Pathologists', 'DACVPath', 'Board certification in veterinary pathology', 'American College of Veterinary Pathologists', 120, false),
('Diplomate – American College of Veterinary Preventive Medicine', 'DACVPM', 'Board certification in veterinary preventive medicine', 'American College of Veterinary Preventive Medicine', 120, false),
('Diplomate – American College of Veterinary Radiology', 'DACVR', 'Board certification in veterinary radiology', 'American College of Veterinary Radiology', 120, false),
('Diplomate – American College of Veterinary Sports Medicine and Rehabilitation', 'DACVSMR', 'Board certification in veterinary sports medicine and rehabilitation', 'American College of Veterinary Sports Medicine and Rehabilitation', 120, false),
('Diplomate – American College of Veterinary Surgeons', 'DACVS', 'Board certification in veterinary surgery', 'American College of Veterinary Surgeons', 120, false),
('Diplomate – American College of Zoological Medicine', 'DACZM', 'Board certification in zoological medicine', 'American College of Zoological Medicine', 120, false),
('Diplomate – American College of Veterinary Emergency & Critical Care', 'DACVECC', 'Board certification in veterinary emergency and critical care', 'American College of Veterinary Emergency & Critical Care', 120, false),
('Diplomate – American Veterinary Dental College', 'DAVDC', 'Board certification in veterinary dentistry', 'American Veterinary Dental College', 120, false),

-- =====================================================
-- US AVMA-RECOGNIZED SPECIALTY AREAS
-- =====================================================
('Specialty – Anesthesia and Analgesia', 'SPEC-ANES', 'AVMA-recognized specialty in anesthesia and analgesia', 'AVMA', NULL, false),
('Specialty – Animal Welfare', 'SPEC-AW', 'AVMA-recognized specialty in animal welfare', 'AVMA', NULL, false),
('Specialty – Behavior', 'SPEC-BEH', 'AVMA-recognized specialty in veterinary behavior', 'AVMA', NULL, false),
('Specialty – Dentistry', 'SPEC-DENT', 'AVMA-recognized specialty in veterinary dentistry', 'AVMA', NULL, false),
('Specialty – Dermatology', 'SPEC-DERM', 'AVMA-recognized specialty in veterinary dermatology', 'AVMA', NULL, false),
('Specialty – Emergency and Critical Care', 'SPEC-ECC', 'AVMA-recognized specialty in emergency and critical care', 'AVMA', NULL, false),
('Specialty – Internal Medicine: Cardiology', 'SPEC-IM-CARD', 'AVMA-recognized specialty in veterinary cardiology', 'AVMA', NULL, false),
('Specialty – Internal Medicine: Large Animal', 'SPEC-IM-LA', 'AVMA-recognized specialty in large animal internal medicine', 'AVMA', NULL, false),
('Specialty – Internal Medicine: Neurology', 'SPEC-IM-NEUR', 'AVMA-recognized specialty in veterinary neurology', 'AVMA', NULL, false),
('Specialty – Internal Medicine: Oncology', 'SPEC-IM-ONC', 'AVMA-recognized specialty in veterinary oncology', 'AVMA', NULL, false),
('Specialty – Internal Medicine: Small Animal', 'SPEC-IM-SA', 'AVMA-recognized specialty in small animal internal medicine', 'AVMA', NULL, false),
('Specialty – Laboratory Animal Medicine', 'SPEC-LAM', 'AVMA-recognized specialty in laboratory animal medicine', 'AVMA', NULL, false),
('Specialty – Microbiology', 'SPEC-MICRO', 'AVMA-recognized specialty in veterinary microbiology', 'AVMA', NULL, false),
('Specialty – Nutrition', 'SPEC-NUTR', 'AVMA-recognized specialty in veterinary nutrition', 'AVMA', NULL, false),
('Specialty – Ophthalmology', 'SPEC-OPHTHO', 'AVMA-recognized specialty in veterinary ophthalmology', 'AVMA', NULL, false),
('Specialty – Pathology', 'SPEC-PATH', 'AVMA-recognized specialty in veterinary pathology', 'AVMA', NULL, false),
('Specialty – Pharmacology', 'SPEC-PHARM', 'AVMA-recognized specialty in veterinary pharmacology', 'AVMA', NULL, false),
('Specialty – Poultry', 'SPEC-POULT', 'AVMA-recognized specialty in poultry veterinary medicine', 'AVMA', NULL, false),
('Specialty – Preventive Medicine', 'SPEC-PREV', 'AVMA-recognized specialty in veterinary preventive medicine', 'AVMA', NULL, false),
('Specialty – Radiology', 'SPEC-RAD', 'AVMA-recognized specialty in veterinary radiology', 'AVMA', NULL, false),
('Specialty – Sports Medicine and Rehabilitation', 'SPEC-SMR', 'AVMA-recognized specialty in sports medicine and rehabilitation', 'AVMA', NULL, false),
('Specialty – Surgery', 'SPEC-SURG', 'AVMA-recognized specialty in veterinary surgery', 'AVMA', NULL, false),
('Specialty – Theriogenology', 'SPEC-THERIO', 'AVMA-recognized specialty in animal reproduction', 'AVMA', NULL, false),
('Specialty – Toxicology', 'SPEC-TOX', 'AVMA-recognized specialty in veterinary toxicology', 'AVMA', NULL, false),
('Specialty – Zoological Medicine', 'SPEC-ZOO', 'AVMA-recognized specialty in zoological medicine', 'AVMA', NULL, false),
('Veterinary Practitioners – Avian Practice', 'ABVP-AVIAN', 'ABVP specialty certification in avian practice', 'American Board of Veterinary Practitioners', 120, false),
('Veterinary Practitioners – Beef Cattle Practice', 'ABVP-BEEF', 'ABVP specialty certification in beef cattle practice', 'American Board of Veterinary Practitioners', 120, false),
('Veterinary Practitioners – Canine and Feline Practice', 'ABVP-CF', 'ABVP specialty certification in canine and feline practice', 'American Board of Veterinary Practitioners', 120, false),
('Veterinary Practitioners – Dairy Practice', 'ABVP-DAIRY', 'ABVP specialty certification in dairy practice', 'American Board of Veterinary Practitioners', 120, false),
('Veterinary Practitioners – Equine Practice', 'ABVP-EQUINE', 'ABVP specialty certification in equine practice', 'American Board of Veterinary Practitioners', 120, false),
('Veterinary Practitioners – Exotic Companion Mammal Practice', 'ABVP-ECM', 'ABVP specialty certification in exotic companion mammal practice', 'American Board of Veterinary Practitioners', 120, false),
('Veterinary Practitioners – Feline Practice', 'ABVP-FELINE', 'ABVP specialty certification in feline practice', 'American Board of Veterinary Practitioners', 120, false),
('Veterinary Practitioners – Food Animal Practice', 'ABVP-FOOD', 'ABVP specialty certification in food animal practice', 'American Board of Veterinary Practitioners', 120, false),
('Veterinary Practitioners – Reptile and Amphibian Practice', 'ABVP-REPT', 'ABVP specialty certification in reptile and amphibian practice', 'American Board of Veterinary Practitioners', 120, false),
('Veterinary Practitioners – Shelter Practice', 'ABVP-SHELTER', 'ABVP specialty certification in shelter practice', 'American Board of Veterinary Practitioners', 120, false),
('Veterinary Practitioners – Swine Health Management', 'ABVP-SWINE', 'ABVP specialty certification in swine health management', 'American Board of Veterinary Practitioners', 120, false),

-- =====================================================
-- EU VETERINARY SPECIALIZATION (EBVS recognized)
-- =====================================================
('Diplomate – European College of Animal Reproduction', 'DECAR', 'EBVS-recognized specialist in animal reproduction', 'European College of Animal Reproduction', 120, false),
('Diplomate – European College of Animal Welfare and Behavioural Medicine', 'DECAWBM', 'EBVS-recognized specialist in animal welfare and behavioural medicine', 'European College of Animal Welfare and Behavioural Medicine', 120, false),
('Diplomate – European College of Aquatic Animal Health', 'DECAAH', 'EBVS-recognized specialist in aquatic animal health', 'European College of Aquatic Animal Health', 120, false),
('Diplomate – European College of Bovine Health Management', 'DECBHM', 'EBVS-recognized specialist in bovine health management', 'European College of Bovine Health Management', 120, false),
('Diplomate – European College of Equine Internal Medicine', 'DECEIM', 'EBVS-recognized specialist in equine internal medicine', 'European College of Equine Internal Medicine', 120, false),
('Diplomate – European College of Laboratory Animal Medicine', 'DECLAM', 'EBVS-recognized specialist in laboratory animal medicine', 'European College of Laboratory Animal Medicine', 120, false),
('Diplomate – European College of Porcine Health Management', 'DECPHM', 'EBVS-recognized specialist in porcine health management', 'European College of Porcine Health Management', 120, false),
('Diplomate – European College of Poultry Veterinary Science', 'DECPVS', 'EBVS-recognized specialist in poultry veterinary science', 'European College of Poultry Veterinary Science', 120, false),
('Diplomate – European College of Small Ruminant Health Management', 'DECSRHM', 'EBVS-recognized specialist in small ruminant health management', 'European College of Small Ruminant Health Management', 120, false),
('Diplomate – European College of Veterinary Anaesthesia and Analgesia', 'DECVAA', 'EBVS-recognized specialist in veterinary anaesthesia and analgesia', 'European College of Veterinary Anaesthesia and Analgesia', 120, false),
('Diplomate – European College of Veterinary and Comparative Nutrition', 'DECVCN', 'EBVS-recognized specialist in veterinary and comparative nutrition', 'European College of Veterinary and Comparative Nutrition', 120, false),
('Diplomate – European College of Veterinary Clinical Pathology', 'DECVCP', 'EBVS-recognized specialist in veterinary clinical pathology', 'European College of Veterinary Clinical Pathology', 120, false),
('Diplomate – European College of Veterinary Dermatology', 'DECVD', 'EBVS-recognized specialist in veterinary dermatology', 'European College of Veterinary Dermatology', 120, false),
('Diplomate – European College of Veterinary Diagnostic Imaging', 'DECVDI', 'EBVS-recognized specialist in veterinary diagnostic imaging', 'European College of Veterinary Diagnostic Imaging', 120, false),
('Diplomate – European College of Veterinary Emergency and Critical Care', 'DECVECC', 'EBVS-recognized specialist in veterinary emergency and critical care', 'European College of Veterinary Emergency and Critical Care', 120, false),
('Diplomate – European College of Veterinary Internal Medicine – Companion Animals', 'DECVIM-CA', 'EBVS-recognized specialist in companion animal internal medicine', 'European College of Veterinary Internal Medicine – Companion Animals', 120, false),
('Diplomate – European College of Veterinary Microbiology', 'DECVMicro', 'EBVS-recognized specialist in veterinary microbiology', 'European College of Veterinary Microbiology', 120, false),
('Diplomate – European College of Veterinary Neurology', 'DECVN', 'EBVS-recognized specialist in veterinary neurology', 'European College of Veterinary Neurology', 120, false),
('Diplomate – European College of Veterinary Ophthalmologists', 'DECVO', 'EBVS-recognized specialist in veterinary ophthalmology', 'European College of Veterinary Ophthalmologists', 120, false),
('Diplomate – European College of Veterinary Pathologists', 'DECVPath', 'EBVS-recognized specialist in veterinary pathology', 'European College of Veterinary Pathologists', 120, false),
('Diplomate – European College of Veterinary Pharmacology and Toxicology', 'DECVPT', 'EBVS-recognized specialist in veterinary pharmacology and toxicology', 'European College of Veterinary Pharmacology and Toxicology', 120, false),
('Diplomate – European College of Veterinary Public Health', 'DECVPH', 'EBVS-recognized specialist in veterinary public health', 'European College of Veterinary Public Health', 120, false),
('Diplomate – European College of Veterinary Sports Medicine and Rehabilitation', 'DECVSMR', 'EBVS-recognized specialist in veterinary sports medicine and rehabilitation', 'European College of Veterinary Sports Medicine and Rehabilitation', 120, false),
('Diplomate – European College of Veterinary Surgeons', 'DECVS', 'EBVS-recognized specialist in veterinary surgery', 'European College of Veterinary Surgeons', 120, false),
('Diplomate – European College of Zoological Medicine', 'DECZM', 'EBVS-recognized specialist in zoological medicine', 'European College of Zoological Medicine', 120, false),
('Diplomate – European Veterinary Dental College', 'DEVDC', 'EBVS-recognized specialist in veterinary dentistry', 'European Veterinary Dental College', 120, false),
('Diplomate – European Veterinary Parasitology College', 'DEVPC', 'EBVS-recognized specialist in veterinary parasitology', 'European Veterinary Parasitology College', 120, false),

-- =====================================================
-- UK POSTGRADUATE CREDENTIALS (RCVS)
-- =====================================================
('RCVS Certificate in Advanced Veterinary Practice', 'CertAVP', 'RCVS postgraduate certificate in advanced veterinary practice', 'Royal College of Veterinary Surgeons', NULL, false),
('RCVS Certificate in Advanced Veterinary Nursing', 'CertAVN', 'RCVS postgraduate certificate in advanced veterinary nursing', 'Royal College of Veterinary Surgeons', NULL, false),

-- =====================================================
-- VETERINARY TECHNICIAN/NURSE DEGREES & CREDENTIALS
-- =====================================================
-- Associate / Bachelor Degrees
('Associate of Applied Science in Veterinary Technology', 'AAS-VT', 'Associate degree in veterinary technology (applied science)', 'AVMA-accredited program', NULL, false),
('Associate of Science in Veterinary Technology', 'AS-VT', 'Associate degree in veterinary technology (science)', 'AVMA-accredited program', NULL, false),
('Associate Degree in Veterinary Technology', 'AD-VT', 'Associate degree in veterinary technology (general)', 'AVMA-accredited program', NULL, false),
('Bachelor of Science in Veterinary Technology', 'BS-VT', 'Bachelor''s degree in veterinary technology', 'AVMA-accredited program', NULL, false),
('Bachelor of Science in Veterinary Nursing', 'BS-VN', 'Bachelor''s degree in veterinary nursing', 'Accredited university', NULL, false),
('Bachelor of Veterinary Technology', 'BVetTech', 'Bachelor''s degree in veterinary technology', 'Accredited university', NULL, false),
('Diploma in Veterinary Nursing (UK & Ireland)', 'DipVN', 'Diploma-level veterinary nursing qualification (UK/IE)', 'RCVS-approved institution', NULL, false),
('Diploma in Veterinary Technology', 'DipVT', 'Diploma-level veterinary technology qualification', 'AVMA-accredited program', NULL, false),

-- Academic Certificates
('Veterinary Assistant Certificate', 'VA-CERT', 'Entry-level veterinary assistant academic certificate', 'Accredited educational institution', NULL, false),
('Veterinary Nursing Certificate', 'VN-CERT', 'Veterinary nursing academic certificate', 'Accredited educational institution', NULL, false),
('Veterinary Technician Certificate', 'VT-CERT', 'Veterinary technician academic certificate', 'Accredited educational institution', NULL, false),

-- US / Canada Licenses
('Credentialed Veterinary Technician', 'CVT-CRED', 'State-credentialed veterinary technician', 'State Veterinary Board', 24, false),
('Licensed Veterinary Technician', 'LVT', 'State-licensed veterinary technician', 'State Veterinary Board', 24, false),
-- RVT already exists in seed data
('Licensed Veterinary Medical Technician', 'LVMT', 'State-licensed veterinary medical technician', 'State Veterinary Board', 24, false),

-- UK / Ireland / EU Licenses
('Registered Veterinary Nurse', 'RVN', 'UK/Ireland registered veterinary nurse credential', 'Royal College of Veterinary Surgeons', NULL, false),
('Veterinary Nurse Practitioner', 'VNP', 'UK specialized veterinary nurse practitioner designation', 'Royal College of Veterinary Surgeons', NULL, false),

-- Australia / New Zealand
('Veterinary Nurse Registration (Australia)', 'VNR-AU', 'State/territory veterinary nurse registration (Australia)', 'Australian state veterinary board', NULL, false),
('New Zealand Registered Veterinary Nurse', 'NZRVN', 'New Zealand registered veterinary nurse credential', 'Veterinary Council of New Zealand', NULL, false),

-- =====================================================
-- NAVTA VETERINARY TECHNICIAN SPECIALIST (VTS) ACADEMIES
-- =====================================================
('VTS – Academy of Veterinary Emergency and Critical Care Technicians and Nurses', 'VTS-ECCTN', 'NAVTA VTS credential in emergency and critical care', 'NAVTA / Academy of Veterinary Emergency and Critical Care Technicians and Nurses', 60, false),
('VTS – Academy of Veterinary Dental Technicians', 'VTS-DENTAL', 'NAVTA VTS credential in veterinary dentistry', 'NAVTA / Academy of Veterinary Dental Technicians', 60, false),
('VTS – Academy of Internal Medicine Veterinary Technicians', 'VTS-IM', 'NAVTA VTS credential in internal medicine', 'NAVTA / Academy of Internal Medicine Veterinary Technicians', 60, false),
-- VTS-ANES already exists in seed data
('VTS – Academy of Veterinary Zoological Medicine Technicians', 'VTS-ZOO', 'NAVTA VTS credential in zoological medicine', 'NAVTA / Academy of Veterinary Zoological Medicine Technicians', 60, false),
('VTS – Academy of Veterinary Technicians in Clinical Practice', 'VTS-CP', 'NAVTA VTS credential in clinical practice', 'NAVTA / Academy of Veterinary Technicians in Clinical Practice', 60, false),
('VTS – Academy of Veterinary Clinical Pathology Technicians', 'VTS-CPATH', 'NAVTA VTS credential in clinical pathology', 'NAVTA / Academy of Veterinary Clinical Pathology Technicians', 60, false),
('VTS – Academy of Veterinary Nutrition Technicians', 'VTS-NUTR', 'NAVTA VTS credential in veterinary nutrition', 'NAVTA / Academy of Veterinary Nutrition Technicians', 60, false),
('VTS – Academy of Veterinary Surgical Technicians', 'VTS-SURG', 'NAVTA VTS credential in veterinary surgery', 'NAVTA / Academy of Veterinary Surgical Technicians', 60, false),
('VTS – Academy of Veterinary Behavior Technicians', 'VTS-BEH', 'NAVTA VTS credential in veterinary behavior', 'NAVTA / Academy of Veterinary Behavior Technicians', 60, false),
('VTS – Academy of Equine Veterinary Nursing Technicians', 'VTS-EQUINE', 'NAVTA VTS credential in equine veterinary nursing', 'NAVTA / Academy of Equine Veterinary Nursing Technicians', 60, false),
('VTS – Academy of Laboratory Animal Veterinary Technicians and Nurses', 'VTS-LAB', 'NAVTA VTS credential in laboratory animal medicine', 'NAVTA / Academy of Laboratory Animal Veterinary Technicians and Nurses', 60, false),
('VTS – Academy of Veterinary Ophthalmic Technicians', 'VTS-OPHTH', 'NAVTA VTS credential in veterinary ophthalmology', 'NAVTA / Academy of Veterinary Ophthalmic Technicians', 60, false),
('VTS – Academy of Dermatology Veterinary Technicians', 'VTS-DERMA', 'NAVTA VTS credential in veterinary dermatology', 'NAVTA / Academy of Dermatology Veterinary Technicians', 60, false),
('VTS – Academy of Veterinary Technicians in Diagnostic Imaging', 'VTS-DI', 'NAVTA VTS credential in diagnostic imaging', 'NAVTA / Academy of Veterinary Technicians in Diagnostic Imaging', 60, false),
('VTS – Academy of Physical Rehabilitation Veterinary Technicians', 'VTS-REHAB', 'NAVTA VTS credential in physical rehabilitation', 'NAVTA / Academy of Physical Rehabilitation Veterinary Technicians', 60, false),

-- =====================================================
-- VTS SHORT-FORM SPECIALTY CREDENTIALS
-- =====================================================
('VTS – Anesthesia & Analgesia', 'VTS-AA', 'VTS specialty credential in anesthesia and analgesia', 'NAVTA', 60, false),
('VTS – Behavior', 'VTS-BEHAV', 'VTS specialty credential in behavior', 'NAVTA', 60, false),
('VTS – Clinical Practice', 'VTS-CLINPRAC', 'VTS specialty credential in clinical practice', 'NAVTA', 60, false),
('VTS – Dentistry', 'VTS-DENTISTRY', 'VTS specialty credential in dentistry', 'NAVTA', 60, false),
('VTS – Dermatology', 'VTS-DERM', 'VTS specialty credential in dermatology', 'NAVTA', 60, false),
('VTS – Emergency & Critical Care', 'VTS-EMCC', 'VTS specialty credential in emergency and critical care', 'NAVTA', 60, false),
('VTS – Internal Medicine', 'VTS-INTMED', 'VTS specialty credential in internal medicine', 'NAVTA', 60, false),
('VTS – Nutrition', 'VTS-NUTRITION', 'VTS specialty credential in nutrition', 'NAVTA', 60, false),
('VTS – Ophthalmology', 'VTS-OPHTHAL', 'VTS specialty credential in ophthalmology', 'NAVTA', 60, false),
('VTS – Physical Rehabilitation', 'VTS-PHYSREHAB', 'VTS specialty credential in physical rehabilitation', 'NAVTA', 60, false),
('VTS – Radiology/Imaging', 'VTS-RADIMG', 'VTS specialty credential in radiology and diagnostic imaging', 'NAVTA', 60, false),
('VTS – Surgery', 'VTS-SURGERY', 'VTS specialty credential in surgery', 'NAVTA', 60, false),
('VTS – Zoological Medicine', 'VTS-ZOOMED', 'VTS specialty credential in zoological medicine', 'NAVTA', 60, false),
('VTS – Laboratory Animal Medicine', 'VTS-LABMED', 'VTS specialty credential in laboratory animal medicine', 'NAVTA', 60, false),

-- =====================================================
-- OTHER NATIONAL / PROFESSIONAL CERTIFICATIONS (Tech-Level)
-- =====================================================
-- General / Cross-Discipline
-- Fear Free Certified Professional already exists as FFCP
('Fear Free Certified Veterinary Nurse/Technician', 'FFCVNT', 'Fear Free certification specific to veterinary nurses and technicians', 'Fear Free', 12, false),
('Pet Professional Guild Certified Professional', 'PPG-CP', 'Pet Professional Guild certified professional credential', 'Pet Professional Guild', 24, false),
('AAHA Veterinary Assistant Certification', 'AAHA-VA', 'American Animal Hospital Association veterinary assistant certification', 'American Animal Hospital Association', 24, false),
('VTS Certified Instructor', 'VTS-CI', 'Certified instructor for VTS training programs', 'NAVTA', NULL, false),
('Veterinary Practice Manager Certification', 'CVPM', 'Certified veterinary practice manager credential', 'Veterinary Hospital Managers Association', 60, false),

-- Anesthesia & Pain Management
('Veterinary Technician Pain Management Certification', 'VT-PAIN', 'Pain management certification for veterinary technicians', 'International Veterinary Academy of Pain Management', 24, false),
('Certified Veterinary Anesthesia Technician', 'CVAT', 'Veterinary anesthesia technician certification', 'Professional certification body', 24, false),

-- Dental
('Certified Veterinary Dental Technician', 'CVDT', 'Veterinary dental technician certification', 'Academy of Veterinary Dental Technicians', 60, false),
('Advanced Veterinary Dental Technician Certification', 'ADVDT', 'Advanced-level veterinary dental technician certification', 'Academy of Veterinary Dental Technicians', 60, false),

-- Emergency & Critical Care
('Emergency & Critical Care Veterinary Technician Certification', 'ECC-VT', 'Emergency and critical care certification for veterinary technicians', 'VECCS', 60, false),
('Trauma Technician Credentialing', 'TTC', 'Trauma technician credentialing program', 'Veterinary Emergency & Critical Care Society', 24, false),

-- Behavior
('Certified Veterinary Behavior Technician', 'CVBT', 'Veterinary behavior technician certification', 'Academy of Veterinary Behavior Technicians', 60, false),

-- Nutrition
('Certified Veterinary Nutrition Technician', 'CVNT', 'Veterinary nutrition technician certification', 'Academy of Veterinary Nutrition Technicians', 60, false),

-- Ophthalmology
('Veterinary Ophthalmic Technician Certification', 'VOTC', 'Veterinary ophthalmic technician certification', 'Academy of Veterinary Ophthalmic Technicians', 60, false),

-- Radiology & Imaging
('Certified Veterinary Radiology Technician', 'CVRT', 'Veterinary radiology technician certification', 'Academy of Veterinary Technicians in Diagnostic Imaging', 60, false),

-- Laboratory / Clinical Pathology
('Veterinary Clinical Pathology Technician Certification', 'VCPTC', 'Veterinary clinical pathology technician certification', 'Academy of Veterinary Clinical Pathology Technicians', 60, false),

-- Surgical
('Certified Veterinary Surgical Technician', 'CVST', 'Veterinary surgical technician certification', 'Academy of Veterinary Surgical Technicians', 60, false),

-- Exotics / Zoological
('Zoological Veterinary Technician Certification', 'ZVTC', 'Zoological veterinary technician certification', 'Academy of Veterinary Zoological Medicine Technicians', 60, false),
('Avian/Exotic Animal Technician Certificate', 'AEATC', 'Avian and exotic animal technician certificate', 'Association of Avian Veterinarians', 24, false),

-- Rehabilitation
('Certified Canine Rehabilitation Technician', 'CCRT', 'Canine rehabilitation technician certification', 'Canine Rehabilitation Institute', 24, false),
('Veterinary Physical Rehabilitation Technician', 'VPRT', 'Veterinary physical rehabilitation technician credential', 'Academy of Physical Rehabilitation Veterinary Technicians', 60, false),

-- =====================================================
-- CONTINUING EDUCATION & SPECIALIZED TRAINING
-- =====================================================
('Fear Free Certified Professional – Companion Animal', 'FF-COMP', 'Fear Free certification for companion animal handling', 'Fear Free', 12, false),
('Fear Free Certified Professional – Advanced', 'FF-ADV', 'Fear Free advanced certification', 'Fear Free', 12, false),
('Fear Free Hospital Certification Training', 'FF-HOSP', 'Fear Free hospital-level certification training', 'Fear Free', 12, false),
('AAHA Staff Credentialing Program – Assistants', 'AAHA-ASST', 'AAHA staff credentialing for veterinary assistants', 'American Animal Hospital Association', 24, false),
('AAHA Staff Credentialing Program – Technicians', 'AAHA-TECH', 'AAHA staff credentialing for veterinary technicians', 'American Animal Hospital Association', 24, false),
('AAFP Cat Friendly Certification', 'AAFP-CF', 'Cat Friendly Practice / professional certification program', 'American Association of Feline Practitioners', 36, false),
('WSAVA Global Pain Council Training Certificate', 'WSAVA-PAIN', 'WSAVA pain management training certificate', 'WSAVA Global Pain Council', 24, false),
('AARV Radiology Interpretation Training', 'AARV-RAD', 'Radiology interpretation training for veterinary professionals', 'AARV', 24, false),

-- AALAS Certifications (Laboratory Animal)
('AALAS Assistant Laboratory Animal Technician', 'ALAT', 'AALAS entry-level laboratory animal technician certification', 'American Association for Laboratory Animal Science', 36, false),
('AALAS Laboratory Animal Technician', 'LAT', 'AALAS mid-level laboratory animal technician certification', 'American Association for Laboratory Animal Science', 36, false),
('AALAS Laboratory Animal Technologist', 'LATG', 'AALAS advanced laboratory animal technologist certification', 'American Association for Laboratory Animal Science', 36, false),

-- =====================================================
-- INTERNATIONAL / REGION-SPECIFIC TECH CREDENTIALS
-- =====================================================
-- UK / Ireland
('RCVS Certificate in Advanced Veterinary Nursing', 'RCVS-CertAVN', 'RCVS advanced veterinary nursing certificate', 'Royal College of Veterinary Surgeons', NULL, false),
('RCVS Specialist Nurse Credential', 'RCVS-SNC', 'RCVS specialist nurse credential', 'Royal College of Veterinary Surgeons', NULL, false),

-- Canada
('National Veterinary Assistant Program Certificate', 'NVAP', 'Canadian national veterinary assistant program certificate', 'Canadian Veterinary Medical Association', NULL, false),
('Provincial Registered Veterinary Technician License', 'PRVTL', 'Canadian provincial RVT licensing', 'Provincial veterinary regulatory body', 24, false),

-- Australia / NZ
('Australian Veterinary Nursing Association Certification', 'AVNA-CERT', 'AVNA professional certification for veterinary nurses', 'Australian Veterinary Nursing Association', NULL, false),
('Veterinary Nurse Educator Certificate', 'VNEC', 'Veterinary nurse educator certification', 'Professional veterinary nursing body', NULL, false)

ON CONFLICT (code) DO NOTHING;
