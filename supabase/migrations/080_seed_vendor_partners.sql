-- =====================================================
-- VENDOR/PARTNER DATA EXPANSION
-- Migration: 080_seed_vendor_partners.sql
-- Description: Add partner_type column and seed vendor data
--              from Marketing Spreadsheet PDFs
-- =====================================================

-- =====================================================
-- 1. ADD NEW COLUMNS
-- =====================================================

ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS partner_type TEXT DEFAULT 'clinic';

ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS events_attended TEXT[] DEFAULT '{}';

ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT false;

ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS booth_size TEXT;

-- Create index for partner_type
CREATE INDEX IF NOT EXISTS idx_referral_partners_type ON public.referral_partners(partner_type);

-- =====================================================
-- 2. SEED RESCUE PARTNERS
-- Note: hospital_name is required (NOT NULL), so we set it equal to name
-- =====================================================

-- GSL Rescue
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'GSL Rescue', 'GSL Rescue', 'Victoria Begler', 'toribegler@gmail.com', '262-443-1105', 'rescue', 'active',
  '3 pug mixes (mama and 2 babies). Green Dog Partner.', ARRAY['24 PetChella', '25 GreenDogland', '25 Adoptapalooza'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'GSL Rescue');

-- Vanderpump Dogs Foundation
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, website, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'Vanderpump Dogs Foundation', 'Vanderpump Dogs Foundation', 'Paola Pierantoni, Brittany', 'paola@vanderpumpdogs.org, brittany@vanderpumpdogs.org', '310-489-5556', 'https://www.vanderpumpdogs.org/', 'rescue', 'active',
  'Plan to bring 5/6 dogs. Green Dog Partner. Requesting 20x20 space.', ARRAY['24 PetChella', '25 GreenDogland'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Vanderpump Dogs Foundation');

-- Deleon Foundation
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, website, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'Deleon Foundation', 'Deleon Foundation', 'Yari Deleon', 'deleonfoundation22@gmail.com', '814-737-2222', 'https://www.deleonanimalrescue.org/', 'rescue', 'active',
  '15-20 cats and 1 puppy. Green Dog Partner.', ARRAY['24 PetChella', '25 GreenDogland'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Deleon Foundation');

-- Mutternity Project
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, website, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'Mutternity Project', 'Mutternity Project', 'Kris Gunn, Sheri', 'kris@beforenight.co', '(213) 864-5196', 'https://www.mutternityproject.org/', 'rescue', 'active',
  'Bringing foster dogs, 9 dogs. Dogs too young to adopt but will pass out foster and adoption materials. Green Dog Partner.', ARRAY['25 GreenDogland'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Mutternity Project');

-- Pup Culture Rescue
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, website, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'Pup Culture Rescue', 'Pup Culture Rescue', 'Victoria', 'hello@pupculturerescue.org', '914-400-6446', 'https://www.pupculturerescue.org/', 'rescue', 'active',
  '10-15 dogs/puppies. 4 adoptions at event.', ARRAY['24 PetChella', '25 GreenDogland', '25 Adoptapalooza'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Pup Culture Rescue');

-- Hollywood Huskies
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, website, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'Hollywood Huskies', 'Hollywood Huskies', 'Jen Gray', 'hollywoodhuskiesrescue@gmail.com', '(323) 683-1800', 'https://hollywoodhuskies.org/', 'rescue', 'active',
  '10 dogs - number may vary depending on volunteers. Requested 10x20 space. 7 adoptions at event.', ARRAY['25 GreenDogland', '25 Adoptapalooza'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Hollywood Huskies');

-- Pawsitive Beginnings
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'Pawsitive Beginnings', 'Pawsitive Beginnings', 'Aleks Zak (Tristan)', 'pawsitivebeginningsla@gmail.com', '(818) 292-4114', 'rescue', 'active',
  'Getting personal contact from Westside Dog Gang. Puppies too young for adoption giveaway.', ARRAY['24 PetChella', '25 Adoptapalooza'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Pawsitive Beginnings');

-- Stray Cat Alliance
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'Stray Cat Alliance', 'Stray Cat Alliance', 'Marissa Peterson', 'marissa@straycatalliance.org', '310-488-5426', 'rescue', 'active',
  '5 cats. Will arrive between 11:30am and 12pm to set up in Shor-lines.', ARRAY['24 PetChella', '25 Adoptapalooza'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Stray Cat Alliance');

-- Rovers Retreat
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'Rovers Retreat', 'Rovers Retreat', 'Sydney Malemenan', 'sydney@roversretreat.org', '(310) 804-4312', 'rescue', 'active',
  '4-6 dogs, some puppies/small dogs in playpens.', ARRAY['25 Adoptapalooza'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Rovers Retreat');

-- Ozzie & Friends Rescue
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, partner_type, status, events_attended, is_confirmed)
SELECT 'Ozzie and Friends Rescue', 'Ozzie and Friends Rescue', 'Nancy', 'info@ozzieandfriendsrescue.org', '323-270-2009', 'rescue', 'active', ARRAY['25 Adoptapalooza'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Ozzie and Friends Rescue');

-- WUFAW
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'WUFAW', 'WUFAW', 'Valerie Inniallo', 'info@wufaw.org', '818-317-5863', 'rescue', 'active',
  '8x8 pop-up, 4-6 dogs. Setup at 11:30am. 2 pups/5 adults. Helped place cat traps during fires.', ARRAY['25 Adoptapalooza'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'WUFAW');

-- Sweet Angel Dog Rescue
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'Sweet Angel Dog Rescue', 'Sweet Angel Dog Rescue', 'Sabrina Escarze', 'sweetangeldogrescue@yahoo.com', '831-334-5448', 'rescue', 'active',
  'Rescue reached out via email.', ARRAY['25 Adoptapalooza'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Sweet Angel Dog Rescue');

-- Pet Aid USA
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'Pet Aid USA', 'Pet Aid USA', 'Micaela', 'stopthekillca@gmail.com', '(310) 500-5528', 'rescue', 'active',
  'Interested - reached out via email.', ARRAY['25 GreenDogland'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Pet Aid USA');

-- Bark N Bitches
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, website, partner_type, status, notes, events_attended, is_confirmed, booth_size)
SELECT 'Bark N Bitches', 'Bark N Bitches', 'Shannon von Roemer', 'shopbnb@gmail.com', '818-300-3889', 'https://www.barknbitches.com/', 'rescue', 'active',
  'Green Dog Partner. VEN 10x20 booth.', ARRAY['25 GreenDogland'], true, 'VEN 10x20'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Bark N Bitches');

-- Big Love Animal Rescue
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, partner_type, status, notes, is_confirmed)
SELECT 'Big Love Animal Rescue', 'Big Love Animal Rescue', 'Lisa & Vivian', 'Lisa@bigloveanimalrescue.org', '310-403-2202', 'rescue', 'pending',
  'Green Dog Partner. Left VM.', false
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Big Love Animal Rescue');

-- Deity Animal Rescue
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, partner_type, status, notes, is_confirmed)
SELECT 'Deity Animal Rescue', 'Deity Animal Rescue', 'Ellen', 'deityanimalrescue@gmail.com', '310-926-7945', 'rescue', 'pending',
  'Green Dog Partner. Left VM.', false
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Deity Animal Rescue');

-- Cavalier Rescue USA
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, partner_type, status, notes, is_confirmed)
SELECT 'Cavalier Rescue USA', 'Cavalier Rescue USA', 'Donna Beirne', 'd_beirne@yahoo.com', '818-929-0777', 'rescue', 'pending',
  'Green Dog Partner. Left VM.', false
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Cavalier Rescue USA');

-- Hope for China Dogs Rescue
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, partner_type, status, notes, is_confirmed)
SELECT 'Hope for China Dogs Rescue', 'Hope for China Dogs Rescue', 'Margo Rogat', 'info@hopeforchinadogsrescue.org', '(303) 667-7622', 'rescue', 'pending',
  'Green Dog Partner. Left VM.', false
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Hope for China Dogs Rescue');

-- Dogs Without Borders
INSERT INTO public.referral_partners (name, hospital_name, email, partner_type, status, events_attended, is_confirmed)
SELECT 'Dogs Without Borders', 'Dogs Without Borders', 'kmadsenmft@gmail.com', 'rescue', 'active', ARRAY['25 GreenDogland'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Dogs Without Borders');

-- Pups Without Borders
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, partner_type, status, events_attended, is_confirmed)
SELECT 'Pups Without Borders', 'Pups Without Borders', 'Evie', 'info@pupswithoutborders.org', 'rescue', 'active', ARRAY['25 GreenDogland'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Pups Without Borders');

-- Marleys Mutts
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, website, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'Marleys Mutts', 'Marleys Mutts', 'Bernadette', 'adoptions@marleysmutts.org', '818-415-8805', 'https://marleysmutts.org/', 'rescue', 'pending',
  'Maybe - have another huge event same week. Green Dog Partner.', ARRAY['25 GreenDogland'], false
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Marleys Mutts');

-- Love Leo Rescue
INSERT INTO public.referral_partners (name, hospital_name, partner_type, status, notes, is_confirmed)
SELECT 'Love Leo Rescue', 'Love Leo Rescue', 'rescue', 'pending', 'Followed up via website and IG.', false
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Love Leo Rescue');

-- Forte Animal Rescue
INSERT INTO public.referral_partners (name, hospital_name, phone, website, partner_type, status, events_attended, is_confirmed)
SELECT 'Forte Animal Rescue', 'Forte Animal Rescue', '(310) 362-0321', 'https://farescue.org/contact/', 'rescue', 'pending', ARRAY['24 PetChella', '25 GreenDogland'], false
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Forte Animal Rescue');

-- =====================================================
-- 3. SPONSORS
-- =====================================================

-- Zoetis
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, partner_type, status, notes, events_attended, is_confirmed, booth_size)
SELECT 'Zoetis', 'Zoetis', 'Juliana Ryan', 'juliana.ryan@zoetis.com', 'sponsor', 'active',
  'Vet equipment. Donating $500 for food truck.', ARRAY['25 GreenDogland'], true, 'SPONSOR'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Zoetis');

-- CELSIUS
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, partner_type, status, events_attended, is_confirmed, booth_size)
SELECT 'CELSIUS', 'CELSIUS', 'Marissa Rossi', 'mrossi@celsius.com', 'sponsor', 'active', ARRAY['25 GreenDogland'], true, 'VEN 10x10'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'CELSIUS');

-- El Cristiano Tequila
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, partner_type, status, events_attended, is_confirmed, booth_size)
SELECT 'El Cristiano Tequila', 'El Cristiano Tequila', 'Alyssa, Tina, Nikki', 'Tina@el-cristiano.com', '323-810-8501', 'sponsor', 'active', ARRAY['25 GreenDogland'], true, 'SPONSOR'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'El Cristiano Tequila');

-- Fluffology
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, partner_type, status, notes, events_attended, is_confirmed, booth_size)
SELECT 'Fluffology', 'Fluffology', 'Emily Henbest, Marcella, Kimberly', 'kimberly@fluffology.com', 'sponsor', 'active',
  'Grooming, Treats. Raffle Items.', ARRAY['25 GreenDogland', '25 Adoptapalooza'], true, 'VEN 10x10'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Fluffology');

