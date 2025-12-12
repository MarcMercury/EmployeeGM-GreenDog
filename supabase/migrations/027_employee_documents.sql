-- =====================================================
-- Migration 027: Employee Documents Table
-- Stores time-stamped files for employee profiles
-- =====================================================

-- =====================================================
-- 1. CREATE EMPLOYEE_DOCUMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Which employee this document belongs to
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  
  -- Who uploaded it (admin/manager)
  uploader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- File metadata
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT, -- e.g., 'pdf', 'png', 'jpg', 'docx'
  file_size INTEGER, -- Size in bytes
  
  -- Optional description
  description TEXT,
  
  -- Document category
  category TEXT DEFAULT 'general' CHECK (category IN (
    'general',
    'offer_letter',
    'contract',
    'performance_review',
    'certification',
    'license',
    'training',
    'disciplinary',
    'other'
  )),
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON public.employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_uploader ON public.employee_documents(uploader_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_category ON public.employee_documents(category);
CREATE INDEX IF NOT EXISTS idx_employee_documents_created ON public.employee_documents(created_at DESC);

-- =====================================================
-- 3. ENABLE RLS
-- =====================================================

ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================

-- Admins can do everything
CREATE POLICY "Admins can manage employee documents"
  ON public.employee_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- Managers can view documents
CREATE POLICY "Managers can view employee documents"
  ON public.employee_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role = 'manager'
    )
  );

-- Employees can view their own documents
CREATE POLICY "Employees can view their own documents"
  ON public.employee_documents FOR SELECT
  USING (
    employee_id IN (
      SELECT e.id FROM employees e
      JOIN profiles p ON e.profile_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- =====================================================
-- 5. UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_employee_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS employee_documents_updated_at ON public.employee_documents;
CREATE TRIGGER employee_documents_updated_at
  BEFORE UPDATE ON public.employee_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_documents_updated_at();

-- =====================================================
-- 6. STORAGE BUCKET SETUP (Run in Supabase Dashboard)
-- =====================================================
-- Note: Storage bucket creation requires Supabase Dashboard or CLI
-- 
-- Bucket Name: employee-docs
-- Public: false
-- File size limit: 10MB
-- Allowed mime types: application/pdf, image/*, application/msword, 
--                     application/vnd.openxmlformats-officedocument.*
--
-- Storage Policies (add via Dashboard):
-- 
-- INSERT Policy: "Admins can upload documents"
--   (bucket_id = 'employee-docs' AND 
--    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('super_admin', 'admin')))
--
-- SELECT Policy: "Admins and managers can view documents"
--   (bucket_id = 'employee-docs' AND 
--    EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('super_admin', 'admin', 'manager')))
--
-- SELECT Policy: "Employees can view their own documents"
--   (bucket_id = 'employee-docs' AND 
--    name LIKE (SELECT e.id::text || '/%' FROM employees e 
--               JOIN profiles p ON e.profile_id = p.id 
--               WHERE p.auth_user_id = auth.uid()))

-- =====================================================
-- 7. HELPER VIEW
-- =====================================================

CREATE OR REPLACE VIEW public.employee_documents_with_details AS
SELECT 
  ed.*,
  e.first_name || ' ' || e.last_name as employee_name,
  up.email as uploader_email
FROM public.employee_documents ed
LEFT JOIN public.employees e ON ed.employee_id = e.id
LEFT JOIN auth.users up ON ed.uploader_id = up.id;

-- =====================================================
-- 8. COMMENTS
-- =====================================================

COMMENT ON TABLE public.employee_documents IS 'Stores documents associated with employees (contracts, certifications, etc.)';
COMMENT ON COLUMN public.employee_documents.file_url IS 'Path to file in Supabase Storage (employee-docs bucket)';
COMMENT ON COLUMN public.employee_documents.category IS 'Document classification for organization';
