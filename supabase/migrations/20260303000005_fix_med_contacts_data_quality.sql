-- Migration: Clean up misplaced data in med_contacts
-- Fixes: emails in contact_phone column, phone numbers in contact_name column,
-- and strips non-phone characters from phone numbers where possible

-- =====================================================
-- STEP 1: Move pure emails from contact_phone to contact_email
-- (where contact_phone contains an @ and no digits, or is purely an email)
-- =====================================================
UPDATE public.med_contacts
SET
  contact_email = COALESCE(contact_email, '') ||
    CASE WHEN contact_email IS NOT NULL AND contact_email != '' THEN ', ' ELSE '' END ||
    contact_phone,
  contact_phone = NULL
WHERE contact_phone IS NOT NULL
  AND contact_phone LIKE '%@%.%'
  AND contact_phone NOT LIKE '%[0-9][0-9][0-9]%'
  AND LENGTH(REGEXP_REPLACE(contact_phone, '[^0-9]', '', 'g')) < 7;

-- =====================================================
-- STEP 2: For phone fields that have an email embedded alongside a phone number,
-- extract the email portion into contact_email if contact_email is null
-- e.g. "1-877-352-6261 x 4 x 1 (elanco_payments@elancoAH.com) 805-551-2379"
-- =====================================================
UPDATE public.med_contacts
SET
  contact_email = COALESCE(contact_email,
    (REGEXP_MATCH(contact_phone, '([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'))[1]
  )
WHERE contact_phone IS NOT NULL
  AND contact_phone LIKE '%@%'
  AND contact_email IS NULL;

-- =====================================================
-- STEP 3: Move phone numbers from contact_name to contact_phone
-- For records where contact_name is purely a phone number
-- e.g. "(805) 577-6742"
-- =====================================================
UPDATE public.med_contacts
SET
  contact_phone = COALESCE(contact_phone, contact_name),
  contact_name = NULL
WHERE contact_name IS NOT NULL
  AND contact_phone IS NULL
  AND LENGTH(REGEXP_REPLACE(contact_name, '[^0-9]', '', 'g')) >= 7
  AND LENGTH(REGEXP_REPLACE(contact_name, '[^0-9]', '', 'g')) <= 11
  AND contact_name NOT LIKE '%@%'
  AND LENGTH(contact_name) < 20;

-- =====================================================
-- STEP 4: For contact_name that has an email, move the email part
-- e.g. "CSSSD@airgas.com" in contact_name
-- =====================================================
UPDATE public.med_contacts
SET
  contact_email = COALESCE(contact_email, contact_name),
  contact_name = NULL
WHERE contact_name IS NOT NULL
  AND contact_name LIKE '%@%.%'
  AND contact_email IS NULL
  AND LENGTH(contact_name) < 50;

-- =====================================================
-- STEP 5: Now apply same fixes to med_ops_partners
-- (since we merged data, same issues exist there)
-- =====================================================

-- Emails in contact_phone -> contact_email
UPDATE public.med_ops_partners
SET
  contact_email = COALESCE(contact_email, '') ||
    CASE WHEN contact_email IS NOT NULL AND contact_email != '' THEN ', ' ELSE '' END ||
    contact_phone,
  contact_phone = NULL
WHERE contact_phone IS NOT NULL
  AND contact_phone LIKE '%@%.%'
  AND contact_phone NOT LIKE '%[0-9][0-9][0-9]%'
  AND LENGTH(REGEXP_REPLACE(contact_phone, '[^0-9]', '', 'g')) < 7;

-- Extract embedded emails from contact_phone
UPDATE public.med_ops_partners
SET
  contact_email = COALESCE(contact_email,
    (REGEXP_MATCH(contact_phone, '([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'))[1]
  )
WHERE contact_phone IS NOT NULL
  AND contact_phone LIKE '%@%'
  AND contact_email IS NULL;

-- Phone numbers in contact_name -> contact_phone
UPDATE public.med_ops_partners
SET
  contact_phone = COALESCE(contact_phone, contact_name),
  contact_name = NULL
WHERE contact_name IS NOT NULL
  AND contact_phone IS NULL
  AND LENGTH(REGEXP_REPLACE(contact_name, '[^0-9]', '', 'g')) >= 7
  AND LENGTH(REGEXP_REPLACE(contact_name, '[^0-9]', '', 'g')) <= 11
  AND contact_name NOT LIKE '%@%'
  AND LENGTH(contact_name) < 20;

-- Emails in contact_name -> contact_email
UPDATE public.med_ops_partners
SET
  contact_email = COALESCE(contact_email, contact_name),
  contact_name = NULL
WHERE contact_name IS NOT NULL
  AND contact_name LIKE '%@%.%'
  AND contact_email IS NULL
  AND LENGTH(contact_name) < 50;
