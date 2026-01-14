-- Migration: 054_referral_partners_crm
-- Description: Consolidated Medical/Referral Partners CRM system
-- Consolidates: 054, 055, 070, 072, 075 migrations
-- Includes: schema enhancements, contacts, notes, goals, visit logs, and seed data

-- =====================================================
-- 1. ENSURE BASE COLUMNS EXIST ON REFERRAL_PARTNERS
-- =====================================================

-- Add core columns if missing (fixes schema sync issues)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'referral_partners' AND column_name = 'name'
    ) THEN
        ALTER TABLE public.referral_partners ADD COLUMN name TEXT NOT NULL DEFAULT 'Unknown';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'referral_partners' AND column_name = 'contact_name'
    ) THEN
        ALTER TABLE public.referral_partners ADD COLUMN contact_name TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'referral_partners' AND column_name = 'email'
    ) THEN
        ALTER TABLE public.referral_partners ADD COLUMN email TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'referral_partners' AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.referral_partners ADD COLUMN phone TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'referral_partners' AND column_name = 'address'
    ) THEN
        ALTER TABLE public.referral_partners ADD COLUMN address TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'referral_partners' AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.referral_partners ADD COLUMN notes TEXT;
    END IF;
END $$;

-- =====================================================
-- 2. MED OPS PARTNER ENHANCEMENTS
-- =====================================================

-- Ensure status column exists
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add category and display fields
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'mdi-factory',
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'grey',
ADD COLUMN IF NOT EXISTS products TEXT[] DEFAULT '{}';

-- =====================================================
-- 3. CRM ENHANCEMENT FIELDS
-- =====================================================

-- Priority and targeting
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'bronze' CHECK (tier IN ('platinum', 'gold', 'silver', 'bronze', 'prospect')),
ADD COLUMN IF NOT EXISTS zone TEXT,
ADD COLUMN IF NOT EXISTS clinic_type TEXT DEFAULT 'general' CHECK (clinic_type IN ('general', 'specialty', 'emergency', 'urgent_care', 'mobile', 'shelter', 'corporate', 'independent')),
ADD COLUMN IF NOT EXISTS size TEXT DEFAULT 'small' CHECK (size IN ('small', 'medium', 'large', 'enterprise')),
ADD COLUMN IF NOT EXISTS hospital_name TEXT;

-- Goals and objectives
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS monthly_referral_goal INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quarterly_revenue_goal NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_month_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_quarter_revenue NUMERIC(12,2) DEFAULT 0;

-- Targeting and scheduling
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS visit_frequency TEXT DEFAULT 'monthly' CHECK (visit_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually', 'as_needed')),
ADD COLUMN IF NOT EXISTS last_visit_date DATE,
ADD COLUMN IF NOT EXISTS preferred_visit_day TEXT CHECK (preferred_visit_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', NULL)),
ADD COLUMN IF NOT EXISTS preferred_visit_time TEXT CHECK (preferred_visit_time IN ('morning', 'midday', 'afternoon', NULL)),
ADD COLUMN IF NOT EXISTS best_contact_person TEXT,
ADD COLUMN IF NOT EXISTS needs_followup BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS followup_reason TEXT;

-- Agreement and relationship details
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS referral_agreement_type TEXT DEFAULT 'none' CHECK (referral_agreement_type IN ('none', 'informal', 'formal', 'exclusive')),
ADD COLUMN IF NOT EXISTS ce_event_host BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lunch_and_learn_eligible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS drop_off_materials BOOLEAN DEFAULT true;

-- Tags for flexible categorization
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Revenue tracking
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS revenue_ytd NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS revenue_last_year NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_monthly_revenue NUMERIC(10,2) DEFAULT 0;

-- =====================================================
-- 4. PARTNER CONTACTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.partner_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.referral_partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN DEFAULT false,
  relationship_notes TEXT,
  preferred_contact_method TEXT DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'text', 'in_person')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.partner_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_contacts_view" ON public.partner_contacts;
DROP POLICY IF EXISTS "partner_contacts_admin_all" ON public.partner_contacts;

CREATE POLICY "partner_contacts_view" ON public.partner_contacts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "partner_contacts_admin_all" ON public.partner_contacts
  FOR ALL USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_partner_contacts_partner_id ON public.partner_contacts(partner_id);
GRANT ALL ON public.partner_contacts TO authenticated;

-- =====================================================
-- 5. PARTNER NOTES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.partner_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.referral_partners(id) ON DELETE CASCADE,
  note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'visit', 'call', 'email', 'meeting', 'issue', 'opportunity', 'goal')),
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.partner_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_notes_view" ON public.partner_notes;
DROP POLICY IF EXISTS "partner_notes_admin_all" ON public.partner_notes;

CREATE POLICY "partner_notes_view" ON public.partner_notes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "partner_notes_admin_all" ON public.partner_notes
  FOR ALL USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_partner_notes_partner_id ON public.partner_notes(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_notes_created_at ON public.partner_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_notes_is_pinned ON public.partner_notes(is_pinned);
GRANT ALL ON public.partner_notes TO authenticated;

-- =====================================================
-- 6. PARTNER GOALS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.partner_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.referral_partners(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('referral', 'revenue', 'relationship', 'event', 'custom')),
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC(12,2),
  current_value NUMERIC(12,2) DEFAULT 0,
  target_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'overdue')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.partner_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_goals_view" ON public.partner_goals;
