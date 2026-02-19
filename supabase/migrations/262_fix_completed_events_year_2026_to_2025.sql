-- Fix completed events incorrectly dated in 2026 — move them back to 2025
-- These events already happened in 2025 but were entered with 2026 dates.

UPDATE marketing_events
SET event_date = event_date - INTERVAL '1 year'
WHERE status = 'completed'
  AND event_date >= '2026-01-01'
  AND id IN (
    'b1c1541e-88bc-40a5-95d5-32be7cde8532', -- New Year's Day 2026-01-01 -> 2025-01-01
    '72389448-6d99-4b04-9420-e8d6cbb99dba', -- GDD Staff Holiday Party 2026-01-10 -> 2025-01-10
    '15a21c1a-797d-40a3-b5f8-8dd0018a7699', -- Martin Luther King Jr. Day 2026-01-19 -> 2025-01-19
    '1b61f798-841c-4451-9aa7-af3992719bbd', -- DOG PPL X GDD POP UP CLINIC 2026-05-18 -> 2025-05-18
    '95b49ea5-f6be-4b99-8c62-5aee8eb7e31b', -- GRLSWIRL Event 2026-08-04 -> 2025-08-04
    '52282881-c752-4b69-8239-52ffb6c96294', -- Howloween 2026-11-02 -> 2025-11-02
    'eefa673a-a7f2-4d0c-9942-4326922b5070', -- JAKKS Toys Health Fair 2026-11-13 -> 2025-11-13
    '79185faf-26b6-463d-b541-8e6383040065', -- Cat Show 2026-11-15 -> 2025-11-15
    '9ba555cb-aa81-4fd3-bf5d-a43d0c68400e', -- Venice Fest 2025 2026-11-22 -> 2025-11-22
    '87c39412-aeac-4f98-969a-5757b5d95c74'  -- GD LAND 2025 2026-12-06 -> 2025-12-06
  );
