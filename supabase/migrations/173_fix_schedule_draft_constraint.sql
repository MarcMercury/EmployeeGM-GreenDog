-- ============================================================================
-- MIGRATION 173: Fix Schedule Draft Unique Constraint
-- The unique constraint on (location_id, week_start) prevents creating new drafts
-- when published/archived drafts exist. Change to partial unique index that only
-- applies to active drafts (not archived).
-- ============================================================================

-- ============================================================================
-- 1. DROP THE EXISTING UNIQUE CONSTRAINT
-- ============================================================================
ALTER TABLE schedule_drafts 
DROP CONSTRAINT IF EXISTS schedule_drafts_location_id_week_start_key;

-- Also try the alternate naming convention
DO $$ 
BEGIN
  -- Try dropping with various possible constraint names
  EXECUTE 'ALTER TABLE schedule_drafts DROP CONSTRAINT IF EXISTS schedule_drafts_location_id_week_start_key';
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- Drop any unique index that might exist
DROP INDEX IF EXISTS schedule_drafts_location_id_week_start_key;
DROP INDEX IF EXISTS idx_schedule_drafts_unique_active;

-- ============================================================================
-- 2. CREATE PARTIAL UNIQUE INDEX FOR ACTIVE DRAFTS ONLY
-- Only one active (non-archived) draft allowed per location per week
-- ============================================================================
CREATE UNIQUE INDEX idx_schedule_drafts_unique_active 
ON schedule_drafts (location_id, week_start) 
WHERE status != 'archived';

-- ============================================================================
-- 3. SIMPLIFIED create_schedule_draft FUNCTION
-- Now that archived drafts don't conflict, we can simplify the logic
-- Fixed: Use profile ID (not auth.uid()) for created_by FK
-- ============================================================================
CREATE OR REPLACE FUNCTION create_schedule_draft(
  p_location_id UUID,
  p_week_start DATE,
  p_operational_days INT[],
  p_service_ids UUID[]
) RETURNS UUID AS $$
DECLARE
  v_draft_id UUID;
  v_existing_status TEXT;
  v_profile_id UUID;
  v_service RECORD;
  v_req RECORD;
  v_day INT;
  v_slot_date DATE;
BEGIN
  -- Get the profile ID for the current user (FK references profiles.id, not auth.uid())
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE auth_user_id = auth.uid();
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No profile found for current user';
  END IF;

  -- Check for existing non-archived draft
  SELECT id, status INTO v_draft_id, v_existing_status
  FROM schedule_drafts
  WHERE location_id = p_location_id 
    AND week_start = p_week_start
    AND status != 'archived'
  LIMIT 1;
  
  IF v_draft_id IS NOT NULL THEN
    IF v_existing_status = 'published' THEN
      -- Archive the published draft and create a new one
      UPDATE schedule_drafts
      SET status = 'archived',
          updated_at = now()
      WHERE id = v_draft_id;
      
      v_draft_id := NULL; -- Force new draft creation
    ELSE
      -- Active building/reviewing draft exists - update it
      UPDATE schedule_drafts
      SET operational_days = p_operational_days,
          selected_service_ids = p_service_ids,
          status = 'building',
          updated_at = now()
      WHERE id = v_draft_id;
      
      -- Clear existing slots and regenerate
      DELETE FROM draft_slots WHERE draft_id = v_draft_id;
    END IF;
  END IF;
  
  -- Create new draft if needed
  IF v_draft_id IS NULL THEN
    INSERT INTO schedule_drafts (location_id, week_start, operational_days, selected_service_ids, created_by)
    VALUES (p_location_id, p_week_start, p_operational_days, p_service_ids, v_profile_id)
    RETURNING id INTO v_draft_id;
  END IF;
  
  -- Generate ghost slots for each service/day combination
  FOR v_day IN SELECT unnest(p_operational_days) LOOP
    v_slot_date := p_week_start + v_day;
    
    FOR v_service IN 
      SELECT s.id as service_id, s.name as service_name
      FROM services s
      WHERE s.id = ANY(p_service_ids) AND s.is_active = true
    LOOP
      -- Get staffing requirements for this service
      FOR v_req IN
        SELECT *
        FROM service_staffing_requirements
        WHERE service_id = v_service.service_id
        ORDER BY priority, sort_order
      LOOP
        -- Create min_count slots for this requirement
        FOR i IN 1..GREATEST(v_req.min_count, 1) LOOP
          -- Only create if within min_count OR if max allows optional slots
          IF i <= v_req.min_count OR (v_req.max_count IS NOT NULL AND i <= v_req.max_count) THEN
            INSERT INTO draft_slots (
              draft_id, service_id, staffing_requirement_id,
              role_category, role_label, is_required, priority,
              slot_date, start_time, end_time
            ) VALUES (
              v_draft_id, v_service.service_id, v_req.id,
              v_req.role_category, 
              v_req.role_label,
              i <= v_req.min_count, -- Only required if within min_count
              v_req.priority,
              v_slot_date, 
              COALESCE(v_req.default_start_time, '09:00'::TIME),
              COALESCE(v_req.default_end_time, '17:30'::TIME)
            );
          END IF;
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;
  
  RETURN v_draft_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_schedule_draft(UUID, DATE, INT[], UUID[]) TO authenticated;

-- ============================================================================
-- 4. Add index for faster lookups
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_schedule_drafts_location_week_status 
ON schedule_drafts(location_id, week_start, status);
