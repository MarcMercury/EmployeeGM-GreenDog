-- Migration: Recruiting CRM Enhancements
-- Adds candidate_type to distinguish applicants, interns, externs, students
-- Adds employee geo-lock settings for time clock

-- =====================================================
-- 1. Add candidate_type to candidates table
-- =====================================================
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS candidate_type text DEFAULT 'applicant';

-- Update existing candidates to have 'applicant' type
UPDATE public.candidates 
SET candidate_type = 'applicant' 
WHERE candidate_type IS NULL;

-- Add constraint for valid candidate types
ALTER TABLE public.candidates
DROP CONSTRAINT IF EXISTS candidates_candidate_type_check;

ALTER TABLE public.candidates
ADD CONSTRAINT candidates_candidate_type_check 
CHECK (candidate_type IN ('applicant', 'intern', 'extern', 'student', 'ce_attendee'));

-- =====================================================
-- 2. Add geo_lock settings to employees table
-- =====================================================
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS geo_lock_enabled boolean DEFAULT false;

ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS geo_lock_location_ids uuid[] DEFAULT ARRAY[]::uuid[];

COMMENT ON COLUMN public.employees.geo_lock_enabled IS 
'When true, employee can only clock in/out from approved locations';

COMMENT ON COLUMN public.employees.geo_lock_location_ids IS 
'Array of location IDs where this employee is allowed to clock in/out when geo-locked';

