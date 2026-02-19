-- Remove animal breed / species "International ... Day" events from marketing_events
-- These are pet-breed-specific and animal-species-specific awareness days
-- that clutter the marketing calendar without business value.

DELETE FROM marketing_events
WHERE name IN (
  'International Skye Terrier Day',
  'International Polar Bear Day',
  'International Rescue Cat Day',
  'International Akita Day',
  'International Bull Terrier Day',
  'International Bat Appreciation Day',
  'International Samoyed Day',
  'International Migratory Bird Day',
  'International Chihuahua Appreciation Day',
  'International Cavalier King Charles Spaniel Day',
  'International Sheltie Day',
  'International Corgi Day',
  'International Whippet Day',
  'International Tiger Day',
  'International Cat Day',
  'International Orangutan Day',
  'International Dog Day',
  'International Rabbit Day',
  'International Cheetah Day'
);
