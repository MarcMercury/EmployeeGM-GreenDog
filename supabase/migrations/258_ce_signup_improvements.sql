-- =====================================================
-- CE Event Public Signup Improvements
-- 1. Adds atomic increment RPC for current_attendees (prevents race conditions)
-- 2. Adds composite index on ce_event_attendees(ce_event_id, email) for duplicate checks
-- =====================================================

-- Atomic increment function for attendee count
-- Prevents race conditions when multiple people register simultaneously
CREATE OR REPLACE FUNCTION increment_event_attendees(p_event_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ce_events
  SET current_attendees = COALESCE(current_attendees, 0) + 1
  WHERE id = p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index for fast duplicate-check queries in the public signup endpoint
-- Query pattern: WHERE ce_event_id = ? AND email = ?
CREATE INDEX IF NOT EXISTS idx_ce_event_attendees_event_email
  ON ce_event_attendees(ce_event_id, email);
