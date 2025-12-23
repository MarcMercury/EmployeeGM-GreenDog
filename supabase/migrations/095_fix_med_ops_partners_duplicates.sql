-- Migration: Fix med_ops_partners duplicates - clean slate with all vendors
-- This clears any duplicate entries and re-inserts the correct data

-- First, clear existing data to remove duplicates
TRUNCATE TABLE public.med_ops_partner_notes CASCADE;
TRUNCATE TABLE public.med_ops_partner_contacts CASCADE;
TRUNCATE TABLE public.med_ops_partners CASCADE;

-- ============================================================
-- SEED DATA: Equipment Vendors and Suppliers (Clean Insert)
-- ============================================================

-- 1. Practice Management Software (PIMS) - 8 vendors
INSERT INTO public.med_ops_partners (name, category, description, website, icon, color, products, is_preferred) VALUES
('EzyVet', 'Practice Management Software', 'Cloud-based practice management software, often integrated with Idexx', 'https://ezyvet.com', 'mdi-laptop', 'blue', ARRAY['Cloud PIMS', 'Idexx Integration', 'Client Portal'], true),
('Covetrus Pulse', 'Practice Management Software', 'Formerly EvetPractice - comprehensive practice management solution', 'https://covetrus.com', 'mdi-laptop', 'purple', ARRAY['PIMS', 'Inventory Management', 'Client Communication'], false),
('Idexx Cornerstone', 'Practice Management Software', 'Server-based legacy standard practice management system', 'https://idexx.com/cornerstone', 'mdi-server', 'teal', ARRAY['Server PIMS', 'Lab Integration', 'Medical Records'], false),
('Idexx Neo', 'Practice Management Software', 'Cloud-based practice management from Idexx', 'https://idexx.com/neo', 'mdi-cloud', 'teal', ARRAY['Cloud PIMS', 'Lab Integration', 'Analytics'], true),
('Avimark', 'Practice Management Software', 'Covetrus practice management solution', 'https://covetrus.com/avimark', 'mdi-laptop', 'orange', ARRAY['PIMS', 'Scheduling', 'Billing'], false),
('Shepherd', 'Practice Management Software', 'Modern veterinary practice management', 'https://shepherd.vet', 'mdi-laptop', 'green', ARRAY['Cloud PIMS', 'Modern UI', 'Integrations'], false),
('DaySmart Vet', 'Practice Management Software', 'Formerly Vetter - scheduling and practice management', 'https://daysmartvet.com', 'mdi-calendar-clock', 'blue', ARRAY['Scheduling', 'PIMS', 'Reminders'], false),
('Instinct Science', 'Practice Management Software', 'Workflow and treatment sheet specific software', 'https://instinct.vet', 'mdi-clipboard-flow', 'cyan', ARRAY['Treatment Sheets', 'Workflows', 'Checklists'], true);

-- 2. Diagnostics & Reference Labs - 5 vendors
INSERT INTO public.med_ops_partners (name, category, description, website, icon, color, products, is_preferred) VALUES
('Idexx Laboratories', 'Diagnostics & Reference Labs', 'Leading provider of in-house analyzers and reference laboratory services', 'https://idexx.com', 'mdi-flask', 'teal', ARRAY['In-House Analyzers', 'Reference Lab', 'SNAP Tests', 'VetConnect PLUS'], true),
('Antech Diagnostics', 'Diagnostics & Reference Labs', 'Mars Veterinary Health reference laboratory services', 'https://antechdiagnostics.com', 'mdi-test-tube', 'red', ARRAY['Reference Lab', 'Specialty Testing', 'Pathology'], false),
('Zoetis', 'Diagnostics & Reference Labs', 'Acquired Abaxis - verified in-house analyzers and diagnostics', 'https://zoetis.com', 'mdi-microscope', 'blue', ARRAY['VetScan Analyzers', 'Point of Care', 'Rapid Tests'], true),
('Heska', 'Diagnostics & Reference Labs', 'Immunodiagnostics and point of care testing', 'https://heska.com', 'mdi-heart-pulse', 'orange', ARRAY['Element Analyzers', 'Immunoassay', 'Allergy Testing'], false),
('Butterfly Network', 'Diagnostics & Reference Labs', 'Handheld ultrasound technology', 'https://butterflynetwork.com', 'mdi-radiology-box', 'indigo', ARRAY['Handheld Ultrasound', 'Butterfly iQ', 'Cloud Platform'], false);

-- 3. Distributors (Supply Chain) - 5 vendors
INSERT INTO public.med_ops_partners (name, category, description, website, icon, color, products, is_preferred) VALUES
('Covetrus', 'Distributors', 'Merged Henry Schein Animal Health & Vets First Choice - comprehensive distribution', 'https://covetrus.com', 'mdi-truck-delivery', 'purple', ARRAY['Pharmaceuticals', 'Supplies', 'Equipment', 'Compounding'], true),
('MWI Animal Health', 'Distributors', 'AmerisourceBergen veterinary distribution', 'https://mwianimalhealth.com', 'mdi-truck', 'blue', ARRAY['Pharmaceuticals', 'Supplies', 'Equipment'], true),
('Patterson Veterinary', 'Distributors', 'Full-service veterinary distribution', 'https://pattersonvet.com', 'mdi-package-variant-closed', 'green', ARRAY['Pharmaceuticals', 'Supplies', 'Equipment', 'Technology'], false),
('Penn Veterinary Supply', 'Distributors', 'Veterinary pharmaceuticals and supplies', 'https://pennvet.com', 'mdi-package-variant', 'cyan', ARRAY['Pharmaceuticals', 'Supplies'], false),
('Victor Medical', 'Distributors', 'Regional veterinary distribution', 'https://victormedical.com', 'mdi-truck-fast', 'orange', ARRAY['Supplies', 'Equipment', 'Regional Service'], false);

