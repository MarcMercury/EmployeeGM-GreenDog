-- =====================================================
-- Migration 269: Seed Med Ops Partners from Med Contacts Feb 2026
-- Source: "Med COntacts 1.xlsx" → "Updated Contacts Feb 2026" sheet
--   and first sheet (vendor credentials)
-- Description: 
--   1) Update existing Idexx Laboratories and JorVet with real account info
--   2) Insert all new vendors from Med Contacts spreadsheets
--   3) Add Idexx contact people as partner_contacts
--   4) Insert Office Supply vendors and other vendors from first sheet
-- =====================================================

-- ================================================================
-- PART 1: Update existing partners with real data from spreadsheets
-- ================================================================

-- Update Idexx Laboratories with real account info (primary AETNA account)
UPDATE public.med_ops_partners
SET
  account_number = '439618 (lims-107863)',
  location_code = 'AETNA',
  department = 'ALL OTHER',
  cost_type = 'MED SUPPLIES',
  has_cc_fees = false,
  portal_url = 'https://login.idexx.com/',
  portal_username = 'info@greendogdental.com',
  portal_password = 'Ventura13907!',
  contact_phone = '888-437-9987',
  browser_preference = 'Either',
  form_filled = false,
  vendor_info = 'Labs and kits - NOT VETCONNECT/RESULTS. Additional accounts: VEN=350821, SO=314191, MPMV=262034',
  notes = 'Multiple location accounts. AETNA: 439618 (lims-107863), VEN: 350821, SO: 314191, MPMV: 262034',
  updated_at = NOW()
WHERE name = 'Idexx Laboratories';

-- Update JorVet with real account info
UPDATE public.med_ops_partners
SET
  account_number = NULL,
  location_code = 'MVS ALL',
  department = 'ALL OTHER',
  cost_type = 'MED SUPPLIES',
  portal_url = 'https://jorvet.com/cart/',
  portal_username = 'docrenvet@gmail.com',
  portal_password = 'Ventura!210@BUYit',
  form_filled = false,
  vendor_info = 'CE CREATED 7/3/2025 - MVSGDD account',
  website = 'https://jorvet.com',
  updated_at = NOW()
WHERE name = 'JorVet';

-- Update McKesson (if exists, otherwise will be inserted below)
UPDATE public.med_ops_partners
SET
  account_number = '65653024',
  contact_name = 'Morgan (no longer works there)',
  contact_email = 'morgan.ruziska@mckesson.com',
  contact_phone = '800-755-2090',
  portal_url = 'https://mms.mckesson.com/',
  portal_username = 'bmakaryk',
  portal_password = '.YMhS29dNh2X6sh',
  order_method = 'Website',
  payment_method = 'Website',
  notes = '$100 minimum order. Human medical supply company, rarely used. Good for PPE or if something is unavailable at our normal suppliers. Account: MY PET MOBILE VET (Bill to) Ship to.',
  updated_at = NOW()
WHERE name ILIKE '%McKesson%';

-- ================================================================
-- PART 2: Insert new Med Ops Partners from Updated Contacts Feb 2026
-- ================================================================

-- Auburn University (MPMV account)
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  location_code, department, cost_type,
  portal_username, portal_password,
  form_filled, vendor_info, is_active
) VALUES (
  'Auburn University (MPMV)', 'Diagnostics & Reference Labs',
  'Auburn University veterinary lab - MPMV account',
  NULL, 'mdi-flask', 'orange',
  'MPMV', 'ALL OTHER', 'MED SUPPLIES',
  'Greendogdental', NULL,
  false, 'FOR MPMV - no website or password listed', true
)
ON CONFLICT DO NOTHING;

