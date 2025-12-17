-- =====================================================
-- Marketing Hubs Seed Data
-- Data extracted from Marketing Spreadsheets PDF
-- =====================================================

-- =====================================================
-- MARKETING PARTNERS - Chambers of Commerce
-- =====================================================
INSERT INTO marketing_partners (name, partner_type, status, contact_name, contact_phone, contact_email, website, membership_level, membership_fee, membership_end, notes) VALUES
('Sherman Oaks Chamber', 'chamber', 'active', 'Vickie Bourdas Martinez', '(818) 906-1951', 'vickie@shermanoakschamber.org', 'https://members.shermanoaksencinochamber.org/', 'Member Plus', 775.00, '2026-08-29', 'Logo on email weekly newsletter. Annual membership + email blasts'),
('Venice Chamber of Commerce', 'chamber', 'active', 'George Francisco', '310-994-1151', 'gianfrancisco@hotmail.com', 'https://business.venicechamber.net/', 'Annual Membership (21-50 ppl)', 525.00, '2026-05-29', 'Windward event space available'),
('San Fernando Valley Chamber', 'chamber', 'active', 'Nikki Basi (VP of Membership)', '(818) 902-9457', 'nikki@sanfernandovalleychamber.com', 'https://www.sanfernandovalleychamber.com/', 'Annual Membership', 510.00, '2026-03-25', 'Good till March 2026'),
('Santa Monica Chamber', 'chamber', 'active', 'Katie Zika', NULL, 'Katie.zika@smchamber.com', 'http://members.smchamber.com/', 'Annual Membership (6-10 employees)', 605.00, '2026-11-26', 'Dana Sapiro also contact: dana.sapiro@smchamber.com'),
('Ocean Park Association', 'association', 'prospect', 'Sean Besser', NULL, 'board@opa-sm.org', 'https://opa.wildapricot.org/join', NULL, NULL, NULL, 'Dre looking into membership status'),
('Main Street Business Association', 'association', 'prospect', 'Jenny / Hunter Hall', '1-314-323-4663', 'HUNTER@MAINSTREETSM.COM', NULL, NULL, NULL, NULL, 'marketing@mainstreetsm.com for Jenny'),
('Beverly Hills Chamber (MY PET MOBILE VET)', 'chamber', 'inactive', NULL, NULL, 'mypetgladys@gmail.com', 'https://www.beverlyhillschamber.com/', NULL, NULL, NULL, 'No longer active - we are no longer wanting to be members');

-- =====================================================
-- MARKETING PARTNERS - Food & Beverage Vendors
-- =====================================================
INSERT INTO marketing_partners (name, partner_type, status, contact_name, contact_email, instagram_handle, services_provided, notes) VALUES
('Prince Street Pizza', 'food_vendor', 'inactive', 'Austin Night', 'austin@eatprincestreetpizza.com', 'princestreetpizza', 'Pizza donation', 'Bailed last minute for Adoptapalooza and previous events - would not use again'),
('Celsius', 'food_vendor', 'active', 'Marissa Rossi', 'mrossi@celsius.com', 'celsiusofficial', 'Energy drink distribution', 'Will be there from 1-6PM bringing enough product to distribute'),
('Mela Watermelon', 'food_vendor', 'active', NULL, 'Alana@melawater.com', 'mela', 'Watermelon product', 'Donating product 2/26/24'),
('Paulinas Food Catering (Taco)', 'food_vendor', 'active', NULL, NULL, 'paulinasfoodcateringg', 'Taco catering', 'Zoetis donated $750 for food'),
('Rough Day Rose', 'food_vendor', 'active', 'Matthew Bushman', 'matthew.bushman@gandbimporters.com', NULL, 'Rose wine cans', 'Donating cases of Rough Day Rose cans'),
('Venice Duck Brewery', 'food_vendor', 'prospect', 'John Quinn', NULL, NULL, 'Beer', 'Contact: 1 (310) 623-7551'),
('June Shine', 'food_vendor', 'active', 'Ryan Jones', 'ryanjones@juneshine.co', NULL, 'Hard kombucha', 'Donated 6 cases for Adoptapalooza - always donates! Keep this relationship!'),
('Tavern on Main', 'food_vendor', 'active', 'Dan', 'info@tavernonmainsm.com', NULL, 'Keg and ice', 'Donated a keg and ice for Adoptapalooza - very helpful');

