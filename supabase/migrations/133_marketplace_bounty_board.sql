-- =====================================================
-- Migration 133: Green Dog Marketplace (Bounty Board) Schema
-- =====================================================
-- Description:
--   Gamified "Gig Economy" system where employees earn "Bones" (points)
--   for completing extra tasks and spend them on non-monetary perks.
-- =====================================================

-- =====================================================
-- 1. EMPLOYEE WALLETS TABLE
-- 1:1 relationship with employees, tracks point balances
-- =====================================================

CREATE TABLE IF NOT EXISTS public.employee_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL UNIQUE REFERENCES public.employees(id) ON DELETE CASCADE,
  current_balance INTEGER NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
  lifetime_earned INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_earned >= 0),
  lifetime_spent INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_spent >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_wallets_employee_id ON public.employee_wallets(employee_id);

-- =====================================================
-- 2. MARKETPLACE GIGS TABLE (The Work)
-- Tasks/bounties that employees can claim and complete
-- =====================================================

CREATE TABLE IF NOT EXISTS public.marketplace_gigs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  bounty_value INTEGER NOT NULL CHECK (bounty_value > 0),
  status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'reviewing', 'completed', 'expired')),
  
  -- Assignment
  claimed_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  
  -- Time constraints
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  flake_penalty INTEGER NOT NULL DEFAULT 0 CHECK (flake_penalty >= 0),
  
  -- Completion
  proof_url TEXT,
  proof_notes TEXT,
  completed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Metadata
  category VARCHAR(100),
  difficulty VARCHAR(50) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'legendary')),
  icon VARCHAR(100) DEFAULT 'mdi-star',
  max_claims INTEGER DEFAULT 1, -- How many times this gig can be completed
  times_completed INTEGER DEFAULT 0,
  is_recurring BOOLEAN DEFAULT FALSE,
  
  -- Admin
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_gigs_status ON public.marketplace_gigs(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_gigs_claimed_by ON public.marketplace_gigs(claimed_by);
CREATE INDEX IF NOT EXISTS idx_marketplace_gigs_category ON public.marketplace_gigs(category);

-- =====================================================
-- 3. MARKETPLACE REWARDS TABLE (The Perks)
-- Rewards that employees can purchase with their points
-- =====================================================

CREATE TABLE IF NOT EXISTS public.marketplace_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  cost INTEGER NOT NULL CHECK (cost > 0),
  stock_quantity INTEGER, -- NULL = unlimited
  icon VARCHAR(100) DEFAULT 'mdi-gift',
  image_url TEXT,
  category VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Fulfillment
  requires_approval BOOLEAN DEFAULT TRUE,
  fulfillment_notes TEXT,
  
  -- Admin
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_rewards_is_active ON public.marketplace_rewards(is_active);
CREATE INDEX IF NOT EXISTS idx_marketplace_rewards_category ON public.marketplace_rewards(category);

-- =====================================================
-- 4. MARKETPLACE TRANSACTIONS TABLE (Audit Log)
-- Complete history of all point movements
-- =====================================================

CREATE TABLE IF NOT EXISTS public.marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
    'gig_completed',      -- Earned from completing a gig
    'reward_purchased',   -- Spent on a reward
    'flake_penalty',      -- Penalty for not completing claimed gig
    'admin_adjustment',   -- Manual adjustment by admin
    'bonus',              -- Bonus points awarded
    'refund'              -- Refund for cancelled reward
  )),
  
  amount INTEGER NOT NULL, -- Positive = earned, Negative = spent
  balance_after INTEGER NOT NULL,
  
  -- References
  gig_id UUID REFERENCES public.marketplace_gigs(id) ON DELETE SET NULL,
  reward_id UUID REFERENCES public.marketplace_rewards(id) ON DELETE SET NULL,
  
  -- Context
  description TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_employee_id ON public.marketplace_transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_type ON public.marketplace_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_created_at ON public.marketplace_transactions(created_at DESC);

-- =====================================================
-- 5. REWARD REDEMPTIONS TABLE (Fulfillment Tracking)
-- Track reward purchases and their fulfillment status
-- =====================================================

CREATE TABLE IF NOT EXISTS public.marketplace_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.marketplace_rewards(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.marketplace_transactions(id) ON DELETE SET NULL,
  
  cost_paid INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'fulfilled', 'denied', 'refunded')),
  
  -- Fulfillment
  fulfilled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  fulfilled_at TIMESTAMPTZ,
  fulfillment_notes TEXT,
  denial_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_redemptions_employee_id ON public.marketplace_redemptions(employee_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_redemptions_status ON public.marketplace_redemptions(status);

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

ALTER TABLE public.employee_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_redemptions ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is HR admin
CREATE OR REPLACE FUNCTION public.is_hr_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
    AND role IN ('admin', 'super_admin', 'hr_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_hr_admin() TO authenticated;

-- Employee Wallets: Users can view their own, admins can view all
CREATE POLICY "wallets_select_own" ON public.employee_wallets
  FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT e.id FROM public.employees e
      JOIN public.profiles p ON e.profile_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
    OR public.is_hr_admin()
  );

CREATE POLICY "wallets_insert_admin" ON public.employee_wallets
  FOR INSERT TO authenticated
  WITH CHECK (public.is_hr_admin());

CREATE POLICY "wallets_update_admin" ON public.employee_wallets
  FOR UPDATE TO authenticated
  USING (public.is_hr_admin());

-- Marketplace Gigs: All can view, HR admins can manage
CREATE POLICY "gigs_select_all" ON public.marketplace_gigs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "gigs_insert_admin" ON public.marketplace_gigs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_hr_admin());