-- DJ Skam Artists
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, partner_type, status, events_attended, is_confirmed, booth_size)
SELECT 'DJ Skam Artists', 'DJ Skam Artists', 'Sujit Kundu', 'sujit1@skamartist.com', 'entertainment', 'active', ARRAY['25 GreenDogland'], true, 'SPONSOR'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'DJ Skam Artists');

-- Covetrus
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, partner_type, status, is_confirmed)
SELECT 'Covetrus', 'Covetrus', 'Katrina Fargas', 'katherina.fargas@covetrus.com', 'sponsor', 'pending', false
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Covetrus');

-- =====================================================
-- 4. FOOD & BEVERAGE
-- =====================================================

-- Kona Ice
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, partner_type, status, notes, events_attended, is_confirmed, booth_size)
SELECT 'Kona Ice of Culver City', 'Kona Ice of Culver City', 'Leilani Rodriguez', 'lrod@kona-ice.com', '424-345-5969', 'food_beverage', 'active',
  'Mobile Shaved Ice. Setup at 10am.', ARRAY['25 Adoptapalooza'], true, 'VEN 10x10'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Kona Ice of Culver City');

-- JuneShine
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'JuneShine and Easy Rider', 'JuneShine and Easy Rider', 'Ryan Jones', 'ryanjones@juneshine.co', 'food_beverage', 'active',
  'Alcoholic kombucha. Picked up 6 cases.', ARRAY['24 PetChella', '25 GreenDogland'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'JuneShine and Easy Rider');

