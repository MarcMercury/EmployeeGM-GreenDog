-- Migration: Deduplicate med_ops_partners records
-- Date: 2026-03-10
-- Description: Many vendors ended up with multiple rows due to med_contacts
-- import creating new rows instead of matching existing ones (name mismatches).
-- This migration merges duplicate records, preserving all unique info.
--
-- Strategy per group:
--   1. Pick the best "keeper" record (most complete, or the one from original seed)
--   2. COALESCE all NULL fields on the keeper from duplicates
--   3. Append unique data from duplicates into keeper's notes field
--   4. Reassign partner_contacts and partner_notes to keeper
--   5. Delete duplicates

-- ================================================================
-- HELPER FUNCTION: merge one duplicate into a keeper
-- ================================================================
CREATE OR REPLACE FUNCTION _merge_partner_into(
  p_keeper_id UUID,
  p_dup_id UUID
) RETURNS void AS $$
DECLARE
  v_keeper RECORD;
  v_dup RECORD;
  v_extra TEXT := '';
BEGIN
  IF p_keeper_id = p_dup_id THEN RETURN; END IF;

  SELECT * INTO v_keeper FROM public.med_ops_partners WHERE id = p_keeper_id;
  SELECT * INTO v_dup FROM public.med_ops_partners WHERE id = p_dup_id;

  IF v_keeper IS NULL OR v_dup IS NULL THEN RETURN; END IF;

  -- Build a string of all unique info from the duplicate
  v_extra := E'\n--- Merged from: ' || v_dup.name || ' ---';
  IF v_dup.contact_name IS NOT NULL AND v_dup.contact_name IS DISTINCT FROM v_keeper.contact_name THEN
    v_extra := v_extra || E'\nContact: ' || v_dup.contact_name;
  END IF;
  IF v_dup.contact_email IS NOT NULL AND v_dup.contact_email IS DISTINCT FROM v_keeper.contact_email THEN
    v_extra := v_extra || E'\nEmail: ' || v_dup.contact_email;
  END IF;
  IF v_dup.contact_phone IS NOT NULL AND v_dup.contact_phone IS DISTINCT FROM v_keeper.contact_phone THEN
    v_extra := v_extra || E'\nPhone: ' || v_dup.contact_phone;
  END IF;
  IF v_dup.account_number IS NOT NULL AND v_dup.account_number IS DISTINCT FROM v_keeper.account_number THEN
    v_extra := v_extra || E'\nAccount #: ' || v_dup.account_number;
  END IF;
  IF v_dup.website IS NOT NULL AND v_dup.website IS DISTINCT FROM v_keeper.website THEN
    v_extra := v_extra || E'\nWebsite: ' || v_dup.website;
  END IF;
  IF v_dup.portal_url IS NOT NULL AND v_dup.portal_url IS DISTINCT FROM v_keeper.portal_url THEN
    v_extra := v_extra || E'\nPortal URL: ' || v_dup.portal_url;
  END IF;
  IF v_dup.portal_username IS NOT NULL AND v_dup.portal_username IS DISTINCT FROM v_keeper.portal_username THEN
    v_extra := v_extra || E'\nPortal User: ' || v_dup.portal_username;
  END IF;
  IF v_dup.portal_password IS NOT NULL AND v_dup.portal_password IS DISTINCT FROM v_keeper.portal_password THEN
    v_extra := v_extra || E'\nPortal Pass: ' || v_dup.portal_password;
  END IF;
  IF v_dup.order_method IS NOT NULL AND v_dup.order_method IS DISTINCT FROM v_keeper.order_method THEN
    v_extra := v_extra || E'\nOrder Method: ' || v_dup.order_method;
  END IF;
  IF v_dup.payment_method IS NOT NULL AND v_dup.payment_method IS DISTINCT FROM v_keeper.payment_method THEN
    v_extra := v_extra || E'\nPayment: ' || v_dup.payment_method;
  END IF;
  IF v_dup.location_code IS NOT NULL AND v_dup.location_code IS DISTINCT FROM v_keeper.location_code THEN
    v_extra := v_extra || E'\nLocation: ' || v_dup.location_code;
  END IF;
  IF v_dup.department IS NOT NULL AND v_dup.department IS DISTINCT FROM v_keeper.department THEN
    v_extra := v_extra || E'\nDepartment: ' || v_dup.department;
  END IF;
  IF v_dup.vendor_info IS NOT NULL AND v_dup.vendor_info IS DISTINCT FROM v_keeper.vendor_info THEN
    v_extra := v_extra || E'\nVendor Info: ' || v_dup.vendor_info;
  END IF;
  IF v_dup.description IS NOT NULL AND v_dup.description IS DISTINCT FROM v_keeper.description THEN
    v_extra := v_extra || E'\nDescription: ' || v_dup.description;
  END IF;
  IF v_dup.notes IS NOT NULL AND v_dup.notes IS DISTINCT FROM v_keeper.notes THEN
    v_extra := v_extra || E'\nNotes: ' || v_dup.notes;
  END IF;
  IF v_dup.browser_preference IS NOT NULL AND v_dup.browser_preference IS DISTINCT FROM v_keeper.browser_preference THEN
    v_extra := v_extra || E'\nBrowser: ' || v_dup.browser_preference;
  END IF;

  -- Fill keeper's NULL fields from duplicate (first non-null wins)
  UPDATE public.med_ops_partners SET
    contact_name       = COALESCE(contact_name, v_dup.contact_name),
    contact_email      = COALESCE(contact_email, v_dup.contact_email),
    contact_phone      = COALESCE(contact_phone, v_dup.contact_phone),
    account_number     = COALESCE(account_number, v_dup.account_number),
    website            = COALESCE(website, v_dup.website),
    portal_url         = COALESCE(portal_url, v_dup.portal_url),
    portal_username    = COALESCE(portal_username, v_dup.portal_username),
    portal_password    = COALESCE(portal_password, v_dup.portal_password),
    order_method       = COALESCE(order_method, v_dup.order_method),
    payment_method     = COALESCE(payment_method, v_dup.payment_method),
    location_code      = COALESCE(location_code, v_dup.location_code),
    department         = COALESCE(department, v_dup.department),
    browser_preference = COALESCE(browser_preference, v_dup.browser_preference),
    vendor_info        = COALESCE(vendor_info, v_dup.vendor_info),
    description        = COALESCE(description, v_dup.description),
    address            = COALESCE(address, v_dup.address),
    account_rep        = COALESCE(account_rep, v_dup.account_rep),
    cost_type          = COALESCE(cost_type, v_dup.cost_type),
    -- Append merged info to notes
    notes = COALESCE(notes, '') || v_extra,
    updated_at = NOW()
  WHERE id = p_keeper_id;

  -- Reassign child records
  UPDATE public.med_ops_partner_contacts SET partner_id = p_keeper_id WHERE partner_id = p_dup_id;
  UPDATE public.med_ops_partner_notes SET partner_id = p_keeper_id WHERE partner_id = p_dup_id;

  -- Delete the duplicate
  DELETE FROM public.med_ops_partners WHERE id = p_dup_id;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- HELPER FUNCTION: merge a group by name patterns into one keeper
