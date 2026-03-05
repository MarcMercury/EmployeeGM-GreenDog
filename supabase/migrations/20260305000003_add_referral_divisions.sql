-- Add referral_divisions column to referral_partners
-- Tracks which Green Dog divisions (locations) have received referrals from each clinic
-- e.g. ["Green Dog - Sherman Oaks", "Green Dog - Venice (BU)", "Green Dog - Van Nuys"]

ALTER TABLE referral_partners
  ADD COLUMN IF NOT EXISTS referral_divisions TEXT[] DEFAULT '{}';

-- Add a comment for clarity
COMMENT ON COLUMN referral_partners.referral_divisions IS
  'Array of Green Dog division names that have received referrals from this clinic';