-- =====================================================
-- MARKETING PARTNERS - Pet Related Businesses
-- =====================================================
INSERT INTO marketing_partners (name, partner_type, status, contact_name, contact_email, instagram_handle, website, services_provided, notes) VALUES
('Fresh Patch', 'pet_business', 'prospect', NULL, 'partner@freshpatch.com', 'freshpatch', NULL, 'Pet grass delivery', NULL),
('WestsideDog Gang', 'pet_business', 'prospect', NULL, 'woof@westsidedoggang.com', 'westside.doggang', NULL, NULL, NULL),
('DOG PPL', 'pet_business', 'prospect', 'Sam Gurrie', 'sam@dogppl.co', NULL, 'https://www.dogppl.co/', NULL, 'Emailed Sam for alternative opps to be involved in market other than $5k or $10k sponsorship. milan@dogppl.co, shipley@dogppl.co'),
('Ourfloof', 'pet_business', 'prospect', NULL, 'michael@ourfloof.com', NULL, NULL, NULL, NULL),
('TruPanion', 'pet_business', 'prospect', NULL, 'genesis.rendon@trupanion.com', NULL, NULL, 'Pet insurance', NULL),
('Healthy Paws Herbal Lab', 'pet_business', 'prospect', NULL, 'michael@healthypawsherballabs.com', NULL, NULL, NULL, NULL),
('Mossimos Chef Made Dog Food', 'pet_business', 'prospect', NULL, 'info@massimoschef.com', NULL, NULL, 'Dog food', NULL),
('Balanced Dog Grooming', 'pet_business', 'active', 'Torina', 'Torina@balanceddg.com', NULL, NULL, 'Grooming, sells GD Dental products', 'Huge partner. anndrea@balanceddg.com also contact'),
('EarthWise Pet', 'pet_business', 'active', NULL, 'socal_slott@earthwisepet.com', NULL, NULL, 'Pet supplies, sells GD Dental products', NULL),
('Giving Paws', 'pet_business', 'prospect', NULL, 'gina@givingpaws.com', NULL, NULL, NULL, NULL),
('Alphaone Canine Academy', 'pet_business', 'prospect', NULL, 'info@alphaonecanineacademy.com', NULL, NULL, 'Dog training', NULL),
('Zen Frens', 'pet_business', 'prospect', 'Alex Gray', 'alex@zenfrenz.com', NULL, NULL, NULL, NULL),
('KindyBites', 'pet_business', 'prospect', 'Kristin Hughes', 'kindybites@gmail.com', NULL, NULL, 'Pet treats', 'Multi location - not one direct contact'),
('Just Food For Dogs', 'pet_business', 'prospect', NULL, NULL, NULL, NULL, 'Dog food', NULL),
('Saturday Dog Club', 'pet_business', 'prospect', 'Max Stiggs', 'max@wuf.world', NULL, NULL, NULL, NULL),
('Fluffology', 'pet_business', 'prospect', 'Marcella Giuffrida', 'mg@marcellagiuffrida.com', NULL, NULL, NULL, NULL),
('Cleo & Hooman', 'pet_business', 'prospect', 'Mike Mclafferty', 'mike@cleoandhooman.com', NULL, NULL, NULL, NULL);