-- Auburn STAT PET TRAVEL
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  location_code, department, cost_type,
  portal_url, portal_username, portal_password,
  contact_email, form_filled, vendor_info, is_active
) VALUES (
  'Auburn STAT PET TRAVEL', 'Diagnostics & Reference Labs',
  'Auburn veterinary pathology - specimen submission and payment portal',
  'https://patho.vetmed.auburn.edu/login/auth', 'mdi-flask', 'orange',
  NULL, 'ALL OTHER', 'MED SUPPLIES',
  'https://patho.vetmed.auburn.edu/login/auth', 'GDD2024', '123Greendog',
  'weldolm@auburn.edu', false,
  'Also under billing? TO MAKE PAYMENTS & DOWNLOAD INVOICES OR STATEMENTS', true
)
ON CONFLICT DO NOTHING;

-- CAHFS California Animal Health & Food Safety Lab System
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  location_code, department, cost_type,
  account_number, contact_phone,
  form_filled, vendor_info, is_active
) VALUES (
  'CAHFS California Animal Health & Food Safety Lab', 'Diagnostics & Reference Labs',
  'California Animal Health & Food Safety Lab System - use phone number to pay bills',
  NULL, 'mdi-flask', 'green',
  'AETNA', 'EXOTICS', 'PATIENTS',
  '0001294D', '530-564-2631',
  false, 'Use phone number to pay bills', true
)
ON CONFLICT DO NOTHING;

-- Cornell University (Geist)
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  location_code, department, cost_type,
  portal_url, portal_username, portal_password,
  form_filled, vendor_info, notes, is_active
) VALUES (
  'Cornell University Lab (Geist)', 'Diagnostics & Reference Labs',
  'Cornell University Animal Health Diagnostic Center - Geist internal medicine lab',
  'https://ahdc.vet.cornell.edu/myaccount/', 'mdi-flask', 'red',
  'MVS ALL', 'INTERNAL MED', 'MED SUPPLIES',
  'https://ahdc.vet.cornell.edu/myaccount/', 'mypetchristina@gmail.com', 'Gr33nD0g91423@',
  false, '***GEIST*** - Online website (no direct contact)', 'Online website (no direct contact)', true
)
ON CONFLICT DO NOTHING;

-- Ebay
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  location_code, department, cost_type, has_cc_fees,
  portal_url, portal_username, portal_password,
  form_filled, vendor_info, is_active
) VALUES (
  'eBay', 'Other',
  'Online marketplace for medical supplies - CE account created 7/3/25',
  'https://www.ebay.com', 'mdi-shopping', 'blue',
  NULL, 'ALL OTHER', 'MED SUPPLIES', false,
  'https://www.ebay.com', 'docrenvet@gmail.com', 'Buy@Aetna210ETC!',
  false, 'CE CREATED 7/3/25 - MVSGDD', true
)
ON CONFLICT DO NOTHING;

-- FedEx
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  location_code, department, cost_type,
  account_number, portal_username, portal_password,
  form_filled, is_active
) VALUES (
  'FedEx', 'Other',
  'FedEx shipping services',
  'https://www.fedex.com', 'mdi-truck-delivery', 'purple',
  NULL, 'ALL OTHER', 'MED SUPPLIES',
  '210163673', 'greendogdeija@gmail.com', 'ZiggyRugby!123',
  false, true
)
ON CONFLICT DO NOTHING;

-- Michigan State University (Exotics)
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  location_code, department, cost_type,
  account_number, portal_url,
  browser_preference, form_filled, vendor_info, is_active
) VALUES (
  'Michigan State University Lab (Exotics)', 'Diagnostics & Reference Labs',
  'Michigan State University Veterinary Diagnostic Lab - Exotics department',
  'https://vdl.msu.edu/Bin/Account.exe', 'mdi-flask', 'green',
  'AETNA', 'EXOTICS', 'PATIENTS',
  '73770', 'https://vdl.msu.edu/Bin/Account.exe',
  'Either', false, 'Use website to pay bills - ***EXOTICS***', true
)
ON CONFLICT DO NOTHING;

