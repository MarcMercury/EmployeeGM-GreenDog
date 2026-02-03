-- Migration: Lead Prize Tracking System
-- Adds prize_inventory_item_id to marketing_leads for proper prize tracking
-- Also adds a function to deduct prize inventory when lead claims a prize

-- =====================================================
-- 1. Add prize_inventory_item_id column to marketing_leads
-- =====================================================
ALTER TABLE marketing_leads 
ADD COLUMN IF NOT EXISTS prize_inventory_item_id UUID REFERENCES marketing_inventory(id) ON DELETE SET NULL;

-- Add index for faster prize lookups
CREATE INDEX IF NOT EXISTS idx_marketing_leads_prize_item ON marketing_leads(prize_inventory_item_id) WHERE prize_inventory_item_id IS NOT NULL;

-- =====================================================
-- 2. Add prize_quantity column (default 1)
-- =====================================================
ALTER TABLE marketing_leads 
ADD COLUMN IF NOT EXISTS prize_quantity INTEGER DEFAULT 1;

-- =====================================================
-- 3. Add prize_location column to track where prize was given from
-- =====================================================
ALTER TABLE marketing_leads 
ADD COLUMN IF NOT EXISTS prize_location TEXT CHECK (prize_location IS NULL OR prize_location IN ('venice', 'sherman_oaks', 'valley', 'mpmv', 'offsite'));

-- =====================================================
-- 4. Create function to record lead with prize and deduct inventory
-- =====================================================
CREATE OR REPLACE FUNCTION create_lead_with_prize(
  p_lead_name TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_source_event_id UUID DEFAULT NULL,
  p_source TEXT DEFAULT 'event_qr',
  p_interest_level TEXT DEFAULT 'new_prospect',
  p_prize_item_id UUID DEFAULT NULL,
  p_prize_quantity INTEGER DEFAULT 1,
  p_prize_location TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id UUID;
  v_current_qty INTEGER;
  v_location_col TEXT;
BEGIN
  -- Create the lead
  INSERT INTO marketing_leads (
    lead_name,
    first_name,
    last_name,
    email,
    phone,
    notes,
    source_event_id,
    event_id,
    source,
    status,
    interest_level,
    prize_inventory_item_id,
    prize_quantity,
    prize_location
  )
  VALUES (
    p_lead_name,
    p_first_name,
    p_last_name,
    p_email,
    p_phone,
    p_notes,
    p_source_event_id,
    p_source_event_id,
    p_source,
    'new',
    p_interest_level,
    p_prize_item_id,
    p_prize_quantity,
    p_prize_location
  )
  RETURNING id INTO v_lead_id;
  
  -- If prize was selected and location provided, deduct from inventory
  IF p_prize_item_id IS NOT NULL AND p_prize_location IS NOT NULL THEN
    -- Validate location
    IF p_prize_location NOT IN ('venice', 'sherman_oaks', 'valley', 'mpmv', 'offsite') THEN
      RAISE EXCEPTION 'Invalid prize location: %', p_prize_location;
    END IF;
    
    -- Get column name for location
    v_location_col := 'quantity_' || p_prize_location;
    
    -- Check current quantity at location
    EXECUTE format('SELECT %I FROM marketing_inventory WHERE id = $1', v_location_col)
    INTO v_current_qty
    USING p_prize_item_id;
    
    IF v_current_qty IS NULL THEN
      RAISE EXCEPTION 'Prize inventory item not found: %', p_prize_item_id;
    END IF;
    
    -- Deduct from inventory (allow going negative with warning in notes)
    EXECUTE format('UPDATE marketing_inventory SET %I = %I - $1 WHERE id = $2', v_location_col, v_location_col)
    USING p_prize_quantity, p_prize_item_id;
  END IF;
  
  RETURN v_lead_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_lead_with_prize TO authenticated;
GRANT EXECUTE ON FUNCTION create_lead_with_prize TO anon; -- For public lead capture form

COMMENT ON COLUMN marketing_leads.prize_inventory_item_id IS 'FK to marketing_inventory for tracking what prize the lead won';
COMMENT ON COLUMN marketing_leads.prize_quantity IS 'Quantity of prize items given (usually 1)';
COMMENT ON COLUMN marketing_leads.prize_location IS 'Location from which the prize was given';
COMMENT ON FUNCTION create_lead_with_prize IS 'Creates a lead and optionally deducts prize from inventory at specified location';
