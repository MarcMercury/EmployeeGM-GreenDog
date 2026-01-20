-- ============================================================
-- INFLUENCER MANAGEMENT SYSTEM
-- Migration 136: Enhanced influencer CRM with modern best practices
-- ============================================================

-- =====================================================
-- ENHANCED INFLUENCER TABLE COLUMNS
-- Adding modern influencer marketing fields
-- =====================================================

-- Tier classification (nano, micro, macro, mega)
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'micro';

-- Content niche/vertical
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS content_niche TEXT;

-- Audience demographics
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS audience_age_range TEXT;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS audience_gender_split TEXT;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS audience_location TEXT;

-- Platform-specific metrics
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS instagram_followers INTEGER;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS tiktok_followers INTEGER;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS youtube_subscribers INTEGER;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS facebook_followers INTEGER;

-- Engagement metrics
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS avg_likes INTEGER;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS avg_comments INTEGER;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS avg_saves INTEGER;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS avg_shares INTEGER;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS avg_views INTEGER;

-- Relationship management
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS relationship_status TEXT DEFAULT 'new';
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS relationship_score INTEGER DEFAULT 50;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS last_contact_date DATE;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS next_followup_date DATE;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS needs_followup BOOLEAN DEFAULT false;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';

-- Collaboration tracking
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS collaboration_type TEXT;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS content_rights TEXT;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS exclusivity_terms TEXT;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS contract_start_date DATE;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS contract_end_date DATE;

-- Compensation
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS compensation_type TEXT;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS compensation_rate DECIMAL(10,2);
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5,2);
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS total_paid DECIMAL(10,2) DEFAULT 0;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS total_value_generated DECIMAL(10,2) DEFAULT 0;

-- Campaign performance
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS total_campaigns INTEGER DEFAULT 0;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS total_impressions BIGINT DEFAULT 0;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS total_clicks INTEGER DEFAULT 0;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS total_conversions INTEGER DEFAULT 0;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(5,2);
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS roi DECIMAL(5,2);

-- Content preferences
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS preferred_content_types TEXT[];
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS content_guidelines TEXT;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS brand_alignment_score INTEGER;

-- Additional pet info (relevant for pet influencers)
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS pet_breed TEXT;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS pet_age TEXT;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS pet_type TEXT;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS pet_instagram TEXT;

-- Media kit & assets
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS media_kit_url TEXT;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Source tracking
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS referral_source TEXT;
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS discovered_via TEXT;

-- Tags for filtering
ALTER TABLE marketing_influencers 
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- =====================================================
-- INFLUENCER NOTES TABLE
-- For detailed activity tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS influencer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES marketing_influencers(id) ON DELETE CASCADE,
  note_type TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  author_initials TEXT,
  edited_at TIMESTAMPTZ,
  edited_by UUID REFERENCES auth.users(id),
  edited_by_initials TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INFLUENCER CAMPAIGNS TABLE
