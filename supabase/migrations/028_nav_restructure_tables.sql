-- =====================================================
-- MIGRATION: 028_nav_restructure_tables.sql
-- Description: Creates tables for new navigation features
-- Created: December 2024
-- =====================================================

-- =====================================================
-- 1. Employee Goals Table
-- For Goals section integrated into Profile page
-- =====================================================
CREATE TABLE IF NOT EXISTS employee_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Professional Development',
    target_date DATE,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_employee_goals_employee ON employee_goals(employee_id);

-- RLS Policies for employee_goals
ALTER TABLE employee_goals ENABLE ROW LEVEL SECURITY;

-- Employees can view their own goals
CREATE POLICY "Employees can view own goals"
    ON employee_goals FOR SELECT
    USING (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN profiles p ON e.profile_id = p.id
            WHERE p.auth_user_id = auth.uid()
        )
    );

-- Employees can create their own goals
CREATE POLICY "Employees can create own goals"
    ON employee_goals FOR INSERT
    WITH CHECK (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN profiles p ON e.profile_id = p.id
            WHERE p.auth_user_id = auth.uid()
        )
    );

-- Employees can update their own goals
CREATE POLICY "Employees can update own goals"
    ON employee_goals FOR UPDATE
    USING (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN profiles p ON e.profile_id = p.id
            WHERE p.auth_user_id = auth.uid()
        )
    );

-- Employees can delete their own goals
CREATE POLICY "Employees can delete own goals"
    ON employee_goals FOR DELETE
    USING (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN profiles p ON e.profile_id = p.id
            WHERE p.auth_user_id = auth.uid()
        )
    );

-- Admins can manage all goals
CREATE POLICY "Admins can manage all goals"
    ON employee_goals FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.auth_user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 2. Med Ops Partners Table
-- For Medical equipment manufacturers directory
-- =====================================================
CREATE TABLE IF NOT EXISTS med_ops_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    website TEXT,
    address TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_preferred BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for med_ops_partners
ALTER TABLE med_ops_partners ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view partners
CREATE POLICY "Users can view med_ops_partners"
    ON med_ops_partners FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can manage partners
CREATE POLICY "Admins can manage med_ops_partners"
    ON med_ops_partners FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.auth_user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 3. Wiki Articles Table
-- For Med Ops Wiki knowledge base
-- =====================================================
CREATE TABLE IF NOT EXISTS wiki_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT[],
    author_id UUID REFERENCES employees(id),
    is_published BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for search
CREATE INDEX IF NOT EXISTS idx_wiki_articles_title ON wiki_articles USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_wiki_articles_content ON wiki_articles USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_wiki_articles_category ON wiki_articles(category);

-- RLS Policies for wiki_articles
ALTER TABLE wiki_articles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view published articles
CREATE POLICY "Users can view published wiki articles"
    ON wiki_articles FOR SELECT
    TO authenticated
    USING (is_published = true);

-- Admins can manage all articles
CREATE POLICY "Admins can manage wiki_articles"
    ON wiki_articles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.auth_user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 4. Medical Boards (Patient Tracking)
-- For Med Ops Boards feature
-- =====================================================
CREATE TABLE IF NOT EXISTS medical_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_name TEXT NOT NULL,
    species TEXT NOT NULL,
    breed TEXT,
    owner_name TEXT,
    owner_phone TEXT,
    department TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting',
    priority TEXT DEFAULT 'normal',
    assigned_to UUID REFERENCES employees(id),
    check_in_time TIMESTAMPTZ DEFAULT NOW(),
    estimated_time INTEGER, -- in minutes
    notes TEXT,
    room TEXT,
    is_urgent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for department and status
CREATE INDEX IF NOT EXISTS idx_medical_boards_department ON medical_boards(department);
CREATE INDEX IF NOT EXISTS idx_medical_boards_status ON medical_boards(status);

-- RLS Policies for medical_boards
ALTER TABLE medical_boards ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view and update boards
CREATE POLICY "Users can view medical_boards"
    ON medical_boards FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update medical_boards"
    ON medical_boards FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert medical_boards"
    ON medical_boards FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Admins can delete
CREATE POLICY "Admins can delete medical_boards"
    ON medical_boards FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.auth_user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 5. Marketing Resources Table
-- For Resources directory (vendors, agencies, photographers)
-- =====================================================
CREATE TABLE IF NOT EXISTS marketing_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    address TEXT,
    tags TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    is_preferred BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for marketing_resources
ALTER TABLE marketing_resources ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage marketing resources
CREATE POLICY "Admins can manage marketing_resources"
    ON marketing_resources FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.auth_user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 6. Partnerships (CRM) Table