-- =====================================================
-- MARKETING PARTNERS - Rescues
-- =====================================================
INSERT INTO marketing_partners (name, partner_type, status, contact_name, contact_phone, contact_email, services_provided, notes) VALUES
('Mutternity Project', 'rescue', 'active', 'Asia Bornetto / Kris Gunn', '(213) 864-5196', 'asia@mutternityproject.org', 'Rescue partner', 'Primary contact: Asia. kris@vcla.agency'),
('Bark N Bitches', 'rescue', 'active', 'Shannon von Roemer', NULL, 'shopbnb@gmail.com', 'Rescue partner', NULL),
('Vanderpump Dogs', 'rescue', 'active', 'Paola Pierantoni', '1 (310) 489-5556', 'paola@vanderpumpdogs.org', 'Rescue partner', NULL),
('Pup Culture Dog Rescue', 'rescue', 'prospect', NULL, NULL, 'hello@pupculturerescue.org', 'Rescue partner', NULL),
('Samsons Sanctuary', 'rescue', 'prospect', 'Rickie Tice', '(516)355-8153', 'samsonssanctuary@gmail.com', 'Rescue partner', NULL),
('Stray Cat Alliance', 'rescue', 'prospect', 'Camrin Christensen', NULL, 'camrin@straycatalliance.org', 'Cat rescue', NULL),
('Pups without Borders', 'rescue', 'prospect', NULL, NULL, 'info@pupswithoutborders.org', 'Rescue partner', NULL),
('Deleon Foundation (Cat)', 'rescue', 'prospect', NULL, NULL, 'clarejacobs500@gmail.com', 'Cat rescue', 'yarideleon77@gmail.com'),
('Dogs without Borders', 'rescue', 'prospect', 'Katie Richards', NULL, 'kmadsenmft@gmail.com', 'Rescue partner', NULL),
('Marleys Mutts', 'rescue', 'prospect', 'Bernadette', '818-415-8805', 'clong@marleysmutts.org', 'Rescue partner', NULL),
('YARI', 'rescue', 'prospect', NULL, NULL, 'theyariorg@gmail.com', 'Rescue partner', NULL),
('Annenberg PetSpace', 'rescue', 'prospect', NULL, NULL, NULL, 'Rescue partner', NULL),
('Korean K9 Rescue', 'rescue', 'prospect', NULL, NULL, NULL, 'Rescue partner', NULL),
('Hollywood Huskies', 'rescue', 'prospect', NULL, NULL, NULL, 'Rescue partner', NULL),
('Dog Yoyo', 'rescue', 'prospect', NULL, NULL, NULL, 'Rescue partner', NULL),
('Deity Animal Rescue', 'rescue', 'prospect', NULL, NULL, NULL, 'Rescue partner', NULL),
('Yorkie Rescue of America', 'rescue', 'prospect', NULL, NULL, NULL, 'Rescue partner', NULL),
('GSI Rescue', 'rescue', 'prospect', NULL, NULL, 'toribegler@gmail.com', 'Rescue partner', NULL);

-- =====================================================
-- MARKETING PARTNERS - Print Vendors
-- =====================================================
INSERT INTO marketing_partners (name, partner_type, status, contact_name, contact_phone, contact_email, website, services_provided, notes) VALUES
('AV Graphics', 'print_vendor', 'active', 'rjacobs / sdiomande', '818-678-6980', 'rjacobs@avgraphics.com', 'https://www.avgraphics.com/', 'All printing', 'Per Doc - wants us to use this company for all printing moving forward'),
('PrintPlace', 'print_vendor', 'active', NULL, '877-405-3949', 'mypetgladys@gmail.com', 'https://www.printplace.com/', 'Stickers for bags', NULL),
('Builtmore ProPrint', 'print_vendor', 'active', NULL, NULL, 'aquartullo@biltmoreproprint.com', NULL, 'Business cards, flyer, dental report card', NULL),
('Epic Print Solutions', 'print_vendor', 'active', 'Ken', '480-625-4682', 'ken@epicprintsolutions.com', 'www.epicprintsolutions.com', 'Note pads for AP notes', 'Cell: 623-297-6374'),
('ThumbPrint', 'print_vendor', 'active', NULL, '805-527-9491', NULL, 'https://www.tpdigital.com/', 'Big items, tents, step and repeats, large banners', 'Cell: 805-432-3774'),
('Copy Hub', 'print_vendor', 'active', 'Ray', '818-784-9999', 'ray@copyhub.net', 'http://www.copyhub.net', 'Color copies, B&W copies', 'Down the street. Color .49 cents, B&W .05 cents'),
('NextDayFlyers', 'print_vendor', 'active', NULL, '855-898-9870', 'greendogsocial@gmail.com', 'https://portal.nextdayflyers.com/', 'Flyers', NULL),
('FedEx Office Print & Ship Center', 'print_vendor', 'active', NULL, '(818) 780-2123', 'greendogsocial@gmail.com', 'https://www.office.fedex.com/', 'Posters', '5810 Sepulveda Blvd - Card on file'),
('UPrinting', 'print_vendor', 'active', NULL, NULL, 'GREENDOGDEIJA@GMAIL.COM', 'https://www.uprinting.com/', 'Wellness Plans, Dental Report Cards', NULL),
('Prints & Threads', 'print_vendor', 'active', 'Jessica', '786-286-6626', NULL, NULL, 'Sweaters, business cards, leather portfolios, event tents', 'WhatsApp Group'),
('Uniform Advantage', 'print_vendor', 'active', 'Priyanka / Maria', NULL, 'psingh@uabrands.in', 'https://www.uniformadvantage.com/', 'Uniform scrubs', 'mmartinez3@uabrands.com'),
('Embroidery Station', 'print_vendor', 'active', 'Fred Yson', '818-414-5115', 'embrosta@aol.com', NULL, 'Custom embroidery', NULL),
('Digital Image Solutions', 'print_vendor', 'active', 'Kerry', '877-373-7883', 'kerry@discopiers.com', NULL, 'Venice Printer', NULL);

