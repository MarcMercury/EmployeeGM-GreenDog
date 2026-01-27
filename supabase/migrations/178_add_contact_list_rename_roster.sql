-- MIGRATION 178: Add Contact List page and rename section to Roster
-- ============================================================================
-- 1. Add the new Contact List page (accessible to all users)
-- 2. Rename "Contact List" section to "Roster" in page_definitions
-- ============================================================================

-- Add the new Contact List page (for My Workspace - all users can access)
INSERT INTO page_definitions (path, name, section, icon, sort_order, is_active)
VALUES ('/contact-list', 'Contact List', 'My Workspace', 'mdi-card-account-details', 6, true)
ON CONFLICT (path) DO UPDATE SET
  name = EXCLUDED.name,
  section = EXCLUDED.section,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- Update any pages that were in "Contact List" section to be in "Roster" section
UPDATE page_definitions 
SET section = 'Roster'
WHERE section = 'Contact List';

-- Update the roster page name to just "Roster"
UPDATE page_definitions 
SET name = 'Roster'
WHERE path = '/roster';

-- The contact-list page in "My Workspace" section will inherit full access for all roles
-- based on the access calculation function that grants full access to My Workspace pages
