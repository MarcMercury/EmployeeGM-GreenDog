-- Migration: Seed Inventory Items (Part 2)
-- Seeds missing inventory items using new category enum values
-- This must run in a separate transaction after the enum values are added

-- =====================================================
-- Add missing inventory items with quantity 0
-- Using the new category enum values: print, prize, product, supply, emp_apparel
-- =====================================================
INSERT INTO marketing_inventory (item_name, category, quantity_venice, quantity_sherman_oaks, quantity_valley, quantity_mpmv, quantity_offsite, reorder_point)
VALUES 
  -- Apparel (using existing 'apparel' enum value)
  ('Bandanas', 'apparel', 0, 0, 0, 0, 0, 50),
  ('Beanies', 'apparel', 0, 0, 0, 0, 0, 50),
  ('Scrub Caps', 'apparel', 0, 0, 0, 0, 0, 50),
  ('New Tote Bags', 'apparel', 0, 0, 0, 0, 0, 100),
  ('Old Tote Bags (White)', 'apparel', 0, 0, 0, 0, 0, 50),
  ('Proud Pet Parent Shirts', 'apparel', 0, 0, 0, 0, 0, 50),
  ('Proud Pet Parent Hats', 'apparel', 0, 0, 0, 0, 0, 50),
  ('GDD Hats', 'apparel', 0, 0, 0, 0, 0, 50),
  
  -- Print materials (using new 'print' enum value)
  ('Business Cards', 'print', 0, 0, 0, 0, 0, 500),
  ('Dental Report Cards', 'print', 0, 0, 0, 0, 0, 200),
  ('Dr. Geist Flyers', 'print', 0, 0, 0, 0, 0, 200),
  ('Exotic Postcards', 'print', 0, 0, 0, 0, 0, 200),
  ('First Aid Brochures', 'print', 0, 0, 0, 0, 0, 200),
  ('Green Dog Plus Post Cards - Wellness Plan', 'print', 0, 0, 0, 0, 0, 200),
  ('Green Dog University Brochures', 'print', 0, 0, 0, 0, 0, 200),
  ('Referral Brochures', 'print', 0, 0, 0, 0, 0, 200),
  ('Urgent Care Flyers SO', 'print', 0, 0, 0, 0, 0, 200),
  ('Urgent Care Flyers Venice', 'print', 0, 0, 0, 0, 0, 200),
  ('New Folders CE/AP Clients', 'print', 0, 0, 0, 0, 0, 100),
  
  -- Prize items (using new 'prize' enum value)
  ('Calendar Magnets', 'prize', 0, 0, 0, 0, 0, 100),
  ('Pill Organizer', 'prize', 0, 0, 0, 0, 0, 50),
  ('Pins', 'prize', 0, 0, 0, 0, 0, 100),
  ('Poop Bags + Flashlight', 'prize', 0, 0, 0, 0, 0, 100),
  
  -- Product items (using new 'product' enum value)
  ('Dental Dust', 'product', 0, 0, 0, 0, 0, 50),
  ('Smile Spray', 'product', 0, 0, 0, 0, 0, 50),
  ('Smile Spray Cards', 'product', 0, 0, 0, 0, 0, 100),
  
  -- Supply items (using new 'supply' enum value)
  ('Lanyard Slips', 'supply', 0, 0, 0, 0, 0, 200),
  ('Lanyards', 'supply', 0, 0, 0, 0, 0, 100),
  ('Note Pads', 'supply', 0, 0, 0, 0, 0, 100),
  ('Pens', 'supply', 0, 0, 0, 0, 0, 200),
  ('Tickets', 'supply', 0, 0, 0, 0, 0, 100),
  
  -- EMP Apparel / Employee Uniforms (using new 'emp_apparel' enum value)
  ('Ladies Top XS', 'emp_apparel', 0, 0, 0, 0, 0, 5),
  ('Ladies Top S', 'emp_apparel', 0, 0, 0, 0, 0, 5),
  ('Ladies Top M', 'emp_apparel', 0, 0, 0, 0, 0, 5),
  ('Ladies Top L', 'emp_apparel', 0, 0, 0, 0, 0, 5),
  ('Ladies Top XL/XXL', 'emp_apparel', 0, 0, 0, 0, 0, 5),
  ('Mens Top S', 'emp_apparel', 0, 0, 0, 0, 0, 5),
  ('Mens Top M', 'emp_apparel', 0, 0, 0, 0, 0, 5),
  ('Mens Top L', 'emp_apparel', 0, 0, 0, 0, 0, 5),
  ('Mens Top XL/XXL', 'emp_apparel', 0, 0, 0, 0, 0, 5),
  ('Womens Bottoms XS', 'emp_apparel', 0, 0, 0, 0, 0, 5),
  ('Womens Bottoms S', 'emp_apparel', 0, 0, 0, 0, 0, 5),
  ('Womens Bottoms M', 'emp_apparel', 0, 0, 0, 0, 0, 5),
  ('Womens Bottoms L', 'emp_apparel', 0, 0, 0, 0, 0, 5),
  ('Womens Bottoms XL', 'emp_apparel', 0, 0, 0, 0, 0, 5),
  ('Mens Bottoms S', 'emp_apparel', 0, 0, 0, 0, 0, 5),
  ('Mens Bottoms M', 'emp_apparel', 0, 0, 0, 0, 0, 5),
  ('Mens Bottoms L', 'emp_apparel', 0, 0, 0, 0, 0, 5),
  ('Mens Bottoms XL/XXL', 'emp_apparel', 0, 0, 0, 0, 0, 5),
  ('Hoodie S', 'emp_apparel', 0, 0, 0, 0, 0, 5),
  ('Hoodie M', 'emp_apparel', 0, 0, 0, 0, 0, 5),
  ('Hoodie L', 'emp_apparel', 0, 0, 0, 0, 0, 5),
  ('Hoodie XL', 'emp_apparel', 0, 0, 0, 0, 0, 5)
ON CONFLICT DO NOTHING;
