-- Migration: Add trigger to auto-recalculate partner metrics when data changes
-- This ensures Tier, Priority, Relationship Health, and Overdue status are always current

-- Create or replace the recalculate_partner_metrics function (with return type fix)
CREATE OR REPLACE FUNCTION recalculate_partner_metrics()
RETURNS SETOF referral_partners
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Step 1: Calculate Tier based on revenue (quintiles using NTILE for even distribution)
  -- Platinum (top 20%), Gold (20-40%), Silver (40-60%), Bronze (60-80%), Coal (bottom 20%)
  WITH tier_calc AS (
    SELECT 
      id,
      NTILE(5) OVER (ORDER BY COALESCE(total_revenue_all_time, 0) DESC) as tier_bucket
    FROM referral_partners
  )
  UPDATE referral_partners rp
  SET tier = CASE tc.tier_bucket
    WHEN 1 THEN 'Platinum'
    WHEN 2 THEN 'Gold'
    WHEN 3 THEN 'Silver'
    WHEN 4 THEN 'Bronze'
    WHEN 5 THEN 'Coal'
  END
  FROM tier_calc tc
  WHERE rp.id = tc.id;

  -- Step 2: Calculate Priority based on referral count (quartiles using NTILE)
  -- Very High (top 25%), High (25-50%), Medium (50-75%), Low (bottom 25%)
  WITH priority_calc AS (
    SELECT 
      id,
      NTILE(4) OVER (ORDER BY COALESCE(total_referrals_all_time, 0) DESC) as priority_bucket
    FROM referral_partners
  )
  UPDATE referral_partners rp
  SET priority = CASE pc.priority_bucket
    WHEN 1 THEN 'Very High'
    WHEN 2 THEN 'High'
    WHEN 3 THEN 'Medium'
    WHEN 4 THEN 'Low'
  END
  FROM priority_calc pc
  WHERE rp.id = pc.id;

  -- Step 3: Calculate Visit Tier (thirds based on combined score for visit frequency expectations)
  -- High = every 60 days, Medium = every 120 days, Low = every 180 days
  WITH visit_tier_calc AS (
    SELECT 
      id,
      NTILE(3) OVER (
        ORDER BY (COALESCE(total_revenue_all_time, 0) + COALESCE(total_referrals_all_time, 0) * 100) DESC
      ) as visit_bucket
    FROM referral_partners
  )
  UPDATE referral_partners rp
  SET 
    visit_tier = CASE vtc.visit_bucket
      WHEN 1 THEN 'High'
      WHEN 2 THEN 'Medium'
      WHEN 3 THEN 'Low'
    END,
    expected_visit_frequency_days = CASE vtc.visit_bucket
      WHEN 1 THEN 60    -- High priority: every 2 months
      WHEN 2 THEN 120   -- Medium priority: every 4 months
      WHEN 3 THEN 180   -- Low priority: every 6 months
    END
  FROM visit_tier_calc vtc
  WHERE rp.id = vtc.id;

  -- Step 4: Calculate days since last visit and overdue status
  UPDATE referral_partners
  SET 
    days_since_last_visit = CASE 
      WHEN last_visit_date IS NOT NULL THEN 
        EXTRACT(DAY FROM (NOW() - last_visit_date::timestamp))::integer
      ELSE NULL
    END,
    visit_overdue = CASE
      WHEN last_visit_date IS NULL THEN TRUE
      WHEN EXTRACT(DAY FROM (NOW() - last_visit_date::timestamp)) > COALESCE(expected_visit_frequency_days, 120) THEN TRUE
      ELSE FALSE
    END
  WHERE TRUE;

  -- Step 5a: Calculate Relationship Health (0-100 scale)
  -- Formula: Tier (40 pts) + Priority (30 pts) + Visit Recency (30 pts)
  UPDATE referral_partners
  SET 
    relationship_health = (
      -- Tier points (40 max)
      CASE tier
        WHEN 'Platinum' THEN 40
        WHEN 'Gold' THEN 32
        WHEN 'Silver' THEN 24
        WHEN 'Bronze' THEN 16
        WHEN 'Coal' THEN 8
        ELSE 0
      END
      +
      -- Priority points (30 max)
      CASE priority
        WHEN 'Very High' THEN 30
        WHEN 'High' THEN 22
        WHEN 'Medium' THEN 15
        WHEN 'Low' THEN 8
        ELSE 0
      END
      +
      -- Visit Recency points (30 max) - based on how close to expected visit frequency
      CASE
        WHEN last_visit_date IS NULL THEN 0
        WHEN days_since_last_visit <= COALESCE(expected_visit_frequency_days, 120) * 0.5 THEN 30
        WHEN days_since_last_visit <= COALESCE(expected_visit_frequency_days, 120) THEN 20
        WHEN days_since_last_visit <= COALESCE(expected_visit_frequency_days, 120) * 1.5 THEN 10
        ELSE 0
      END
    )
  WHERE TRUE;

  -- Step 5b: Derive relationship_status and needs_followup from the NEWLY computed relationship_health
  UPDATE referral_partners
  SET
    relationship_status = CASE
      WHEN relationship_health >= 80 THEN 'Excellent'
      WHEN relationship_health >= 60 THEN 'Good'
      WHEN relationship_health >= 40 THEN 'Fair'
      WHEN relationship_health >= 20 THEN 'Needs Attention'
      ELSE 'At Risk'
    END,
    needs_followup = CASE
      WHEN visit_overdue = TRUE THEN TRUE
      WHEN relationship_health < 40 THEN TRUE
      ELSE needs_followup  -- Keep existing value if not auto-flagging
    END
  WHERE TRUE;

  RETURN QUERY SELECT * FROM referral_partners ORDER BY name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION recalculate_partner_metrics() TO authenticated;