-- For referral clinics and business partnerships
-- =====================================================
CREATE TABLE IF NOT EXISTS partnerships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Active',
    priority TEXT DEFAULT 'Medium',
    contact_name TEXT,
    contact_title TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    website TEXT,
    referral_count INTEGER DEFAULT 0,
    last_contact DATE,
    next_followup DATE,
    referral_agreement TEXT DEFAULT 'None',
    notes TEXT,
    tags TEXT[],
    needs_followup BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for partnerships
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;

-- Only admins can manage partnerships
CREATE POLICY "Admins can manage partnerships"
    ON partnerships FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.auth_user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 7. Partnership Activities (CRM Activity Log)
-- =====================================================
CREATE TABLE IF NOT EXISTS partnership_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partnership_id UUID NOT NULL REFERENCES partnerships(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- 'call', 'email', 'meeting', 'note'
    title TEXT NOT NULL,
    description TEXT,
    performed_by UUID REFERENCES employees(id),
    activity_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for partnership lookup
CREATE INDEX IF NOT EXISTS idx_partnership_activities_partnership ON partnership_activities(partnership_id);

-- RLS Policies
ALTER TABLE partnership_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage partnership_activities"
    ON partnership_activities FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.auth_user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 8. Update triggers for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to new tables
DO $$
BEGIN
    -- employee_goals
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_employee_goals_updated_at') THEN
        CREATE TRIGGER update_employee_goals_updated_at
            BEFORE UPDATE ON employee_goals
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- med_ops_partners
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_med_ops_partners_updated_at') THEN
        CREATE TRIGGER update_med_ops_partners_updated_at
            BEFORE UPDATE ON med_ops_partners
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- wiki_articles
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_wiki_articles_updated_at') THEN
        CREATE TRIGGER update_wiki_articles_updated_at
            BEFORE UPDATE ON wiki_articles
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- medical_boards
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_medical_boards_updated_at') THEN
        CREATE TRIGGER update_medical_boards_updated_at
            BEFORE UPDATE ON medical_boards
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- marketing_resources
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_marketing_resources_updated_at') THEN
        CREATE TRIGGER update_marketing_resources_updated_at
            BEFORE UPDATE ON marketing_resources
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- partnerships
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_partnerships_updated_at') THEN
        CREATE TRIGGER update_partnerships_updated_at
            BEFORE UPDATE ON partnerships
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- =====================================================
-- 9. Sample Data for Med Ops Partners
-- =====================================================
INSERT INTO med_ops_partners (name, category, description, contact_email, website, is_preferred) VALUES
('IDEXX Laboratories', 'Diagnostics', 'Leading provider of diagnostic and information technology solutions', 'info@idexx.com', 'https://www.idexx.com', true),
('Zoetis', 'Pharmaceuticals', 'Global animal health company providing medicines and vaccines', 'contact@zoetis.com', 'https://www.zoetis.com', true),
('Hill''s Pet Nutrition', 'Nutrition', 'Premium therapeutic and wellness pet foods', 'info@hillspet.com', 'https://www.hillspet.com', true),
('Midmark', 'Equipment', 'Medical equipment including exam tables and dental units', 'info@midmark.com', 'https://www.midmark.com', false),
('Heska Corporation', 'Diagnostics', 'Point-of-care diagnostic and specialty products', 'info@heska.com', 'https://www.heska.com', false)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 10. Sample Wiki Articles
-- =====================================================
INSERT INTO wiki_articles (title, content, category, tags, is_published) VALUES
('Canine Vaccination Protocols', 'Core vaccines for dogs include DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza) and Rabies...', 'Preventive Care', ARRAY['vaccines', 'dogs', 'preventive'], true),
('Feline Upper Respiratory Infections', 'URIs in cats are commonly caused by feline herpesvirus and calicivirus. Treatment includes...', 'Feline Medicine', ARRAY['cats', 'respiratory', 'URI'], true),
('Emergency Triage Guidelines', 'Priority assessment using the modified Glasgow Coma Scale and ABC assessment...', 'Emergency Medicine', ARRAY['emergency', 'triage', 'critical care'], true),
('Pain Management Protocols', 'Multimodal approach to pain management including NSAIDs, opioids, and local anesthetics...', 'Anesthesia', ARRAY['pain', 'anesthesia', 'opioids'], true),
('Dental Prophylaxis Procedure', 'Step-by-step guide for professional dental cleaning including scaling, polishing, and charting...', 'Dentistry', ARRAY['dental', 'teeth', 'prophylaxis'], true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- Done!
-- =====================================================