-- Tavern on Main
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'Tavern on Main', 'Tavern on Main', 'Dan, Addy', 'info@tavernonmainsm.com', '(310) 392-2772', 'food_beverage', 'active',
  'Donating keg, ice, jockey box, CO2 and 700 cups! Pickup 12:30pm.', ARRAY['24 PetChella', '25 GreenDogland'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Tavern on Main');

-- Mi Compa Benny Tacos
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, website, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'Mi Compa Benny Tacos', 'Mi Compa Benny Tacos', 'Benny, Araceli', 'micompabeni@gmail.com', '562-843-3847', 'https://compabenytacocatering.com/', 'food_beverage', 'active',
  '$1000 for 3 hours: 3 meats, toppings, salsas, 2-3 tacos each = 1000 tacos + 3 agua frescas.', ARRAY['25 GreenDogland'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Mi Compa Benny Tacos');

-- Triple Beam Pizza
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'Triple Beam Pizza', 'Triple Beam Pizza', 'Joana Rodriguez', 'joana@triplebeampizza.com', '310-579-4775', 'food_beverage', 'active',
  'Donated 8 pizzas last minute after Prince Street bailed. Pickup 12:15pm Saturday.', ARRAY['25 GreenDogland'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Triple Beam Pizza');

-- Heavy Handed Burgers
INSERT INTO public.referral_partners (name, hospital_name, contact_name, phone, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'Heavy Handed Burgers', 'Heavy Handed Burgers', 'Max (Owner), Paula (Mgr)', '818-571-7419', 'food_beverage', 'active',
  'Giving us 30 burgers/fries. Pickup 1:30pm.', ARRAY['25 GreenDogland'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Heavy Handed Burgers');

-- Stella Coffee
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, partner_type, status, events_attended, is_confirmed, booth_size)
SELECT 'Stella Coffee', 'Stella Coffee', 'Ally, Josh', 'hello@stellacoffeela.com', 'food_beverage', 'active', ARRAY['25 GreenDogland'], true, 'VEN 10x10'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Stella Coffee');

-- =====================================================
-- 5. DONORS
-- =====================================================

-- Bitchin Sauce
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'Bitchin Sauce', 'Bitchin Sauce', 'Abbey', 'abbey@bitchinsauce.com', 'donor', 'active',
  'Coupons, raffle and sauce.', ARRAY['25 Adoptapalooza'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Bitchin Sauce');

-- The Corner Door
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'The Corner Door', 'The Corner Door', 'Liz', 'liz@heartcentereddesignstudio.com', 'donor', 'active',
  'Bar in Culver City. Gift Card for raffle or silent auction.', ARRAY['25 Adoptapalooza'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'The Corner Door');

-- Fresh Patch
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'Fresh Patch', 'Fresh Patch', 'Kristin', 'partner@freshpatch.com', 'donor', 'active',
  'Real grass potty patches for pets. 2-3 XL Grass Combos (2x4 each).', ARRAY['25 Adoptapalooza', '25 GreenDogland'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Fresh Patch');

-- ZippyPaws
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'ZippyPaws', 'ZippyPaws', 'Jen', 'jen@zippypaws.com', 'donor', 'active',
  'Dog toys and accessories. ~50 plush toys, ~48 latex toys, ~50 treat bags, 2 tote bags.', ARRAY['25 Adoptapalooza'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'ZippyPaws');

-- =====================================================
-- 6. VENDORS
-- =====================================================

-- CLEO and HOOMAN
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, partner_type, status, notes, events_attended, is_confirmed, booth_size)
SELECT 'CLEO and HOOMAN', 'CLEO and HOOMAN', 'Louie, Mike', 'hello@cleoandhooman.com', 'vendor', 'active',
  'Inquired if interested in PetChella in June.', ARRAY['25 GreenDogland'], true, 'VEN 10x20'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'CLEO and HOOMAN');

-- PartyAnimals
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, partner_type, status, notes, events_attended, is_confirmed, booth_size)
SELECT 'PartyAnimals', 'PartyAnimals', 'Aaron Irmas', 'aaron@getpartyanimal.com', 'vendor', 'active',
  'Personalized birthdays in a box for your dog.', ARRAY['25 GreenDogland', '25 Adoptapalooza'], true, 'VEN 10x10'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'PartyAnimals');

-- Lapawnaderiatreats
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, partner_type, status, events_attended, is_confirmed, booth_size)
SELECT 'Lapawnaderiatreats', 'Lapawnaderiatreats', 'Adriana Montoya', 'lapawnaderiatreats@gmail.com', 'vendor', 'active', ARRAY['25 GreenDogland'], true, 'VEN 10x10'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Lapawnaderiatreats');

-- Xtreme Wellness Pets
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, partner_type, status, events_attended, is_confirmed, booth_size)
SELECT 'Xtreme Wellness Pets', 'Xtreme Wellness Pets', 'Jeff', 'jeff@xtreme-brands.com', 'vendor', 'active', ARRAY['25 GreenDogland'], true, 'VEN 10x10'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Xtreme Wellness Pets');