-- Create a trigger function that marks a partner for recalculation
-- Note: Full recalculation is expensive, so we only do it on-demand via the API
-- This trigger just updates the individual record's derived fields
CREATE OR REPLACE FUNCTION update_partner_derived_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update days since last visit
  NEW.days_since_last_visit := CASE 
    WHEN NEW.last_visit_date IS NOT NULL THEN 
      EXTRACT(DAY FROM (NOW() - NEW.last_visit_date::timestamp))::integer
    ELSE NULL
  END;
  
  -- Update visit overdue status
  NEW.visit_overdue := CASE
    WHEN NEW.last_visit_date IS NULL THEN TRUE
    WHEN NEW.days_since_last_visit > COALESCE(NEW.expected_visit_frequency_days, 120) THEN TRUE
    ELSE FALSE
  END;
  
  -- Recalculate relationship health if tier/priority changed
  NEW.relationship_health := (
    CASE NEW.tier
      WHEN 'Platinum' THEN 40
      WHEN 'Gold' THEN 32
      WHEN 'Silver' THEN 24
      WHEN 'Bronze' THEN 16
      WHEN 'Coal' THEN 8
      ELSE 0
    END
    +
    CASE NEW.priority
      WHEN 'Very High' THEN 30
      WHEN 'High' THEN 22
      WHEN 'Medium' THEN 15
      WHEN 'Low' THEN 8
      ELSE 0
    END
    +
    CASE
      WHEN NEW.last_visit_date IS NULL THEN 0
      WHEN NEW.days_since_last_visit <= COALESCE(NEW.expected_visit_frequency_days, 120) * 0.5 THEN 30
      WHEN NEW.days_since_last_visit <= COALESCE(NEW.expected_visit_frequency_days, 120) THEN 20
      WHEN NEW.days_since_last_visit <= COALESCE(NEW.expected_visit_frequency_days, 120) * 1.5 THEN 10
      ELSE 0
    END
  );
  
  -- Update relationship status
  NEW.relationship_status := CASE
    WHEN NEW.relationship_health >= 80 THEN 'Excellent'
    WHEN NEW.relationship_health >= 60 THEN 'Good'
    WHEN NEW.relationship_health >= 40 THEN 'Fair'
    WHEN NEW.relationship_health >= 20 THEN 'Needs Attention'
    ELSE 'At Risk'
  END;
  
  -- Auto-flag for followup if overdue or health is low
  IF NEW.visit_overdue = TRUE OR NEW.relationship_health < 40 THEN
    NEW.needs_followup := TRUE;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_update_partner_derived_fields ON referral_partners;

-- Create trigger for individual record updates
CREATE TRIGGER trg_update_partner_derived_fields
  BEFORE INSERT OR UPDATE OF last_visit_date, tier, priority, total_revenue_all_time, total_referrals_all_time
  ON referral_partners
  FOR EACH ROW
  EXECUTE FUNCTION update_partner_derived_fields();

-- Add helpful comment
COMMENT ON FUNCTION recalculate_partner_metrics() IS 'Recalculates tier, priority, visit frequency, and relationship health for all referral partners using NTILE for even distribution';
COMMENT ON FUNCTION update_partner_derived_fields() IS 'Trigger function to update derived fields when a partner record is modified';
