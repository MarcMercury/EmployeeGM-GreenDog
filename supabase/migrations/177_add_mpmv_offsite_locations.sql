-- MIGRATION 177: Add MPMV and Off-Site locations
-- ============================================================================
-- Adds new location columns to marketing_inventory table
-- The locations themselves were already added to the locations table via SQL insert
-- ============================================================================

-- Add new location columns to marketing_inventory
ALTER TABLE marketing_inventory 
  ADD COLUMN IF NOT EXISTS quantity_mpmv INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_offsite INT NOT NULL DEFAULT 0;