DROP POLICY IF EXISTS "partner_goals_admin_all" ON public.partner_goals;

CREATE POLICY "partner_goals_view" ON public.partner_goals
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "partner_goals_admin_all" ON public.partner_goals
  FOR ALL USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_partner_goals_partner_id ON public.partner_goals(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_goals_status ON public.partner_goals(status);
GRANT ALL ON public.partner_goals TO authenticated;

-- =====================================================
-- 7. PARTNER VISIT LOGS RLS
-- =====================================================

ALTER TABLE public.partner_visit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_visit_logs_view" ON public.partner_visit_logs;
DROP POLICY IF EXISTS "partner_visit_logs_admin_all" ON public.partner_visit_logs;

CREATE POLICY "partner_visit_logs_view" ON public.partner_visit_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "partner_visit_logs_admin_all" ON public.partner_visit_logs
  FOR ALL USING (public.is_admin());

GRANT ALL ON public.partner_visit_logs TO authenticated;

-- =====================================================
-- 8. INDEXES FOR CRM QUERIES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_referral_partners_name ON public.referral_partners(name);
CREATE INDEX IF NOT EXISTS idx_referral_partners_status ON public.referral_partners(status);
CREATE INDEX IF NOT EXISTS idx_referral_partners_category ON public.referral_partners(category);
CREATE INDEX IF NOT EXISTS idx_referral_partners_priority ON public.referral_partners(priority);
CREATE INDEX IF NOT EXISTS idx_referral_partners_tier ON public.referral_partners(tier);
CREATE INDEX IF NOT EXISTS idx_referral_partners_zone ON public.referral_partners(zone);
CREATE INDEX IF NOT EXISTS idx_referral_partners_needs_followup ON public.referral_partners(needs_followup);
CREATE INDEX IF NOT EXISTS idx_referral_partners_next_followup ON public.referral_partners(next_followup_date);
CREATE INDEX IF NOT EXISTS idx_referral_partners_last_visit ON public.referral_partners(last_visit_date);

-- =====================================================
-- 9. TRIGGERS
-- =====================================================

-- Update last_visit_date when a visit log is added
CREATE OR REPLACE FUNCTION public.update_partner_last_visit()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.referral_partners
  SET last_visit_date = NEW.visit_date,
      last_contact_date = NEW.visit_date,
      needs_followup = false,
      updated_at = NOW()
  WHERE id = NEW.partner_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_partner_last_visit ON public.partner_visit_logs;

CREATE TRIGGER trigger_update_partner_last_visit
  AFTER INSERT ON public.partner_visit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_partner_last_visit();

-- Update last_contact_date when a visit log is added
CREATE OR REPLACE FUNCTION public.update_partner_last_contact()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.referral_partners
  SET last_contact_date = NEW.visit_date,
      updated_at = NOW()
  WHERE id = NEW.partner_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_partner_last_contact ON public.partner_visit_logs;

CREATE TRIGGER trigger_update_partner_last_contact
  AFTER INSERT ON public.partner_visit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_partner_last_contact();

-- =====================================================
-- 10. FUNCTION TO CHECK OVERDUE PARTNERS
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_overdue_partners()
RETURNS TABLE (
  partner_id UUID,
  partner_name TEXT,
  days_overdue INTEGER,
  visit_frequency TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rp.id,
    rp.name,
    CASE 
      WHEN rp.visit_frequency = 'weekly' THEN CURRENT_DATE - COALESCE(rp.last_visit_date, rp.created_at::date) - 7
      WHEN rp.visit_frequency = 'biweekly' THEN CURRENT_DATE - COALESCE(rp.last_visit_date, rp.created_at::date) - 14
      WHEN rp.visit_frequency = 'monthly' THEN CURRENT_DATE - COALESCE(rp.last_visit_date, rp.created_at::date) - 30
      WHEN rp.visit_frequency = 'quarterly' THEN CURRENT_DATE - COALESCE(rp.last_visit_date, rp.created_at::date) - 90
      ELSE 0
    END::INTEGER as days_overdue,
    rp.visit_frequency
  FROM public.referral_partners rp
  WHERE rp.status = 'active'
    AND rp.visit_frequency != 'as_needed'
    AND (
      (rp.visit_frequency = 'weekly' AND COALESCE(rp.last_visit_date, rp.created_at::date) < CURRENT_DATE - 7)
      OR (rp.visit_frequency = 'biweekly' AND COALESCE(rp.last_visit_date, rp.created_at::date) < CURRENT_DATE - 14)
      OR (rp.visit_frequency = 'monthly' AND COALESCE(rp.last_visit_date, rp.created_at::date) < CURRENT_DATE - 30)
      OR (rp.visit_frequency = 'quarterly' AND COALESCE(rp.last_visit_date, rp.created_at::date) < CURRENT_DATE - 90)
    )
  ORDER BY days_overdue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. COMMENTS
-- =====================================================

COMMENT ON COLUMN public.referral_partners.category IS 'Partner category for Med Ops (e.g., Laboratory, Pharmaceuticals)';
COMMENT ON COLUMN public.referral_partners.website IS 'Partner website URL';
COMMENT ON COLUMN public.referral_partners.description IS 'Brief description of the partner';
COMMENT ON COLUMN public.referral_partners.icon IS 'Material Design icon name for display';
COMMENT ON COLUMN public.referral_partners.color IS 'Color theme for partner avatar';
COMMENT ON COLUMN public.referral_partners.products IS 'Array of products/services offered';
COMMENT ON COLUMN public.referral_partners.priority IS 'Partner priority level for outreach (high, medium, low)';
COMMENT ON COLUMN public.referral_partners.tier IS 'Partnership tier based on value (platinum, gold, silver, bronze, prospect)';
COMMENT ON COLUMN public.referral_partners.zone IS 'Geographic zone for territory management';
COMMENT ON COLUMN public.referral_partners.clinic_type IS 'Type of veterinary practice';
COMMENT ON COLUMN public.referral_partners.visit_frequency IS 'How often this partner should be visited';
COMMENT ON COLUMN public.referral_partners.needs_followup IS 'Flag indicating partner needs immediate follow-up';
COMMENT ON COLUMN public.referral_partners.revenue_ytd IS 'Year-to-date revenue from this partner';
COMMENT ON COLUMN public.referral_partners.revenue_last_year IS 'Total revenue from last calendar year';
COMMENT ON COLUMN public.referral_partners.average_monthly_revenue IS 'Average monthly revenue over relationship';
COMMENT ON TABLE public.partner_contacts IS 'Key contacts at partner clinics/organizations';
COMMENT ON COLUMN public.partner_contacts.is_primary IS 'Whether this is the primary contact for the partner';
COMMENT ON TABLE public.partner_notes IS 'Timestamped notes for tracking partner interactions';
COMMENT ON TABLE public.partner_goals IS 'Goals and objectives for each partner relationship';

-- =====================================================
-- 12. SEED DATA - 143 Veterinary Clinics from Master List
-- =====================================================

INSERT INTO public.referral_partners (name, hospital_name, status, phone, email, address, tier, priority, clinic_type, visit_frequency, zone)
SELECT name, name AS hospital_name, status, phone, email, address, tier, priority, clinic_type, visit_frequency, zone
FROM (
VALUES
  ('Access LA', 'active', '310.558.6100', 'cserv@accessla.org', '9599 Jefferson Blvd, Culver City CA 90232', 'platinum', 'medium', 'general', 'monthly', 'WESTSIDE'),
  ('Affordable Animal Hospital Eagle Rock', 'active', '323-794-056', 'info@affordableanimalhospitaleaglerock.com', '4000 Eagle Rock Blvd, Los Angeles, CA 90065', 'bronze', 'medium', 'general', 'monthly', 'EASTSIDE'),
  ('Affordable Animal Hospital Silver Lake', 'active', NULL, NULL, NULL, 'bronze', 'medium', 'general', 'monthly', 'EASTSIDE'),
  ('All Animals Veterinary Hospital', 'active', '(818) 600-1838', 'help@allanimals-vet.com', '23815 Ventura Blvd Calabasas, CA 91302', 'silver', 'medium', 'general', 'monthly', 'WEST VALLEY'),
  ('Aloro Pet Hospital', 'active', '818-766-8197', 'staff@aloropethospital.com', '4846 Laurel Canyon Blvd Valley Village, CA 91607', 'bronze', 'medium', 'general', 'monthly', 'STUDIO CITY'),
  ('Animal AM-Emergency Clinic', 'active', '626-564-0704', 'info@aaecp.com', '2121 E. Foothill Blvd, Pasadena, CA 91107', 'silver', 'medium', 'general', 'monthly', 'PASADENA'),
  ('Animal Clinic of Encino', 'active', '818-342-7900', 'tacoeoffice@sbcglobal.net', '18010 Ventura Blvd. Encino, CA 91316', 'bronze', 'medium', 'general', 'monthly', 'ENCINO'),
  ('Animal Dermatology Center', 'active', '818-981-8877', 'animaldermatologycenter@gmail.com', '13125 Ventura Blvd, Studio City, CA 91604', 'gold', 'medium', 'general', 'monthly', 'STUDIO CITY'),
  ('Animal Dermatology Clinic', 'active', '310.822.3376', 'infomarinadelrey@adcmg.com', '4834 Lincoln Blvd, Marina Del Rey, CA 90292', 'gold', 'medium', 'general', 'monthly', 'MARINA'),
  ('Animal Medical Center Valencia', 'active', NULL, 'amcvalencia@gmail.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'VALENCIA'),
  ('Animal Vision Care & Surgical Center', 'active', '(818) 501-5155', 'reception@animalvisioncare.com', '12147 Ventura Boulevard, Studio City, CA 91604', 'gold', 'medium', 'general', 'monthly', 'STUDIO CITY'),
  ('Animal Wellness Centers', 'active', '310.381.9481', 'info@animalwellnesscenters.com', '1217 Wilshire Blvd, Santa Monica, 90403', 'silver', 'medium', 'general', 'monthly', 'SANTA MONICA'),
  ('Avalon Animal Hospital & Bird Clinic', 'active', '(310) 835-0111', NULL, '22404 S Avalon Blvd, Carson, CA 90745', 'bronze', 'medium', 'general', 'monthly', 'SOUTH BAY'),
  ('Balboa Veterinary Medical Center', 'active', '(747) 285-4885', NULL, '10361 Balboa Blvd. Granada Hills, CA 91344', 'bronze', 'medium', 'general', 'monthly', 'GRANADA HILLS'),
  ('Banfield Pet Hospital', 'active', '818-998-3875', 'banfield5237@banfield.com', '8986 Tampa Ave, Northridge, CA 91324', 'bronze', 'medium', 'general', 'monthly', 'NORTHRIDGE'),
  ('Bay Animal Hospital', 'active', '310.545.6596', 'frontdesk@bayanimalhosp.com', '1801 North Sepulveda blvd, Manhattan Beach CA 90266', 'gold', 'medium', 'general', 'monthly', 'SOUTH BAY'),
  ('Benjamin Rosnick DVM', 'active', '(424) 270-9006', 'benjamin.rosnick@drrosnick.com', NULL, 'silver', 'medium', 'general', 'monthly', 'WESTSIDE'),
  ('Best Friends Animal Hospital', 'active', '818-766-2140', 'info@bestfriendsanimalhospitals.com', '5425 Laurel Canyon Blvd. Valley Village, CA 91607', 'gold', 'medium', 'general', 'monthly', 'VALLEY VILLAGE'),
  ('Beverly Hills Small Animal Hospital', 'active', '310.276.7113', 'bhsah.pets@gmail.com', '353 Foothill Dr, Beverly Hills, 90210', 'platinum', 'medium', 'general', 'monthly', 'BEVERLY HILLS'),
  ('Beverly Oaks Animal Hospital', 'active', '818.722.8680', 'bevoaks@gmail.com', '14302 Ventura Blvd., Sherman Oaks, CA 91423', 'silver', 'medium', 'general', 'monthly', 'SHERMAN OAKS'),
  ('Beverly Pet Clinic', 'active', '323.378.5402', 'info@beverlypetclinic.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'BEVERLY'),
  ('Beverly Robertson Veterinary Clinic', 'active', NULL, 'info@beverlyrobertsonvet.com', NULL, 'gold', 'medium', 'general', 'monthly', 'BEVERLY'),
  ('Bloomfield Animal Hospital', 'active', NULL, 'bloomfieldpet@yahoo.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'CERRITOS'),
  ('Blue Pearl Los Angeles', 'active', NULL, 'info.losangeles@bluepearlvet.com', '11730 Ventura Blvd, Los Angeles, CA 91604', 'platinum', 'medium', 'general', 'monthly', 'STUDIO CITY'),
  ('Boulevard Pet Clinic', 'active', NULL, 'boulevardpetclinic@yahoo.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'WESTSIDE'),
  ('Brent-Air Animal Hospital', 'active', NULL, 'frontdesk@brentairanimalhospital.com', NULL, 'silver', 'medium', 'general', 'monthly', 'BRENTWOOD'),
  ('California Animal Rehabilitation', 'active', NULL, 'info@CalAnimalRehab.com', NULL, 'silver', 'medium', 'general', 'monthly', 'LA'),
  ('Capri Plaza Pet Clinic', 'active', NULL, 'info@capriplazapetclinic.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'LA'),
  ('Carlsen Animal Hospital', 'active', NULL, 'CARLSENANIMALHOSPITAL@CAHSTAFF.COM', '5505 Tujunga Ave, North Hollywood, CA 91601', 'bronze', 'medium', 'general', 'monthly', 'NORTH HOLLYWOOD'),
  ('Cat Care Clinic Burbank', 'active', NULL, 'info@catcburbank.org', NULL, 'bronze', 'medium', 'general', 'monthly', 'BURBANK'),
  ('Center Sinai Animal Hospital', 'active', NULL, 'info@centersinaianimalhospital.com', '10316 Sepulveda Blvd. #117 Mission Hills CA 91345', 'bronze', 'medium', 'general', 'monthly', 'MISSION HILLS'),
  ('Centinela Animal Hospital', 'active', NULL, 'centinela.animal@gmail.com', '721 Centinela Ave, Inglewood, CA 90302', 'bronze', 'medium', 'general', 'monthly', 'INGLEWOOD'),
  ('Complete Animal Eye Care Center', 'active', NULL, 'completeanimaleyecarecenter@hotmail.com', NULL, 'silver', 'medium', 'general', 'monthly', 'LA'),
  ('Copper Hill Animal Clinic', 'active', NULL, NULL, '7680 Clybourn Avenue Suite A, Sun Valley, CA 91352', 'bronze', 'medium', 'general', 'monthly', 'SUN VALLEY'),
  ('Culver City Animal Hospital', 'active', NULL, 'culvercityanimalhospital5830@gmail.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'CULVER CITY'),
  ('Dill Veterinary Hospital', 'active', NULL, 'dillvet@verizon.net', NULL, 'bronze', 'medium', 'general', 'monthly', 'LA'),
  ('Dog and Cat Hospital Calabasas', 'active', NULL, 'dogandcatcalabasas@gmail.com', NULL, 'silver', 'medium', 'general', 'monthly', 'CALABASAS'),
  ('Dog and Cat Cardiology', 'active', NULL, 'dogandcatcardio@gmail.com', NULL, 'gold', 'medium', 'general', 'monthly', 'LA'),
  ('El Segundo Animal Hospital', 'active', NULL, 'reception@elsegundoah.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'SOUTH BAY'),
  ('Elite Veterinary Care', 'active', '310-564-0013', 'info@eliteveterinarycare.com', '4139 Via Marina, Marina del Rey CA 90292', 'silver', 'medium', 'general', 'monthly', 'MARINA'),
  ('Emerald Animal Hospital', 'active', NULL, 'info@emeraldanimal.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'LA'),
  ('Encino Veterinary Center', 'active', NULL, 'Hello@EncinoVetCenter.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'ENCINO'),
  ('ERAE Animal Hospital', 'active', NULL, 'info@erae.vet', NULL, 'silver', 'medium', 'general', 'monthly', 'LA'),
  ('Exotic Animal Veterinary Center', 'active', '(626)405-1777', NULL, NULL, 'silver', 'medium', 'general', 'monthly', 'PASADENA'),
  ('Family Pet Clinic', 'active', NULL, 'frontdesk@familypetclinic.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'LA'),
  ('Family Veterinary Inc', 'active', '(818) 362-6599', 'familyveterinaryinc@gmail.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'VALLEY'),
  ('Five Star Vet', 'active', NULL, 'fivestarvet@gmail.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'LA'),
  ('Fox Hills Animal Hospital', 'active', NULL, 'info@foxhillsah.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'CULVER CITY'),
  ('Garfield Animal Hospital', 'active', NULL, 'garfieldanimalhosp@pacbell.net', NULL, 'bronze', 'medium', 'general', 'monthly', 'ALHAMBRA'),
  ('Gemcore Veterinary Services', 'active', NULL, 'gemcorevetservices@gmail.com', '21701 Devonshire St Suite F, Chatsworth, CA 91311', 'bronze', 'medium', 'general', 'monthly', 'CHATSWORTH'),
  ('Granada Veterinary Clinic', 'active', NULL, 'granadavet@yahoo.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'GRANADA HILLS'),
  ('Greentree Veterinary Clinic', 'active', NULL, 'info@greentree.vet.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'LA'),
  ('Hancock Park Veterinary Clinic', 'active', NULL, 'info@hancockparkvetclinic.com', NULL, 'silver', 'medium', 'general', 'monthly', 'HANCOCK PARK'),
  ('Holistika Vet', 'active', NULL, 'holistikavet@gmail.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'LA'),
  ('Home Pet Doctor', 'active', NULL, 'steve@homepetdoctor.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'LA'),
  ('LA Aser Vet', 'active', NULL, 'info@laaser.vet', NULL, 'silver', 'medium', 'general', 'monthly', 'LA'),
  ('LA Pet Clinic', 'active', NULL, 'lapetclinic@yahoo.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'LA'),
  ('LA Veterinary Center', 'active', NULL, 'info.laveterinarycenter@gmail.com', '109 N Boyle Ave, Los Angeles, CA 90033', 'bronze', 'medium', 'general', 'monthly', 'LA'),
  ('Laurel Pet Hospital', 'active', NULL, 'lph@laurelpethospital.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'STUDIO CITY'),
  ('Limehouse Vet Clinic', 'active', NULL, 'c-barreto@limehousevetclinic.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'LA'),
  ('Long Beach Vet Care', 'active', NULL, 'staff@lbvetcare.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'LONG BEACH'),
  ('Malibu Vets', 'active', NULL, 'information@malibuvets.com', NULL, 'silver', 'medium', 'general', 'monthly', 'MALIBU'),
  ('Mar Vista Animal Medical Center', 'active', NULL, 'MarVistaAMC@gmail.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'MAR VISTA'),
  ('Marina Veterinary', 'active', NULL, 'INFO@MARINAVET.COM', NULL, 'silver', 'medium', 'general', 'monthly', 'MARINA'),
  ('McGrath Veterinary Center', 'active', NULL, 'info@mcgrathvet.com', NULL, 'silver', 'medium', 'general', 'monthly', 'LA'),
  ('Melrose Animal Hospital', 'active', '(323) 937.2334', NULL, NULL, 'bronze', 'medium', 'general', 'monthly', 'MELROSE'),
  ('Mid Valley Veterinary Hospital', 'active', NULL, 'midvalleyveterinaryhospital@gmail.com', '17280 Saticoy St. Van Nuys, CA 91406', 'bronze', 'medium', 'general', 'monthly', 'VAN NUYS'),
  ('Modern Animal', 'active', NULL, 'hello@modernanimal.com', NULL, 'silver', 'medium', 'general', 'monthly', 'LA'),
  ('Northridge Pet Hospital', 'active', NULL, 'Northridgepethospital@gmail.com', '8615 Lindley Ave, Northridge, CA, 91325', 'bronze', 'medium', 'general', 'monthly', 'NORTHRIDGE'),
  ('Overland Veterinary Clinic', 'active', NULL, 'contact@overlandvetclinic.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'CULVER CITY'),
  ('Pacific Animal Clinic', 'active', NULL, 'contact@pacificanimalclinic.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'LA'),
  ('Pali Vet', 'active', NULL, 'Daisyhello@palivet.com', NULL, 'silver', 'medium', 'general', 'monthly', 'PACIFIC PALISADES'),
  ('Palm Paws Vet', 'active', NULL, 'Hello@palmspawsvet.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'LA'),
  ('Panorama Pet Hospital', 'active', NULL, 'panoramapet@gmail.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'PANORAMA CITY'),
  ('Pasternak Vet Center', 'active', NULL, 'info@pasternakvetcenter.com', NULL, 'silver', 'medium', 'general', 'monthly', 'WEST LA'),
  ('Paw Project', 'active', NULL, 'info@pawproject.org', NULL, 'bronze', 'medium', 'general', 'monthly', 'LA'),
  ('Paw Rehab', 'active', NULL, 'info@pawrehab.com', NULL, 'silver', 'medium', 'general', 'monthly', 'LA'),
  ('Peaceful Pets Aquamation', 'active', NULL, 'info@peacefulpetsaquamation.com', '19727 Bahama St. Northridge, CA. 91324', 'bronze', 'medium', 'general', 'monthly', 'NORTHRIDGE'),
  ('Pet Cure Vet Reseda', 'active', NULL, 'petcurevetreseda@gmail.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'RESEDA'),
  ('Pet Medical Santa Monica', 'active', '(310) 393-8218', 'recp@petmedical.com', '1534 14th St, Santa Monica, CA 90404', 'silver', 'medium', 'general', 'monthly', 'SANTA MONICA'),
  ('Pet Orphans of Southern California', 'active', NULL, 'info@petorphans.org', NULL, 'bronze', 'medium', 'general', 'monthly', 'LA'),
  ('Pinnacle Pet Hospital', 'active', '661.254.2000', 'pinnaclevet@vetsantaclarita.com', '23026 Soledad Canyon Rd Santa Clarita CA 91350', 'silver', 'medium', 'general', 'monthly', 'SANTA CLARITA'),
  ('Rancho Park Veterinary Clinic', 'active', '(855) 350-7387', 'office@ranchoparkveterinaryclinic.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'RANCHO PARK'),
  ('Redondo Shores Vet', 'active', NULL, 'info@redondoshoresvet.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'SOUTH BAY'),
  ('San Fernando Pet Hospital', 'active', NULL, 'info@sanfernandovet.com', '11207 San Fernando Road, San Fernando, CA 91340', 'bronze', 'medium', 'general', 'monthly', 'SAN FERNANDO'),
  ('Sepulveda Animal Hospital', 'active', '866-725-6729', 'info@sepulvedaanimalhospital.com', '4300 Sepulveda Blvd, Culver City, CA 90230', 'silver', 'medium', 'general', 'monthly', 'CULVER CITY'),
  ('Serenity Vet Care', 'active', NULL, 'info@serenityvetcare.com', '701 S Pacific Coast Hwy, Redondo Beach, CA 90277', 'silver', 'medium', 'general', 'monthly', 'SOUTH BAY'),
  ('Shane Veterinary', 'active', NULL, 'info@shanevet.com', '11814 Sheldon St, Sun Valley, CA 91352', 'bronze', 'medium', 'general', 'monthly', 'SUN VALLEY'),
  ('Shelter Vet Inc', 'active', NULL, 'reception@sheltervetinc.com', '13428 Maxella Ave #770, Marina Del Rey, CA 90292', 'bronze', 'medium', 'general', 'monthly', 'MARINA'),
  ('Shiloh''s Vet', 'active', '(818) 509-2987', 'mypet@shilohsvet.com', '11800 Ventura Blvd Studio City, CA 91604', 'bronze', 'medium', 'general', 'monthly', 'STUDIO CITY'),
  ('Simon Vet Surgical', 'active', NULL, 'info@simonvetsurgical.com', NULL, 'silver', 'medium', 'general', 'monthly', 'LA'),
  ('SO Vet Group', 'active', NULL, 'so.vetgroup@yahoo.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'SHERMAN OAKS'),
  ('Southpaw Vets', 'active', NULL, 'hello@southpawvets.la', NULL, 'bronze', 'medium', 'general', 'monthly', 'LA'),
  ('Stewart Veterinary Group', 'active', '818-996-0000', 'info@stewartvet.com', NULL, 'silver', 'medium', 'general', 'monthly', 'TARZANA'),
  ('Sweet Home Veterinary Hospital', 'active', '(818) 767-3945', 'info@sweethomevets.com', '11814 Sheldon St, Sun Valley, CA 91352', 'bronze', 'medium', 'general', 'monthly', 'SUN VALLEY'),
  ('Tarzana Pet Clinic', 'active', NULL, 'tarzanapetclinic@gmail.com', '19582 Ventura Blvd., Tarzana, CA 91356', 'bronze', 'medium', 'general', 'monthly', 'TARZANA'),
  ('The Cat Hospital', 'active', NULL, 'marina@thecathospital.com', '1523 Truman St., San Fernando, CA 91340', 'bronze', 'medium', 'general', 'monthly', 'SAN FERNANDO'),
  ('The Pet Doctors of Sherman Oaks', 'active', '818.850.7297', 'info@thepetdrs.com', '14942 Ventura Blvd, Sherman Oaks, CA 91403', 'silver', 'medium', 'general', 'monthly', 'SHERMAN OAKS'),
  ('THRIVE Woodland Hills', 'active', '818-887-2262', 'dagaiby@accessvets.com', '20051 Ventura Blvd D, Woodland Hills, CA 91364', 'platinum', 'medium', 'general', 'monthly', 'WOODLAND HILLS'),
  ('Topanga Veterinary Clinic', 'active', '818-280-3530', 'topangaveterinaryclinic@gmail.com', '21913 Devonshire St, Chatsworth, CA 91311', 'bronze', 'medium', 'general', 'monthly', 'CHATSWORTH'),
  ('Townsgate Pet Hospital', 'active', '(805) 230-1999', 'info@townsgatepethospital.com', '2806 Townsgate Road Suite C, Westlake Village, CA 91361', 'bronze', 'medium', 'general', 'monthly', 'WESTLAKE VILLAGE'),
  ('TrueCare for Pets', 'active', NULL, NULL, NULL, 'bronze', 'medium', 'general', 'monthly', 'LA'),
  ('Two Hands Four Paws', 'active', '(323) 919-6666', 'info@twohandsfourpaws.com', '2240 Federal Ave, Los Angeles, CA 90064', 'gold', 'medium', 'general', 'monthly', 'WEST LA'),
  ('Value Vet Canoga Park', 'active', '818-592-0092', 'canogapark@myvaluevet.com', '21724 Sherman Way, Canoga Park, CA 91303', 'bronze', 'medium', 'general', 'monthly', 'CANOGA PARK'),
  ('Value Vet Westwood', 'active', '310.446.3908', 'westwood@myvaluevet.com', '1278 Westwood Blvd, Los Angeles, CA 90024', 'bronze', 'medium', 'general', 'monthly', 'WESTWOOD'),
  ('Van Nuys Veterinary Clinic', 'active', '818-453-8789', 'vannuysvetclinic@gmail.com', '7215 Van Nuys Blvd, Van Nuys, CA', 'gold', 'medium', 'general', 'monthly', 'VAN NUYS'),
  ('VCA A Breed Apart', 'active', '626-795-4444', 'stepanian.christina@gmail.com', '777 S. Arroyo Parkway, Suite 106, Pasadena, CA 91105', 'silver', 'medium', 'general', 'monthly', 'PASADENA'),
  ('VCA Adler Animal Hospital', 'active', '818-893-6366', 'au861@vca.com', '16911 Roscoe Blvd. North Hills, CA 91343', 'silver', 'medium', 'general', 'monthly', 'NORTH HILLS'),
  ('VCA Animal Medical Center', 'active', '818-786-1651', 'vcaamcvannuys@vca.com', '14931 Oxnard Street Van Nuys, CA 91411', 'gold', 'medium', 'general', 'monthly', 'VAN NUYS'),
  ('VCA Animal Medical Center of Southern California', 'active', '(310) 575-5656', 'vcaamcsocal@vca.com', '2340 S Sepulveda Blvd, Los Angeles, CA 90064', 'platinum', 'medium', 'general', 'monthly', 'WEST LA'),
  ('VCA Animal Specialty Group', 'active', '818-244-7977', 'Andreas.Andreou@vca.com', '4641 Colorado Blvd., Glendale, CA 90039', 'platinum', 'medium', 'general', 'monthly', 'GLENDALE'),
  ('VCA Chatoak Pet Clinic', 'active', '818-363-7444', NULL, '17659 Chatsworth St, Granada Hills, CA 91344', 'silver', 'medium', 'general', 'monthly', 'GRANADA HILLS'),
  ('VCA Marina Bay Cities Animal Hospital', 'active', '310.306.8707', 'AU153@vcahospitals.com', '2506 Lincoln Blvd, Venice 90291', 'gold', 'medium', 'general', 'monthly', 'VENICE'),
  ('VCA McClave Veterinary Hospital', 'active', '818-881-5102', NULL, '6950 Reseda Blvd., Reseda, CA 91335', 'silver', 'medium', 'general', 'monthly', 'RESEDA'),
  ('VCA Miller-Robertson', 'active', '310.657.7050', 'Mark.nunez@vca.com', '8807 Melrose Ave, LA, 90069', 'gold', 'medium', 'general', 'monthly', 'WEST HOLLYWOOD'),
  ('VCA Parkwood Animal Hospital', 'active', '818-884-5506', 'au124@vca.com', '6330 Fallbrook Avenue, Woodland Hills, CA 91367', 'silver', 'medium', 'general', 'monthly', 'WOODLAND HILLS'),
  ('VCA Santa Monica Dog and Cat Hospital', 'active', '310.453.5459', 'Gina.Johnson@vca.com', '2010 Broadway., Santa Monica CA, 90404', 'gold', 'medium', 'general', 'monthly', 'SANTA MONICA'),
  ('VCA TLC Animal Hospital', 'active', '310.859.4852', 'ian.hannigan@vca.com', '8725 Santa Monica Blvd, West Hollywood CA 90069', 'silver', 'medium', 'general', 'monthly', 'WEST HOLLYWOOD'),
  ('VCA Venture Animal Hospital', 'active', '310.559.2500', NULL, '8750 Venice Blvd, LA, 90034', 'silver', 'medium', 'general', 'monthly', 'WEST LA'),
  ('VCA Veterinary Specialists of the Valley', 'active', '818-883-8387', NULL, '22123 Ventura Blvd Woodland Hills, CA 91364', 'platinum', 'medium', 'general', 'monthly', 'WOODLAND HILLS'),
  ('VCA West LA Animal Hospital', 'active', '310-473-2951', 'eliot.kaplan@vca.com', '1818 South Sepulveda Blvd., Los Angeles, CA 90025', 'gold', 'medium', 'general', 'monthly', 'WEST LA'),
  ('VCA Wilshire', 'active', '310.828.4587', 'Frank.Lavac@vca.com', '2421 Wilshire Blvd, Santa Monica, CA 90403', 'gold', 'medium', 'general', 'monthly', 'SANTA MONICA'),
  ('Vegan Vet', 'active', NULL, 'veganvet@gmail.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'LA'),
  ('VEG Veterinary Emergency Group', 'active', '424.538.876', 'jonathanyashari@veg.vet', '2700 Wilshire Boulevard, Santa Monica, CA', 'platinum', 'medium', 'general', 'monthly', 'SANTA MONICA'),
  ('Vet Care Animal Center', 'active', '(818) 364-1544', NULL, '13815 Sayre St Sylmar, CA 91342', 'bronze', 'medium', 'general', 'monthly', 'SYLMAR'),
  ('Veterinary Care Center', 'active', '310.773.9286', 'info@veterinarycarecenter.com', '1507 7th St, Santa Monica, CA 90406', 'gold', 'medium', 'general', 'monthly', 'SANTA MONICA'),
  ('Veterinary Medical Center', 'active', '(818) 232-5718', NULL, '11723 Ventura Blvd Studio City, CA 91604', 'bronze', 'medium', 'general', 'monthly', 'STUDIO CITY'),
  ('Veterinary Skin and Ear', 'active', '310.855.3499', 'info@vetskinear.com', '11335 Santa Monica Blvd, Los Angeles, CA 90025', 'gold', 'medium', 'general', 'monthly', 'WEST LA'),
  ('Village Vet LA', 'active', NULL, 'INFO@VILLAGEVETLA.com', '6455 Santa Monica Blvd, Los Angeles, CA 90038', 'bronze', 'medium', 'general', 'monthly', 'HOLLYWOOD'),
  ('Warner Center Pet Clinic', 'active', '818-710-8528', 'epetwcpc@yahoo.com', '20930 Victory Blvd, Woodland Hills, CA 91367', 'bronze', 'medium', 'general', 'monthly', 'WOODLAND HILLS'),
  ('WeHo Vets', 'active', NULL, 'Wehovets@gmail.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'WEST HOLLYWOOD'),
  ('West Hollywood Animal Hospital', 'active', '310.275.0055', 'info@wh-ah.com', '9000 N Santa Monica Blvd, West Hollywood, 90069', 'silver', 'medium', 'general', 'monthly', 'WEST HOLLYWOOD'),
  ('West LA Vet Group', 'active', '310.478.5915', 'info@wlavg.com', '10749 W Pico Blvd, Los Angeles, CA 90064', 'silver', 'medium', 'general', 'monthly', 'WEST LA'),
  ('West Valley Pet Clinic', 'active', '(818)225-7160', 'reception@westvalleypetclinic.com', '22430 Ventura Blvd, Woodland Hills, CA 91364', 'silver', 'medium', 'general', 'monthly', 'WOODLAND HILLS'),
  ('Westchester Veterinary Center', 'active', '310.645.4444', 'info@westchestervet.com', '8911 S Sepulveda Blvd, Los Angeles, CA 90045', 'silver', 'medium', 'general', 'monthly', 'WESTCHESTER'),
  ('WesternU Spay and Neuter', 'active', '818-510-0197', 'spayneuterev@westernu.edu', '14409 Vanowen St, Van Nuys, CA 91411', 'bronze', 'medium', 'general', 'monthly', 'VAN NUYS'),
  ('Westside Pet Clinic', 'active', NULL, 'info@westsidepetclinic.com', '1304 Wilshire Blvd, Santa Monica, CA 90403', 'bronze', 'medium', 'general', 'monthly', 'SANTA MONICA'),
  ('Winnetka Animal Clinic', 'active', '818-341-8373', 'info@winnetkaanimalclinic.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'WINNETKA'),
  ('Blue Cross Pet Hospital', 'active', NULL, NULL, NULL, 'bronze', 'medium', 'general', 'monthly', 'LA'),
  ('Blue Pet Hospital', 'active', NULL, 'reception@bluepet.com', NULL, 'bronze', 'medium', 'general', 'monthly', 'LA'),
  ('Culver Palms Animal Hospital', 'active', NULL, NULL, NULL, 'bronze', 'medium', 'general', 'monthly', 'CULVER CITY'),
  ('Dr. May''s Veterinary House Calls', 'active', NULL, NULL, NULL, 'bronze', 'medium', 'general', 'monthly', 'LA'),
  ('Santa Clarita Valley Veterinary Hospital', 'active', '818-999-1290', 'scvh@yourvetdoc.com', '5421 Topanga Canyon Blvd, Woodland Hills, CA 91367', 'silver', 'medium', 'general', 'monthly', 'WOODLAND HILLS')
) AS new_clinics(name, status, phone, email, address, tier, priority, clinic_type, visit_frequency, zone)
WHERE NOT EXISTS (
  SELECT 1 FROM public.referral_partners rp WHERE rp.name = new_clinics.name
);
