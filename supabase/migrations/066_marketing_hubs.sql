-- =====================================================
-- Marketing Hubs System
-- Creates tables for Partnership CRM, Influencer Roster, and Marketing Inventory
-- =====================================================

-- =====================================================
-- ENUM TYPES
-- =====================================================
CREATE TYPE marketing_partner_type AS ENUM (
  'chamber',
  'association', 
  'food_vendor',
  'pet_business',
  'rescue',
  'entertainment',
  'local_business',
  'print_vendor',
  'exotic_shop',
  'spay_neuter',
  'media_outlet',
  'other'
);

CREATE TYPE marketing_partner_status AS ENUM (
  'active',
  'pending',
  'expired',
  'inactive',
  'prospect'
);

CREATE TYPE influencer_status AS ENUM (
  'active',
  'prospect',
  'inactive',
  'completed'
);

CREATE TYPE inventory_category AS ENUM (
  'brochures',
  'flyers',
  'business_cards',
  'promotional_items',
  'apparel',
  'signage',
  'supplies',
  'other'
);

-- =====================================================
-- MARKETING PARTNERS TABLE
-- Tracks Chambers, Vendors, Rescues, Pet Businesses, Exotics
-- =====================================================
CREATE TABLE marketing_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  partner_type marketing_partner_type NOT NULL DEFAULT 'other',
  status marketing_partner_status NOT NULL DEFAULT 'prospect',
  
  -- Contact Information
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  website TEXT,
  address TEXT,
  
  -- Membership/Relationship Details
  membership_level TEXT,
  membership_fee DECIMAL(10,2),
  membership_start DATE,
  membership_end DATE,
  
  -- Social Media
  instagram_handle TEXT,
  facebook_url TEXT,
  tiktok_handle TEXT,
  youtube_url TEXT,
  
  -- Business Details
  services_provided TEXT,
  notes TEXT,
  
  -- Tracking
  events_attended TEXT[],
  last_contact_date DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- For exotic shops
  proximity_to_location TEXT
);

-- =====================================================
-- MARKETING INFLUENCERS TABLE
-- Tracks social media influencers and their collaborations
-- =====================================================
CREATE TABLE marketing_influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contact Info
  contact_name TEXT NOT NULL,
  pet_name TEXT,
  phone TEXT,
  email TEXT,
  
  -- Status & Agreement
  status influencer_status NOT NULL DEFAULT 'prospect',
  agreement_details TEXT,
  promo_code TEXT,
  
  -- Social Media Handles
  instagram_handle TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  tiktok_handle TEXT,
  youtube_url TEXT,
  
  -- Metrics
  follower_count INTEGER,
  highest_platform TEXT,
  engagement_rate DECIMAL(5,2),
  
  -- Tracking
  location TEXT,
  ezyvet_tracking TEXT,
  notes TEXT,
  
  -- Collaboration History
  last_post_date DATE,
  posts_completed INTEGER DEFAULT 0,
  stories_completed INTEGER DEFAULT 0,
  reels_completed INTEGER DEFAULT 0,
  
  -- Events
  events_attended TEXT[],
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- MARKETING INVENTORY TABLE
-- Tracks swag, marketing materials, and supplies with reorder points
-- =====================================================
CREATE TABLE marketing_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Item Details
  item_name TEXT NOT NULL,
  category inventory_category NOT NULL DEFAULT 'other',
  description TEXT,
  
  -- Quantities by Location
  quantity_venice INTEGER DEFAULT 0,
  quantity_sherman_oaks INTEGER DEFAULT 0,
  quantity_valley INTEGER DEFAULT 0,
  boxes_on_hand INTEGER DEFAULT 0,
  units_per_box INTEGER,
  
  -- Computed total (can be calculated or stored)
  total_quantity INTEGER GENERATED ALWAYS AS (
    COALESCE(quantity_venice, 0) + 
    COALESCE(quantity_sherman_oaks, 0) + 
    COALESCE(quantity_valley, 0)
  ) STORED,
  
  -- Reorder Management
  reorder_point INTEGER NOT NULL DEFAULT 100,
  is_low_stock BOOLEAN GENERATED ALWAYS AS (
    (COALESCE(quantity_venice, 0) + COALESCE(quantity_sherman_oaks, 0) + COALESCE(quantity_valley, 0)) < reorder_point
  ) STORED,
  
  -- Ordering Details
  last_ordered DATE,
  order_quantity INTEGER,
  supplier TEXT,
  unit_cost DECIMAL(10,2),
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- MARKETING SPENDING TABLE
-- Tracks payments, receipts, and reimbursements
-- =====================================================
CREATE TABLE marketing_spending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Transaction Details
  vendor TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT, -- 'chambers', 'events', 'materials', 'other'
  
  -- Payment Info
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE,
  payment_method TEXT, -- 'AMEX', 'Visa', 'Zelle', 'Cash', etc.
  paid_by TEXT,
  
  -- Approval
  approved_by TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'reimbursed', 'cancelled'
  
  -- Service Period
  service_start DATE,
  service_end DATE,
  
  -- Receipt Tracking
  receipt_sent BOOLEAN DEFAULT FALSE,
  receipt_sent_date DATE,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_marketing_partners_type ON marketing_partners(partner_type);
CREATE INDEX idx_marketing_partners_status ON marketing_partners(status);
CREATE INDEX idx_marketing_influencers_status ON marketing_influencers(status);
CREATE INDEX idx_marketing_inventory_category ON marketing_inventory(category);
CREATE INDEX idx_marketing_inventory_low_stock ON marketing_inventory(is_low_stock) WHERE is_low_stock = true;
CREATE INDEX idx_marketing_spending_status ON marketing_spending(status);
CREATE INDEX idx_marketing_spending_date ON marketing_spending(payment_date);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE marketing_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_spending ENABLE ROW LEVEL SECURITY;

-- Partners policies
CREATE POLICY "Authenticated users can view marketing partners"
  ON marketing_partners FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage marketing partners"
  ON marketing_partners FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Influencers policies  
CREATE POLICY "Authenticated users can view marketing influencers"
  ON marketing_influencers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage marketing influencers"
  ON marketing_influencers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Inventory policies
CREATE POLICY "Authenticated users can view marketing inventory"
  ON marketing_inventory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage marketing inventory"
  ON marketing_inventory FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Spending policies
CREATE POLICY "Authenticated users can view marketing spending"
  ON marketing_spending FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage marketing spending"
  ON marketing_spending FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- =====================================================
-- TRIGGERS for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_marketing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_marketing_partners_updated_at
  BEFORE UPDATE ON marketing_partners
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_updated_at();

CREATE TRIGGER update_marketing_influencers_updated_at
  BEFORE UPDATE ON marketing_influencers
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_updated_at();

CREATE TRIGGER update_marketing_inventory_updated_at
  BEFORE UPDATE ON marketing_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_updated_at();

CREATE TRIGGER update_marketing_spending_updated_at
  BEFORE UPDATE ON marketing_spending
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_updated_at();
