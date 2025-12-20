-- =====================================================
-- Migration: Add Account Credentials to Marketing Partners
-- Description: Add secure fields for login credentials and populate retail/printing/vendor partners
-- =====================================================

-- =====================================================
-- STEP 1: Add new columns for account credentials
-- =====================================================

ALTER TABLE public.marketing_partners 
ADD COLUMN IF NOT EXISTS account_email TEXT;

ALTER TABLE public.marketing_partners 
ADD COLUMN IF NOT EXISTS account_password TEXT;

ALTER TABLE public.marketing_partners 
ADD COLUMN IF NOT EXISTS account_number TEXT;

ALTER TABLE public.marketing_partners 
ADD COLUMN IF NOT EXISTS category TEXT; -- For grouping: retail, printing, vendor

-- Add comments for documentation
COMMENT ON COLUMN public.marketing_partners.account_email IS 'Login email/username for online accounts (sensitive)';
COMMENT ON COLUMN public.marketing_partners.account_password IS 'Account password (sensitive - consider vault storage)';
COMMENT ON COLUMN public.marketing_partners.account_number IS 'Customer/account number';
COMMENT ON COLUMN public.marketing_partners.category IS 'Partner category grouping: retail, printing, vendor';

-- =====================================================
-- STEP 2: Add new partner types if not exists
-- =====================================================

-- The enum might not have all types we need, update constraint
ALTER TABLE public.marketing_partners 
DROP CONSTRAINT IF EXISTS marketing_partners_partner_type_check;

-- We'll use 'other' type for retail accounts since they fit that category

-- =====================================================
-- STEP 3: Seed Marketing Partners Data
-- =====================================================

-- I. RETAIL ACCOUNTS
INSERT INTO public.marketing_partners (
  name, partner_type, status, contact_email, website, notes, 
  account_email, account_password, account_number, category
) VALUES
-- Amazon GDD Biz Account
(
  'Amazon GDD Biz Account',
  'other',
  'active',
  'mypetbianca@gmail.com',
  'https://www.amazon.com',
  'Bianca''s phone number (305-302-2334) is linked to this account.',
  'mypetbianca@gmail.com',
  '305 Aheat',
  NULL,
  'retail'
),
-- Costco
(
  'Costco',
  'other',
  'active',
  'gladysfattonni@yahoo.com',
  'https://www.costco.com',
  NULL,
  'gladysfattonni@yahoo.com',
  'rugby2012',
  '111820938618',
  'retail'
),
-- Walmart.com
(
  'Walmart.com',
  'other',
  'active',
  'mypetgladys@gmail.com',
  'https://www.walmart.com',
  NULL,
  'mypetgladys@gmail.com',
  'Rugby2012',
  NULL,
  'retail'
),
-- Staples
(
  'Staples',
  'other',
  'active',
  'mypetgladys@gmail.com',
  'http://www.staples.com',
  NULL,
  'mypetgladys@gmail.com',
  'Rugby2012',
  NULL,
  'retail'
),
-- Target GDD
(
  'Target GDD',
  'other',
  'active',
  'mypetbianca@gmail.com',
  'https://www.target.com',
  NULL,
  'mypetbianca@gmail.com',
  '13907Ventura!!',
  NULL,
  'retail'
)
ON CONFLICT DO NOTHING;

