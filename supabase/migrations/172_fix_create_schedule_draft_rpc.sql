-- ============================================================================
-- MIGRATION 172: Fix create_schedule_draft RPC
-- The function was conflicting with unique constraint when a published draft exists
-- Also add WITH CHECK to RLS policies for INSERT operations
-- ============================================================================

-- ============================================================================
-- 1. FIX RLS POLICIES - Add WITH CHECK for INSERT operations
-- ============================================================================

-- Fix schedule_drafts policy
DROP POLICY IF EXISTS "schedule_drafts_modify_admin" ON schedule_drafts;
CREATE POLICY "schedule_drafts_modify_admin" ON schedule_drafts
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_admin', 'manager')
    )
  );

-- Fix draft_slots policy  
DROP POLICY IF EXISTS "draft_slots_modify_admin" ON draft_slots;
CREATE POLICY "draft_slots_modify_admin" ON draft_slots
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_admin', 'manager')
    )
  );

-- ============================================================================
-- 2. FIX create_schedule_draft FUNCTION
-- Handle case where published/archived draft exists for same location+week
-- ============================================================================
CREATE OR REPLACE FUNCTION create_schedule_draft(
  p_location_id UUID,
  p_week_start DATE,
  p_operational_days INT[],
  p_service_ids UUID[]
) RETURNS UUID AS $$
DECLARE
  v_draft_id UUID;
  v_existing_id UUID;
  v_service RECORD;
  v_req RECORD;
  v_day INT;
  v_slot_date DATE;
BEGIN
  -- First check if ANY draft exists (including published/archived)
  SELECT id, status INTO v_existing_id
  FROM schedule_drafts
  WHERE location_id = p_location_id 
    AND week_start = p_week_start
  LIMIT 1;
  
  -- Check for active (building/reviewing/validated) draft
  SELECT id INTO v_draft_id
  FROM schedule_drafts
  WHERE location_id = p_location_id 
    AND week_start = p_week_start
    AND status NOT IN ('published', 'archived');
  
  -- If exists an active draft, update it
  IF v_draft_id IS NOT NULL THEN
    UPDATE schedule_drafts
    SET operational_days = p_operational_days,
        selected_service_ids = p_service_ids,
        status = 'building',
        updated_at = now()
    WHERE id = v_draft_id;
    
    -- Clear existing slots and regenerate
    DELETE FROM draft_slots WHERE draft_id = v_draft_id;
    
  -- If a published/archived draft exists, archive it and create new
  ELSIF v_existing_id IS NOT NULL THEN
    -- Archive the existing one first
    UPDATE schedule_drafts
    SET status = 'archived',
        updated_at = now()
    WHERE id = v_existing_id;
    
    -- Create new draft
    INSERT INTO schedule_drafts (location_id, week_start, operational_days, selected_service_ids, created_by)
    VALUES (p_location_id, p_week_start, p_operational_days, p_service_ids, auth.uid())
    ON CONFLICT (location_id, week_start) 
    DO UPDATE SET 
      operational_days = EXCLUDED.operational_days,
      selected_service_ids = EXCLUDED.selected_service_ids,
      status = 'building',
      updated_at = now()
    RETURNING id INTO v_draft_id;
    
  ELSE
    -- No draft exists, create new
    INSERT INTO schedule_drafts (location_id, week_start, operational_days, selected_service_ids, created_by)
    VALUES (p_location_id, p_week_start, p_operational_days, p_service_ids, auth.uid())
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
