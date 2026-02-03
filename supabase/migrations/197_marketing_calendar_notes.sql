-- Migration: Marketing Calendar Notes
-- Adds a table for calendar notes with color support

-- =====================================================
-- 1. Create marketing_calendar_notes table
-- =====================================================
CREATE TABLE IF NOT EXISTS marketing_calendar_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_date DATE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  color TEXT NOT NULL DEFAULT 'blue' CHECK (color IN ('blue', 'green', 'red', 'orange', 'purple', 'pink', 'teal', 'amber', 'grey')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_calendar_notes_date ON marketing_calendar_notes(note_date);
CREATE INDEX IF NOT EXISTS idx_calendar_notes_created_by ON marketing_calendar_notes(created_by);

-- Enable RLS
ALTER TABLE marketing_calendar_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone authenticated can view notes
CREATE POLICY "calendar_notes_select_policy" ON marketing_calendar_notes
  FOR SELECT TO authenticated
  USING (true);

-- Only marketing admins, managers, and hr_admins can create/update/delete
CREATE POLICY "calendar_notes_insert_policy" ON marketing_calendar_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'marketing_admin', 'hr_admin', 'super_admin', 'sup_admin')
    )
  );

CREATE POLICY "calendar_notes_update_policy" ON marketing_calendar_notes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'marketing_admin', 'hr_admin', 'super_admin', 'sup_admin')
    )
  );

CREATE POLICY "calendar_notes_delete_policy" ON marketing_calendar_notes
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'marketing_admin', 'hr_admin', 'super_admin', 'sup_admin')
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_calendar_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calendar_notes_updated_at_trigger ON marketing_calendar_notes;
CREATE TRIGGER calendar_notes_updated_at_trigger
  BEFORE UPDATE ON marketing_calendar_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_notes_updated_at();

-- Comments
COMMENT ON TABLE marketing_calendar_notes IS 'Notes for marketing calendar dates with color support';
COMMENT ON COLUMN marketing_calendar_notes.note_date IS 'The date this note is attached to';
COMMENT ON COLUMN marketing_calendar_notes.title IS 'Short title for the note';
COMMENT ON COLUMN marketing_calendar_notes.content IS 'Full content/description of the note';
COMMENT ON COLUMN marketing_calendar_notes.color IS 'Display color for the note on calendar';