-- The keeper is selected by: first match from preferred_names list,
-- or the record with the most non-null fields
-- ================================================================
CREATE OR REPLACE FUNCTION _dedup_partner_group(
  p_preferred_name TEXT,       -- exact name of the preferred keeper (or NULL)
  p_name_patterns TEXT[],      -- array of ILIKE patterns to match duplicates
  p_final_name TEXT DEFAULT NULL  -- optional: rename keeper to this
) RETURNS void AS $$
DECLARE
  v_keeper_id UUID;
  v_dup RECORD;
BEGIN
  -- Find the keeper: try preferred name first
  IF p_preferred_name IS NOT NULL THEN
    SELECT id INTO v_keeper_id
    FROM public.med_ops_partners
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(p_preferred_name))
    ORDER BY
      (CASE WHEN contact_name IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN contact_email IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN website IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN portal_url IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN account_number IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN notes IS NOT NULL THEN 1 ELSE 0 END) DESC
    LIMIT 1;
  END IF;

  -- If preferred name didn't match, pick the most complete record from the group
  IF v_keeper_id IS NULL THEN
    SELECT id INTO v_keeper_id
    FROM public.med_ops_partners
    WHERE name ILIKE ANY(p_name_patterns)
    ORDER BY
      (CASE WHEN contact_name IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN contact_email IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN contact_phone IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN website IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN portal_url IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN portal_username IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN account_number IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN notes IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN order_method IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN vendor_info IS NOT NULL THEN 1 ELSE 0 END) DESC
    LIMIT 1;
  END IF;

  IF v_keeper_id IS NULL THEN RETURN; END IF;

  -- Merge all other matching records into the keeper
  FOR v_dup IN
    SELECT id FROM public.med_ops_partners
    WHERE name ILIKE ANY(p_name_patterns)
      AND id != v_keeper_id
    ORDER BY created_at ASC
  LOOP
    PERFORM _merge_partner_into(v_keeper_id, v_dup.id);
  END LOOP;

  -- Optionally rename the keeper to a clean name
  IF p_final_name IS NOT NULL THEN
    UPDATE public.med_ops_partners SET name = p_final_name, updated_at = NOW()
    WHERE id = v_keeper_id;
  END IF;
