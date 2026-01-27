-- ============================================================================
-- MIGRATION 167: Multi-Location Dashboard & Template System
-- Overview dashboard and reusable staffing templates
-- ============================================================================

-- ============================================================================
-- 1. SCHEDULE TEMPLATES TABLE
-- Reusable staffing patterns that can be saved and loaded
-- ============================================================================

-- Drop and recreate to ensure clean state
DROP TABLE IF EXISTS schedule_templates CASCADE;

CREATE TABLE schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Scope
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL, -- NULL = any location
  
  -- Template content
  operational_days INT[] NOT NULL DEFAULT '{1,2,3,4,5}', -- Days this template covers
  service_ids UUID[] NOT NULL DEFAULT '{}',
  
  -- Slot definitions (stored as JSONB array)
  -- Each slot: { service_code, role_label, role_category, day_of_week, start_time, end_time, is_required, priority }
  slot_definitions JSONB NOT NULL DEFAULT '[]',
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Default template for location
  usage_count INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Tracking
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_schedule_templates_location ON schedule_templates(location_id);
CREATE INDEX idx_schedule_templates_active ON schedule_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_schedule_templates_default ON schedule_templates(location_id, is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedule_templates_select" ON schedule_templates;
CREATE POLICY "schedule_templates_select" ON schedule_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "schedule_templates_modify" ON schedule_templates;
CREATE POLICY "schedule_templates_modify" ON schedule_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'hr_admin', 'manager'))
);