-- Ricky Animations
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, partner_type, status, events_attended, is_confirmed, booth_size)
SELECT 'Ricky Animations', 'Ricky Animations', 'Ricky', 'ickyanimation@gmail.com', '805-315-6184', 'vendor', 'active', ARRAY['25 GreenDogland'], true, 'VEN 10x10'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Ricky Animations');

-- Fi Collars
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, partner_type, status, events_attended, is_confirmed, booth_size)
SELECT 'Fi Collars', 'Fi Collars', 'Ken North', 'ken.north@tryfi.com', 'vendor', 'active', ARRAY['25 GreenDogland'], true, 'VEN 10x10'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Fi Collars');

-- Jiby Dog Crew
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, partner_type, status, is_confirmed)
SELECT 'Jiby Dog Crew', 'Jiby Dog Crew', 'Hailey', 'partners@jibydogcrew.com', 'vendor', 'pending', false
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Jiby Dog Crew');

-- TAVO Pets
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, partner_type, status, is_confirmed)
SELECT 'TAVO Pets', 'TAVO Pets', 'Justin Byrd', 'justin.byrd@tavopets.com', '760-908-6513', 'vendor', 'pending', false
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'TAVO Pets');

-- TruPanion
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, partner_type, status, is_confirmed)
SELECT 'TruPanion', 'TruPanion', 'Genesis Rendon', 'genesis.rendon@trupaion.com', 'vendor', 'pending', false
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'TruPanion');

