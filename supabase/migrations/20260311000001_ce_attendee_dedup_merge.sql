-- =====================================================
-- CE Attendee Deduplication & Merge
-- 
-- Problem: Each CE event signup creates a separate education_visitors row.
-- Solution: Merge duplicates into single contacts linked via ce_event_attendees.
-- =====================================================

-- Step 1: Add index on email for faster duplicate lookups
CREATE INDEX IF NOT EXISTS idx_education_visitors_email 
  ON education_visitors(email) WHERE email IS NOT NULL;

-- Step 2: RPC function to find CE attendee duplicates (by email or last_name)
CREATE OR REPLACE FUNCTION find_ce_attendee_duplicates()
RETURNS TABLE (
  email TEXT,
  last_name TEXT,
  duplicate_count BIGINT,
  visitor_ids UUID[]
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    LOWER(ev.email) AS email,
    LOWER(ev.last_name) AS last_name,
    COUNT(*) AS duplicate_count,
    ARRAY_AGG(ev.id ORDER BY ev.created_at ASC) AS visitor_ids
  FROM education_visitors ev
  WHERE ev.visitor_type = 'ce_attendee'
    AND ev.email IS NOT NULL
    AND ev.email != ''
  GROUP BY LOWER(ev.email), LOWER(ev.last_name)
  HAVING COUNT(*) > 1
  ORDER BY COUNT(*) DESC;
$$;

-- Step 3: RPC function to merge duplicate CE attendees
-- Keeps the oldest record (first created), reassigns all ce_event_attendees, then deletes duplicates
CREATE OR REPLACE FUNCTION merge_ce_attendee_duplicates(p_visitor_ids UUID[])
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_primary_id UUID;
  v_dup_id UUID;
  v_merged_count INT := 0;
  v_events_reassigned INT := 0;
  v_row_count INT;
BEGIN
  -- The first ID (oldest) becomes the primary record
  v_primary_id := p_visitor_ids[1];

  -- Clear the ce_event_id from the primary record (we use the join table now)
  UPDATE education_visitors 
  SET ce_event_id = NULL 
  WHERE id = v_primary_id;

  -- Loop through duplicate IDs (skip the first/primary)
  FOR i IN 2..array_length(p_visitor_ids, 1) LOOP
    v_dup_id := p_visitor_ids[i];
    
    -- Reassign ce_event_attendees from duplicate to primary
    -- But only if the primary isn't already linked to that event
    UPDATE ce_event_attendees 
    SET visitor_id = v_primary_id
    WHERE visitor_id = v_dup_id
      AND ce_event_id NOT IN (
        SELECT ce_event_id FROM ce_event_attendees WHERE visitor_id = v_primary_id
      );
    
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    v_events_reassigned := v_events_reassigned + v_row_count;
    
    -- Delete ce_event_attendees that would be duplicates after merge
    DELETE FROM ce_event_attendees 
    WHERE visitor_id = v_dup_id;
    
    -- Delete the duplicate visitor record
    DELETE FROM education_visitors WHERE id = v_dup_id;
    
    v_merged_count := v_merged_count + 1;
  END LOOP;

  RETURN json_build_object(
    'primary_id', v_primary_id,
    'merged_count', v_merged_count,
    'events_reassigned', v_events_reassigned
  );
END;
$$;

-- Step 4: RPC to get CE events attended by a specific visitor
CREATE OR REPLACE FUNCTION get_visitor_ce_events(p_visitor_id UUID)
RETURNS TABLE (
  event_id UUID,
  event_title TEXT,
  event_date_start DATE,
  checked_in BOOLEAN,
  certificate_issued BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    ce.id AS event_id,
    ce.title AS event_title,
    ce.event_date_start,
    cea.checked_in,
    cea.certificate_issued
  FROM ce_event_attendees cea
  JOIN ce_events ce ON ce.id = cea.ce_event_id
  WHERE cea.visitor_id = p_visitor_id
  ORDER BY ce.event_date_start DESC;
$$;

-- Step 5: Batch dedup — automatically merge all CE attendee duplicates
-- Run this once to clean up existing data
DO $$
DECLARE
  dup_record RECORD;
  merge_result JSON;
  total_merged INT := 0;
BEGIN
  FOR dup_record IN 
    SELECT 
      LOWER(ev.email) AS email,
      ARRAY_AGG(ev.id ORDER BY ev.created_at ASC) AS visitor_ids,
      COUNT(*) AS cnt
    FROM education_visitors ev
    WHERE ev.visitor_type = 'ce_attendee'
      AND ev.email IS NOT NULL
      AND ev.email != ''
    GROUP BY LOWER(ev.email)
    HAVING COUNT(*) > 1
  LOOP
    -- Merge: keep first (oldest), reassign attendees, delete rest
    PERFORM merge_ce_attendee_duplicates(dup_record.visitor_ids);
    total_merged := total_merged + (dup_record.cnt - 1);
  END LOOP;
  
  RAISE NOTICE 'CE Attendee dedup complete. Merged % duplicate records.', total_merged;
END;
$$;

-- Step 6: Clear ce_event_id from remaining CE attendees 
-- (they should use the join table instead)
UPDATE education_visitors 
SET ce_event_id = NULL 
WHERE visitor_type = 'ce_attendee' 
  AND ce_event_id IS NOT NULL;
