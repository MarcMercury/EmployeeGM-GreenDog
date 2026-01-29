-- Migration: Event Inventory Tracking System (Part 1)
-- Creates event_inventory_usage table and extends inventory_category enum

-- =====================================================
-- 1. Create event_inventory_usage table
-- =====================================================
CREATE TABLE IF NOT EXISTS event_inventory_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES marketing_events(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES marketing_inventory(id) ON DELETE CASCADE,
  quantity_used INTEGER NOT NULL DEFAULT 1 CHECK (quantity_used > 0),
  location_deducted_from TEXT NOT NULL CHECK (location_deducted_from IN ('venice', 'sherman_oaks', 'valley', 'mpmv', 'offsite')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_inventory_usage_event ON event_inventory_usage(event_id);
CREATE INDEX IF NOT EXISTS idx_event_inventory_usage_item ON event_inventory_usage(inventory_item_id);

-- Enable RLS
ALTER TABLE event_inventory_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Marketing admins can manage event inventory usage" ON event_inventory_usage
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'marketing_admin', 'supervisor', 'manager')
    )
    OR is_super_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'marketing_admin', 'supervisor', 'manager')
    )
    OR is_super_admin()
  );

CREATE POLICY "Authenticated users can view event inventory usage" ON event_inventory_usage
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 2. Add new enum values to inventory_category
-- =====================================================
ALTER TYPE inventory_category ADD VALUE IF NOT EXISTS 'print';
ALTER TYPE inventory_category ADD VALUE IF NOT EXISTS 'prize';
ALTER TYPE inventory_category ADD VALUE IF NOT EXISTS 'product';
ALTER TYPE inventory_category ADD VALUE IF NOT EXISTS 'supply';
ALTER TYPE inventory_category ADD VALUE IF NOT EXISTS 'emp_apparel';

-- =====================================================
-- 3. Create function to deduct inventory when used at event
-- =====================================================
CREATE OR REPLACE FUNCTION deduct_inventory_for_event(
  p_event_id UUID,
  p_inventory_item_id UUID,
  p_quantity INTEGER,
  p_location TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usage_id UUID;
  v_current_qty INTEGER;
  v_location_col TEXT;
BEGIN
  -- Validate location
  IF p_location NOT IN ('venice', 'sherman_oaks', 'valley', 'mpmv', 'offsite') THEN
    RAISE EXCEPTION 'Invalid location: %', p_location;
  END IF;
  
  -- Get column name for location
  v_location_col := 'quantity_' || p_location;
  
  -- Check current quantity at location
  EXECUTE format('SELECT %I FROM marketing_inventory WHERE id = $1', v_location_col)
  INTO v_current_qty
  USING p_inventory_item_id;
  
  IF v_current_qty IS NULL THEN
    RAISE EXCEPTION 'Inventory item not found: %', p_inventory_item_id;
  END IF;
  
  IF v_current_qty < p_quantity THEN
    RAISE EXCEPTION 'Insufficient inventory at % (have: %, need: %)', p_location, v_current_qty, p_quantity;
  END IF;
  
  -- Deduct from inventory
  EXECUTE format('UPDATE marketing_inventory SET %I = %I - $1 WHERE id = $2', v_location_col, v_location_col)
  USING p_quantity, p_inventory_item_id;
  
  -- Record usage
  INSERT INTO event_inventory_usage (
    event_id, 
    inventory_item_id, 
    quantity_used, 
    location_deducted_from, 
    notes,
    created_by
  )
  VALUES (
    p_event_id, 
    p_inventory_item_id, 
    p_quantity, 
    p_location, 
    p_notes,
    auth.uid()
  )
  RETURNING id INTO v_usage_id;
  
  RETURN v_usage_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION deduct_inventory_for_event TO authenticated;

COMMENT ON TABLE event_inventory_usage IS 'Tracks inventory items used at marketing events with automatic deduction from location stock';
COMMENT ON FUNCTION deduct_inventory_for_event IS 'Deducts inventory from a specific location and records usage for an event';