END;
$$ LANGUAGE plpgsql;


-- ================================================================
-- EXECUTE DEDUP FOR EACH GROUP
-- ================================================================

-- 1. Airgas (2 rows: SO location + VE location)
SELECT _dedup_partner_group(
  'Airgas',
  ARRAY['Airgas'],
  'Airgas'
);

-- 2. Amazon (med_contacts rows + 269 insert)
SELECT _dedup_partner_group(
  'Amazon',
  ARRAY['Amazon'],
  'Amazon'
);

-- 3. MWI Animal Health / MWI (American Bergen...)
SELECT _dedup_partner_group(
  'MWI Animal Health',
  ARRAY['MWI Animal Health', 'MWI (American Bergen%', 'MWI%'],
  'MWI Animal Health'
);

-- 4. Victor Medical
SELECT _dedup_partner_group(
  'Victor Medical',
  ARRAY['Victor Medical%'],
  'Victor Medical'
);

-- 5. Patterson Veterinary (multiple login/payment entries)
SELECT _dedup_partner_group(
  'Patterson Veterinary',
  ARRAY['Patterson Veterinary%', 'Pattersons Log in%', 'Patterson Log in%', '4/11/2024 CE CALLED PATTERSONS%'],
  'Patterson Veterinary'
);

-- 6. Covetrus distributor (not Covetrus Pulse PIMS, not Covetrus/Road Runner compounding)
-- Only merge exact 'Covetrus' rows under MEDICAL SUPPLY DISTRIBUTORS
SELECT _dedup_partner_group(
  'Covetrus',
  ARRAY['Covetrus'],
  'Covetrus'
);

-- 7. Covetrus (previously Road Runner) + ROADRUNNER + Roadrunner Pharmacy
SELECT _dedup_partner_group(
  'Roadrunner Pharmacy',
  ARRAY['Roadrunner Pharmacy', 'ROADRUNNER', 'Covetrus (previously Road Runner)'],
  'Roadrunner Pharmacy (Covetrus Compounding)'
);

-- 8. Wedgewood Pharmacy + Wedgewood
SELECT _dedup_partner_group(
  'Wedgewood Pharmacy',
  ARRAY['Wedgewood Pharmacy', 'Wedgewood'],
  'Wedgewood Pharmacy'
);

-- 9. Midwest Veterinary Supply (2 rows)
SELECT _dedup_partner_group(
  NULL,
  ARRAY['Midwest Veterinary Supply'],
  'Midwest Veterinary Supply'
);

-- 10. MedWaste (2 rows: Hugo + Raymond)
SELECT _dedup_partner_group(
  NULL,
  ARRAY['MedWaste'],
  'MedWaste'
);

-- 11. SunTech (2 rows: Jackie + Tech Support)
SELECT _dedup_partner_group(
  NULL,
  ARRAY['SunTech'],
  'SunTech'
);

-- 12. Sonopath (2 rows: submissions vs reports portals)
SELECT _dedup_partner_group(
  NULL,
  ARRAY['Sonopath%'],
  'Sonopath'
);