-- =====================================================
-- MARKETING PARTNERS - Entertainment
-- =====================================================
INSERT INTO marketing_partners (name, partner_type, status, contact_name, contact_phone, contact_email, instagram_handle, services_provided, notes) VALUES
('Angela Lima', 'entertainment', 'prospect', 'Angela Lima', '214-991-6601', NULL, 'imangelalima', 'Event contacts in Marina', 'Doc referral - she does events in the Marina and has a lot of contacts there'),
('Glenice DJ', 'entertainment', 'active', 'Glen Walsh', '1 (310) 704-2679', NULL, NULL, 'DJ services', NULL),
('Venice Pap (photo booth)', 'entertainment', 'active', 'Alex & Eden', '1 (310) 467-1775', 'alex@venicepaparazzi.com', 'venicepaparazzi', 'Photo booth', NULL);

-- =====================================================
-- MARKETING PARTNERS - Exotic Pet Shops (Valley Area)
-- =====================================================
INSERT INTO marketing_partners (name, partner_type, status, contact_phone, address, website, proximity_to_location, notes) VALUES
('Birds Plus', 'exotic_shop', 'prospect', '(818) 901-1187', '14041 Burbank Blvd, Valley Glen, CA 91401', NULL, '5 min / 1.4 miles', NULL),
('The Perfect Parrot', 'exotic_shop', 'prospect', '(818) 506-5456', '10646 Riverside Dr, North Hollywood, CA 91602', 'https://www.theperfectparrot.com/', '18 min / 6.6 miles', NULL),
('Exotic Pet World', 'exotic_shop', 'prospect', '(818) 571-4053', NULL, NULL, NULL, NULL),
('Village Pet Supply', 'exotic_shop', 'prospect', '(818) 579-4434', '2510 Magnolia Blvd, Valley Village, CA 91607', 'http://www.villagepetsupplyla.com/', '22 min / 7.3 miles', NULL),
('Exotic Life Fish & Reptiles', 'exotic_shop', 'prospect', '(818) 341-1007', '10122 Topanga Canyon Blvd, Chatsworth, CA 91311', 'https://www.instagram.com/exoticlife91311/', '25 min / 16.9 miles', NULL),
('The Painted Reptile', 'exotic_shop', 'prospect', '(818) 654-9441', '18730 Oxnard St #215, Tarzana, CA 91356', 'https://paintedreptile.com/', '21 min / 6.2 miles', NULL),
('Burbank Scales & Tails', 'exotic_shop', 'prospect', '(818) 842-6496', '701 W Magnolia Blvd, Burbank, CA 91506', 'https://www.scalesntails.com/', '25 min / 8.3 miles', NULL),
('Agamas Mau Exotics', 'exotic_shop', 'prospect', '(661) 648-0949', '12777 San Fernando Rd Sylmar, CA 91342', NULL, '19 min / 12.3 miles', NULL),
('Aquarium City', 'exotic_shop', 'prospect', '(818) 887-7369', '21723 Sherman Way Canoga Park, CA 91303', 'http://www.theaquariumcity.com/', '30 min / 10.1 miles', NULL),
('Canaries with Care', 'exotic_shop', 'prospect', '(818) 648-7965', '7844 Allott Ave Los Angeles, CA 91402', 'https://www.instagram.com/canarieswithcare/', '13 min / 4.0 miles', NULL),
('Birdhouse/Doghouse North Hollywood', 'exotic_shop', 'prospect', '(818) 753-4325', '5742 Lankershim Blvd, North Hollywood, CA 91601', 'https://www.dogdog.org/pet-store/birdhousedoghouse-north-hollywood', '13 min / 4.4 miles', NULL);