-- Michigan State University (Geist)
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  location_code, department, cost_type,
  portal_url,
  browser_preference, vendor_info, is_active
) VALUES (
  'Michigan State University Lab (Geist)', 'Diagnostics & Reference Labs',
  'Michigan State University Veterinary Diagnostic Lab - Geist internal medicine',
  'https://vdl.msu.edu/Bin/Account.exe', 'mdi-flask', 'green',
  NULL, 'INTERNAL MED', NULL,
  'https://vdl.msu.edu/Bin/Account.exe',
  'Either', '***GEIST***', true
)
ON CONFLICT DO NOTHING;

-- Pharmgate
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  location_code, department, cost_type,
  account_number, contact_email,
  form_filled, vendor_info, is_active
) VALUES (
  'Pharmgate', 'Pharmacy & Compounding',
  'Veterinary pharmaceutical supplier - 3% fee, send link to pay',
  NULL, 'mdi-pill', 'teal',
  'AETNA', 'EXOTICS', 'PATIENTS',
  'C7625', 'mlarson@pharmgate.com',
  false, '3% send link to pay, we do it', true
)
ON CONFLICT DO NOTHING;

-- Review Tree
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  location_code, department, cost_type,
  portal_url, portal_username, portal_password,
  contact_name, contact_email, contact_phone,
  payment_method, form_filled, is_active
) VALUES (
  'Review Tree', 'Client Communication & Payment',
  'Review filtering and management program',
  'https://app.reviewtree.com/login', 'mdi-star', 'green',
  NULL, 'ALL OTHER', 'MED SUPPLIES',
  'https://app.reviewtree.com/login', 'mypetgladys@gmail.com', 'Goodreviews4m3!',
  'Michael Cody', 'mcody@reviewtree.com', '1 860-918-2774',
  'Monthly, auto', false, true
)
ON CONFLICT DO NOTHING;

-- Rx Pads dot Com
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  location_code, department, cost_type,
  portal_url, portal_username,
  form_filled, is_active
) VALUES (
  'RxPads.com', 'Other',
  'Prescription pad ordering',
  'https://rxpads.com', 'mdi-file-document', 'blue',
  'MVS ALL', 'ALL OTHER', 'MED SUPPLIES',
  'https://rxpads.com', 'greendogdeija@gmail.com',
  false, true
)
ON CONFLICT DO NOTHING;

-- Serona Zoomed
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  location_code, department, cost_type,
  portal_url, portal_username, portal_password,
  form_filled, is_active
) VALUES (
  'Serona (ZooMed)', 'Equipment & Hardware',
  'Exotic animal veterinary instruments and supplies',
  'https://serona.vet', 'mdi-needle', 'cyan',
  'AETNA', 'EXOTICS', 'MED SUPPLIES',
  'https://serona.vet', 'greendogdeija@gmail.com', '110490dml',
  false, true
)
ON CONFLICT DO NOTHING;

-- Tennessee University (Geist)
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  location_code, department, cost_type,
  portal_url, portal_username, portal_password,
  form_filled, vendor_info, notes, is_active
) VALUES (
  'University of Tennessee Lab (Geist)', 'Diagnostics & Reference Labs',
  'University of Tennessee Veterinary Diagnostic Lab - Geist internal medicine',
  'https://webhcs.vet.utk.edu/csp/rvp/rvpsignin.CSP', 'mdi-flask', 'orange',
  NULL, 'INTERNAL MED', 'MED SUPPLIES',
  'https://webhcs.vet.utk.edu/csp/rvp/rvpsignin.CSP', 'mypetchristina@gmail.com', 'Gr33n@D0g!!',
  false, '***GEIST***',
  'Has $18 next day FedEx labels, asked them to bill to email address', true
)
ON CONFLICT DO NOTHING;

-- Texas A&M Lab Portal (Geist)
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  location_code, department, cost_type,
  portal_url, portal_username, portal_password,
  form_filled, vendor_info, is_active
) VALUES (
  'Texas A&M Lab Portal (Geist)', 'Diagnostics & Reference Labs',
  'Texas A&M Veterinary Medical Diagnostic Lab - Geist internal medicine portal',
  'https://lims.tvmdl.tamu.edu/', 'mdi-flask', 'red',
  'VEN', 'INTERNAL MED', 'MED SUPPLIES',
  'https://lims.tvmdl.tamu.edu/', 'mypetchristina@gmail.com', 'Gr33n@91423!!',
  false, '***GEIST*** - Headquarters College Station 1-888-646-5623, Full service canyon 1-888-646-5624', true
)
ON CONFLICT DO NOTHING;