-- 13. Mobile Animal CT (2 rows: Anna + Tita)
SELECT _dedup_partner_group(
  NULL,
  ARRAY['Mobile Animal CT'],
  'Mobile Animal CT'
);

-- 14. Coltene / COLTENE (2 rows)
SELECT _dedup_partner_group(
  NULL,
  ARRAY['Coltene', 'COLTENE'],
  'Coltene'
);

-- 15. Review Tree (from 269 + med_contacts)
SELECT _dedup_partner_group(
  'Review Tree',
  ARRAY['Review Tree'],
  'Review Tree'
);

-- 16. Uniform Advantage (from 269 + med_contacts)
SELECT _dedup_partner_group(
  NULL,
  ARRAY['Uniform Advantage'],
  'Uniform Advantage'
);

-- 17. Universal Surgical (from 269 + med_contacts)
SELECT _dedup_partner_group(
  NULL,
  ARRAY['Universal Surgical'],
  'Universal Surgical'
);

-- 18. VDI Lab (Dr. Yoo) / VDI Lab - Dr.Yoo
SELECT _dedup_partner_group(
  'VDI Lab (Dr. Yoo)',
  ARRAY['VDI Lab%'],
  'VDI Lab (Dr. Yoo)'
);

-- 19. VGP / VGP Vet Growth Partners / VGP (Vet Growth Partners)
SELECT _dedup_partner_group(
  'VGP (Vet Growth Partners)',
  ARRAY['VGP%'],
  'VGP (Vet Growth Partners)'
);

-- 20. FedEx / FEDEX
SELECT _dedup_partner_group(
  NULL,
  ARRAY['FedEx', 'FEDEX'],
  'FedEx'
);

-- 21. eBay / Ebay E Bay
SELECT _dedup_partner_group(
  'eBay',
  ARRAY['eBay', 'Ebay E Bay%'],
  'eBay'
);

-- 22. JorVet / Jorvet CE / JorVet MVSGDD
SELECT _dedup_partner_group(
  'JorVet',
  ARRAY['JorVet', 'Jorvet%', 'JorVet%'],
  'JorVet'
);

-- 23. PetDx / PetDx - All separate locations / PetDX All separate locations
SELECT _dedup_partner_group(
  'PetDx',
  ARRAY['PetDx%', 'PetDX%'],
  'PetDx'
);

-- 24. Brasseler / BRASSELER EXOTICS / Brasseler (login only...)
SELECT _dedup_partner_group(
  'Brasseler',
  ARRAY['Brasseler%', 'BRASSELER%'],
  'Brasseler'
);

-- 25. US Bank Copier / US Bank Copier (DiscoVers)
SELECT _dedup_partner_group(
  NULL,
  ARRAY['US Bank Copier%'],
  'US Bank Copier (DiscoVers)'
);

-- 26. Serona / SERONA ZOOMED / Serona Zoomed / Serona (ZooMed)
SELECT _dedup_partner_group(
  'Serona (ZooMed)',
  ARRAY['Serona%', 'SERONA%'],
  'Serona (ZooMed)'
);

-- 27. RxPads / RX PADS / Rx Pads dot Com / RxPads.com
SELECT _dedup_partner_group(
  'RxPads.com',
  ARRAY['RxPads%', 'RX PADS%', 'Rx Pads%'],
  'RxPads.com'
);

-- 28. Pharmgate (from 269 + med_contacts)
SELECT _dedup_partner_group(
  NULL,
  ARRAY['Pharmgate'],
  'Pharmgate'
);

-- 29. McKesson (from 269 + med_contacts variations)
SELECT _dedup_partner_group(
  'McKesson',
  ARRAY['McKesson%'],
  'McKesson'
);

-- 30. Cornell University labs (different name variants for same Geist lab)
SELECT _dedup_partner_group(
  'Cornell University Lab (Geist)',
  ARRAY['Cornell University Lab (Geist)', 'Lab Geist - Cornell University', 'Cornell University %GEIST%'],
  'Cornell University Lab (Geist)'
);

