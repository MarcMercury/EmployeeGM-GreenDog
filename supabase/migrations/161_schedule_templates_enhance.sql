-- ============================================================================
-- Migration: 161_schedule_templates_enhance.sql
-- Purpose: Enhance schedule_templates for Phase 5B - Template Schedules
-- ============================================================================

-- Add new columns to schedule_template_shifts for service-based templates
ALTER TABLE schedule_template_shifts
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS staffing_requirement_id UUID REFERENCES service_staffing_requirements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role_category TEXT,
  ADD COLUMN IF NOT EXISTS role_label TEXT;

-- Add location_id to schedule_templates for location-specific templates
ALTER TABLE schedule_templates
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- Create index for faster template lookups
CREATE INDEX IF NOT EXISTS idx_schedule_template_shifts_template 
  ON schedule_template_shifts(template_id);

CREATE INDEX IF NOT EXISTS idx_schedule_template_shifts_service 
  ON schedule_template_shifts(service_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Save current week as a template
CREATE OR REPLACE FUNCTION save_week_as_template(
  p_template_name TEXT,
  p_template_description TEXT,
  p_week_start DATE,
  p_location_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_template_id UUID;
BEGIN
  -- Create the template
  INSERT INTO schedule_templates (name, description, created_by, location_id)
  VALUES (p_template_name, p_template_description, v_user_id, p_location_id)
  RETURNING id INTO v_template_id;
  
  -- Copy shifts from the week to template_shifts
  INSERT INTO schedule_template_shifts (
    template_id,
    day_of_week,
    start_time,
    end_time,
    role_required,
    location_id,
    service_id,
    staffing_requirement_id,
    role_category,
    role_label
  )
  SELECT
    v_template_id,
    EXTRACT(DOW FROM sh.start_at::date)::INTEGER,
    sh.start_at::time,
    sh.end_at::time,
    sh.role_required,
    sh.location_id,
    sh.service_id,
    sh.staffing_requirement_id,
    ssr.role_category,
    ssr.role_label
  FROM shifts sh
  LEFT JOIN service_staffing_requirements ssr ON sh.staffing_requirement_id = ssr.id
  WHERE sh.start_at::date >= p_week_start
    AND sh.start_at::date < p_week_start + INTERVAL '7 days'
    AND (p_location_id IS NULL OR sh.location_id = p_location_id);
  
  RETURN v_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply a template to a target week
CREATE OR REPLACE FUNCTION apply_template_to_week(
  p_template_id UUID,
  p_week_start DATE,
  p_clear_existing BOOLEAN DEFAULT false
)
RETURNS TABLE (
  shifts_created INT,
  shifts_skipped INT
) AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_shifts_created INT := 0;
  v_shifts_skipped INT := 0;
  v_template_shift RECORD;
  v_target_date DATE;
  v_start_at TIMESTAMPTZ;
  v_end_at TIMESTAMPTZ;
  v_existing INT;
BEGIN
  -- Optionally clear existing draft shifts for the week
  IF p_clear_existing THEN
    DELETE FROM shifts
    WHERE start_at::date >= p_week_start
      AND start_at::date < p_week_start + INTERVAL '7 days'
      AND status = 'draft';
  END IF;
  
  -- Create shifts from template
  FOR v_template_shift IN
    SELECT * FROM schedule_template_shifts
    WHERE template_id = p_template_id
  LOOP
    -- Calculate target date based on day_of_week
    v_target_date := p_week_start + v_template_shift.day_of_week;
    v_start_at := (v_target_date || ' ' || v_template_shift.start_time)::TIMESTAMPTZ;
    v_end_at := (v_target_date || ' ' || v_template_shift.end_time)::TIMESTAMPTZ;
    
    -- Check for existing shift at same time/location/role
    SELECT COUNT(*) INTO v_existing
    FROM shifts
    WHERE start_at = v_start_at
      AND location_id = v_template_shift.location_id
      AND (
        staffing_requirement_id = v_template_shift.staffing_requirement_id
        OR role_required = v_template_shift.role_required
      );
    
    IF v_existing = 0 THEN
      -- Create the shift (without employee - just the slot)
      INSERT INTO shifts (
        location_id,
        start_at,
        end_at,
        role_required,
        service_id,
        staffing_requirement_id,
        status,
        assignment_source
      ) VALUES (
        v_template_shift.location_id,
        v_start_at,
        v_end_at,
        v_template_shift.role_required,
        v_template_shift.service_id,
        v_template_shift.staffing_requirement_id,
        'draft',
        'template'
      );
      v_shifts_created := v_shifts_created + 1;
    ELSE
      v_shifts_skipped := v_shifts_skipped + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_shifts_created, v_shifts_skipped;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get list of templates with shift counts
CREATE OR REPLACE FUNCTION get_schedule_templates()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  location_id UUID,
  location_name TEXT,
  shift_count BIGINT,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    st.id,
    st.name,
    st.description,
    st.location_id,
    l.name as location_name,
    COUNT(sts.id) as shift_count,
    st.created_by,
    CONCAT(p.first_name, ' ', p.last_name) as created_by_name,
    st.created_at,
    st.is_active
  FROM schedule_templates st
  LEFT JOIN locations l ON st.location_id = l.id
  LEFT JOIN profiles p ON st.created_by = p.id
  LEFT JOIN schedule_template_shifts sts ON st.id = sts.template_id
  WHERE st.is_active = true
  GROUP BY st.id, st.name, st.description, st.location_id, l.name, 
           st.created_by, p.first_name, p.last_name, st.created_at, st.is_active
  ORDER BY st.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION save_week_as_template TO authenticated;
GRANT EXECUTE ON FUNCTION apply_template_to_week TO authenticated;
GRANT EXECUTE ON FUNCTION get_schedule_templates TO authenticated;