-- ============================================================================
-- 2. GET MULTI-LOCATION DASHBOARD FUNCTION
-- Returns schedule status for all locations for a given week
-- ============================================================================
CREATE OR REPLACE FUNCTION get_schedule_dashboard(
  p_week_start DATE
)
RETURNS TABLE (
  location_id UUID,
  location_name TEXT,
  location_code TEXT,
  draft_id UUID,
  draft_status TEXT,
  total_slots INT,
  filled_slots INT,
  required_slots INT,
  required_filled INT,
  coverage_percentage NUMERIC,
  has_draft BOOLEAN,
  published_at TIMESTAMPTZ,
  last_updated TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id as location_id,
    l.name as location_name,
    l.code as location_code,
    sd.id as draft_id,
    COALESCE(sd.status, 'none')::TEXT as draft_status,
    COALESCE((SELECT COUNT(*)::INT FROM draft_slots ds WHERE ds.draft_id = sd.id), 0) as total_slots,
    COALESCE((SELECT COUNT(*)::INT FROM draft_slots ds WHERE ds.draft_id = sd.id AND ds.employee_id IS NOT NULL), 0) as filled_slots,
    COALESCE((SELECT COUNT(*)::INT FROM draft_slots ds WHERE ds.draft_id = sd.id AND ds.is_required = true), 0) as required_slots,
    COALESCE((SELECT COUNT(*)::INT FROM draft_slots ds WHERE ds.draft_id = sd.id AND ds.is_required = true AND ds.employee_id IS NOT NULL), 0) as required_filled,
    CASE 
      WHEN COALESCE((SELECT COUNT(*) FROM draft_slots ds WHERE ds.draft_id = sd.id), 0) = 0 THEN 0
      ELSE ROUND(
        COALESCE((SELECT COUNT(*) FROM draft_slots ds WHERE ds.draft_id = sd.id AND ds.employee_id IS NOT NULL), 0)::NUMERIC /
        COALESCE((SELECT COUNT(*) FROM draft_slots ds WHERE ds.draft_id = sd.id), 1)::NUMERIC * 100,
        1
      )
    END as coverage_percentage,
    sd.id IS NOT NULL as has_draft,
    sd.published_at,
    COALESCE(sd.updated_at, sd.created_at) as last_updated
  FROM locations l
  LEFT JOIN schedule_drafts sd ON sd.location_id = l.id AND sd.week_start = p_week_start
  WHERE l.is_active = true
  ORDER BY l.sort_order, l.name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_schedule_dashboard TO authenticated;

-- ============================================================================
-- 3. SAVE TEMPLATE FROM DRAFT FUNCTION
-- Creates a reusable template from an existing draft
-- ============================================================================
CREATE OR REPLACE FUNCTION save_template_from_draft(
  p_draft_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_location_specific BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft RECORD;
  v_template_id UUID;
  v_slot_defs JSONB := '[]'::JSONB;
  v_slot RECORD;
BEGIN
  -- Get draft info
  SELECT * INTO v_draft FROM schedule_drafts WHERE id = p_draft_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Draft not found';
  END IF;
  
  -- Build slot definitions from draft slots
  FOR v_slot IN
    SELECT DISTINCT ON (ds.service_id, ds.role_category, ds.role_label, EXTRACT(DOW FROM ds.slot_date))
      s.code as service_code,
      ds.role_label,
      ds.role_category,
      EXTRACT(DOW FROM ds.slot_date)::INT as day_of_week,
      ds.start_time::TEXT,
      ds.end_time::TEXT,
      ds.is_required,
      ds.priority
    FROM draft_slots ds
    JOIN services s ON ds.service_id = s.id
    WHERE ds.draft_id = p_draft_id
    ORDER BY ds.service_id, ds.role_category, ds.role_label, EXTRACT(DOW FROM ds.slot_date), ds.priority
  LOOP
    v_slot_defs := v_slot_defs || jsonb_build_object(
      'service_code', v_slot.service_code,
      'role_label', v_slot.role_label,
      'role_category', v_slot.role_category,
      'day_of_week', v_slot.day_of_week,
      'start_time', v_slot.start_time,
      'end_time', v_slot.end_time,
      'is_required', v_slot.is_required,
      'priority', v_slot.priority
    );
  END LOOP;
  
  -- Create template
  INSERT INTO schedule_templates (
    name,
    description,
    location_id,
    operational_days,
    service_ids,
    slot_definitions,
    created_by
  ) VALUES (
    p_name,
    p_description,
    CASE WHEN p_location_specific THEN v_draft.location_id ELSE NULL END,
    v_draft.operational_days,
    v_draft.selected_service_ids,
    v_slot_defs,
    auth.uid()
  )
  RETURNING id INTO v_template_id;
  
  RETURN v_template_id;
END;
$$;

GRANT EXECUTE ON FUNCTION save_template_from_draft TO authenticated;

-- ============================================================================
-- 4. APPLY TEMPLATE TO DRAFT FUNCTION
-- Loads a template into a new or existing draft
-- ============================================================================
CREATE OR REPLACE FUNCTION apply_template_to_draft(
  p_template_id UUID,
  p_location_id UUID,
  p_week_start DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template RECORD;
  v_draft_id UUID;
  v_slot JSONB;
  v_service_id UUID;
  v_slot_date DATE;
  v_day INT;
BEGIN
  -- Get template
  SELECT * INTO v_template FROM schedule_templates WHERE id = p_template_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
  
  -- Check for existing draft
  SELECT id INTO v_draft_id
  FROM schedule_drafts
  WHERE location_id = p_location_id AND week_start = p_week_start;
  
  IF v_draft_id IS NOT NULL THEN
    -- Clear existing slots
    DELETE FROM draft_slots WHERE draft_id = v_draft_id;
    
    -- Update draft with template settings
    UPDATE schedule_drafts
    SET 
      operational_days = v_template.operational_days,
      selected_service_ids = v_template.service_ids,
      status = 'building',
      updated_at = now()
    WHERE id = v_draft_id;
  ELSE
    -- Create new draft
    INSERT INTO schedule_drafts (
      location_id,
      week_start,
      operational_days,
      selected_service_ids,
      created_by
    ) VALUES (
      p_location_id,
      p_week_start,
      v_template.operational_days,
      v_template.service_ids,
      auth.uid()
    )
    RETURNING id INTO v_draft_id;
  END IF;
  
  -- Create slots from template definitions
  FOR v_slot IN SELECT * FROM jsonb_array_elements(v_template.slot_definitions)
  LOOP
    -- Get service ID by code
    SELECT id INTO v_service_id FROM services WHERE code = v_slot->>'service_code';
    
    IF v_service_id IS NOT NULL THEN
      -- Calculate slot date
      v_day := (v_slot->>'day_of_week')::INT;
      v_slot_date := p_week_start + v_day;
      
      -- Only create if day is in operational days
      IF v_day = ANY(v_template.operational_days) THEN
        INSERT INTO draft_slots (
          draft_id,
          service_id,
          role_category,
          role_label,
          slot_date,
          start_time,
          end_time,
          is_required,
          priority
        ) VALUES (
          v_draft_id,
          v_service_id,
          v_slot->>'role_category',
          v_slot->>'role_label',
          v_slot_date,
          (v_slot->>'start_time')::TIME,
          (v_slot->>'end_time')::TIME,
          COALESCE((v_slot->>'is_required')::BOOLEAN, true),
          COALESCE((v_slot->>'priority')::INT, 1)
        );
      END IF;
    END IF;
  END LOOP;
  
  -- Update template usage stats
  UPDATE schedule_templates
  SET 
    usage_count = usage_count + 1,
    last_used_at = now()
  WHERE id = p_template_id;
  
  RETURN v_draft_id;
END;
$$;

GRANT EXECUTE ON FUNCTION apply_template_to_draft TO authenticated;

-- ============================================================================
-- 5. LIST TEMPLATES FUNCTION
-- Returns available templates, optionally filtered by location
-- ============================================================================
CREATE OR REPLACE FUNCTION list_schedule_templates(
  p_location_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  location_id UUID,
  location_name TEXT,
  operational_days INT[],
  service_count INT,
  slot_count INT,
  is_default BOOLEAN,
  usage_count INT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    st.id,
    st.name,
    st.description,
    st.location_id,
    l.name as location_name,
    st.operational_days,
    COALESCE(array_length(st.service_ids, 1), 0)::INT as service_count,
    COALESCE(jsonb_array_length(st.slot_definitions), 0)::INT as slot_count,
    st.is_default,
    st.usage_count,
    st.last_used_at,
    st.created_at
  FROM schedule_templates st
  LEFT JOIN locations l ON st.location_id = l.id
  WHERE st.is_active = true
    AND (p_location_id IS NULL OR st.location_id IS NULL OR st.location_id = p_location_id)
  ORDER BY 
    st.is_default DESC,
    st.usage_count DESC,
    st.name;
END;
$$;

GRANT EXECUTE ON FUNCTION list_schedule_templates TO authenticated;

-- ============================================================================
-- 6. DELETE TEMPLATE FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION delete_schedule_template(
  p_template_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE schedule_templates
  SET is_active = false, updated_at = now()
  WHERE id = p_template_id;
  
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_schedule_template TO authenticated;

-- ============================================================================
-- COMPLETE
-- ============================================================================