-- 31. Michigan State - Exotics group
SELECT _dedup_partner_group(
  'Michigan State University Lab (Exotics)',
  ARRAY['Michigan State University Lab (Exotics)', 'Michigan State Uni %EXOTICS%', 'Lab Geist - MSU Michigan State University'],
  'Michigan State University Lab (Exotics)'
);

-- 32. Michigan State - Geist group (separate from exotics)
SELECT _dedup_partner_group(
  'Michigan State University Lab (Geist)',
  ARRAY['Michigan State University Lab (Geist)', 'Michigan State Uni %GEIST%'],
  'Michigan State University Lab (Geist)'
);

-- 33. Texas A&M Lab (TVMDL) + Lab Geist - Texas A&M
SELECT _dedup_partner_group(
  'Texas A&M Lab (TVMDL)',
  ARRAY['Texas A&M Lab (TVMDL)', 'Lab Geist - Texas A&M'],
  'Texas A&M Lab (TVMDL)'
);

-- 34. Texas A&M Lab Portal (Geist) + Lab Geist - Texas A&M PORTAL + Texas A&M Lab PORTAL ***GEIST***
SELECT _dedup_partner_group(
  'Texas A&M Lab Portal (Geist)',
  ARRAY['Texas A&M Lab Portal%', 'Lab Geist - Texas A&M PORTAL%', 'Texas A&M Lab PORTAL %GEIST%'],
  'Texas A&M Lab Portal (Geist)'
);

-- 35. University of Tennessee Lab (Geist) + Lab Geist - U of Tennessee + Tennessee University...
SELECT _dedup_partner_group(
  'University of Tennessee Lab (Geist)',
  ARRAY['University of Tennessee Lab%', 'Lab Geist - U of Tennessee%', 'Tennessee University%'],
  'University of Tennessee Lab (Geist)'
);

-- 36. CAHFS
SELECT _dedup_partner_group(
  'CAHFS California Animal Health & Food Safety Lab',
  ARRAY['CAHFS%'],
  'CAHFS California Animal Health & Food Safety Lab'
);

-- 37. Auburn - MPMV group: Auburn University (MPMV) + Auburn FOR MPMV + MPMV AUBURN
SELECT _dedup_partner_group(
  'Auburn University (MPMV)',
  ARRAY['Auburn University (MPMV)', 'Auburn FOR MPMV', 'MPMV AUBURN'],
  'Auburn University (MPMV)'
);

-- 38. Auburn STAT PET TRAVEL + Auburn University - STAT FAVN + Auburn STAT PET TRAVEL Deija
SELECT _dedup_partner_group(
  'Auburn STAT PET TRAVEL',
  ARRAY['Auburn STAT PET TRAVEL%', 'Auburn University - STAT FAVN%'],
  'Auburn STAT PET TRAVEL'
);

-- 39. USPS / USPS United States Postal Service
SELECT _dedup_partner_group(
  NULL,
  ARRAY['USPS%'],
  'USPS'
);

-- 40. Heska + Heska Mark Corwin (same company, Corwin is a contact)
SELECT _dedup_partner_group(
  'Heska',
  ARRAY['Heska%'],
  'Heska'
);

-- 41. AV Graphics (from 269 + med_contacts)
SELECT _dedup_partner_group(
  NULL,
  ARRAY['AV Graphics'],
  'AV Graphics'
);

-- 42. Elanco + Bayer / Elanco (these are now the same company)
SELECT _dedup_partner_group(
  NULL,
  ARRAY['Elanco', 'Bayer / Elanco', 'Bayer /Elanco'],
  'Elanco (formerly Bayer)'
);

-- 43. VetImmune / VetIMMUNE (separate from Idexx VetImmune portal entries)
SELECT _dedup_partner_group(
  NULL,
  ARRAY['VetImmune', 'VetIMMUNE'],
  'VetImmune'
);

-- 44. Mixlab / MIXLAB
SELECT _dedup_partner_group(
  'Mixlab',
  ARRAY['Mixlab', 'MIXLAB'],
  'Mixlab'
);

-- 45. iM3 (from 095 seed + med_contacts)
SELECT _dedup_partner_group(
  'iM3',
  ARRAY['iM3'],
  'iM3'
);