-- Track individual campaigns/collaborations
-- =====================================================
CREATE TABLE IF NOT EXISTS influencer_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES marketing_influencers(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL,
  campaign_type TEXT, -- 'sponsored_post', 'story', 'reel', 'ugc', 'event', 'ambassador'
  status TEXT DEFAULT 'planned', -- 'planned', 'active', 'completed', 'cancelled'
  start_date DATE,
  end_date DATE,
  
  -- Deliverables
  deliverables TEXT[],
  posts_required INTEGER DEFAULT 0,
  stories_required INTEGER DEFAULT 0,
  reels_required INTEGER DEFAULT 0,
  posts_delivered INTEGER DEFAULT 0,
  stories_delivered INTEGER DEFAULT 0,
  reels_delivered INTEGER DEFAULT 0,
  
  -- Performance
  impressions BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  engagements INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  promo_code_uses INTEGER DEFAULT 0,
  
  -- Compensation for this campaign
  compensation_amount DECIMAL(10,2),
  compensation_type TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_date DATE,
  
  -- Content links
  content_urls TEXT[],
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- INFLUENCER CONTENT TABLE
-- Track individual pieces of content
-- =====================================================
CREATE TABLE IF NOT EXISTS influencer_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES marketing_influencers(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES influencer_campaigns(id) ON DELETE SET NULL,
  
  content_type TEXT NOT NULL, -- 'post', 'story', 'reel', 'video', 'ugc'
  platform TEXT NOT NULL, -- 'instagram', 'tiktok', 'youtube', 'facebook'
  content_url TEXT,
  thumbnail_url TEXT,
  caption TEXT,
  hashtags TEXT[],
  
  -- Performance metrics
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  
  -- Dates
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_influencers_tier ON marketing_influencers(tier);
CREATE INDEX IF NOT EXISTS idx_influencers_status ON marketing_influencers(status);
CREATE INDEX IF NOT EXISTS idx_influencers_relationship_status ON marketing_influencers(relationship_status);
CREATE INDEX IF NOT EXISTS idx_influencers_priority ON marketing_influencers(priority);
CREATE INDEX IF NOT EXISTS idx_influencers_needs_followup ON marketing_influencers(needs_followup) WHERE needs_followup = true;
CREATE INDEX IF NOT EXISTS idx_influencers_next_followup ON marketing_influencers(next_followup_date) WHERE next_followup_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_influencers_niche ON marketing_influencers(content_niche) WHERE content_niche IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_influencer_notes_influencer_id ON influencer_notes(influencer_id);
CREATE INDEX IF NOT EXISTS idx_influencer_campaigns_influencer_id ON influencer_campaigns(influencer_id);
CREATE INDEX IF NOT EXISTS idx_influencer_campaigns_status ON influencer_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_influencer_content_influencer_id ON influencer_content(influencer_id);
CREATE INDEX IF NOT EXISTS idx_influencer_content_campaign_id ON influencer_content(campaign_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE influencer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencer_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencer_content ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe recreation)
DROP POLICY IF EXISTS "Marketing admins can manage influencer notes" ON influencer_notes;
DROP POLICY IF EXISTS "Marketing admins can manage influencer campaigns" ON influencer_campaigns;
DROP POLICY IF EXISTS "Marketing admins can manage influencer content" ON influencer_content;

-- Allow authenticated users with marketing access to manage influencer data
CREATE POLICY "Marketing admins can manage influencer notes"
  ON influencer_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('super_admin', 'admin', 'marketing_admin', 'manager')
    )
  );

CREATE POLICY "Marketing admins can manage influencer campaigns"
  ON influencer_campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('super_admin', 'admin', 'marketing_admin', 'manager')
    )
  );

CREATE POLICY "Marketing admins can manage influencer content"
  ON influencer_content FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('super_admin', 'admin', 'marketing_admin', 'manager')
    )
  );

-- =====================================================
-- HELPER FUNCTION: Calculate influencer tier
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_influencer_tier(follower_count INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF follower_count IS NULL THEN
    RETURN 'unknown';
  ELSIF follower_count < 1000 THEN
    RETURN 'nano';
  ELSIF follower_count < 10000 THEN
    RETURN 'nano';
  ELSIF follower_count < 50000 THEN
    RETURN 'micro';
  ELSIF follower_count < 500000 THEN
    RETURN 'macro';
  ELSE
    RETURN 'mega';
  END IF;
END;
$$;

-- =====================================================
-- TRIGGER: Auto-calculate tier on insert/update
-- =====================================================
CREATE OR REPLACE FUNCTION update_influencer_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.tier = calculate_influencer_tier(
    GREATEST(
      COALESCE(NEW.instagram_followers, 0),
      COALESCE(NEW.tiktok_followers, 0),
      COALESCE(NEW.youtube_subscribers, 0),
      COALESCE(NEW.facebook_followers, 0),
      COALESCE(NEW.follower_count, 0)
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_influencer_tier ON marketing_influencers;
CREATE TRIGGER trigger_update_influencer_tier
  BEFORE INSERT OR UPDATE ON marketing_influencers
  FOR EACH ROW
  EXECUTE FUNCTION update_influencer_tier();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE influencer_notes IS 'Activity notes and communication log for influencer relationships';
COMMENT ON TABLE influencer_campaigns IS 'Individual campaign/collaboration tracking for influencers';
COMMENT ON TABLE influencer_content IS 'Individual content pieces posted by influencers';

COMMENT ON COLUMN marketing_influencers.tier IS 'Influencer tier: nano (<10K), micro (10K-50K), macro (50K-500K), mega (500K+)';
COMMENT ON COLUMN marketing_influencers.content_niche IS 'Primary content vertical (pets, lifestyle, wellness, etc.)';
COMMENT ON COLUMN marketing_influencers.relationship_score IS 'Relationship health score 0-100';
COMMENT ON COLUMN marketing_influencers.roi IS 'Return on investment percentage for all collaborations';