-- Texas A&M (from first sheet - has account number)
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  department, cost_type,
  account_number, vendor_info, is_active
) VALUES (
  'Texas A&M Lab (TVMDL)', 'Diagnostics & Reference Labs',
  'Texas A&M Veterinary Medical Diagnostic Lab - test ordering',
  'https://tvmdl.tamu.edu', 'mdi-flask', 'red',
  'INTERNAL MED', 'MED SUPPLIES',
  '38546',
  'Search tests: https://tvmdl.tamu.edu/?s=tli&species=&post_type=tests&test-submit=Search+Tests', true
)
ON CONFLICT DO NOTHING;

-- USPS
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  location_code, department, cost_type, has_cc_fees,
  portal_url, portal_username, portal_password,
  form_filled, vendor_info, is_active
) VALUES (
  'USPS', 'Other',
  'United States Postal Service - MPMV & GDD use',
  'https://usps.com', 'mdi-email-fast', 'blue',
  'MVS ALL', 'ALL OTHER', 'MED SUPPLIES', false,
  'https://usps.com', 'renvet29', '!Rugs9069738@',
  false, 'MPMV & GDD USE', true
)
ON CONFLICT DO NOTHING;

-- VDI Lab (Dr. Yoo)
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  location_code, department, cost_type,
  portal_url, portal_username, portal_password,
  contact_email, contact_phone,
  form_filled, vendor_info, is_active
) VALUES (
  'VDI Lab (Dr. Yoo)', 'Diagnostics & Reference Labs',
  'Veterinary diagnostic laboratory',
  'https://vdilab.com', 'mdi-flask', 'purple',
  'MVS ALL', 'ALL OTHER', 'MED SUPPLIES',
  'https://vdilab.com', 'info@greendogdental.com', '210mainst',
  'office@vdilab.com', '(805) 577-6742',
  false, '12/16/24 - CE PLEASE HAVE THEM BILL US, DO NOT PAY AT TIME OF ORDER / CE PAYS MONTH AT ONE TIME', true
)
ON CONFLICT DO NOTHING;

-- VGP Vet Growth Partners
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  location_code, department, cost_type,
  portal_url, portal_username, portal_password,
  form_filled, is_active
) VALUES (
  'VGP (Vet Growth Partners)', 'Client Communication & Payment',
  'Veterinary business growth and consulting platform',
  'https://vgpvet.com', 'mdi-chart-line', 'green',
  'MVS ALL', 'ALL OTHER', 'MED SUPPLIES',
  'https://vgpvet.com', 'greendogdeija@gmail.com', 'getmen-navqY8-cuhcac',
  false, true
)
ON CONFLICT DO NOTHING;

-- Uniform Advantage
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  location_code, department, cost_type, has_cc_fees,
  portal_url, portal_username, portal_password,
  contact_email, form_filled, vendor_info, is_active
) VALUES (
  'Uniform Advantage', 'Other',
  'Scrubs and medical uniforms supplier',
  'http://www.uniformadvantage.com/', 'mdi-tshirt-crew', 'pink',
  'MVS ALL', 'ALL OTHER', 'MED SUPPLIES', false,
  'http://www.uniformadvantage.com/', 'greendogrhette@gmail.com', 'Admin101gdd',
  'accountcoordinator@uacorporate.com', false, 'SCRUBS', true
)
ON CONFLICT DO NOTHING;

-- Universal Surgical
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  location_code, department, cost_type, has_cc_fees,
  contact_name, contact_phone,
  order_method, form_filled, vendor_info, is_active,
  products
) VALUES (
  'Universal Surgical', 'Equipment & Hardware',
  'Surgical instruments - call to order',
  NULL, 'mdi-needle', 'grey',
  'MVS ALL', 'ALL OTHER', 'MED SUPPLIES', false,
  'Brandon', '516-860-6468',
  'Phone (call to order)', false, 'CALL TO ORDER - Surgical instruments', true,
  ARRAY['Bandage Scissors', 'Periosteal Elevators', 'Needle Holders', 'Surgical Instruments']
)
ON CONFLICT DO NOTHING;