CREATE POLICY "gigs_update_admin" ON public.marketplace_gigs
  FOR UPDATE TO authenticated
  USING (public.is_hr_admin() OR claimed_by IN (
    SELECT e.id FROM public.employees e
    JOIN public.profiles p ON e.profile_id = p.id
    WHERE p.auth_user_id = auth.uid()
  ));

CREATE POLICY "gigs_delete_admin" ON public.marketplace_gigs
  FOR DELETE TO authenticated
  USING (public.is_hr_admin());

-- Marketplace Rewards: All can view active, admins can manage
CREATE POLICY "rewards_select_all" ON public.marketplace_rewards
  FOR SELECT TO authenticated
  USING (is_active = true OR public.is_hr_admin());

CREATE POLICY "rewards_insert_admin" ON public.marketplace_rewards
  FOR INSERT TO authenticated
  WITH CHECK (public.is_hr_admin());

CREATE POLICY "rewards_update_admin" ON public.marketplace_rewards
  FOR UPDATE TO authenticated
  USING (public.is_hr_admin());

CREATE POLICY "rewards_delete_admin" ON public.marketplace_rewards
  FOR DELETE TO authenticated
  USING (public.is_hr_admin());

-- Transactions: Users see their own, admins see all
CREATE POLICY "transactions_select" ON public.marketplace_transactions
  FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT e.id FROM public.employees e
      JOIN public.profiles p ON e.profile_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
    OR public.is_hr_admin()
  );

CREATE POLICY "transactions_insert_admin" ON public.marketplace_transactions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_hr_admin());

-- Redemptions: Users see their own, admins see all
CREATE POLICY "redemptions_select" ON public.marketplace_redemptions
  FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT e.id FROM public.employees e
      JOIN public.profiles p ON e.profile_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
    OR public.is_hr_admin()
  );

CREATE POLICY "redemptions_insert" ON public.marketplace_redemptions
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT e.id FROM public.employees e
      JOIN public.profiles p ON e.profile_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
    OR public.is_hr_admin()
  );

CREATE POLICY "redemptions_update_admin" ON public.marketplace_redemptions
  FOR UPDATE TO authenticated
  USING (public.is_hr_admin());

-- =====================================================
-- 7. GRANTS
-- =====================================================

GRANT ALL ON public.employee_wallets TO authenticated;
GRANT ALL ON public.marketplace_gigs TO authenticated;
GRANT ALL ON public.marketplace_rewards TO authenticated;
GRANT ALL ON public.marketplace_transactions TO authenticated;
GRANT ALL ON public.marketplace_redemptions TO authenticated;

-- =====================================================
-- 8. TRIGGER: Auto-create wallet for employees
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_employee_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.employee_wallets (employee_id)
  VALUES (NEW.id)
  ON CONFLICT (employee_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_create_employee_wallet ON public.employees;
CREATE TRIGGER trigger_create_employee_wallet
  AFTER INSERT ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.create_employee_wallet();

-- =====================================================
-- 9. TRIGGER: Update timestamps
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_marketplace_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_wallet_updated ON public.employee_wallets;
CREATE TRIGGER trigger_wallet_updated
  BEFORE UPDATE ON public.employee_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marketplace_timestamp();

DROP TRIGGER IF EXISTS trigger_gig_updated ON public.marketplace_gigs;
CREATE TRIGGER trigger_gig_updated
  BEFORE UPDATE ON public.marketplace_gigs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marketplace_timestamp();

DROP TRIGGER IF EXISTS trigger_reward_updated ON public.marketplace_rewards;
CREATE TRIGGER trigger_reward_updated
  BEFORE UPDATE ON public.marketplace_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marketplace_timestamp();

DROP TRIGGER IF EXISTS trigger_redemption_updated ON public.marketplace_redemptions;
CREATE TRIGGER trigger_redemption_updated
  BEFORE UPDATE ON public.marketplace_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marketplace_timestamp();

-- =====================================================
-- 10. SEED: Create wallets for existing employees
-- =====================================================

INSERT INTO public.employee_wallets (employee_id)
SELECT id FROM public.employees
WHERE id NOT IN (SELECT employee_id FROM public.employee_wallets)
ON CONFLICT (employee_id) DO NOTHING;

-- =====================================================
-- 11. COMMENTS
-- =====================================================

COMMENT ON TABLE public.employee_wallets IS 'Stores point balances for the marketplace gamification system';
COMMENT ON TABLE public.marketplace_gigs IS 'Available tasks/bounties that employees can claim and complete for points';
COMMENT ON TABLE public.marketplace_rewards IS 'Rewards/perks that employees can purchase with their earned points';
COMMENT ON TABLE public.marketplace_transactions IS 'Audit log of all point movements (earned, spent, penalties)';
COMMENT ON TABLE public.marketplace_redemptions IS 'Tracks reward purchases and their fulfillment status';
COMMENT ON FUNCTION public.is_hr_admin() IS 'Returns true if current user has HR admin access';