-- Modern Beast
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, partner_type, status, notes, events_attended, is_confirmed, booth_size)
SELECT 'Modern Beast', 'Modern Beast', 'Hope', 'hope@modernbeast.com', 'vendor', 'active',
  'Contemporary toys, apparel and home goods. Gift basket for silent auction.', ARRAY['25 Adoptapalooza'], true, 'VEN 10x10'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Modern Beast');

-- Zen Frenz
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, partner_type, status, is_confirmed)
SELECT 'Zen Frenz', 'Zen Frenz', 'Alex Gray', 'alex@zenfrenz.com', 'vendor', 'pending', false
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Zen Frenz');

-- Alpha One Canine Academy
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, partner_type, status, is_confirmed)
SELECT 'Alpha One Canine Academy', 'Alpha One Canine Academy', 'Ian', 'info@alphaonecanineacademy.com', 'vendor', 'pending', false
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Alpha One Canine Academy');

-- Bad Hands Tattoo
INSERT INTO public.referral_partners (name, hospital_name, contact_name, partner_type, status, events_attended, is_confirmed, booth_size)
SELECT 'Bad Hands Tattoo', 'Bad Hands Tattoo', 'Hiyo', 'vendor', 'active', ARRAY['25 GreenDogland'], true, 'VEN 10x20'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Bad Hands Tattoo');