-- PetDx (All locations)
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  location_code, department,
  vendor_info, notes, is_active
) VALUES (
  'PetDx', 'Diagnostics & Reference Labs',
  'Cancer detection and diagnostics - separate accounts per location',
  NULL, 'mdi-test-tube', 'red',
  'MVS ALL', 'ALL OTHER',
  'All separate location accounts',
  'WEHO: PetDx-10327, SO: PETDX-10239, Santa Monica/VEN: PetDX-10328, MPMV: PETDX-10326, GDD & Wellness: PETDX-C152 (not actual account)', true
)
ON CONFLICT DO NOTHING;

-- Brasseler (Exotics)
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  department, cost_type,
  portal_url, portal_username, portal_password,
  form_filled, vendor_info, is_active
) VALUES (
  'Brasseler', 'Equipment & Hardware',
  'Dental and surgical instruments - Exotics department',
  'https://shop.brasselerusa.com', 'mdi-tooth', 'orange',
  'EXOTICS', 'MED SUPPLIES',
  'https://shop.brasselerusa.com', 'mypetchristina@gmail.com', 'Ex0tics@!',
  false, 'Login is for making payments only', true
)
ON CONFLICT DO NOTHING;

-- US Bank Copier
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  department, cost_type, has_cc_fees,
  portal_url, portal_username, portal_password,
  contact_name, contact_email, contact_phone,
  browser_preference, form_filled, vendor_info, is_active
) VALUES (
  'US Bank Copier (DiscoVers)', 'Other',
  'Copier lease payment portal through US Bank',
  'https://accountabilities.usbank.com/eportal/auth/login.faces', 'mdi-printer', 'grey',
  'ALL OTHER', 'MED SUPPLIES', false,
  'https://accountabilities.usbank.com/eportal/auth/login.faces', 'GDDCOPIER1', 'Copier@gdd123!',
  'Kerry', 'kerry@discopiers.com', '818-519-2100',
  'Safari', false, 'USE SAFARI SAVED AS BOOKMARK', true
)
ON CONFLICT DO NOTHING;

-- PSI Vet (from first sheet)
INSERT INTO public.med_ops_partners (
  name, category, description, icon, color,
  vendor_info, is_active
) VALUES (
  'PSI Vet', 'Other',
  'Veterinary purchasing/services - added 5/21/25',
  'mdi-factory', 'grey',
  'Today: 5/21/25', true
)
ON CONFLICT DO NOTHING;

-- McKesson (if not already present from seed data)
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  account_number, contact_name, contact_email, contact_phone,
  portal_url, portal_username, portal_password,
  order_method, payment_method,
  notes, is_active
) VALUES (
  'McKesson', 'Distributors',
  '$100 minimum order. Human medical supply company, rarely used. Good for PPE or if something is unavailable at normal suppliers.',
  'https://mms.mckesson.com/', 'mdi-truck-delivery', 'blue',
  '65653024', 'Morgan (no longer there)', 'morgan.ruziska@mckesson.com', '800-755-2090',
  'https://mms.mckesson.com/', 'bmakaryk', '.YMhS29dNh2X6sh',
  'Website', 'Website',
  'Account: MY PET MOBILE VET (Bill to) Ship to', true
)
ON CONFLICT DO NOTHING;

-- ================================================================
-- PART 3: Add Idexx contacts as partner_contacts
-- ================================================================

-- Get the Idexx Laboratories partner ID
DO $$
DECLARE
  v_idexx_id UUID;