-- 4. Equipment & Hardware - 7 vendors
INSERT INTO public.med_ops_partners (name, category, description, website, icon, color, products, is_preferred) VALUES
('iM3', 'Equipment & Hardware', 'The gold standard for veterinary dental equipment', 'https://im3vet.com', 'mdi-tooth', 'blue', ARRAY['Dental Units', 'Dental X-Ray', 'Dental Instruments'], true),
('Midmark', 'Equipment & Hardware', 'Anesthesia machines, monitoring, tables, and lighting', 'https://midmark.com', 'mdi-medical-bag', 'teal', ARRAY['Anesthesia Machines', 'Patient Monitors', 'Exam Tables', 'Surgical Lighting'], true),
('Samsung', 'Equipment & Hardware', 'High-end ultrasound and digital radiography', 'https://samsung.com/healthcare', 'mdi-radiology-box', 'blue', ARRAY['Ultrasound', 'Digital Radiography', 'Imaging Solutions'], false),
('Sound', 'Equipment & Hardware', 'Digital imaging and ultrasound equipment', 'https://soundvet.com', 'mdi-radiology-box', 'purple', ARRAY['Digital X-Ray', 'Ultrasound', 'Imaging Software'], true),
('Dentalaire', 'Equipment & Hardware', 'Dental workstations and equipment', 'https://dentalaire.com', 'mdi-tooth', 'green', ARRAY['Dental Stations', 'Dental Equipment'], false),
('JorVet', 'Equipment & Hardware', 'Jorgensen Laboratories - general veterinary instruments', 'https://jorvet.com', 'mdi-needle', 'orange', ARRAY['Surgical Instruments', 'General Equipment', 'Supplies'], false),
('Bayer / Elanco', 'Equipment & Hardware', 'Parasiticides and therapeutics', 'https://elanco.com', 'mdi-pill', 'green', ARRAY['Parasiticides', 'Therapeutics', 'Vaccines'], false);

-- 5. Pharmacy & Compounding - 5 vendors
INSERT INTO public.med_ops_partners (name, category, description, website, icon, color, products, is_preferred) VALUES
('Wedgewood Pharmacy', 'Pharmacy & Compounding', 'Veterinary compounding pharmacy', 'https://wedgewoodpharmacy.com', 'mdi-pill', 'blue', ARRAY['Compounding', 'Custom Medications', 'Flavoring'], true),
('Roadrunner Pharmacy', 'Pharmacy & Compounding', 'Veterinary compounding services', 'https://roadrunnerpharmacy.com', 'mdi-pill', 'orange', ARRAY['Compounding', 'Custom Formulations'], false),
('Vetsource', 'Pharmacy & Compounding', 'Home delivery and online pharmacy services', 'https://vetsource.com', 'mdi-truck-delivery', 'green', ARRAY['Home Delivery', 'Online Pharmacy', 'Prescription Management'], true),
('Mixlab', 'Pharmacy & Compounding', 'Modern veterinary compounding pharmacy', 'https://mixlab.com', 'mdi-flask-outline', 'purple', ARRAY['Compounding', 'Modern Formulations', 'Fast Delivery'], false),
('Epicur Pharma', 'Pharmacy & Compounding', 'Veterinary compounding pharmacy', 'https://epicurpharma.com', 'mdi-pill', 'teal', ARRAY['Compounding', 'FDA-Registered', 'Specialty Medications'], false);

-- 6. Client Communication & Payment - 5 vendors
INSERT INTO public.med_ops_partners (name, category, description, website, icon, color, products, is_preferred) VALUES
('CareCredit', 'Client Communication & Payment', 'Healthcare financing for veterinary services', 'https://carecredit.com', 'mdi-credit-card', 'blue', ARRAY['Client Financing', 'Payment Plans', 'Credit Line'], true),
('Scratchpay', 'Client Communication & Payment', 'Veterinary payment plans and financing', 'https://scratchpay.com', 'mdi-cash-multiple', 'green', ARRAY['Payment Plans', 'Financing', 'Easy Approval'], true),
('Weave', 'Client Communication & Payment', 'VOIP and client communication platform', 'https://getweave.com', 'mdi-phone-message', 'cyan', ARRAY['VOIP Phone', 'Text Messaging', 'Reviews', 'Payments'], true),
('PetDesk', 'Client Communication & Payment', 'Client communication app and reminders', 'https://petdesk.com', 'mdi-cellphone-message', 'purple', ARRAY['Mobile App', 'Reminders', 'Appointments', 'Loyalty'], false),
('Otto', 'Client Communication & Payment', 'Formerly TeleVet - communication and payment solutions', 'https://otto.vet', 'mdi-message-video', 'orange', ARRAY['Telehealth', 'Payments', 'Client Communication'], false);

-- Verify count (should be exactly 35 vendors)
-- SELECT category, COUNT(*) FROM public.med_ops_partners GROUP BY category ORDER BY category;
