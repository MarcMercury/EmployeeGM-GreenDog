-- Migration: Add external resources support to marketing_folders
-- Allows folders to be external links that open in new tabs instead of navigating internally

-- Add type column to differentiate between folders and links
ALTER TABLE marketing_folders 
ADD COLUMN IF NOT EXISTS folder_type TEXT DEFAULT 'folder' CHECK (folder_type IN ('folder', 'link', 'internal_route'));

-- Add external_url for external links
ALTER TABLE marketing_folders 
ADD COLUMN IF NOT EXISTS external_url TEXT;

-- Add internal_route for internal app navigation (like /marketing/inventory)
ALTER TABLE marketing_folders 
ADD COLUMN IF NOT EXISTS internal_route TEXT;

-- Add is_external flag to easily filter external resources section
ALTER TABLE marketing_folders 
ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT FALSE;

-- Add unique constraint on path for ON CONFLICT to work
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'marketing_folders_path_unique'
  ) THEN
    ALTER TABLE marketing_folders ADD CONSTRAINT marketing_folders_path_unique UNIQUE (path);
  END IF;
END $$;

-- Insert the existing hardcoded external resources as database records
-- These will replace the hardcoded tiles in the UI

INSERT INTO marketing_folders (name, description, icon, color, path, folder_type, external_url, is_external, sort_order)
VALUES 
  ('Company Assets', 'Dropbox folder for company assets', 'mdi-dropbox', '#2196F3', 'external-company-assets', 'link', 'https://www.dropbox.com/scl/fo/465hik7yxbdej26k3xwe5/AEqcQ-cpxxU8OjzFrFQbNdY?rlkey=dvmv0cvj504n7gkvt7kf82eld&e=1&st=z1s68eaf&dl=0', TRUE, 1),
  ('Media Drop Box', 'Dropbox folder for media files', 'mdi-dropbox', '#9C27B0', 'external-media-dropbox', 'link', 'https://www.dropbox.com/scl/fo/s36wdlct6q8rgznvsi8py/AJgaoCVe15pIUGjHdlX4omo?rlkey=cwwum11xdjslh36c2wddux1kg&e=1&st=udfnbd9u&dl=0', TRUE, 2),
  ('Canva', 'Design platform for graphics', 'mdi-palette', '#009688', 'external-canva', 'link', 'https://www.canva.com/login/?redirect=%2Fdesign%2FDAGZrjtoYzw%2FF_LmUEwIEto-N96GAg6idw%2Fedit', TRUE, 3),
  ('User Accounts', 'Account credentials spreadsheet', 'mdi-account-key', '#4CAF50', 'external-user-accounts', 'link', 'https://docs.google.com/spreadsheets/d/1hZvC3hqKfotbMU7qkzOce2Ya4xovNabHVwGc2z2PI6Y/edit?gid=303049314#gid=303049314', TRUE, 4),
  ('Inventory', 'Marketing supplies & materials', 'mdi-package-variant-closed', '#FFC107', 'internal-inventory', 'internal_route', NULL, TRUE, 5)
ON CONFLICT (path) DO NOTHING;

-- Set internal_route for the Inventory link
UPDATE marketing_folders 
SET internal_route = '/marketing/inventory'
WHERE path = 'internal-inventory';

-- Add comment explaining the schema
COMMENT ON COLUMN marketing_folders.folder_type IS 'Type of folder: folder (regular file folder), link (external URL), internal_route (app navigation)';
COMMENT ON COLUMN marketing_folders.external_url IS 'External URL for link-type folders';
COMMENT ON COLUMN marketing_folders.internal_route IS 'Internal app route for internal_route-type folders (e.g., /marketing/inventory)';
COMMENT ON COLUMN marketing_folders.is_external IS 'Whether this appears in the External Resources section at the top';