-- 46. Zoetis (from 095 seed, may have duplicates from med_contacts if merge didn't match)
SELECT _dedup_partner_group(
  'Zoetis',
  ARRAY['Zoetis'],
  'Zoetis'
);

-- 47. IDEXX sub-records: merge the "General" rows (account numbers for different locations)
-- These are 4 rows all named "General" with IDEXX category - merge into Idexx Laboratories
DO $$
DECLARE
  v_idexx_id UUID;
  v_dup RECORD;
BEGIN
  SELECT id INTO v_idexx_id FROM public.med_ops_partners
  WHERE name = 'Idexx Laboratories' LIMIT 1;

  IF v_idexx_id IS NOT NULL THEN
    FOR v_dup IN
      SELECT id FROM public.med_ops_partners
      WHERE name = 'General' AND id != v_idexx_id
    LOOP
      PERFORM _merge_partner_into(v_idexx_id, v_dup.id);
    END LOOP;
  END IF;
END $$;

-- 48. IDEXX sub-records: merge VetConnect Plus rows into Idexx Laboratories
DO $$
DECLARE
  v_idexx_id UUID;
  v_dup RECORD;
BEGIN
  SELECT id INTO v_idexx_id FROM public.med_ops_partners
  WHERE name = 'Idexx Laboratories' LIMIT 1;

  IF v_idexx_id IS NOT NULL THEN
    FOR v_dup IN
      SELECT id FROM public.med_ops_partners
      WHERE name = 'VetConnect Plus' AND id != v_idexx_id
    LOOP
      PERFORM _merge_partner_into(v_idexx_id, v_dup.id);
    END LOOP;
  END IF;
END $$;

-- 49. IDEXX sub-records: merge Idexx-named contact/support entries into Idexx Laboratories
-- (These are separate med_contacts entries for reps, support lines, etc.)
DO $$
DECLARE
  v_idexx_id UUID;
  v_dup RECORD;
BEGIN
  SELECT id INTO v_idexx_id FROM public.med_ops_partners
  WHERE name = 'Idexx Laboratories' LIMIT 1;

  IF v_idexx_id IS NOT NULL THEN
    FOR v_dup IN
      SELECT id FROM public.med_ops_partners
      WHERE (
        name ILIKE 'Idexx%'
        OR name ILIKE 'Vet Med Stat%'
        OR name ILIKE 'VetMedStat%'
        OR name = 'Sherman Oaks Rep'
        OR name = 'Santa Monica Rep'
        OR name = 'Digital Rad Specialist'
        OR name = 'Digital Rad Installer'
        OR name = 'Tech Support'
        OR name = 'Digital Radiography Support'
      )
      AND name NOT IN ('Idexx Laboratories', 'Idexx Cornerstone', 'Idexx Neo')
      AND id != v_idexx_id
    LOOP
      PERFORM _merge_partner_into(v_idexx_id, v_dup.id);
    END LOOP;
  END IF;
END $$;

-- 50. PetDx - All separate locations rows have location account numbers
-- Already handled in group 23 above

-- 51. Kansas State FAVN + Auburn University STAT FAVN
-- These are different entities (Kansas State vs Auburn), keep separate

-- 52. Cislak or Zoll dental - standalone, no duplicate

-- 53. CopyHub - standalone, no duplicate


-- ================================================================
-- CLEANUP: Drop helper functions
-- ================================================================
DROP FUNCTION IF EXISTS _dedup_partner_group(TEXT, TEXT[], TEXT);
DROP FUNCTION IF EXISTS _merge_partner_into(UUID, UUID);

-- ================================================================
-- FINAL: Clean up any remaining exact-name duplicates we may have missed
-- (safety net: if two+ rows share the exact same LOWER(name), merge them)
-- ================================================================
DO $$
DECLARE
  v_group RECORD;
  v_keeper_id UUID;
  v_dup RECORD;
BEGIN
  FOR v_group IN
    SELECT LOWER(TRIM(name)) AS norm_name, COUNT(*) AS cnt
    FROM public.med_ops_partners
    GROUP BY LOWER(TRIM(name))
    HAVING COUNT(*) > 1
  LOOP
    -- Pick keeper: most populated record
    SELECT id INTO v_keeper_id
    FROM public.med_ops_partners
    WHERE LOWER(TRIM(name)) = v_group.norm_name
    ORDER BY
      (CASE WHEN contact_name IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN contact_email IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN contact_phone IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN website IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN portal_url IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN portal_username IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN account_number IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN notes IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN order_method IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN vendor_info IS NOT NULL THEN 1 ELSE 0 END) DESC,
      created_at ASC
    LIMIT 1;

    -- Merge all others into keeper
    FOR v_dup IN
      SELECT * FROM public.med_ops_partners
      WHERE LOWER(TRIM(name)) = v_group.norm_name
        AND id != v_keeper_id
      ORDER BY created_at ASC
    LOOP
      -- Build extra info
      DECLARE
        v_extra TEXT := E'\n--- Merged from: ' || v_dup.name || ' ---';
      BEGIN
        IF v_dup.contact_name IS NOT NULL THEN v_extra := v_extra || E'\nContact: ' || v_dup.contact_name; END IF;
        IF v_dup.contact_email IS NOT NULL THEN v_extra := v_extra || E'\nEmail: ' || v_dup.contact_email; END IF;
        IF v_dup.contact_phone IS NOT NULL THEN v_extra := v_extra || E'\nPhone: ' || v_dup.contact_phone; END IF;
        IF v_dup.account_number IS NOT NULL THEN v_extra := v_extra || E'\nAccount #: ' || v_dup.account_number; END IF;
        IF v_dup.website IS NOT NULL THEN v_extra := v_extra || E'\nWebsite: ' || v_dup.website; END IF;
        IF v_dup.portal_url IS NOT NULL THEN v_extra := v_extra || E'\nPortal URL: ' || v_dup.portal_url; END IF;
        IF v_dup.portal_username IS NOT NULL THEN v_extra := v_extra || E'\nPortal User: ' || v_dup.portal_username; END IF;
        IF v_dup.portal_password IS NOT NULL THEN v_extra := v_extra || E'\nPortal Pass: ' || v_dup.portal_password; END IF;
        IF v_dup.order_method IS NOT NULL THEN v_extra := v_extra || E'\nOrder Method: ' || v_dup.order_method; END IF;
        IF v_dup.payment_method IS NOT NULL THEN v_extra := v_extra || E'\nPayment: ' || v_dup.payment_method; END IF;
        IF v_dup.vendor_info IS NOT NULL THEN v_extra := v_extra || E'\nVendor Info: ' || v_dup.vendor_info; END IF;
        IF v_dup.notes IS NOT NULL THEN v_extra := v_extra || E'\nNotes: ' || v_dup.notes; END IF;

        UPDATE public.med_ops_partners SET
          contact_name       = COALESCE(contact_name, v_dup.contact_name),
          contact_email      = COALESCE(contact_email, v_dup.contact_email),
          contact_phone      = COALESCE(contact_phone, v_dup.contact_phone),
          account_number     = COALESCE(account_number, v_dup.account_number),
          website            = COALESCE(website, v_dup.website),
          portal_url         = COALESCE(portal_url, v_dup.portal_url),
          portal_username    = COALESCE(portal_username, v_dup.portal_username),
          portal_password    = COALESCE(portal_password, v_dup.portal_password),
          order_method       = COALESCE(order_method, v_dup.order_method),
          payment_method     = COALESCE(payment_method, v_dup.payment_method),
          location_code      = COALESCE(location_code, v_dup.location_code),
          department         = COALESCE(department, v_dup.department),
          browser_preference = COALESCE(browser_preference, v_dup.browser_preference),
          vendor_info        = COALESCE(vendor_info, v_dup.vendor_info),
          description        = COALESCE(description, v_dup.description),
          notes = COALESCE(notes, '') || v_extra,
          updated_at = NOW()
        WHERE id = v_keeper_id;

        -- Reassign children
        UPDATE public.med_ops_partner_contacts SET partner_id = v_keeper_id WHERE partner_id = v_dup.id;
        UPDATE public.med_ops_partner_notes SET partner_id = v_keeper_id WHERE partner_id = v_dup.id;

        DELETE FROM public.med_ops_partners WHERE id = v_dup.id;
      END;
    END LOOP;
  END LOOP;
END $$;