BEGIN
  SELECT id INTO v_idexx_id FROM public.med_ops_partners WHERE name = 'Idexx Laboratories' LIMIT 1;
  
  IF v_idexx_id IS NOT NULL THEN
    -- Josh Pacheco - SO Rep & Overall Contact
    INSERT INTO public.med_ops_partner_contacts (partner_id, name, title, email, phone, is_primary, relationship_notes)
    VALUES (v_idexx_id, 'Josh Pacheco', 'SO Rep & Overall Contact', 'Josh-Pacheco@idexx.com', '323-823-0668', true, 'Sherman Oaks representative and overall account contact. Also handles printer/toner reorder (888.794.3399).')
    ON CONFLICT DO NOTHING;
    
    -- Stacia Oemig - Santa Monica Rep
    INSERT INTO public.med_ops_partner_contacts (partner_id, name, title, email, phone, is_primary, relationship_notes)
    VALUES (v_idexx_id, 'Stacia Oemig', 'Santa Monica Rep (may not be accurate)', 'Stacia-Oemig@idexx.com', '310-804-3289', false, 'Venice/Santa Monica area representative - info may not be current')
    ON CONFLICT DO NOTHING;
    
    -- Joel Crawford - Digital Rad Specialist
    INSERT INTO public.med_ops_partner_contacts (partner_id, name, title, email, phone, is_primary, relationship_notes)
    VALUES (v_idexx_id, 'Joel Crawford', 'Digital Radiography Specialist', 'Joel-Crawford@idexx.com', '916-292-0378', false, 'Specialist for digital radiography systems at all MVS locations')
    ON CONFLICT DO NOTHING;
    
    -- Jim Clark - Digital Rad Installer
    INSERT INTO public.med_ops_partner_contacts (partner_id, name, title, phone, is_primary, relationship_notes)
    VALUES (v_idexx_id, 'Jim Clark', 'Digital Radiography Installer', '760-429-5735', false, 'Handles installation of digital radiography equipment at all MVS locations')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ================================================================
-- PART 4: Add support contact entries as notes for Idexx
-- ================================================================

DO $$
DECLARE
  v_idexx_id UUID;
BEGIN
  SELECT id INTO v_idexx_id FROM public.med_ops_partners WHERE name = 'Idexx Laboratories' LIMIT 1;
  
  IF v_idexx_id IS NOT NULL THEN
    -- Update notes with support numbers consolidated
    UPDATE public.med_ops_partners
    SET notes = COALESCE(notes, '') || E'\n\nSupport Numbers:\n- Tech Support: 800-248-2483\n- Digital Radiography Support: 877-433-9948\n- Main customer service: 888-437-9987'
    WHERE id = v_idexx_id;
  END IF;
END $$;

-- ================================================================
-- PART 5: Office Supply vendors (from Office Supply sheet)
-- ================================================================

-- Amazon (office supplies)
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  portal_url, portal_username, portal_password,
  is_active
) VALUES (
  'Amazon', 'Other',
  'Online retail - office and general supplies',
  'https://www.amazon.com', 'mdi-shopping', 'orange',
  'http://www.amazon.com/gp/cart/view.html', 'mypetgladys@gmail.com', 'Youstink!12399',
  true
)
ON CONFLICT DO NOTHING;

-- AV Graphics (Printing)
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  contact_name, contact_phone, contact_email,
  vendor_info, is_active
) VALUES (
  'AV Graphics', 'Other',
  'Printing services - per Doc, use for all printing moving forward',
  'https://www.avgraphics.com/', 'mdi-printer', 'red',
  'Richard Jacobs', '818-678-6980', 'rjacobs@avgraphics.com',
  'Per Doc - wants us to use this company for all printing moving forward', true
)
ON CONFLICT DO NOTHING;

-- Just Food For Dogs
INSERT INTO public.med_ops_partners (
  name, category, description, icon, color,
  contact_name, contact_email,
  is_active
) VALUES (
  'Just Food For Dogs', 'Other',
  'Premium pet food supplier - partnership vendor',
  'mdi-food-drumstick', 'green',
  'Kristen / Norberto', 'kristenp@justfoodfordogs.com / norberto@justfoodfordogs.com',
  true
)
ON CONFLICT DO NOTHING;

