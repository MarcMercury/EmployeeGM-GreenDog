-- Migration: Delete Event with Inventory Restoration
-- Creates function to safely delete an event and restore its inventory

-- =====================================================
-- 1. Create function to restore inventory for an event
-- =====================================================
CREATE OR REPLACE FUNCTION restore_inventory_for_event(p_event_id UUID)
RETURNS void AS $$
DECLARE
  usage_record RECORD;
BEGIN
  -- Loop through all inventory usage for this event and restore quantities
  FOR usage_record IN
    SELECT inventory_item_id, quantity_used, location_deducted_from
    FROM event_inventory_usage
    WHERE event_id = p_event_id
  LOOP
    -- Restore the quantity to the correct location column
    IF usage_record.location_deducted_from = 'venice' THEN
      UPDATE marketing_inventory
      SET quantity_venice = quantity_venice + usage_record.quantity_used
      WHERE id = usage_record.inventory_item_id;
    ELSIF usage_record.location_deducted_from = 'sherman_oaks' THEN
      UPDATE marketing_inventory
      SET quantity_sherman_oaks = quantity_sherman_oaks + usage_record.quantity_used
      WHERE id = usage_record.inventory_item_id;
    ELSIF usage_record.location_deducted_from = 'valley' THEN
      UPDATE marketing_inventory
      SET quantity_valley = quantity_valley + usage_record.quantity_used
      WHERE id = usage_record.inventory_item_id;
    ELSIF usage_record.location_deducted_from = 'mpmv' THEN
      UPDATE marketing_inventory
      SET quantity_mpmv = quantity_mpmv + usage_record.quantity_used
      WHERE id = usage_record.inventory_item_id;
    ELSIF usage_record.location_deducted_from = 'offsite' THEN
      UPDATE marketing_inventory
      SET quantity_offsite = quantity_offsite + usage_record.quantity_used
      WHERE id = usage_record.inventory_item_id;
    ELSE
      -- Default: add to total_quantity if location unknown
      UPDATE marketing_inventory
      SET total_quantity = total_quantity + usage_record.quantity_used
      WHERE id = usage_record.inventory_item_id;
    END IF;
    
    -- Recalculate total_quantity for the item
    UPDATE marketing_inventory
    SET total_quantity = COALESCE(quantity_venice, 0) + 
                         COALESCE(quantity_sherman_oaks, 0) + 
                         COALESCE(quantity_valley, 0) + 
                         COALESCE(quantity_mpmv, 0) + 
                         COALESCE(quantity_offsite, 0)
    WHERE id = usage_record.inventory_item_id;
    
    -- Update is_low_stock flag
    UPDATE marketing_inventory
    SET is_low_stock = (total_quantity <= COALESCE(reorder_point, 10))
    WHERE id = usage_record.inventory_item_id;
  END LOOP;
  
  -- Delete the usage records
  DELETE FROM event_inventory_usage WHERE event_id = p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. Create function to delete event with inventory restoration
-- =====================================================
CREATE OR REPLACE FUNCTION delete_marketing_event(p_event_id UUID)
RETURNS jsonb AS $$
DECLARE
  deleted_event_name TEXT;
  inventory_restored INT;
BEGIN
  -- Get event name before deletion
  SELECT name INTO deleted_event_name
  FROM marketing_events
  WHERE id = p_event_id;
  
  IF deleted_event_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Event not found'
    );
  END IF;
  
  -- Count inventory usage records to restore
  SELECT COUNT(*) INTO inventory_restored
  FROM event_inventory_usage
  WHERE event_id = p_event_id;
  
  -- Restore inventory
  PERFORM restore_inventory_for_event(p_event_id);
  
  -- Delete the event
  DELETE FROM marketing_events WHERE id = p_event_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'event_name', deleted_event_name,
    'inventory_items_restored', inventory_restored
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. Add comments
-- =====================================================
COMMENT ON FUNCTION restore_inventory_for_event(UUID) IS 'Restores inventory quantities when an event is cancelled or deleted';
COMMENT ON FUNCTION delete_marketing_event(UUID) IS 'Deletes a marketing event and restores any allocated inventory';