-- =====================================================
-- MARKETING PARTNERS - Spay & Neuter
-- =====================================================
INSERT INTO marketing_partners (name, partner_type, status, contact_name, contact_phone, website, services_provided, notes) VALUES
('Fix Nation', 'spay_neuter', 'prospect', 'Karn Myers', '818-524-2287 ext 5', 'www.fixnation.org', 'Spay & Neuter only', 'This is Docs contact - dont reach out personally yet');

-- =====================================================
-- MARKETING INFLUENCERS
-- =====================================================
INSERT INTO marketing_influencers (contact_name, pet_name, phone, email, status, promo_code, instagram_handle, instagram_url, follower_count, highest_platform, location, agreement_details, notes) VALUES
('Cathy Kim', 'Sawyer', '714-388-5879', 'sawyertheminidood@gmail.com', 'active', 'SAWYER20', 'sawyertheminidood', 'https://www.instagram.com/sawyertheminidood/', NULL, 'IG', 'The Valley', 'Collaboration Reel showcasing Valley location. Behind-the-scenes footage. Two IG Stories with promo code. Share 2 Stories from Green Dog. Green Dog Experience filming.', 'Posting complete 11/26. Great engagement.'),
('Sam Gritzy', 'Bam', '(301) 717-9088', 'bamthegolden@gmail.com', 'active', 'BAM20', 'thegoldenbandz', 'https://www.instagram.com/thegoldenbandz/', NULL, 'IG', 'Venice', 'Collaboration Reel with promo code BAM20. Behind-the-scenes footage. Minimum 2+ IG Stories with BAM20. Green Dog Experience filming.', 'Collab post and IG stories completed 10/27. Need to post GD Experience/Testimonial.'),
('Nikki Leigh', 'Kodi', '(714) 876-4036', 'assistant.nikkileigh@gmail.com', 'active', 'KODI20', 'missnikkileigh', 'https://www.instagram.com/missnikkileigh', 1000000, 'IG', 'Toluca Lake', 'Collaboration Post showcasing Valley location with KODI20. 3 IG Stories. Repost 2 Stories from Green Dog. Testimony video filming.', '1 million followers! Valley location 10/28.'),
('Mary Bonnet', NULL, NULL, NULL, 'active', NULL, 'themarybonnet', 'https://www.instagram.com/themarybonnet/', 2200000, 'IG', 'LA', NULL, 'Posted for Adoptapalooza! 2.2M followers'),
('Emilia Simonian', NULL, NULL, 'vetventures2.0@gmail.com', 'prospect', 'BENJI20', 'vetventures2.0', 'https://www.instagram.com/vetventures2.0/', 900000, 'IG', NULL, 'IG reel and stories with BENJI20. Green Dog Experience reel.', 'Veterinary Surgeon and Social Media Influencer. 900k combined followers.'),
('Andrew Laske', 'Benji', NULL, NULL, 'active', 'BENJI20', 'lilmanlife', 'https://www.instagram.com/lilmanlife/', NULL, 'IG', NULL, 'Comped appointment for vet exam, bloodwork, vaccines in exchange for IG reel and stories with BENJI20', NULL),
('Courtney Dasher', 'Tuna', '440-289-0785', 'courtney@tunameltsmyheart.com', 'active', NULL, 'tunameltsmyheart', 'https://www.instagram.com/tunameltsmyheart/', NULL, 'IG', NULL, NULL, 'Posted story and smileSpray swipe up'),
('Sommer Ray', 'Rari', '720-470-7164', 'sommerray15@gmail.com', 'active', NULL, 'sommerray', 'https://www.instagram.com/sommerray/', NULL, 'IG', NULL, NULL, 'Did 5 story posts about Green Dog and Smile Spray'),
('Betsy Waldman', 'Parker', '(213) 840-0093', 'betsywaldman@gmail.com', 'active', NULL, 'pumpkinandparker', 'https://www.instagram.com/PumpkinAndParker/', 104000, 'IG', NULL, NULL, 'Posted 3 stories and a reel promoting cleaning and smileSpray. 104K followers.'),
('Christine Hsu', 'Ducky', '402-312-1749', 'Christine@kkarmalove.com', 'active', NULL, 'duckytheyorkie', NULL, 271000, 'IG', NULL, NULL, 'Great photo and post. kkarmalove 271K, duckytheyorkie 55.2K'),
('Nicol Concilio', 'Juni & Moe', '646-425-3557', 'Nicolconciliomgm@gmail.com', 'active', NULL, 'nicolconcilio', 'https://instagram.com/nicolconcilio', NULL, 'IG', NULL, NULL, 'Came in to SO, super nice'),
('David Chi', 'Bowser', '626-537-5061', 'bowserkoopaha@gmail.com', 'active', NULL, 'bowserkoopaha', 'https://www.instagram.com/bowserkoopaha/', NULL, 'IG', NULL, NULL, 'Posted smileSpray content'),
('Teresa Nguyen', 'Sushi', '619-453-7044', 'sushithecockapoo@gmail.com', 'active', NULL, 'sushisaid', 'https://www.instagram.com/sushisaid/', NULL, 'IG', NULL, NULL, 'Has appointment booked'),
('Elana Rockman', 'Dulce', '(818) 669-0144', 'dulceandelana@gmail.com', 'active', NULL, 'dulceandelana', 'https://www.instagram.com/dulceandelana/', NULL, 'IG', NULL, NULL, 'Posted smileSpray content'),
('Alexi Blue', 'Emerson', '805-660-1859', 'alexiblueheart@gmail.com', 'active', NULL, 'mremersonblue', 'https://www.instagram.com/mremersonblue/', NULL, 'IG', NULL, NULL, 'Amazing post with slideshow of 3 posts and about 7 stories. INCREDIBLE influencer!'),
('Ava Allan', 'Jace', '805-660-1858', 'avaallanactress@gmail.com', 'active', NULL, 'avaallan', 'https://www.instagram.com/avaallan/', NULL, 'IG', NULL, NULL, 'Posted a post and stories. Jace coming back for surgery.'),
('Jessica Hwang', 'Zumo', '805-728-5211', 'zumothesamoyed@gmail.com', 'active', NULL, 'zumothesamoyed', NULL, NULL, 'IG', NULL, NULL, 'Interested in coming in'),
('Irene Cho', 'Kiara & Kuma', '323-271-2005', 'rainbowheartdoodles@gmail.com', 'active', NULL, 'rainbowheartdoodles', 'https://www.instagram.com/rainbowheartdoodles/', NULL, 'IG', NULL, NULL, 'Has alot of pull/voice in LA dog community - always be cautious and over nice'),
('Angela Chu', 'Wonton', '650-515-0805', 'shuanyi.chu@gmail.com', 'active', NULL, 'wontonthepug', NULL, NULL, 'IG', 'Venice', NULL, 'Actively coming in. First cleaning ever.'),
('Karen Vu', 'Dexter', '(714) 488-4900', 'karenvu09@yahoo.com', 'active', NULL, 'dextythedachshund', 'https://instagram.com/dextythedachshund', NULL, 'IG', NULL, NULL, 'Posted reel and stories. Great client response.'),
('Corey Brooks', 'Rory', '972-897-5465', 'itscoreyb@gmail.com', 'active', NULL, 'coreybrooks', 'https://www.instagram.com/coreybrooks/', NULL, 'IG', NULL, NULL, 'New influencer reached out via IG'),
('Aiden Lee', 'Scottie & Geordi', NULL, 'lacorgi@gmail.com', 'active', NULL, 'lacorgi', 'https://www.instagram.com/lacorgi/', NULL, 'IG', NULL, NULL, 'New influencers - both coming in together for cleanings'),
('Shirley Braha', 'Gilda', '917-716-6790', 'shirleybraha@gmail.com', 'active', NULL, 'marniethedog', 'https://www.instagram.com/marniethedog/', NULL, 'IG', NULL, NULL, 'Per Doc please hold'),
('Jessica Davis', 'Boomers Buddies', '321-262-7726', 'boomersbuddiesrescue@gmail.com', 'active', NULL, 'boomersbuddiesrescue', 'https://www.instagram.com/boomersbuddiesrescue/', NULL, 'IG', NULL, NULL, 'This is a rescue. Product influencer.'),
('Lauren Riihimaki', 'Moose & Diggy', NULL, NULL, 'prospect', NULL, 'laurdiy', 'https://www.instagram.com/laurdiy/', NULL, 'IG', NULL, NULL, 'NEW INFLUENCER - Have not collabd yet');

