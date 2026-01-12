-- =====================================================
-- Migration: Fix backfill_unified_persons function
-- Issue: Duplicate emails could exist across source tables
-- =====================================================

CREATE OR REPLACE FUNCTION public.backfill_unified_persons()
RETURNS TABLE(
  source_table TEXT,
  records_processed INTEGER,
  records_created INTEGER,
  duplicates_skipped INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed INTEGER := 0;
  v_created INTEGER := 0;
  v_skipped INTEGER := 0;
  v_record RECORD;
  v_new_id UUID;
BEGIN
  -- Backfill from candidates (deduplicated by email, taking earliest)
  FOR v_record IN
    SELECT DISTINCT ON (LOWER(c.email))
      c.first_name, c.last_name, c.preferred_name, c.email, c.email_personal,
      c.phone_mobile, c.phone_work, c.address_line1, c.address_line2,
      c.city, c.state, c.postal_code, c.date_of_birth,
      c.emergency_contact_name, c.emergency_contact_phone, c.emergency_contact_relationship,
      c.avatar_url,
      CASE 
        WHEN c.status = 'hired' THEN 'hired'::person_lifecycle_stage
        ELSE 'applicant'::person_lifecycle_stage
      END as stage,
      c.source, c.referral_source,
      c.id, c.created_at
    FROM candidates c
    WHERE c.email IS NOT NULL
    ORDER BY LOWER(c.email), c.created_at ASC
  LOOP
    v_processed := v_processed + 1;
    
    -- Check if email already exists
    IF NOT EXISTS (SELECT 1 FROM unified_persons up WHERE LOWER(up.email) = LOWER(v_record.email)) THEN
      INSERT INTO unified_persons (
        first_name, last_name, preferred_name, email, email_secondary,
        phone_mobile, phone_work, address_line1, address_line2,
        city, state, postal_code, date_of_birth,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
        avatar_url, current_stage, source_type, referral_source,
        candidate_id, is_active, created_at
      ) VALUES (
        v_record.first_name, v_record.last_name, v_record.preferred_name, 
        v_record.email, v_record.email_personal,
        v_record.phone_mobile, v_record.phone_work, v_record.address_line1, v_record.address_line2,
        v_record.city, v_record.state, v_record.postal_code, v_record.date_of_birth,
        v_record.emergency_contact_name, v_record.emergency_contact_phone, v_record.emergency_contact_relationship,
        v_record.avatar_url, v_record.stage, v_record.source, v_record.referral_source,
        v_record.id, true, v_record.created_at
      )
      RETURNING id INTO v_new_id;
      
      IF v_new_id IS NOT NULL THEN
        v_created := v_created + 1;
      ELSE
        v_skipped := v_skipped + 1;
      END IF;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;
  
  source_table := 'candidates';
  records_processed := v_processed;
  records_created := v_created;
  duplicates_skipped := v_skipped;
  RETURN NEXT;
  
  -- Reset counters
  v_processed := 0;
  v_created := 0;
  v_skipped := 0;
  
  -- Backfill from education_visitors (deduplicated by email)
  FOR v_record IN
    SELECT DISTINCT ON (LOWER(ev.email))
      ev.first_name, ev.last_name, ev.email, ev.phone,
      ev.lead_source, ev.referral_name,
      ev.id, ev.is_active, ev.created_at
    FROM education_visitors ev
    WHERE ev.email IS NOT NULL
    ORDER BY LOWER(ev.email), ev.created_at ASC
  LOOP
    v_processed := v_processed + 1;
    
    IF NOT EXISTS (SELECT 1 FROM unified_persons up WHERE LOWER(up.email) = LOWER(v_record.email)) THEN
      INSERT INTO unified_persons (
        first_name, last_name, email, phone_mobile,
        current_stage, source_type, referral_source,
        education_visitor_id, is_active, created_at
      ) VALUES (
        v_record.first_name, v_record.last_name, v_record.email, v_record.phone,
        'student'::person_lifecycle_stage,
        v_record.lead_source, v_record.referral_name,
        v_record.id, v_record.is_active, v_record.created_at
      )
      RETURNING id INTO v_new_id;
      
      IF v_new_id IS NOT NULL THEN
        v_created := v_created + 1;
      ELSE
        v_skipped := v_skipped + 1;
      END IF;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;
  
  source_table := 'education_visitors';
  records_processed := v_processed;
  records_created := v_created;
  duplicates_skipped := v_skipped;
  RETURN NEXT;
  
  -- Reset counters
  v_processed := 0;
  v_created := 0;
  v_skipped := 0;
  
  -- Backfill from marketing_leads (deduplicated by email)
  FOR v_record IN
    SELECT DISTINCT ON (LOWER(ml.email))
      ml.first_name, ml.last_name, ml.email, ml.phone,
      ml.source,
      ml.id, ml.created_at
    FROM marketing_leads ml
    WHERE ml.email IS NOT NULL
    ORDER BY LOWER(ml.email), ml.created_at ASC
  LOOP
    v_processed := v_processed + 1;
    
    IF NOT EXISTS (SELECT 1 FROM unified_persons up WHERE LOWER(up.email) = LOWER(v_record.email)) THEN
      INSERT INTO unified_persons (
        first_name, last_name, email, phone_mobile,
        current_stage, source_type,
        marketing_lead_id, is_active, created_at
      ) VALUES (
        v_record.first_name, v_record.last_name, v_record.email, v_record.phone,
        'lead'::person_lifecycle_stage,
        v_record.source,
        v_record.id, true, v_record.created_at
      )
      RETURNING id INTO v_new_id;
      
      IF v_new_id IS NOT NULL THEN
        v_created := v_created + 1;
      ELSE
        v_skipped := v_skipped + 1;
      END IF;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;
  
  source_table := 'marketing_leads';
  records_processed := v_processed;
  records_created := v_created;
  duplicates_skipped := v_skipped;
  RETURN NEXT;

  -- Reset counters
  v_processed := 0;
  v_created := 0;
  v_skipped := 0;
  
  -- Backfill employees (deduplicated by email, as employee stage with profile link)
  FOR v_record IN
    SELECT DISTINCT ON (LOWER(COALESCE(e.email_work, e.email_personal)))
      e.first_name, e.last_name, e.preferred_name,
      COALESCE(e.email_work, e.email_personal) as email, 
      e.email_personal as email_secondary,
      e.phone_mobile, e.phone_work,
      e.date_of_birth, 
      CASE 
        WHEN e.employment_status = 'terminated' THEN 'alumni'::person_lifecycle_stage
        ELSE 'employee'::person_lifecycle_stage
      END as stage,
      e.id, e.profile_id, 
      e.employment_status != 'terminated' as is_active,
      e.created_at
    FROM employees e
    WHERE COALESCE(e.email_work, e.email_personal) IS NOT NULL
    ORDER BY LOWER(COALESCE(e.email_work, e.email_personal)), e.created_at ASC
  LOOP
    v_processed := v_processed + 1;
    
    IF NOT EXISTS (SELECT 1 FROM unified_persons up WHERE LOWER(up.email) = LOWER(v_record.email)) THEN
      INSERT INTO unified_persons (
        first_name, last_name, preferred_name, 
        email, email_secondary, phone_mobile, phone_work,
        date_of_birth, current_stage,
        employee_id, profile_id, is_active, created_at
      ) VALUES (
        v_record.first_name, v_record.last_name, v_record.preferred_name,
        v_record.email, v_record.email_secondary,
        v_record.phone_mobile, v_record.phone_work,
        v_record.date_of_birth, v_record.stage,
        v_record.id, v_record.profile_id, 
        v_record.is_active,
        v_record.created_at
      )
      RETURNING id INTO v_new_id;
      
      IF v_new_id IS NOT NULL THEN
        v_created := v_created + 1;
      ELSE
        v_skipped := v_skipped + 1;
      END IF;
    ELSE
      -- Update existing record to link employee_id if not set
      UPDATE unified_persons 
      SET 
        employee_id = COALESCE(employee_id, v_record.id),
        profile_id = COALESCE(profile_id, v_record.profile_id),
        current_stage = CASE 
          WHEN current_stage IN ('visitor', 'lead', 'student', 'applicant', 'hired') 
          THEN v_record.stage 
          ELSE current_stage 
        END,
        is_active = v_record.is_active
      WHERE LOWER(email) = LOWER(v_record.email);
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;
  
  source_table := 'employees';
  records_processed := v_processed;
  records_created := v_created;
  duplicates_skipped := v_skipped;
  RETURN NEXT;
  
END;
$$;

-- Grant permissions
REVOKE EXECUTE ON FUNCTION public.backfill_unified_persons FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_unified_persons TO authenticated;
