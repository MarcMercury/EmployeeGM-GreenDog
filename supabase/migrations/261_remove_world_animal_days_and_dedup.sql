-- Remove World animal/breed/species Day events and deduplicate all marketing events
-- Part 1: Remove World animal/breed days
DELETE FROM marketing_events
WHERE name IN (
  'World Greyhound Day',
  'World Sparrow Day',
  'World Rat Day',
  'World Hamster Day',
  'World Penguin Day',
  'World Dog Day',
  'World Dog Day (third Saturday in May)',
  'World Turtle Day',
  'World Parrot Day',
  'World Sea Turtle Day',
  'World Crocodile Day',
  'World Giraffe Day',
  'Cat World Domination Day',
  'World Snake Day',
  'World Collie Day',
  'World Lion Day',
  'World Elephant Day',
  'World Lizard Day',
  'World Honeybee Day',
  'World Mosquito Day'
);

-- Part 2: Remove parenthetical duplicate variants (keep the simpler name)
DELETE FROM marketing_events
WHERE name IN (
  'World Spay Day (last Tuesday in February)',
  'World Veterinary Day (last Saturday in April)',
  'World Pet Memorial Day (second Tuesday in June)',
  'National Pet Memorial Day (second Sunday in September)',
  'National Hug Your Hound Day (second Saturday in September)'
);

-- Part 3: Deduplicate exact duplicate rows (keep the one with the earliest created_at / lowest id)
DELETE FROM marketing_events a
USING marketing_events b
WHERE a.name = b.name
  AND a.event_date IS NOT DISTINCT FROM b.event_date
  AND a.ctid > b.ctid;
