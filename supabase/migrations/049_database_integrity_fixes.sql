-- =====================================================
-- MIGRATION 049: Database Integrity & Missing Features
-- Fixes: employee_notes columns, goals RLS, review_requests
-- =====================================================

-- =====================================================
-- 1. FIX EMPLOYEE_NOTES TABLE - Add missing columns
-- =====================================================
ALTER TABLE public.employee_notes 
    ADD COLUMN IF NOT EXISTS note_type TEXT DEFAULT 'general',
    ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add constraint for note types
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'employee_notes_note_type_check'
    ) THEN
        ALTER TABLE public.employee_notes 
            ADD CONSTRAINT employee_notes_note_type_check 
            CHECK (note_type IN ('general', 'performance', 'incident', 'positive', 'training', 'admin'));
    END IF;
END $$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_employee_notes_employee_id 
    ON public.employee_notes(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_notes_pinned 
    ON public.employee_notes(is_pinned) WHERE is_pinned = true;

-- RLS for employee_notes
ALTER TABLE public.employee_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all notes" ON public.employee_notes;
CREATE POLICY "Admins can manage all notes" ON public.employee_notes
FOR ALL USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authors can view own notes" ON public.employee_notes;
CREATE POLICY "Authors can view own notes" ON public.employee_notes
FOR SELECT USING (
    author_employee_id IN (
        SELECT e.id FROM public.employees e
        WHERE e.profile_id = auth.uid()
    )
);

-- =====================================================
-- 2. FIX GOALS TABLE - Add missing RLS policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
CREATE POLICY "Users can view own goals" ON public.goals
FOR SELECT USING (
    owner_employee_id IN (
        SELECT e.id FROM public.employees e
        WHERE e.profile_id = auth.uid()
    )
    OR public.is_admin()
);

DROP POLICY IF EXISTS "Users can create own goals" ON public.goals;
CREATE POLICY "Users can create own goals" ON public.goals
FOR INSERT WITH CHECK (
    owner_employee_id IN (
        SELECT e.id FROM public.employees e
        WHERE e.profile_id = auth.uid()
    )
    OR public.is_admin()
);

DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
CREATE POLICY "Users can update own goals" ON public.goals
FOR UPDATE USING (
    owner_employee_id IN (
        SELECT e.id FROM public.employees e
        WHERE e.profile_id = auth.uid()
    )
    OR public.is_admin()
);

DROP POLICY IF EXISTS "Admins can delete goals" ON public.goals;
CREATE POLICY "Admins can delete goals" ON public.goals
FOR DELETE USING (public.is_admin());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.goals TO authenticated;
GRANT DELETE ON public.goals TO authenticated;

-- =====================================================
-- 3. CREATE REVIEW_REQUESTS TABLE for self-review workflow
-- =====================================================
CREATE TABLE IF NOT EXISTS public.review_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Who is being reviewed
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    
    -- Who requested the review (null = self-initiated)
    requested_by_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    
    -- Request details
    request_type TEXT NOT NULL CHECK (request_type IN ('self_initiated', 'admin_initiated')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    
    -- Self-assessment content
    topics_to_cover TEXT[], -- Array of topics user wants to discuss
    skills_to_review UUID[], -- Array of skill IDs to be reviewed
    additional_notes TEXT,
    
    -- Dates
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date DATE,
    completed_at TIMESTAMPTZ,
    
    -- Link to actual review when created
    performance_review_id UUID REFERENCES public.performance_reviews(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_review_requests_employee ON public.review_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_status ON public.review_requests(status);
CREATE INDEX IF NOT EXISTS idx_review_requests_requested_by ON public.review_requests(requested_by_employee_id);

-- RLS
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own review requests" ON public.review_requests;
CREATE POLICY "Users can view own review requests" ON public.review_requests
FOR SELECT USING (
    employee_id IN (
        SELECT e.id FROM public.employees e
        WHERE e.profile_id = auth.uid()
    )
    OR public.is_admin()
);

DROP POLICY IF EXISTS "Users can create own review requests" ON public.review_requests;
CREATE POLICY "Users can create own review requests" ON public.review_requests
FOR INSERT WITH CHECK (
    (employee_id IN (
        SELECT e.id FROM public.employees e
        WHERE e.profile_id = auth.uid()
    ) AND request_type = 'self_initiated')
    OR public.is_admin()
);

DROP POLICY IF EXISTS "Admins can update review requests" ON public.review_requests;
CREATE POLICY "Admins can update review requests" ON public.review_requests
FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete review requests" ON public.review_requests;
CREATE POLICY "Admins can delete review requests" ON public.review_requests
FOR DELETE USING (public.is_admin());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.review_requests TO authenticated;

-- =====================================================
-- 4. NOTIFICATION TRIGGER FOR REVIEW REQUESTS
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_review_request()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_name TEXT;
    v_requester_name TEXT;
    v_admin_profiles UUID[];
BEGIN
    -- Get employee name
    SELECT CONCAT(first_name, ' ', last_name) INTO v_employee_name
    FROM public.employees WHERE id = NEW.employee_id;
    
    -- Get all admin profile IDs
    SELECT ARRAY_AGG(id) INTO v_admin_profiles
    FROM public.profiles
    WHERE role = 'admin';
    
    IF NEW.request_type = 'self_initiated' THEN
        -- Employee requested review - notify all admins
        INSERT INTO public.notifications (profile_id, type, category, title, body, data, requires_action)
        SELECT 
            admin_id,
            'review_requested',
            'performance',
            'Review Request Submitted',
            v_employee_name || ' has requested a performance review',
            jsonb_build_object(
                'review_request_id', NEW.id,
                'employee_id', NEW.employee_id,
                'topics', NEW.topics_to_cover,
                'skills', NEW.skills_to_review
            ),
            true
        FROM UNNEST(v_admin_profiles) AS admin_id;
        
    ELSIF NEW.request_type = 'admin_initiated' THEN
        -- Admin initiated review - notify employee
        SELECT CONCAT(first_name, ' ', last_name) INTO v_requester_name
        FROM public.employees WHERE id = NEW.requested_by_employee_id;
        
        INSERT INTO public.notifications (profile_id, type, category, title, body, data, requires_action)
        SELECT 
            e.profile_id,
            'review_requested',
            'performance',
            'Performance Review Requested',
            COALESCE(v_requester_name, 'An admin') || ' has requested you complete a self-assessment',
            jsonb_build_object(
                'review_request_id', NEW.id,
                'requested_by', NEW.requested_by_employee_id
            ),
            true
        FROM public.employees e
        WHERE e.id = NEW.employee_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_review_request ON public.review_requests;
CREATE TRIGGER trigger_notify_review_request
    AFTER INSERT ON public.review_requests
    FOR EACH ROW EXECUTE FUNCTION public.notify_review_request();

-- =====================================================
-- 5. FIX EMPLOYEE_DOCUMENTS RLS POLICIES
-- =====================================================
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all documents" ON public.employee_documents;
CREATE POLICY "Admins can manage all documents" ON public.employee_documents
FOR ALL USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can view own documents" ON public.employee_documents;
CREATE POLICY "Users can view own documents" ON public.employee_documents
FOR SELECT USING (
    employee_id IN (
        SELECT e.id FROM public.employees e
        WHERE e.profile_id = auth.uid()
    )
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_documents TO authenticated;

-- =====================================================
-- 6. ENSURE NOTIFICATIONS TABLE HAS ALL REQUIRED COLUMNS
-- =====================================================
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS category TEXT,
    ADD COLUMN IF NOT EXISTS requires_action BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS action_url TEXT;

-- =====================================================
-- 7. GRANT PERMISSIONS FOR EMPLOYEE_NOTES
-- =====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_notes TO authenticated;
