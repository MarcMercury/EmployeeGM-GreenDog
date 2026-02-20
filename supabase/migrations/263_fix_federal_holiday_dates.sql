-- Fix federal holiday dates in marketing_events
--
-- 1) Martin Luther King Jr. Day was recorded as 2025-01-19 (Sunday).
--    The third Monday in January 2025 is January 20.
--
-- 2) Memorial Day had a duplicate entry on 2025-05-27 (Tuesday).
--    The last Monday in May 2025 is May 26. Remove the wrong duplicate.

-- Fix MLK Day: move from Jan 19 to Jan 20 (third Monday)
UPDATE marketing_events
SET event_date = '2025-01-20'
WHERE name ILIKE '%Martin Luther King%'
  AND event_date = '2025-01-19';

-- Remove duplicate Memorial Day on wrong date (May 27)
DELETE FROM marketing_events
WHERE name ILIKE '%Memorial Day%'
  AND event_date = '2025-05-27';