-- =====================================================
-- MARKETING INVENTORY
-- =====================================================
INSERT INTO marketing_inventory (item_name, category, boxes_on_hand, quantity_venice, quantity_sherman_oaks, quantity_valley, reorder_point, last_ordered, notes) VALUES
('Green Dog University Brochures', 'brochures', NULL, 100, 0, 0, 100, '2025-04-30', NULL),
('Referral Brochures', 'brochures', NULL, 100, 0, 0, 100, '2025-04-30', NULL),
('Dental Report Cards', 'brochures', 1, 1000, 0, 0, 200, '2025-08-18', 'ORDER MORE 11/19/25'),
('Urgent Care Flyers Venice', 'flyers', NULL, 500, 0, 0, 100, NULL, NULL),
('Urgent Care Flyers SO', 'flyers', 4, 0, 1000, 0, 500, NULL, '3000 total boxes'),
('New Folders CE/AP Clients', 'promotional_items', 1, 200, 100, 0, 50, '2025-03-26', NULL),
('Business Cards', 'business_cards', 1, 1000, 0, 0, 200, '2025-10-28', NULL),
('First Aid Brochures', 'brochures', NULL, 200, 0, 0, 50, NULL, NULL),
('Dr. Geist Flyers', 'flyers', NULL, 0, 0, 0, 50, NULL, 'Need more'),
('Smile Spray Cards', 'brochures', NULL, 0, 0, 0, 100, NULL, 'Outdated - need new ones'),
('Green Dog Plus Post Cards - Wellness Plan', 'promotional_items', 1, 0, 0, 1000, 200, '2025-08-19', '1000 for boots in the valley marketing'),
('Exotic Postcards', 'promotional_items', NULL, 0, 0, 500, 100, '2025-08-12', 'Used Tuesday weekly for Lawrences run'),
('Poop Bags + Flashlight', 'promotional_items', 2, 150, 0, 200, 50, '2025-04-01', NULL),
('Pens', 'promotional_items', 2, 1000, 0, 0, 200, '2025-03-21', NULL),
('Lanyards', 'promotional_items', 1, 350, 50, 0, 100, '2025-06-11', '500 Ordered 6/11/25'),
('Lanyard Slips', 'promotional_items', NULL, 110, 0, 0, 50, '2025-04-21', NULL),
('Pill Organizer', 'promotional_items', 3, 1100, 0, 0, 200, '2025-03-26', NULL),
('Old Tote Bags (White)', 'promotional_items', NULL, 20, 50, 950, 50, NULL, NULL),
('New Tote Bags', 'promotional_items', NULL, 800, 0, 0, 200, '2025-06-06', '1000 Ordered 6/6/25'),
('Pins', 'promotional_items', NULL, 300, 0, 0, 100, NULL, '1/2 box'),
('Calendar Magnets', 'promotional_items', NULL, 50, 0, 0, 50, '2025-03-24', NULL),
('Bandanas', 'apparel', NULL, 350, 0, 0, 100, '2025-06-11', '500 Ordered 6/11/25'),
('Scrub Caps', 'apparel', NULL, 0, 0, 0, 50, '2025-06-11', '200 Ordered 6/11/25'),
('Note Pads', 'promotional_items', 2, 200, 0, 0, 50, '2025-03-27', NULL),
('Dental Dust', 'supplies', NULL, 28, 22, 0, 20, NULL, NULL),
('Beanies', 'apparel', NULL, 30, 0, 0, 20, NULL, NULL),
('Tickets', 'supplies', 4, 4000, 0, 0, 500, NULL, '4 rolls'),
('Smile Spray', 'supplies', NULL, 0, 0, 0, 50, NULL, '2 boxes every 2 months per location: 50/box. Ordered by Ana');