-- Grlswirl
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, website, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'Grlswirl', 'Grlswirl', 'Lindsey Kaye, Lucy Osinski', 'lindsey@grlswirl.com', '203-984-1648', 'https://www.grlswirl.com/', 'vendor', 'active',
  'Female Skate Org.', ARRAY['25 GreenDogland'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Grlswirl');

-- Venice Paparazzi
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'Venice Paparazzi', 'Venice Paparazzi', 'Alex, Edizen', 'alex@venicepaparazzi.com', '310-922-8456', 'vendor', 'active',
  'Photo Booth. Need to discuss backdrop size and tradeout.', ARRAY['25 GreenDogland'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Venice Paparazzi');

-- Fido Flush
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, partner_type, status, notes, events_attended, is_confirmed)
SELECT 'Fido Flush', 'Fido Flush', 'Anthony', 'anthony@fidoflush.com', 'vendor', 'active',
  'Pet Waste Removal.', ARRAY['25 Adoptapalooza'], true
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Fido Flush');

-- Teras Treasures
INSERT INTO public.referral_partners (name, hospital_name, email, partner_type, status, notes, events_attended, is_confirmed, booth_size)
SELECT 'Teras Treasures', 'Teras Treasures', 'Ttreas@pacbell.net', 'vendor', 'active',
  'Retail sales - pet beds.', ARRAY['25 Adoptapalooza'], true, 'VEN 10x20'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Teras Treasures');

-- Keller Williams SELA
INSERT INTO public.referral_partners (name, hospital_name, email, partner_type, status, notes, events_attended, is_confirmed, booth_size)
SELECT 'Keller Williams SELA', 'Keller Williams SELA', 'kcksellshouses@gmail.com', 'vendor', 'active',
  'Real Estate & Wealth creation. Flyers & Marketing Materials.', ARRAY['25 Adoptapalooza'], true, 'VEN 10x10'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Keller Williams SELA');

-- Wild Little Coyote
INSERT INTO public.referral_partners (name, hospital_name, email, partner_type, status, notes, events_attended, is_confirmed, booth_size)
SELECT 'Wild Little Coyote', 'Wild Little Coyote', 'hello@wildlittlecoyote.com', 'vendor', 'active',
  'Handmade custom pet portraits and jewelry. Paid 07/09/25.', ARRAY['25 Adoptapalooza'], true, 'VEN 10x10'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Wild Little Coyote');

-- Aris Icy Bliss
INSERT INTO public.referral_partners (name, hospital_name, email, partner_type, status, notes, events_attended, is_confirmed, booth_size)
SELECT 'Aris Icy Bliss', 'Aris Icy Bliss', 'arisicybliss@gmail.com', 'vendor', 'active',
  'Popsicles.', ARRAY['25 Adoptapalooza'], true, 'VEN 10x10 Indoor w/electricity'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Aris Icy Bliss');

-- Nourish Paws
INSERT INTO public.referral_partners (name, hospital_name, email, partner_type, status, notes, events_attended, is_confirmed, booth_size)
SELECT 'Nourish Paws', 'Nourish Paws', 'infonourishpaws@gmail.com', 'vendor', 'active',
  'Toys and Dog Supplements.', ARRAY['25 Adoptapalooza'], true, 'VEN 10x10'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Nourish Paws');

-- Haileys Doggy Boutique
INSERT INTO public.referral_partners (name, hospital_name, email, partner_type, status, notes, events_attended, is_confirmed, booth_size)
SELECT 'Haileys Doggy Boutique', 'Haileys Doggy Boutique', 'jrod909cal@yahoo.com', 'vendor', 'active',
  'Dog clothes, dog hats.', ARRAY['25 Adoptapalooza'], true, 'VEN 10x10'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Haileys Doggy Boutique');

-- Universal Thermblock Inc
INSERT INTO public.referral_partners (name, hospital_name, email, partner_type, status, notes, events_attended, is_confirmed, booth_size)
SELECT 'Universal Thermblock Inc', 'Universal Thermblock Inc', 'info@universalthermblock.com', 'vendor', 'active',
  'Pet Care dental/oral spray. Qty: 5.', ARRAY['25 Adoptapalooza'], true, 'VEN 10x10'
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Universal Thermblock Inc');

-- =====================================================
-- 7. ADDITIONAL VENDORS FROM ADP VENDOR RESPONSES
-- =====================================================

-- Prince Street Pizza (Note: bailed on event but keeping record)
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, partner_type, status, notes, is_confirmed)
SELECT 'Prince Street Pizza', 'Prince Street Pizza', 'Michael Hershman', 'michael@princestreetpizza.com', '323-672-8482', 'food_beverage', 'inactive',
  'Originally confirmed for 25 GreenDogland but bailed last minute.', false
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'Prince Street Pizza');

-- The Howl
INSERT INTO public.referral_partners (name, hospital_name, contact_name, email, phone, partner_type, status, notes, is_confirmed)
SELECT 'The Howl', 'The Howl', 'Sarah', 'info@thehowl.com', '424-361-3444', 'vendor', 'pending',
  'Dog-friendly bar in LA area.', false
WHERE NOT EXISTS (SELECT 1 FROM public.referral_partners WHERE name = 'The Howl');

-- =====================================================
-- 8. DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN public.referral_partners.partner_type IS 'Type of partner: clinic, rescue, vendor, sponsor, donor, food_beverage, entertainment, other';
COMMENT ON COLUMN public.referral_partners.events_attended IS 'Array of event names this partner has attended';
COMMENT ON COLUMN public.referral_partners.is_confirmed IS 'Whether this partner is confirmed for events';
COMMENT ON COLUMN public.referral_partners.booth_size IS 'Booth size for events (e.g., VEN 10x10, VEN 10x20, SPONSOR)';

-- =====================================================
-- End of Migration
-- =====================================================