-- UniFirst (uniforms/laundry service)
INSERT INTO public.med_ops_partners (
  name, category, description, icon, color,
  notes, is_active
) VALUES (
  'UniFirst', 'Other',
  'Uniform laundry service',
  'mdi-washing-machine', 'blue',
  '$83/weekly', true
)
ON CONFLICT DO NOTHING;

-- Ready Refresh (Water - VE)
INSERT INTO public.med_ops_partners (
  name, category, description, icon, color,
  location_code, contact_phone,
  portal_username, portal_password,
  account_number, notes, is_active
) VALUES (
  'Ready Refresh (Arrowhead Water)', 'Other',
  'Water delivery service - Arrowhead gallons. Check account for next delivery.',
  'mdi-water', 'blue',
  'MVS ALL', '1-800-274-5282',
  'greendogjackb@gmail.com', 'Rugby2012',
  'VE: #6702962190, SO: #0033831611',
  'Use Arrowhead for gallons. Sparkletts ONLY for dispenser (separate: 1-888-432-4823, costcowater@dsservices.com, acct 598475913099794, deliver to 4326 Colbath Ave Sherman Oaks CA 91423). Payments on autopay.', true
)
ON CONFLICT DO NOTHING;

-- RnF Signs
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  contact_name, contact_phone, contact_email,
  address, notes, is_active
) VALUES (
  'RnF Signs Inc.', 'Other',
  'Sign repair and maintenance - CA Lic# 1004002 (C-45)',
  'https://RnFSigns.com', 'mdi-sign-direction', 'orange',
  'Raul Marroquin', '626.991.9048', 'raul@rnfsigns.com',
  '13270 Moorpark Street (Corner of Fulton) Sherman Oaks, California 91423',
  'This is the company that fixed our Green Dog Sign - they repair the lights and such', true
)
ON CONFLICT DO NOTHING;

-- ThumbPrint (large format printing)
INSERT INTO public.med_ops_partners (
  name, category, description, website, icon, color,
  contact_name, contact_phone,
  vendor_info, is_active
) VALUES (
  'ThumbPrint Digital', 'Other',
  'Large format printing - tents, step and repeats, large banners',
  'https://www.tpdigital.com/', 'mdi-printer-3d', 'purple',
  'April Carter', 'o: 805.527.9491 / c: 805.432.3774',
  'Big items: tents, step and repeats, large banners', true
)
ON CONFLICT DO NOTHING;

-- Sound Vet (from Sell Us sheet)
-- Note: "Sound" already exists in seed data - update with contact info
UPDATE public.med_ops_partners
SET
  contact_name = 'Jeff Hayslip',
  contact_phone = '310-560-7832',
  contact_email = 'Jeffrey.Hayslip@soundvet.com',
  notes = COALESCE(notes, '') || E'\nPart of Antech. Products: Ultrasound, XR, Laser, CT.',
  updated_at = NOW()
WHERE name = 'Sound';

-- ================================================================
-- PART 6: Update categories list for the new vendor types
-- ================================================================
-- (No schema change needed - categories handled in frontend)

-- Done! Summary:
-- Updated: Idexx Laboratories, JorVet, McKesson, Sound
-- New Med Contacts: Auburn (MPMV), Auburn STAT PET TRAVEL, CAHFS, Cornell (Geist),
--   eBay, FedEx, Michigan State (Exotics), Michigan State (Geist), Pharmgate,
--   Review Tree, RxPads.com, Serona ZooMed, Tennessee (Geist), Texas A&M Portal (Geist),
--   Texas A&M (TVMDL), USPS, VDI Lab, VGP, Uniform Advantage, Universal Surgical,
--   PetDx, Brasseler, US Bank Copier, PSI Vet
-- New Office Supply: Amazon, AV Graphics, Just Food For Dogs, UniFirst,
--   Ready Refresh, RnF Signs, ThumbPrint Digital
-- New Idexx Contacts: Josh Pacheco, Stacia Oemig, Joel Crawford, Jim Clark