-- =====================================================
-- 3. Ensure the company locations exist with geofences
-- =====================================================
-- Venice location
INSERT INTO public.locations (id, name, address_line1, city, state, postal_code, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'Venice Clinic',
  '210 Main Street',
  'Venice',
  'CA',
  '90291',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address_line1 = EXCLUDED.address_line1,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  postal_code = EXCLUDED.postal_code,
  is_active = EXCLUDED.is_active;

-- Sherman Oaks location
INSERT INTO public.locations (id, name, address_line1, city, state, postal_code, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000002'::uuid,
  'Sherman Oaks Clinic',
  '13907 Ventura Blvd',
  'Sherman Oaks',
  'CA',
  '91423',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address_line1 = EXCLUDED.address_line1,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  postal_code = EXCLUDED.postal_code,
  is_active = EXCLUDED.is_active;

-- Van Nuys location
INSERT INTO public.locations (id, name, address_line1, city, state, postal_code, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000003'::uuid,
  'Van Nuys Clinic',
  '14661 Aetna St',
  'Van Nuys',
  'CA',
  '91411',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address_line1 = EXCLUDED.address_line1,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  postal_code = EXCLUDED.postal_code,
  is_active = EXCLUDED.is_active;

-- =====================================================
-- 4. Create/Update geofences for locations
-- =====================================================
-- Venice geofence (approximate coordinates for 210 Main Street, Venice, CA 90291)
INSERT INTO public.geofences (id, name, location_id, latitude, longitude, radius_meters, is_active)
VALUES (
  'b0000000-0000-0000-0000-000000000001'::uuid,
  'Venice Clinic Geofence',
  'a0000000-0000-0000-0000-000000000001'::uuid,
  33.9925,
  -118.4695,
  100,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  location_id = EXCLUDED.location_id,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  radius_meters = EXCLUDED.radius_meters,
  is_active = EXCLUDED.is_active;

-- Sherman Oaks geofence (approximate coordinates for 13907 Ventura Blvd)
INSERT INTO public.geofences (id, name, location_id, latitude, longitude, radius_meters, is_active)
VALUES (
  'b0000000-0000-0000-0000-000000000002'::uuid,
  'Sherman Oaks Clinic Geofence',
  'a0000000-0000-0000-0000-000000000002'::uuid,
  34.1536,
  -118.4426,
  100,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  location_id = EXCLUDED.location_id,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  radius_meters = EXCLUDED.radius_meters,
  is_active = EXCLUDED.is_active;

-- Van Nuys geofence (approximate coordinates for 14661 Aetna St)
INSERT INTO public.geofences (id, name, location_id, latitude, longitude, radius_meters, is_active)
VALUES (
  'b0000000-0000-0000-0000-000000000003'::uuid,
  'Van Nuys Clinic Geofence',
  'a0000000-0000-0000-0000-000000000003'::uuid,
  34.1948,
  -118.4258,
  100,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  location_id = EXCLUDED.location_id,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  radius_meters = EXCLUDED.radius_meters,
  is_active = EXCLUDED.is_active;

-- =====================================================
-- 5. Create function to migrate education_visitors to candidates
-- =====================================================
CREATE OR REPLACE FUNCTION public.migrate_education_visitor_to_candidate(
  p_visitor_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visitor record;
  v_candidate_id uuid;
  v_candidate_type text;
BEGIN
  -- Get the visitor record
  SELECT * INTO v_visitor
  FROM education_visitors
  WHERE id = p_visitor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visitor not found: %', p_visitor_id;
  END IF;

  -- Map visitor type to candidate type
  v_candidate_type := CASE v_visitor.visitor_type
    WHEN 'intern' THEN 'intern'
    WHEN 'extern' THEN 'extern'
    WHEN 'student' THEN 'student'
    WHEN 'ce_attendee' THEN 'ce_attendee'
    ELSE 'applicant'
  END;

  -- Check if candidate already exists with same email
  SELECT id INTO v_candidate_id
  FROM candidates
  WHERE email = v_visitor.email;

  IF v_candidate_id IS NOT NULL THEN
    -- Update existing candidate with visitor info
    UPDATE candidates SET
      candidate_type = v_candidate_type,
      notes = COALESCE(notes, '') || E'\n\nMigrated from Education Visitor: ' || COALESCE(v_visitor.notes, ''),
      updated_at = now()
    WHERE id = v_candidate_id;
  ELSE
    -- Create new candidate from visitor
    INSERT INTO candidates (
      first_name,
      last_name,
      email,
      phone,
      status,
      candidate_type,
      source,
      notes,
      applied_at
    )
    VALUES (
      COALESCE(v_visitor.first_name, 'Unknown'),
      COALESCE(v_visitor.last_name, 'Unknown'),
      v_visitor.email,
      v_visitor.phone,
      'new',
      v_candidate_type,
      'education_program',
      v_visitor.notes,
      COALESCE(v_visitor.created_at, now())
    )
    RETURNING id INTO v_candidate_id;
  END IF;

  RETURN v_candidate_id;
END;
$$;

-- =====================================================
-- 6. Add index for faster filtering
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_candidates_candidate_type 
ON public.candidates(candidate_type);

CREATE INDEX IF NOT EXISTS idx_candidates_applied_at 
ON public.candidates(applied_at);

CREATE INDEX IF NOT EXISTS idx_candidates_source 
ON public.candidates(source);

CREATE INDEX IF NOT EXISTS idx_candidates_status_type 
ON public.candidates(status, candidate_type);

CREATE INDEX IF NOT EXISTS idx_employees_geo_lock 
ON public.employees(geo_lock_enabled) WHERE geo_lock_enabled = true;

-- =====================================================
-- 7. Marketing Supplies Inventory System
-- =====================================================

-- Create marketing_supplies table for inventory management
CREATE TABLE IF NOT EXISTS public.marketing_supplies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text DEFAULT 'general',
  unit_cost numeric(10,2) NOT NULL DEFAULT 0,
  quantity_on_hand integer NOT NULL DEFAULT 0,
  reorder_level integer DEFAULT 10,
  supplier text,
  sku text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create event_supplies junction table to track supplies used per event
CREATE TABLE IF NOT EXISTS public.event_supplies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.marketing_events(id) ON DELETE CASCADE,
  supply_id uuid NOT NULL REFERENCES public.marketing_supplies(id) ON DELETE RESTRICT,
  quantity_allocated integer NOT NULL DEFAULT 0,
  quantity_used integer DEFAULT 0,
  unit_cost_at_time numeric(10,2),
  total_cost numeric(10,2) GENERATED ALWAYS AS (COALESCE(quantity_used, quantity_allocated) * COALESCE(unit_cost_at_time, 0)) STORED,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, supply_id)
);

-- Add budget tracking columns to marketing_events
ALTER TABLE public.marketing_events
ADD COLUMN IF NOT EXISTS supplies_budget_allocated numeric(10,2) DEFAULT 0;

ALTER TABLE public.marketing_events
ADD COLUMN IF NOT EXISTS supplies_budget_used numeric(10,2) DEFAULT 0;

ALTER TABLE public.marketing_events
ADD COLUMN IF NOT EXISTS budget_remaining numeric(10,2) 
GENERATED ALWAYS AS (COALESCE(budget, 0) - COALESCE(supplies_budget_used, 0)) STORED;

-- Create function to update event supplies budget when supplies are assigned
CREATE OR REPLACE FUNCTION public.update_event_supplies_budget()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recalculate total supplies cost for the event
  UPDATE marketing_events
  SET supplies_budget_used = (
    SELECT COALESCE(SUM(total_cost), 0)
    FROM event_supplies
    WHERE event_id = COALESCE(NEW.event_id, OLD.event_id)
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.event_id, OLD.event_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to auto-update budget when supplies change
DROP TRIGGER IF EXISTS trg_update_event_supplies_budget ON public.event_supplies;
CREATE TRIGGER trg_update_event_supplies_budget
AFTER INSERT OR UPDATE OR DELETE ON public.event_supplies
FOR EACH ROW
EXECUTE FUNCTION public.update_event_supplies_budget();

-- Create function to deduct supplies from inventory when event is completed
CREATE OR REPLACE FUNCTION public.deduct_event_supplies(p_event_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supply record;
BEGIN
  -- Loop through all supplies for this event and deduct from inventory
  FOR v_supply IN 
    SELECT es.supply_id, es.quantity_used, es.quantity_allocated
    FROM event_supplies es
    WHERE es.event_id = p_event_id
  LOOP
    UPDATE marketing_supplies
    SET quantity_on_hand = quantity_on_hand - COALESCE(v_supply.quantity_used, v_supply.quantity_allocated),
        updated_at = now()
    WHERE id = v_supply.supply_id;
  END LOOP;
  
  RETURN true;
END;
$$;

-- RLS Policies for marketing_supplies
ALTER TABLE public.marketing_supplies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view marketing supplies"
ON public.marketing_supplies FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin/HR can manage marketing supplies"
ON public.marketing_supplies FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'super_admin', 'marketing_admin')
  )
);

-- RLS Policies for event_supplies
ALTER TABLE public.event_supplies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view event supplies"
ON public.event_supplies FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin/HR can manage event supplies"
ON public.event_supplies FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'super_admin', 'marketing_admin')
  )
);

-- Seed some common marketing supplies
INSERT INTO public.marketing_supplies (name, category, unit_cost, quantity_on_hand, reorder_level)
VALUES
  ('Business Cards (box of 500)', 'print', 35.00, 10, 5),
  ('Brochures (pack of 100)', 'print', 45.00, 20, 10),
  ('Branded Pens (box of 50)', 'swag', 25.00, 15, 5),
  ('Table Banner', 'display', 150.00, 3, 2),
  ('Pop-up Banner Stand', 'display', 200.00, 2, 1),
  ('Tablecloth (branded)', 'display', 75.00, 4, 2),
  ('Branded Tote Bags (pack of 25)', 'swag', 50.00, 8, 3),
  ('Flyers (pack of 500)', 'print', 30.00, 25, 10),
  ('Giveaway Treats', 'treats', 20.00, 30, 15),
  ('Branded Water Bottles', 'swag', 8.00, 50, 20)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 8. New Applicant Notification System
-- =====================================================

-- Function to notify HR/Manager/Admin when new candidates apply
CREATE OR REPLACE FUNCTION public.notify_new_applicant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient RECORD;
  v_position_title TEXT;
  v_full_name TEXT;
BEGIN
  -- Get position title if available
  IF NEW.target_position_id IS NOT NULL THEN
    SELECT title INTO v_position_title FROM job_positions WHERE id = NEW.target_position_id;
  END IF;
  
  v_full_name := NEW.first_name || ' ' || NEW.last_name;
  
  -- Notify all profiles with HR, Manager, or Admin roles
  FOR v_recipient IN
    SELECT DISTINCT p.id, p.role
    FROM profiles p
    WHERE p.role IN ('admin', 'super_admin', 'hr', 'manager', 'marketing_admin')
      AND p.is_active = true
  LOOP
    INSERT INTO notifications (
      profile_id,
      title,
      body,
      type,
      category,
      action_url,
      requires_action,
      data
    ) VALUES (
      v_recipient.id,
      'New Application Received',
      CASE 
        WHEN v_position_title IS NOT NULL THEN
          v_full_name || ' applied for ' || v_position_title
        ELSE
          v_full_name || ' submitted a job application'
      END,
      'new_applicant',
      'recruiting',
      '/recruiting/candidates?id=' || NEW.id,
      true,
      jsonb_build_object(
        'candidate_id', NEW.id,
        'candidate_name', v_full_name,
        'candidate_email', NEW.email,
        'position_id', NEW.target_position_id,
        'position_title', v_position_title,
        'applied_at', NEW.applied_at,
        'source', NEW.source
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new applicant notifications
DROP TRIGGER IF EXISTS trg_notify_new_applicant ON public.candidates;
CREATE TRIGGER trg_notify_new_applicant
AFTER INSERT ON public.candidates
FOR EACH ROW
WHEN (NEW.status = 'new')
EXECUTE FUNCTION public.notify_new_applicant();

-- Also notify when candidate status changes to important stages
CREATE OR REPLACE FUNCTION public.notify_candidate_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient RECORD;
  v_position_title TEXT;
  v_full_name TEXT;
  v_notification_title TEXT;
  v_notification_body TEXT;
BEGIN
  -- Only notify on significant status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Skip if transitioning to 'new' (handled by insert trigger)
  IF NEW.status = 'new' THEN
    RETURN NEW;
  END IF;
  
  -- Get position title if available
  IF NEW.target_position_id IS NOT NULL THEN
    SELECT title INTO v_position_title FROM job_positions WHERE id = NEW.target_position_id;
  END IF;
  
  v_full_name := NEW.first_name || ' ' || NEW.last_name;
  
  -- Set notification title and body based on status
  CASE NEW.status
    WHEN 'interview' THEN
      v_notification_title := 'Candidate Ready for Interview';
      v_notification_body := v_full_name || ' is ready for interview';
    WHEN 'offer' THEN
      v_notification_title := 'Candidate at Offer Stage';
      v_notification_body := v_full_name || ' has reached the offer stage';
    WHEN 'hired' THEN
      v_notification_title := '🎉 New Hire!';
      v_notification_body := v_full_name || ' has been hired!';
    WHEN 'rejected' THEN
      v_notification_title := 'Candidate Rejected';
      v_notification_body := v_full_name || ' has been rejected';
    ELSE
      -- Don't notify for other status changes
      RETURN NEW;
  END CASE;
  
  IF v_position_title IS NOT NULL THEN
    v_notification_body := v_notification_body || ' for ' || v_position_title;
  END IF;
  
  -- Notify relevant profiles
  FOR v_recipient IN
    SELECT DISTINCT p.id, p.role
    FROM profiles p
    WHERE p.role IN ('admin', 'super_admin', 'hr', 'manager')
      AND p.is_active = true
  LOOP
    INSERT INTO notifications (
      profile_id,
      title,
      body,
      type,
      category,
      action_url,
      requires_action,
      data
    ) VALUES (
      v_recipient.id,
      v_notification_title,
      v_notification_body,
      'candidate_status_change',
      'recruiting',
      '/recruiting/candidates?id=' || NEW.id,
      NEW.status IN ('interview', 'offer'),
      jsonb_build_object(
        'candidate_id', NEW.id,
        'candidate_name', v_full_name,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'position_title', v_position_title
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for status change notifications
DROP TRIGGER IF EXISTS trg_notify_candidate_status_change ON public.candidates;
CREATE TRIGGER trg_notify_candidate_status_change
AFTER UPDATE ON public.candidates
FOR EACH ROW
EXECUTE FUNCTION public.notify_candidate_status_change();