-- II. PRINTING PARTNERS
INSERT INTO public.marketing_partners (
  name, partner_type, status, contact_name, contact_email, contact_phone, website, 
  services_provided, notes, account_email, account_password, category
) VALUES
-- AV Graphics
(
  'AV Graphics',
  'print_vendor',
  'active',
  'Richard Jacobs',
  'jacobs@avgraphics.com',
  '818-678-6980',
  'https://www.avgraphics.com',
  'All printing services',
  'Primary company for all printing moving forward per Doc.',
  NULL,
  NULL,
  'printing'
),
-- PrintPlace
(
  'PrintPlace',
  'print_vendor',
  'active',
  NULL,
  'mypetgladys@gmail.com',
  NULL,
  'https://www.printplace.com',
  'Printing for bag stickers',
  NULL,
  'mypetgladys@gmail.com',
  'roberto 13',
  'printing'
),
-- Builtmore ProPrint
(
  'Builtmore ProPrint',
  'print_vendor',
  'active',
  'Aaron',
  'aquartulio@biltmoreproprint.com',
  NULL,
  NULL,
  'Business cards, flyers, and dental report cards',
  NULL,
  NULL,
  NULL,
  'printing'
),
-- Epic Print Solutions
(
  'Epic Print Solutions',
  'print_vendor',
  'active',
  'Ken Rutt',
  'ken@epicprintsolutions.com',
  '480-625-4682',
  'www.epicprintsolutions.com',
  'Note pads for AP notes',
  NULL,
  NULL,
  NULL,
  'printing'
),
-- ThumbPrint
(
  'ThumbPrint',
  'print_vendor',
  'active',
  'April Carter',
  NULL,
  '805-527-9491',
  'https://www.tpdigital.com',
  'Large items: tents, step and repeats, and large banners',
  'Alt phone: 805-432-3774',
  NULL,
  NULL,
  'printing'
),
-- Copy Hub
(
  'Copy Hub',
  'print_vendor',
  'active',
  'Ray',
  'ray@copyhub.net',
  '818-784-9999',
  'http://www.copyhub.net',
  'Smaller items',
  'Previously used before obtaining heavy-duty printer.',
  NULL,
  NULL,
  'printing'
)
ON CONFLICT DO NOTHING;

-- III. OPERATIONS & FACILITIES VENDORS
INSERT INTO public.marketing_partners (
  name, partner_type, status, contact_name, contact_email, contact_phone, website, 
  services_provided, notes, account_email, account_password, account_number, category
) VALUES
-- Ready Refresh (Arrowhead Water)
(
  'Ready Refresh (Arrowhead Water)',
  'food_vendor',
  'active',
  NULL,
  'greendogjackb@gmail.com',
  NULL,
  NULL,
  'Gallon water delivery',
  'Venice/Sherman Oaks. Payments are on autopay. Alt email: greendogesmeralda@gmail.com. Account #s: #6702962190 (VE) / #0033831611 (SO)',
  'greendogjackb@gmail.com',
  'Rugby2012',
  '6702962190',
  'vendor'
),
-- Sparkletts
(
  'Sparkletts',
  'food_vendor',
  'active',
  NULL,
  NULL,
  '1-888-432-4823',
  NULL,
  'Water dispenser via Costco Water account',
  'Used ONLY for the dispenser via Costco Water account.',
  NULL,
  NULL,
  '598475913099794',
  'vendor'
),
-- Just Food For Dogs / UniFirst
(
  'Just Food For Dogs / UniFirst',
  'food_vendor',
  'active',
  'Kristen P',
  'kristenp@justfoodfordogs.com',
  NULL,
  NULL,
  'Food supply',
  'Cost is $83 weekly.',
  NULL,
  NULL,
  NULL,
  'vendor'
),
-- RnF Signs, Inc.
(
  'RnF Signs, Inc.',
  'other',
  'active',
  'Raul Marroquin',
  'raul@mfsigns.com',
  '626-991-9048',
  'RnFSigns.com',
  'Sign repairs and lighting',
  'Repairs Green Dog signs and lighting.',
  NULL,
  NULL,
  NULL,
  'vendor'
),
-- Idexx (Printer/Toner)
(
  'Idexx (Printer/Toner)',
  'other',
  'active',
  'Josh Pacheco',
  'josh-pacheco@idexx.com',
  '888-794-3399',
  NULL,
  'Printer and toner supplies',
  NULL,
  NULL,
  NULL,
  NULL,
  'vendor'
)
ON CONFLICT DO NOTHING;
