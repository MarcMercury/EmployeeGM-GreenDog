-- ============================================================================
-- MIGRATION 175: Add service-day matrix for granular schedule scoping
-- Allows selecting different services for different days of the week
-- ============================================================================

-- Add the new column to store which services are scheduled for which days
-- Format: { "0": ["service-id-1"], "1": ["service-id-1", "service-id-2"], ... }
-- Key is day of week (0=Sun, 6=Sat), value is array of service IDs
ALTER TABLE schedule_drafts 
ADD COLUMN IF NOT EXISTS service_days_matrix JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN schedule_drafts.service_days_matrix IS 
  'JSON object mapping day of week (0-6) to array of service IDs. Example: {"1": ["uuid1", "uuid2"], "2": ["uuid1"]}';

-- ============================================================================
-- Update create_schedule_draft function to accept the new matrix format
-- ============================================================================
CREATE OR REPLACE FUNCTION create_schedule_draft(
  p_location_id UUID,
  p_week_start DATE,
  p_operational_days INT[],
  p_service_ids UUID[],
  p_service_days_matrix JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft_id UUID;
  v_existing_draft RECORD;
  v_day INT;
  v_day_str TEXT;
  v_slot RECORD;
  v_date DATE;
  v_service_id UUID;
  v_day_services UUID[];
  v_profile_id UUID;
  v_all_service_ids UUID[] := '{}';
BEGIN
  -- Get profile ID for current user
  SELECT id INTO v_profile_id FROM profiles WHERE auth_user_id = auth.uid();

  -- Check for existing draft for this week/location
  SELECT * INTO v_existing_draft
  FROM schedule_drafts
  WHERE location_id = p_location_id 
    AND week_start = p_week_start
    AND status != 'archived';
  
  IF FOUND THEN
    -- Update existing draft
    v_draft_id := v_existing_draft.id;
    
    UPDATE schedule_drafts
    SET operational_days = p_operational_days,
        selected_service_ids = p_service_ids,
        service_days_matrix = COALESCE(p_service_days_matrix, '{}'),
        status = 'building',
        updated_at = now()
    WHERE id = v_draft_id;
    
    -- Clear existing slots
    DELETE FROM draft_slots WHERE draft_id = v_draft_id;
  ELSE
    -- Create new draft
    INSERT INTO schedule_drafts (location_id, week_start, operational_days, selected_service_ids, service_days_matrix, created_by)
    VALUES (p_location_id, p_week_start, p_operational_days, p_service_ids, COALESCE(p_service_days_matrix, '{}'), v_profile_id)
    RETURNING id INTO v_draft_id;
  END IF;
  
  -- If we have a service_days_matrix, use that for slot creation
  -- Otherwise fall back to the old behavior (all services on all days)
  IF p_service_days_matrix IS NOT NULL AND p_service_days_matrix != '{}' THEN
    -- New behavior: create slots based on matrix
    FOR v_day IN SELECT unnest(p_operational_days) LOOP
      v_date := p_week_start + v_day;
      v_day_str := v_day::TEXT;
      
      -- Get services for this day from the matrix
      IF p_service_days_matrix ? v_day_str THEN
        -- Extract service IDs for this day
        SELECT ARRAY(
          SELECT (value)::UUID 
          FROM jsonb_array_elements_text(p_service_days_matrix -> v_day_str)
        ) INTO v_day_services;
        
        -- Create slots for each service on this day
        FOR v_service_id IN SELECT unnest(v_day_services) LOOP
          -- Get staffing requirements for this service
          FOR v_slot IN
            SELECT * FROM service_staffing_requirements 
            WHERE service_id = v_service_id
            ORDER BY priority, sort_order
          LOOP
            INSERT INTO draft_slots (
              draft_id,
              service_id,
              staffing_requirement_id,
              role_category,
              role_label,
              is_required,
              priority,
              slot_date,
              start_time,
              end_time
            ) VALUES (
              v_draft_id,
              v_service_id,
              v_slot.id,
              v_slot.role_category,
              v_slot.role_label,
              v_slot.is_required,
              v_slot.priority,
              v_date,
              v_slot.default_start_time,
              v_slot.default_end_time
            );
          END LOOP;
        END LOOP;
      END IF;
    END LOOP;
  ELSE
    -- Old behavior: all services on all days
    FOR v_day IN SELECT unnest(p_operational_days) LOOP
      v_date := p_week_start + v_day;
      
      FOR v_service_id IN SELECT unnest(p_service_ids) LOOP
        -- Get staffing requirements for this service
        FOR v_slot IN
          SELECT * FROM service_staffing_requirements 
          WHERE service_id = v_service_id
          ORDER BY priority, sort_order
        LOOP
          INSERT INTO draft_slots (
            draft_id,
            service_id,
            staffing_requirement_id,
            role_category,
            role_label,
            is_required,
            priority,
            slot_date,
            start_time,
            end_time
          ) VALUES (
            v_draft_id,
            v_service_id,
            v_slot.id,
            v_slot.role_category,
            v_slot.role_label,
            v_slot.is_required,
            v_slot.priority,
            v_date,
            v_slot.default_start_time,
            v_slot.default_end_time
          );
        END LOOP;
      END LOOP;
    END LOOP;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'draft_id', v_draft_id
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_schedule_draft(UUID, DATE, INT[], UUID[], JSONB) TO authenticated;
